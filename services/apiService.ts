
import { Booking, Car, Member, LogEntry, Expense, StaffMember, Agreement, DigitalForm, Company, MarketingEvent, AuditRecord, PayoutHistory } from '../types';
import { supabase } from './supabase';
import { parseBookingDate } from './bookingService';
import { mytToUtc, formatInMYT, getNowMYT } from '../utils/dateUtils';

// Service for managing fleet data
const logSupabaseError = (context: string, error: any) => {
  const isNetworkError = error.message?.includes('Failed to fetch') || 
                        error.name === 'TypeError' || 
                        error.message?.includes('NetworkError') ||
                        !window.navigator.onLine;

  const isSchemaError = error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703' || error.message?.includes('schema cache');

  if (isSchemaError) {
    // Flexible regex to catch "relation 'cars' does not exist" or "relation 'public.cars' does not exist"
    // Handles both double quotes and single quotes which can vary by Postgres version/driver
    const tableNameMatch = error.message?.match(/relation ["'](?:public\.)?(.*?)["'] does not exist/i);
    const tableName = tableNameMatch ? tableNameMatch[1] : null;
    
    // Check for missing column errors
    const columnMatch = error.message?.match(/column ["'](.*?)["'] of relation ["'](.*?)["'] does not exist/i) || 
                        error.message?.match(/Could not find the ["'](.*?)["'] column of ["'](.*?)["']/i);
    
    if (columnMatch) {
      const columnName = columnMatch[1];
      const table = columnMatch[2];
      const isPriceOrAmount = columnName.includes('price') || columnName.includes('amount') || columnName.includes('deposit');
      const isDate = columnName.includes('expiry') || columnName.includes('date') || columnName.includes('timestamp') || columnName.includes('start') || columnName.includes('end');
      const type = isPriceOrAmount ? 'NUMERIC DEFAULT 0' : (isDate ? 'DATE' : 'TEXT');
      
      console.error(`Supabase Schema Error: The column '${columnName}' is missing from table '${table}'.`);
      console.error(`FIX: Run the following SQL in your Supabase SQL Editor:`);
      
      let sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnName} ${type};`;
      
      // If it's the cars table, suggest adding all Fleet Guardian columns at once to avoid multiple errors
      if (table === 'cars') {
        sql = `ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS plate_number TEXT,
ADD COLUMN IF NOT EXISTS make TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS roadtax_expiry DATE,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS inspection_expiry DATE;`;
      } else if (table === 'subscribers') {
        sql = `ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Tier 1',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();`;
      } else if (table === 'marketing_events') {
        sql = `ALTER TABLE marketing_events 
ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'Total Sales (RM)',
ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 0;`;
      }
      
      console.error(sql);

      // Dispatch custom event for UI feedback
      window.dispatchEvent(new CustomEvent('supabase-schema-error', { 
        detail: { table, column: columnName, type, sql } 
      }));
    } else if (tableName) {
      console.error(`Supabase Schema Error: The table '${tableName}' does not exist. Please run the SQL schema in your Supabase SQL Editor.`);
    } else {
      console.error(`Supabase Schema Error [${context}]: ${error.message}. This usually means a table is missing or the schema cache is stale.`);
    }
  } else if (isNetworkError) {
    const status = !window.navigator.onLine ? 'OFFLINE' : 'CONNECTION_FAILED';
    console.error(`Supabase Network Error [${context}]: ${status}. Could not connect to Supabase. Please check your internet connection or if the Supabase project is paused.`);
  } else {
    console.error(`Supabase Error [${context}]:`, JSON.stringify(error, null, 2));
  }
};

const validateSubscriber = (id: string | null | undefined) => {
  if (!id || id === 'null' || id === 'undefined' || id === '') {
    throw new Error('Missing Subscriber Identity');
  }
};

/**
 * Universal Key Logic: Retrieves the subscriber_id from the logged-in user's profile.
 * This ensures the frontend is Tier-Agnostic.
 */
const getTenantId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) throw new Error('Not authenticated');
  
  // Try metadata first
  let sId = user.user_metadata?.subscriber_id;
  
  const finalId = sId || user.id;
  validateSubscriber(finalId);
  return finalId;
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Fix the 42501 Error: Refresh session and retry once if permission denied
    if (error.code === '42501' || error.status === 403 || error.message?.includes('42501')) {
      console.warn('Permission denied (42501). Attempting to refresh session and retry...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError) {
        try {
          return await fn();
        } catch (retryError) {
          throw retryError;
        }
      }
    }

    const isNetworkError = error.message?.includes('Failed to fetch') || 
                          error.name === 'TypeError' || 
                          error.message?.includes('NetworkError') ||
                          !window.navigator.onLine;
    
    if (retries > 0 && isNetworkError) {
      console.warn(`Supabase Network Retry [${retries} left]: Attempting to reconnect...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Mapping helpers for DB schema consistency (snake_case in DB, camelCase in Frontend)
const mapCarFromDB = (dbCar: any): Car => ({
  id: dbCar.id,
  name: dbCar.name,
  type: dbCar.type,
  plate: dbCar.plate,
  status: dbCar.status,
  plateNumber: dbCar.plate_number,
  make: dbCar.make,
  model: dbCar.model,
  roadtaxExpiry: dbCar.roadtax_expiry,
  insuranceExpiry: dbCar.insurance_expiry,
  inspectionExpiry: dbCar.inspection_expiry
});

const mapCarToDB = (car: any) => {
  const dbCar: any = {
    name: car.name,
    type: car.type,
    plate: car.plate,
    status: car.status,
    plate_number: car.plateNumber || car.plate_number,
    make: car.make,
    model: car.model,
    roadtax_expiry: car.roadtaxExpiry || car.roadtax_expiry,
    insurance_expiry: car.insuranceExpiry || car.insurance_expiry,
    inspection_expiry: car.inspectionExpiry || car.inspection_expiry
  };
  
  // Remove undefined values to prevent PostgREST from trying to insert into missing columns
  Object.keys(dbCar).forEach(key => {
    if (dbCar[key] === undefined) {
      delete dbCar[key];
    }
  });
  
  return dbCar;
};

const mapBookingFromDB = (dbBooking: any): Booking => {
  // Extract start_date and pickup_time from pickup_datetime if available
  let startDate = dbBooking.start_date;
  let pickupTime = dbBooking.pickup_time;
  
  if (!startDate && dbBooking.pickup_datetime) {
    startDate = formatInMYT(dbBooking.pickup_datetime, 'yyyy-MM-dd');
  }
  
  if (!pickupTime && dbBooking.pickup_datetime) {
    pickupTime = formatInMYT(dbBooking.pickup_datetime, 'HH:mm');
  }
  
  // Ensure pickupTime is HH:MM if it came from a TIME column (which might be HH:MM:SS)
  if (pickupTime && pickupTime.length > 5) {
    pickupTime = pickupTime.substring(0, 5);
  }
  
  let returnTime = dbBooking.return_time;
  if (returnTime && returnTime.length > 5) {
    returnTime = returnTime.substring(0, 5);
  }

  return {
    id: dbBooking.id,
    car_id: dbBooking.car_id,
    member_id: dbBooking.member_id,
    agent_id: dbBooking.agent_id,
    start_date: startDate,
    pickup_time: pickupTime,
    duration_days: dbBooking.duration_days || dbBooking.duration,
    end_time: dbBooking.actual_end_time || dbBooking.end_time,
    status: dbBooking.status,
    total_price: dbBooking.total_price,
    commission_earned: dbBooking.commission_earned,
    created_by: dbBooking.created_by,
    is_dates_matched: dbBooking.is_dates_matched,
    has_discrepancy: dbBooking.has_discrepancy,
    discrepancy_reason: dbBooking.discrepancy_reason,
    end_date: dbBooking.end_date,
    return_time: returnTime
  };
};

const mapBookingToDB = (booking: any) => {
  // Create pickup_datetime from start_date and pickup_time
  let pickupDatetime = null;
  if (booking.start_date && booking.pickup_time) {
    pickupDatetime = mytToUtc(`${booking.start_date}T${booking.pickup_time}:00`).toISOString();
  } else if (booking.start_date) {
    pickupDatetime = mytToUtc(`${booking.start_date}T00:00:00`).toISOString();
  }

  const dbBooking: any = {
    car_id: booking.car_id,
    member_id: booking.member_id,
    agent_id: booking.agent_id,
    pickup_datetime: pickupDatetime,
    duration: booking.duration_days,
    actual_end_time: booking.end_time,
    status: booking.status,
    total_price: booking.total_price,
    commission_earned: booking.commission_earned,
    created_by: booking.created_by,
    is_dates_matched: booking.is_dates_matched,
    has_discrepancy: booking.has_discrepancy,
    discrepancy_reason: booking.discrepancy_reason,
    is_receipt_verified: booking.is_receipt_verified,
    payout_status: booking.payout_status
  };

  // Remove undefined values to prevent PostgREST from trying to insert into missing columns
  Object.keys(dbBooking).forEach(key => {
    if (dbBooking[key] === undefined) {
      delete dbBooking[key];
    }
  });

  return dbBooking;
};

const mapMemberFromDB = (dbMember: any): Member => ({
  id: dbMember.id,
  name: dbMember.name,
  color: dbMember.color,
  email: dbMember.email,
  phone: dbMember.phone,
  identity_number: dbMember.identity_number,
  billing_address: dbMember.billing_address,
  emergency_contact_name: dbMember.emergency_contact_name,
  emergency_contact_relation: dbMember.emergency_contact_relation,
  staff_id: dbMember.staff_id
});

const mapMemberToDB = (member: any) => ({
  name: member.name,
  color: member.color,
  email: member.email,
  phone: member.phone,
  identity_number: member.identity_number,
  billing_address: member.billing_address,
  emergency_contact_name: member.emergency_contact_name,
  emergency_contact_relation: member.emergency_contact_relation,
  staff_id: member.staff_id
});

const mapLogFromDB = (dbLog: any): LogEntry => ({
  id: dbLog.id,
  userId: dbLog.user_id,
  staff_name: dbLog.staff_name,
  action: dbLog.action,
  details: dbLog.details,
  timestamp: dbLog.timestamp
});

const mapLogToDB = (log: any) => ({
  user_id: log.userId || log.user_id,
  staff_name: log.staff_name,
  action: log.action,
  details: log.details,
  timestamp: log.timestamp
});

const mapExpenseFromDB = (dbExpense: any): Expense => ({
  id: dbExpense.id,
  car_id: dbExpense.car_id,
  category: dbExpense.category,
  amount: dbExpense.amount,
  date: dbExpense.date,
  notes: dbExpense.notes,
  created_by: dbExpense.created_by
});

const mapExpenseToDB = (expense: any) => ({
  car_id: expense.car_id,
  category: expense.category,
  amount: expense.amount,
  date: expense.date,
  notes: expense.notes,
  created_by: expense.created_by
});

const mapStaffFromDB = (dbStaff: any): StaffMember => ({
  id: dbStaff.id,
  subscriber_id: dbStaff.subscriber_id,
  name: dbStaff.name,
  staff_uid: dbStaff.access_id || dbStaff.staff_uid,
  pin_hash: dbStaff.pin_hash,
  pin_code: dbStaff.pin_code,
  role: dbStaff.role || 'staff',
  is_active: dbStaff.is_active,
  created_at: dbStaff.created_at,
  commission_tier_override: dbStaff.commission_tier_override,
  commission_rate: dbStaff.commission_rate
});

const mapStaffToDB = (staff: any) => {
  const db: any = {};
  if (staff.name !== undefined) db.name = staff.name;
  if (staff.staff_uid !== undefined) {
    db.access_id = staff.staff_uid;
  }
  if (staff.pin_hash !== undefined) db.pin_hash = staff.pin_hash;
  if (staff.pin_code !== undefined) db.pin_code = staff.pin_code;
  if (staff.role !== undefined) db.role = staff.role;
  if (staff.is_active !== undefined) db.is_active = staff.is_active;
  if (staff.commission_tier_override !== undefined) db.commission_tier_override = staff.commission_tier_override;
  if (staff.commission_rate !== undefined) db.commission_rate = staff.commission_rate;
  return db;
};

// Helper to resolve an agent ID (which might be a string UID or an Auth UID) to a valid staff_members.id UUID
const resolveAgentId = async (agentId: string | undefined): Promise<string | undefined> => {
  if (!agentId) return undefined;
  
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
  
  if (isUuid) {
    // Check if it's already a valid staff_members.id
    const { data: existingStaff } = await supabase
      .from('staff_members')
      .select('id')
      .eq('id', agentId)
      .maybeSingle();
      
    if (existingStaff) {
      return existingStaff.id;
    }
  }
  
  // If it's not a valid staff_members.id (e.g. it's an Auth UID or 'idmahira'), try to resolve it via staff_uid
  const { data: staffData } = await supabase
    .from('staff_members')
    .select('id')
    .eq('access_id', agentId)
    .maybeSingle();
    
  if (staffData) {
    return staffData.id;
  }
  
  return undefined;
};

export const apiService = {
  // Cars
  // Helper to ensure we have a UUID for subscriber_id
  async resolveSubscriberId(id: string): Promise<string> {
    if (!id || id === 'superadmin') {
      return await getTenantId();
    }
    
    // Check if it's already a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id;
    }
    
    // It's likely a slug, look it up in the subscribers table
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('id')
        .eq('name', id)
        .single();
      
      if (data?.id) {
        return data.id;
      }
    } catch (err) {
      console.warn('Failed to resolve subscriber slug to UUID:', err);
    }
    
    return id; // Fallback to original
  },

  async getCars(subscriberId: string): Promise<Car[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('cars').select('*');
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query;
      
      if (error) {
        logSupabaseError('getCars', error);
        if (error.code === '42P01' || error.message?.includes('cache')) {
          const err = new Error('DATABASE_TABLES_MISSING');
          (err as any).code = '42P01';
          throw err;
        }
        throw new Error(error.message || 'Failed to fetch cars');
      }
      return (data || []).map(mapCarFromDB);
    });
  },

  async addCar(car: Omit<Car, 'id'>, subscriberId: string): Promise<Car> {
    const targetSubscriberId = await getTenantId();
    
    console.log(`[apiService] addCar: plate=${car.plateNumber}, targetSubscriberId=${targetSubscriberId}`);

    return withRetry(async () => {
      const { data, error } = await supabase
        .from('cars')
        .insert([{ ...mapCarToDB(car), subscriber_id: targetSubscriberId }])
        .select();

      if (error) {
        logSupabaseError('addCar', error);
        if (error.code === '42P01' || error.message?.includes('cache')) {
          const err = new Error('DATABASE_TABLES_MISSING');
          (err as any).code = '42P01';
          throw err;
        }
        throw new Error(error.message || 'Failed to add car');
      }
      
      if (!data || data.length === 0) {
        throw new Error('Insert successful but no data returned. Check RLS policies.');
      }
      
      return mapCarFromDB(data[0]);
    });
  },

  async updateCar(car: Partial<Car>, subscriberId: string): Promise<Car> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let query = supabase
        .from('cars')
        .update(mapCarToDB(car))
        .eq('id', car.id);
      
      query = query.eq('subscriber_id', targetSubscriberId);

      const { data, error } = await query.select();

      if (error) {
        logSupabaseError('updateCar', error);
        throw new Error(error.message || 'Failed to update car');
      }
      
      if (!data || data.length === 0) {
        throw new Error('Update failed');
      }
      
      return mapCarFromDB(data[0]);
    });
  },

  async saveCars(cars: Car[], subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      // Delete all existing cars for this company
      await supabase.from('cars').delete().eq('subscriber_id', targetSubscriberId);
      
      // Insert new ones
      const carsToInsert = cars.map(c => ({
        ...mapCarToDB(c),
        subscriber_id: targetSubscriberId
      }));
      
      const { error } = await supabase.from('cars').insert(carsToInsert);
      if (error) {
        logSupabaseError('saveCars', error);
        throw new Error(error.message || 'Failed to save cars');
      }
    });
  },

  async deleteCar(id: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let query = supabase
        .from('cars')
        .delete()
        .eq('id', id);
      
      query = query.eq('subscriber_id', targetSubscriberId);

      const { error } = await query;
      
      if (error) {
        logSupabaseError('deleteCar', error);
        throw new Error(error.message || 'Failed to delete car');
      }
    });
  },

  // Members
  async getMembers(subscriberId: string, staffId?: string): Promise<Member[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('members').select('*');
      query = query.eq('subscriber_id', subscriberId);

      if (staffId) {
        let resolvedStaffId = staffId;
        const resolvedId = await resolveAgentId(staffId);
        
        if (resolvedId) {
          resolvedStaffId = resolvedId;
        } else {
          // If we can't resolve it, we won't find any members for this staff
          return [];
        }
        query = query.eq('staff_id', resolvedStaffId);
      }

      const { data, error } = await query;
      
      if (error) {
        logSupabaseError('getMembers', error);
        return []; 
      }
      return (data || []).map(mapMemberFromDB);
    });
  },

  async addMember(member: Omit<Member, 'id'>, subscriberId: string): Promise<Member> {
    const targetSubscriberId = await getTenantId();
    
    return withRetry(async () => {
      let finalMember = { ...mapMemberToDB(member) };
      
      if (finalMember.staff_id) {
        const resolvedId = await resolveAgentId(finalMember.staff_id);
        if (resolvedId) {
          finalMember.staff_id = resolvedId;
        } else {
          finalMember.staff_id = undefined;
        }
      }

      const { data, error } = await supabase
        .from('members')
        .insert([{ ...finalMember, subscriber_id: targetSubscriberId }])
        .select();

      if (error) {
        if (error.code === '23503' && error.message?.includes('members_subscriber_id_fkey')) {
          console.error('Foreign Key Error: The subscriber_id does not exist in the subscribers table.');
          console.error('Attempting to self-provision subscriber record...');
          // This is a last-resort attempt if AuthContext self-provisioning failed
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && session.user.id === targetSubscriberId) {
             await supabase.from('subscribers').upsert({
               id: session.user.id,
               name: session.user.user_metadata?.full_name || session.user.email,
               tier: 'Tier 1',
               status: 'ACTIVE'
             });
             // Retry the insert once
             const { data: retryData, error: retryError } = await supabase
               .from('members')
               .insert([{ ...finalMember, subscriber_id: targetSubscriberId }])
               .select();
             if (!retryError) return mapMemberFromDB(retryData?.[0]);
          }
        }
        logSupabaseError('addMember', error);
        throw new Error(error.message || 'Failed to add member');
      }
      return mapMemberFromDB(data?.[0]);
    });
  },

  async deleteMember(id: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let query = supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      query = query.eq('subscriber_id', targetSubscriberId);

      const { error } = await query;
      
      if (error) {
        logSupabaseError('deleteMember', error);
        throw new Error(error.message || 'Failed to delete member');
      }
    });
  },

  async updateMember(id: string, subscriberId: string, updates: Partial<Member>): Promise<Member> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let finalUpdates = mapMemberToDB(updates);
      
      if (finalUpdates.staff_id) {
        const resolvedId = await resolveAgentId(finalUpdates.staff_id);
        if (resolvedId) {
          finalUpdates.staff_id = resolvedId;
        } else {
          finalUpdates.staff_id = undefined;
        }
      }

      let query = supabase
        .from('members')
        .update(finalUpdates)
        .eq('id', id);
      
      query = query.eq('subscriber_id', targetSubscriberId);

      const { data, error } = await query
        .select()
        .single();

      if (error) {
        logSupabaseError('updateMember', error);
        throw new Error(error.message || 'Failed to update member');
      }
      return mapMemberFromDB(data);
    });
  },

  async searchMemberByIdentity(identityNumber: string, subscriberId: string): Promise<Member | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('members')
        .select('*')
        .eq('identity_number', identityNumber);
      
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query.maybeSingle();
      
      if (error) {
        logSupabaseError('searchMemberByIdentity', error);
        return null;
      }
      return data ? mapMemberFromDB(data) : null;
    });
  },

  // Bookings
  async getBookings(subscriberId: string, startDate?: string, endDate?: string, agentId?: string): Promise<Booking[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('bookings').select('*');
      query = query.eq('subscriber_id', subscriberId);

      if (agentId) {
        let resolvedAgentId = agentId;
        const resolvedId = await resolveAgentId(agentId);
        
        if (resolvedId) {
          resolvedAgentId = resolvedId;
        } else {
          // If we can't resolve it, we won't find any bookings for this agent
          return [];
        }
        query = query.eq('agent_id', resolvedAgentId);
      }
      
      if (startDate && endDate) {
        const bufferDate = new Date(startDate);
        bufferDate.setDate(bufferDate.getDate() - 60);
        
        query = query.gte('pickup_datetime', bufferDate.toISOString());
      }

      const { data, error } = await query;
      
      if (error) {
        logSupabaseError('getBookings', error);
        if (error.code === '42P01' || error.message?.includes('cache')) {
          const err = new Error('DATABASE_TABLES_MISSING');
          (err as any).code = '42P01';
          throw err;
        }
        throw new Error(error.message || 'Failed to fetch bookings');
      }
      return (data || []).map(mapBookingFromDB);
    });
  },

  async getBookingById(id: string, subscriberId: string): Promise<Booking | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .eq('subscriber_id', subscriberId)
        .single();
      
      if (error) {
        logSupabaseError('getBookingById', error);
        return null;
      }
      return data ? mapBookingFromDB(data) : null;
    });
  },

  async updateBookingAuditStatus(id: string, subscriberId: string, auditData: { is_dates_matched: boolean, has_discrepancy: boolean, discrepancy_reason: string }): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('bookings')
        .update(auditData)
        .eq('id', id)
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('updateBookingAuditStatus', error);
        throw new Error('Failed to update booking audit status');
      }
    });
  },

  async checkBookingConflict(booking: { car_id: string, start_date: string, pickup_time: string, duration_days: number, end_time?: string }, subscriberId: string, excludeBookingId?: string): Promise<boolean> {
    validateSubscriber(subscriberId);
    const startTime = new Date(parseBookingDate(booking.start_date, booking.pickup_time));
    const endTime = booking.end_time ? new Date(booking.end_time) : new Date(startTime.getTime() + booking.duration_days * 24 * 60 * 60 * 1000);
    
    const bufferStart = new Date(startTime);
    bufferStart.setDate(bufferStart.getDate() - 60); // Look back 60 days
    
    let query = supabase
      .from('bookings')
      .select('pickup_datetime, duration, actual_end_time, id')
      .eq('subscriber_id', subscriberId)
      .eq('car_id', booking.car_id)
      .gte('pickup_datetime', bufferStart.toISOString());
      
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    
    if (error || !data) return false; 
    
    const newStart = startTime.getTime();
    const newEnd = endTime.getTime();
    
    return data.some(b => {
      const bStart = new Date(b.pickup_datetime).getTime();
      const bDuration = b.duration || 0;
      const bEnd = b.actual_end_time ? new Date(b.actual_end_time).getTime() : bStart + (bDuration * 24 * 60 * 60 * 1000);
      return (bStart < newEnd && bEnd > newStart);
    });
  },

  async updateBookingStatus(id: string, subscriberId: string, status: 'pending' | 'active' | 'completed' | 'cancelled'): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('updateBookingStatus', error);
        throw new Error('Failed to update booking status');
      }

      // If completed, also update linked agreement status to 'completed'
      // but only if it's not already 'reconciled'
      if (status === 'completed') {
        await supabase
          .from('agreements')
          .update({ status: 'completed' })
          .eq('booking_id', id)
          .eq('subscriber_id', targetSubscriberId)
          .neq('status', 'reconciled');
      }
    });
  },

  async saveBooking(booking: Omit<Booking, 'id'>, subscriberId: string, id?: string): Promise<Booking> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let finalBooking = { ...booking };
      
      if (finalBooking.agent_id) {
        const resolvedId = await resolveAgentId(finalBooking.agent_id);
        if (resolvedId) {
          finalBooking.agent_id = resolvedId;
        } else {
          console.warn(`Could not resolve agent_id '${finalBooking.agent_id}' to a valid staff member. Setting to null.`);
          finalBooking.agent_id = undefined;
        }
      }

      if (id) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ ...mapBookingToDB(finalBooking), subscriber_id: targetSubscriberId })
          .eq('id', id)
          .eq('subscriber_id', targetSubscriberId)
          .select();
        
        if (error) {
          logSupabaseError('updateBooking', error);
          throw new Error(error.message || 'Failed to update booking');
        }
        if (!data || data.length === 0) throw new Error('Update failed');
        return mapBookingFromDB(data[0]);
      } else {
        // For new bookings, ensure agent_id is set to the staff_member record ID, not the auth UID
        if (!finalBooking.agent_id) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const resolvedId = await resolveAgentId(user.id);
            if (resolvedId) {
              finalBooking.agent_id = resolvedId;
            } else {
              console.warn(`Current user '${user.id}' is not in staff_members. Cannot set agent_id.`);
              finalBooking.agent_id = undefined;
            }
          }
        }

        // Logical Linking: Verify car belongs to subscriber
        const { data: carData, error: carError } = await supabase
          .from('cars')
          .select('id')
          .eq('id', finalBooking.car_id)
          .eq('subscriber_id', targetSubscriberId)
          .single();
        
        if (carError || !carData) {
          throw new Error('Unauthorized: The selected vehicle does not belong to your fleet.');
        }

        const { data, error } = await supabase
          .from('bookings')
          .insert([{ ...mapBookingToDB(finalBooking), subscriber_id: targetSubscriberId }])
          .select();
        
        if (error) {
          logSupabaseError('insertBooking', error);
          throw new Error(error.message || 'Failed to create booking');
        }
        if (!data || data.length === 0) throw new Error('Insert failed');
        return mapBookingFromDB(data[0]);
      }
    });
  },

  async deleteBooking(id: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      // 1. Fetch all handover records for this booking to get photo URLs
      const { data: handoverRecords, error: fetchError } = await supabase
        .from('handover_records')
        .select('photos_url')
        .eq('booking_id', id)
        .eq('subscriber_id', targetSubscriberId);

      if (fetchError) {
        logSupabaseError('deleteBooking_fetchHandover', fetchError);
        throw new Error('Failed to fetch related handover records for cleanup.');
      }

      // 2. Extract file paths from URLs and delete from Storage
      if (handoverRecords && handoverRecords.length > 0) {
        const allPaths: string[] = [];
        handoverRecords.forEach(record => {
          if (Array.isArray(record.photos_url)) {
            record.photos_url.forEach((url: string) => {
              // Extract path from public URL: .../handover_images/PATH
              const parts = url.split('/handover_images/');
              if (parts.length > 1) {
                allPaths.push(parts[1]);
              }
            });
          }
        });

        if (allPaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('handover_images')
            .remove(allPaths);
          
          if (storageError) {
            console.warn('Storage cleanup partially failed:', storageError.message);
            // We continue even if storage deletion fails to avoid blocking DB deletion
          }
        }

        // 3. Delete handover records first (Foreign Key constraint)
        const { error: handoverDeleteError } = await supabase
          .from('handover_records')
          .delete()
          .eq('booking_id', id)
          .eq('subscriber_id', targetSubscriberId);

        if (handoverDeleteError) {
          logSupabaseError('deleteBooking_deleteHandover', handoverDeleteError);
          throw new Error('Failed to delete related handover records.');
        }
      }

      // 4. Finally delete the booking
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('deleteBooking', error);
        throw new Error(error.message || 'Failed to delete booking');
      }
    });
  },

  // Expenses
  async getExpenses(subscriberId: string): Promise<Expense[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('expenses').select('*');
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query.order('date', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
           const err = new Error('DATABASE_TABLES_MISSING');
           (err as any).code = '42P01';
           throw err;
        }
        logSupabaseError('getExpenses', error);
        return [];
      }
      return (data || []).map(mapExpenseFromDB);
    });
  },

  async addExpense(expense: Omit<Expense, 'id'>, subscriberId: string): Promise<Expense> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...mapExpenseToDB(expense), subscriber_id: targetSubscriberId }])
        .select();

      if (error) {
        logSupabaseError('addExpense', error);
        throw new Error(error.message || 'Failed to add expense');
      }
      return mapExpenseFromDB(data?.[0]);
    });
  },

  async deleteExpense(id: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let query = supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      query = query.eq('subscriber_id', targetSubscriberId);

      const { error } = await query;
      
      if (error) {
        logSupabaseError('deleteExpense', error);
        throw new Error(error.message || 'Failed to delete expense');
      }
    });
  },

  // Logs
  async getLogs(subscriberId: string, page: number = 0, pageSize: number = 20): Promise<LogEntry[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('logs').select('*');
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (error) {
        if (error.code === '42P01') {
          const err = new Error('DATABASE_TABLES_MISSING');
          (err as any).code = '42P01';
          throw err;
        }
        logSupabaseError('getLogs', error);
        return [];
      }
      return (data || []).map(mapLogFromDB);
    });
  },

  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('logs')
        .insert([{
          ...mapLogToDB(entry),
          subscriber_id: targetSubscriberId,
          timestamp: new Date().toISOString()
        }]);

      if (error) {
        console.warn('Failed to save log entry:', error.message);
      }
      
      // Auto-cleanup old logs for this company
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase
        .from('logs')
        .delete()
        .eq('subscriber_id', targetSubscriberId)
        .lt('timestamp', thirtyDaysAgo.toISOString());
    });
  },

  // Handover Records
  async getHandoverRecords(bookingId: string, subscriberId: string): Promise<any[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('handover_records').select('*');
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
        
      if (error) {
        logSupabaseError('getHandoverRecords', error);
        return [];
      }
      return data || [];
    });
  },

  async getSignedUrls(paths: string[], bucket: string = 'handover_images'): Promise<string[]> {
    return withRetry(async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, 300); // 300 seconds = 5 minutes

      if (error) {
        logSupabaseError('getSignedUrls', error);
        throw new Error('Failed to generate signed URLs');
      }

      return data?.map(item => item.signedUrl) || [];
    });
  },

  async getSignedUrl(path: string, bucket: string = 'handover_images'): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 300); // 5 minutes

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error signing URL:', err);
      return null;
    }
  },

  // Staff Members
  async getStaffMembers(subscriberId: string): Promise<StaffMember[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      // We need to find the slug for this subscriberId (UUID)
      const { data: subData } = await supabase.from('subscribers').select('name').eq('id', subscriberId).single();
      const slug = subData?.name;

      let query = supabase.from('staff').select('*');
      if (slug) {
        query = query.eq('subscriber_id', slug);
      } else {
        // Fallback to UUID if slug not found (though unlikely)
        query = query.eq('subscriber_id', subscriberId);
      }
      
      // Try to filter by is_active, but handle cases where column might not exist yet
      const { data, error } = await query.eq('is_active', true);
      
      if (error) {
        // If the error is about the column not existing, try without the filter
        if (error.message.includes('column staff.is_active does not exist')) {
          const { data: fallbackData, error: fallbackError } = await query;
          if (fallbackError) {
            logSupabaseError('getStaffMembers (fallback)', fallbackError);
            return [];
          }
          return (fallbackData || []).map(mapStaffFromDB);
        }
        logSupabaseError('getStaffMembers', error);
        return [];
      }
      return (data || []).map(mapStaffFromDB);
    });
  },

  async getStaffMemberByUid(uid: string, subscriberId: string): Promise<StaffMember | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      // We need to find the slug for this subscriberId (UUID)
      const { data: subData } = await supabase.from('subscribers').select('name').eq('id', subscriberId).single();
      const slug = subData?.name || subscriberId;

      let query = supabase
        .from('staff')
        .select('*')
        .eq('access_id', uid)
        .eq('subscriber_id', slug)
        .eq('is_active', true);

      const { data, error } = await query.maybeSingle();

      if (error) {
        logSupabaseError('getStaffMemberByUid', error);
        return null;
      }
      return data ? mapStaffFromDB(data) : null;
    });
  },

  async getStaffMemberById(id: string, subscriberId: string): Promise<StaffMember | null> {
    validateSubscriber(subscriberId);
    
    // Check if it's a valid UUID before querying
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.warn(`Invalid UUID passed to getStaffMemberById: ${id}`);
      return null;
    }

    return withRetry(async () => {
      const { data: subData } = await supabase.from('subscribers').select('name').eq('id', subscriberId).single();
      const slug = subData?.name || subscriberId;

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', id)
        .eq('subscriber_id', slug)
        .maybeSingle();
      
      if (error) {
        logSupabaseError('getStaffMemberById', error);
        return null;
      }
      return data ? mapStaffFromDB(data) : null;
    });
  },

  async getStaffMemberByName(name: string, subscriberId: string): Promise<StaffMember | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      // We need to find the slug for this subscriberId (UUID)
      const { data: subData } = await supabase.from('subscribers').select('name').eq('id', subscriberId).single();
      const slug = subData?.name || subscriberId;

      let query = supabase
        .from('staff')
        .select('*')
        .eq('name', name)
        .eq('subscriber_id', slug)
        .eq('is_active', true);

      const { data, error } = await query.maybeSingle();

      if (error) {
        logSupabaseError('getStaffMemberByName', error);
        return null;
      }
      return data ? mapStaffFromDB(data) : null;
    });
  },

  async addStaffMember(name: string, subscriberId: string, role: 'admin' | 'staff' = 'staff', pin?: string, designatedUid?: string, commissionTierOverride: 'auto' | 'premium' | 'prestige' | 'privilege' = 'auto', commissionRate?: number): Promise<StaffMember> {
    const targetSubscriberId = await getTenantId();
    
    return withRetry(async () => {
      const uid = (designatedUid || name.toLowerCase().replace(/\s+/g, '')).trim().toLowerCase();
      const email = `${uid}@ecafleet.com`;

      // 1. Get the confirmed user ID (handles existing users too)
      const { data: confirmedId, error: rpcError } = await supabase.rpc('auto_confirm_user', { p_email: email });
      
      if (rpcError) {
        console.error('RPC Error in auto_confirm_user:', rpcError);
      }

      // 2. Insert into both tables for compatibility
      // We need the subscriber slug
      const { data: subData } = await supabase.from('subscribers').select('name').eq('id', targetSubscriberId).single();
      const slug = subData?.name || targetSubscriberId; 

      // Construct the staff record dynamically to avoid sending 'id: null'
      const staffRecord: any = { 
        name, 
        subscriber_id: slug, 
        access_id: uid,
        pin_code: pin || '1234', 
        is_active: true,
        commission_tier_override: commissionTierOverride,
        commission_rate: commissionRate
      };

      if (confirmedId) {
        staffRecord.id = confirmedId;
      }

      // Insert into the new 'staff' table (for Virtual Login)
      const { data: newStaff, error: staffError } = await supabase
        .from('staff')
        .insert([staffRecord])
        .select()
        .single();

      if (staffError) {
        logSupabaseError('addStaffMember (staff)', staffError);
        throw new Error(staffError.message || 'Failed to add staff member');
      }

      // Use the ID from the first insert (either confirmedId or database-generated)
      const finalId = newStaff.id;

      // Also insert into legacy 'staff_members' table (for FKs and RLS)
      const { error: legacyError } = await supabase
        .from('staff_members')
        .insert([{ 
          id: finalId,
          name, 
          subscriber_id: targetSubscriberId, 
          role, 
          access_id: uid,
          commission_tier_override: commissionTierOverride,
          commission_rate: commissionRate
        }]);
      
      if (legacyError) {
        console.warn('Legacy staff_members insert failed:', legacyError);
      }

      return mapStaffFromDB(newStaff);
    });
  },

  async updateStaffMember(staffId: string, subscriberId: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      // Map StaffMember updates to DB fields
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.staff_uid !== undefined) dbUpdates.access_id = updates.staff_uid;
      if (updates.pin_code !== undefined) dbUpdates.pin_code = updates.pin_code;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.commission_tier_override !== undefined) dbUpdates.commission_tier_override = updates.commission_tier_override;
      if (updates.commission_rate !== undefined) dbUpdates.commission_rate = updates.commission_rate;

      // Update 'staff' table
      const { data, error } = await supabase
        .from('staff')
        .update(dbUpdates)
        .eq('id', staffId)
        .select()
        .single();

      // Update 'staff_members' table for compatibility
      const legacyUpdates: any = {};
      if (updates.name !== undefined) legacyUpdates.name = updates.name;
      if (updates.staff_uid !== undefined) legacyUpdates.access_id = updates.staff_uid;
      if (updates.role !== undefined) legacyUpdates.role = updates.role;
      if (updates.commission_tier_override !== undefined) legacyUpdates.commission_tier_override = updates.commission_tier_override;
      if (updates.commission_rate !== undefined) legacyUpdates.commission_rate = updates.commission_rate;
      
      if (Object.keys(legacyUpdates).length > 0) {
        await supabase
          .from('staff_members')
          .update(legacyUpdates)
          .eq('id', staffId)
          .eq('subscriber_id', targetSubscriberId);
      }

      if (error) {
        logSupabaseError('updateStaffMember', error);
        throw new Error('Failed to update staff member');
      }
      return mapStaffFromDB(data);
    });
  },

  async deleteStaffMember(staffId: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: false })
        .eq('id', staffId);
      
      if (error) {
        logSupabaseError('deleteStaffMember', error);
        throw new Error('Failed to disable staff member');
      }
    });
  },

  async getSaasRevenueStats(): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('saas_revenue_dashboard')
        .select('*');
      
      if (error) {
        logSupabaseError('getSaasRevenueStats', error);
        return [];
      }
      return data || [];
    });
  },

  // Companies (Superadmin)
  async getCompanies(): Promise<Company[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        logSupabaseError('getCompanies', error);
        throw new Error(error.message || 'Failed to fetch subscribers');
      }
      return data || [];
    });
  },

  async getCompanyById(id: string): Promise<Company | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logSupabaseError('getCompanyById', error);
        return null;
      }
      return data;
    });
  },

  async updateCompany(id: string, updates: any): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('subscribers')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        logSupabaseError('updateCompany', error);
        throw new Error(error.message || 'Failed to update company');
      }
    });
  },

  async deleteCompany(id: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('subscribers')
        .delete()
        .eq('id', id);
      
      if (error) {
        logSupabaseError('deleteCompany', error);
        throw new Error(error.message || 'Failed to delete company');
      }
    });
  },

  async getCompanySettings(subscriberId: string): Promise<any> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('subscribers')
        .select('name, address, logo_url, ssm_logo_url, spdp_logo_url')
        .eq('id', subscriberId)
        .single();
      
      if (error) {
        logSupabaseError('getCompanySettings', error);
        return null;
      }
      return data;
    });
  },

  async updateCompanySettings(subscriberId: string, settings: any): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('subscribers')
        .update({
          name: settings.company_name,
          address: settings.company_address,
          logo_url: settings.company_logo_url,
          ssm_logo_url: settings.ssm_logo_url,
          spdp_logo_url: settings.spdp_logo_url
        })
        .eq('id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('updateCompanySettings', error);
        throw new Error(error.message || 'Failed to update branding settings');
      }
    });
  },

  async addCompany(name: string, tier: string, isTrial: boolean = false, expiryDate: string | null = null, manualUid?: string): Promise<Company> {
    return withRetry(async () => {
      const sanitizedName = name.toLowerCase().replace(/\s+/g, '');
      const email = `${sanitizedName}@ecafleet.com`;
      const password = `${sanitizedName}Eca123!`; // Use strong password to avoid length/complexity errors

      let userId = manualUid;

      // 1. Get the confirmed user ID (handles existing users too) if no manual UID provided
      if (!userId) {
        const { data: confirmedId, error: rpcError } = await supabase.rpc('auto_confirm_user', { p_email: email });
        if (rpcError) {
          console.error('RPC Error in auto_confirm_user:', rpcError);
          console.warn('Failed to auto-confirm user.', rpcError);
        }
        userId = confirmedId;
      }

      if (!userId) {
        throw new Error(`User account for "${email}" not found in Supabase Auth. Please create the user manually in Supabase first, or provide the UID directly.`);
      }

      // 3. Upsert into subscribers table with the new user ID
      // Using upsert handles cases where the record might partially exist from previous attempts
      const { data, error } = await supabase
        .from('subscribers')
        .upsert([{ 
          id: userId,
          name, 
          tier, 
          is_active: true, 
          status: 'ACTIVE', 
          is_trial: isTrial,
          expiry_date: expiryDate,
          subscription_start_date: new Date().toISOString()
        }], { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        logSupabaseError('addCompany', error);
        if (error.code === '23505') {
          throw new Error(`A subscriber with the name "${name}" or ID already exists.`);
        }
        throw new Error(error.message || 'Failed to add company');
      }
      return data;
    });
  },

  // Agreements
  async getAgreements(subscriberId: string, agentId?: string, createdBy?: string | string[]): Promise<Agreement[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('agreements').select('*');
      query = query.eq('subscriber_id', subscriberId);

      let resolvedAgentId = agentId;
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      if (agentId) {
        const resolvedId = await resolveAgentId(agentId);
        if (resolvedId) {
          resolvedAgentId = resolvedId;
        } else {
          // If we can't resolve it, we won't find any agreements for this agent
          resolvedAgentId = undefined;
        }
      }

      if (resolvedAgentId || createdBy) {
        const filters: string[] = [];
        
        if (resolvedAgentId && isUuid(resolvedAgentId)) {
          filters.push(`agent_id.eq.${resolvedAgentId}`);
        }
        
        if (createdBy) {
          if (Array.isArray(createdBy)) {
            createdBy.forEach(id => {
              filters.push(`created_by.eq.${id}`);
            });
          } else {
            filters.push(`created_by.eq.${createdBy}`);
          }
        }
        
        if (filters.length > 0) {
          query = query.or(filters.join(','));
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getAgreements', error);
        return [];
      }
      return data || [];
    });
  },

  async getAgreementById(id: string, subscriberId?: string | null): Promise<Agreement | null> {
    return withRetry(async () => {
      let query = supabase
        .from('agreements')
        .select('*')
        .eq('id', id);
        
      if (subscriberId) {
        query = query.eq('subscriber_id', subscriberId);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        logSupabaseError('getAgreementById', error);
        return null;
      }
      return data;
    });
  },

  async createAgreement(agreement: Omit<Agreement, 'id' | 'created_at'>, subscriberId: string): Promise<Agreement> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      let finalAgreement: any = { ...agreement };
      finalAgreement.subscriber_id = targetSubscriberId;

      // Ensure agent_id is a valid staff_member record ID, not an Auth UID
      if (finalAgreement.agent_id) {
        const resolvedId = await resolveAgentId(finalAgreement.agent_id);
        if (resolvedId) {
          finalAgreement.agent_id = resolvedId;
        } else {
          throw new Error(`Invalid agent ID: Could not resolve '${finalAgreement.agent_id}' to a valid staff member.`);
        }
      } else {
        // If no agent_id provided, try to resolve from current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const resolvedId = await resolveAgentId(user.id);
          if (resolvedId) {
            finalAgreement.agent_id = resolvedId;
          } else {
            throw new Error("Cannot create agreement: Current user is not a registered staff member.");
          }
        } else {
          throw new Error("Cannot create agreement: User not authenticated.");
        }
      }

      // Final safety check
      if (!finalAgreement.agent_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalAgreement.agent_id)) {
        throw new Error("Cannot create agreement: A valid agent ID is required.");
      }

      // Calculate commission earned based on agent's dynamic rate or tier override
      if (finalAgreement.agent_id) {
        try {
          const staffMember = await this.getStaffMemberById(finalAgreement.agent_id, targetSubscriberId);
          if (staffMember) {
            if (staffMember.commission_rate) {
              finalAgreement.commission_earned = finalAgreement.total_price * (staffMember.commission_rate / 100);
            } else if (staffMember.commission_tier_override && staffMember.commission_tier_override !== 'auto') {
              const rate = staffMember.commission_tier_override === 'premium' ? 0.20 : staffMember.commission_tier_override === 'prestige' ? 0.25 : 0.30;
              finalAgreement.commission_earned = finalAgreement.total_price * rate;
            }
          }
        } catch (err) {
          console.error('Error calculating commission for new agreement:', err);
        }
      }

      // Generate unique reference number (DDMMYY-XXXXXX)
      const date = new Date();
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded O, 0, I, 1
      let randomStr = '';
      for (let i = 0; i < 6; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      finalAgreement.reference_number = `${dd}${mm}${yy}-${randomStr}`;

      const { data, error } = await supabase
        .from('agreements')
        .insert([finalAgreement])
        .select()
        .single();
      
      if (error) {
        logSupabaseError('createAgreement', error);
        throw new Error(`Failed to create agreement: ${error.message}`);
      }
      return data;
    });
  },

  async updateAgreement(id: string, subscriberId: string | null | undefined, updates: Partial<Agreement>): Promise<void> {
    let targetSubscriberId: string | undefined;
    try {
      targetSubscriberId = await getTenantId();
    } catch (e) {
      // If not authenticated, we allow public updates (e.g., signing)
      // The RLS policies will enforce security
    }

    return withRetry(async () => {
      let finalUpdates = { ...updates };

      // Ensure agent_id is a valid UUID if provided
      if (finalUpdates.agent_id && targetSubscriberId) {
        const resolvedId = await resolveAgentId(finalUpdates.agent_id);
        if (resolvedId) {
          finalUpdates.agent_id = resolvedId;
        } else {
          throw new Error(`Invalid agent ID: Could not resolve '${finalUpdates.agent_id}' to a valid staff member.`);
        }
      }

      // Get current agreement state for logic
      let currentAgreementQuery = supabase
        .from('agreements')
        .select('*')
        .eq('id', id);
        
      if (targetSubscriberId) {
        currentAgreementQuery = currentAgreementQuery.eq('subscriber_id', targetSubscriberId);
      }
      
      const { data: currentAgreement } = await currentAgreementQuery.single();

      // STATUS LOCK LOGIC:
      // If the current status is 'signed' or 'completed', we should NOT allow it to be reset to 'pending'
      // unless it's an explicit request (which isn't the case for receipt updates).
      const currentStatus = currentAgreement?.status?.toLowerCase().trim();
      if (currentStatus === 'signed' || currentStatus === 'completed') {
        // If the update payload tries to set status to 'pending', we remove it to preserve the current state
        if (finalUpdates.status?.toLowerCase().trim() === 'pending') {
          delete finalUpdates.status;
        }
      }

      // If price or agent changes, we might need to recalculate commission
      if ((finalUpdates.total_price !== undefined || finalUpdates.agent_id !== undefined) && targetSubscriberId) {
        try {
          const agentId = finalUpdates.agent_id || currentAgreement?.agent_id;
          const totalPrice = finalUpdates.total_price !== undefined ? finalUpdates.total_price : currentAgreement?.total_price;
          
          if (agentId && totalPrice !== undefined) {
            const staffMember = await this.getStaffMemberById(agentId, targetSubscriberId);
            if (staffMember) {
              if (staffMember.commission_rate) {
                finalUpdates.commission_earned = totalPrice * (staffMember.commission_rate / 100);
              } else if (staffMember.commission_tier_override && staffMember.commission_tier_override !== 'auto') {
                const rate = staffMember.commission_tier_override === 'premium' ? 0.20 : staffMember.commission_tier_override === 'prestige' ? 0.25 : 0.30;
                finalUpdates.commission_earned = totalPrice * rate;
              }
            }
          }
        } catch (err) {
          console.error('Error recalculating commission on update:', err);
        }
      }

      // ROLLBACK & RESTORE LOGIC FOR PAYMENT RECEIPTS:
      const isRemovingReceipt = finalUpdates.payment_receipt === null || finalUpdates.payment_receipt === '';
      const isAddingReceipt = finalUpdates.payment_receipt && finalUpdates.payment_receipt !== '';

      if (isRemovingReceipt && currentStatus === 'completed') {
        // Downgrade to 'signed' if receipt is removed from a completed agreement
        finalUpdates.status = 'signed';
      } else if (isAddingReceipt && currentStatus === 'signed') {
        // If adding a receipt back to a signed agreement
        if (currentAgreement?.booking_id) {
          try {
            const { data: booking } = await supabase
              .from('bookings')
              .select('status')
              .eq('id', currentAgreement.booking_id)
              .eq('subscriber_id', targetSubscriberId || currentAgreement.subscriber_id)
              .single();
            
            if (booking?.status === 'completed') {
              finalUpdates.status = 'completed';
            }
          } catch (err) {
            console.error('Error checking booking status for agreement restore:', err);
            // Fallback: if we can't check booking, but a receipt is added, 
            // we follow the previous auto-complete logic
            finalUpdates.status = 'completed';
          }
        } else {
          // If no linked booking, mark as completed when receipt is added
          finalUpdates.status = 'completed';
        }
      }

      let query = supabase
        .from('agreements')
        .update(finalUpdates)
        .eq('id', id);
        
      if (targetSubscriberId) {
        query = query.eq('subscriber_id', targetSubscriberId);
      }
      
      const { error } = await query;
      
      if (error) {
        logSupabaseError('updateAgreement', error);
        throw new Error('Failed to update agreement');
      }
    });
  },

  async deleteAgreement(id: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('agreements')
        .delete()
        .eq('id', id)
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('deleteAgreement', error);
        throw new Error('Failed to delete agreement');
      }
    });
  },

  // Digital Forms
  async getDigitalForms(subscriberId: string, agentId?: string, createdBy?: string | string[]): Promise<DigitalForm[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('digital_forms').select('*');
      query = query.eq('subscriber_id', subscriberId);

      let resolvedAgentId = agentId;
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      if (agentId) {
        const resolvedId = await resolveAgentId(agentId);
        if (resolvedId) {
          resolvedAgentId = resolvedId;
        } else {
          // If we can't resolve it, we won't find any forms for this agent
          resolvedAgentId = undefined;
        }
      }

      if (resolvedAgentId || createdBy) {
        const filters: string[] = [];
        
        if (resolvedAgentId && isUuid(resolvedAgentId)) {
          filters.push(`agent_id.eq.${resolvedAgentId}`);
        }
        
        if (createdBy) {
          if (Array.isArray(createdBy)) {
            createdBy.forEach(id => {
              filters.push(`created_by.eq.${id}`);
            });
          } else {
            filters.push(`created_by.eq.${createdBy}`);
          }
        }
        
        if (filters.length > 0) {
          query = query.or(filters.join(','));
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getDigitalForms', error);
        return [];
      }
      return data || [];
    });
  },

  // Customers (CRM)
  async upsertCustomer(customer: { 
    full_name: string, 
    phone_number: string, 
    ic_passport: string, 
    subscriber_id: string,
    billing_address?: string,
    emergency_contact_name?: string,
    emergency_contact_relation?: string
  }): Promise<string> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      // Use ic_passport as unique identifier within the subscriber's scope
      const { data, error } = await supabase
        .from('customers')
        .upsert(
          { 
            full_name: customer.full_name, 
            phone_number: customer.phone_number, 
            ic_passport: customer.ic_passport, 
            subscriber_id: targetSubscriberId,
            billing_address: customer.billing_address,
            emergency_contact_name: customer.emergency_contact_name,
            emergency_contact_relation: customer.emergency_contact_relation
          }, 
          { onConflict: 'subscriber_id,ic_passport' }
        )
        .select('id')
        .single();

      if (error) {
        logSupabaseError('upsertCustomer', error);
        throw new Error('Failed to sync customer data to CRM');
      }
      return data.id;
    });
  },

  async getCustomerByIC(subscriberId: string, ic: string): Promise<any | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('subscriber_id', subscriberId)
        .eq('ic_passport', ic)
        .maybeSingle();
      
      if (error) {
        logSupabaseError('getCustomerByIC', error);
        return null;
      }
      return data;
    });
  },

  async getCustomersCRM(subscriberId: string): Promise<any[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('customer_crm_view')
        .select('*')
        .eq('subscriber_id', subscriberId);
      
      if (error) {
        logSupabaseError('getCustomersCRM', error);
        
        // Fallback to raw customers table if view is missing or failing
        // This ensures the CRM list is not empty even if the view has issues
        const { data: rawData, error: rawError } = await supabase
          .from('customers')
          .select('*')
          .eq('subscriber_id', subscriberId);
          
        if (rawError) {
          logSupabaseError('getCustomersCRM_fallback', rawError);
          return [];
        }
        
        // Map raw data to match the view's expected structure
        return (rawData || []).map(c => ({
          id: c.id,
          subscriber_id: c.subscriber_id,
          full_name: c.full_name,
          phone_number: c.phone_number,
          ic_passport: c.ic_passport,
          billing_address: c.billing_address,
          emergency_contact_name: c.emergency_contact_name,
          emergency_contact_relation: c.emergency_contact_relation,
          acquired_by_agent: c.acquired_by_agent,
          total_bookings: 0, // Fallback default
          last_rental_date: null, // Fallback default
          status: 'New' // Fallback default
        }));
      }
      return data || [];
    });
  },

  // Marketing Events
  async getAuditRecords(subscriberId: string): Promise<AuditRecord[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('subscriber_audit_view')
        .select('*')
        .eq('subscriber_id', subscriberId);
      
      if (error) {
        logSupabaseError('getAuditRecords', error);
        throw new Error('Failed to fetch audit records');
      }
      return data || [];
    });
  },

  async approveAuditRecord(formId: string, bookingId: string | null, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      // Update Agreement
      const { error: formError } = await supabase
        .from('agreements')
        .update({ 
          payout_status: 'approved', 
          is_receipt_verified: true,
          status: 'completed'
        })
        .eq('id', formId)
        .eq('subscriber_id', targetSubscriberId);
      
      if (formError) {
        logSupabaseError('approveAuditRecord:form', formError);
        throw new Error('Failed to approve agreement');
      }

      // Update Booking if exists
      if (bookingId) {
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ has_discrepancy: false })
          .eq('id', bookingId)
          .eq('subscriber_id', targetSubscriberId);
        
        if (bookingError) {
          logSupabaseError('approveAuditRecord:booking', bookingError);
        }
      }
    });
  },

  async approveSelectedAuditRecords(formIds: string[], subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('agreements')
        .update({ payout_status: 'approved', is_receipt_verified: true })
        .in('id', formIds)
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('approveSelectedAuditRecords', error);
        throw new Error('Failed to approve selected records');
      }
    });
  },

  async closeMonthPayouts(subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('agreements')
        .update({ payout_status: 'paid', status: 'reconciled' })
        .eq('payout_status', 'approved')
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('closeMonthPayouts', error);
        throw new Error('Failed to close month payouts');
      }
    });
  },

  async getPayoutHistory(subscriberId: string): Promise<PayoutHistory[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('payout_history')
        .select('*')
        .eq('subscriber_id', subscriberId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getPayoutHistory', error);
        return [];
      }
      return data || [];
    });
  },

  async processMonthlyPayout(subscriberId: string, monthYear: string, records: AuditRecord[]): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      if (records.length === 0) return;

      const totalAmount = records.reduce((sum, r) => sum + (r.commission_earned || 0), 0);
      
      // Group by agent
      const agentMap = new Map<string, { agent_id: string, agent_name: string, total_bookings: number, total_revenue: number, payout_due: number }>();
      
      records.forEach(r => {
        const existing = agentMap.get(r.agent_id) || {
          agent_id: r.agent_id,
          agent_name: r.agent_name,
          total_bookings: 0,
          total_revenue: 0,
          payout_due: 0
        };
        
        existing.total_bookings += 1;
        existing.total_revenue += (r.form_price || 0);
        existing.payout_due += (r.commission_earned || 0);
        
        agentMap.set(r.agent_id, existing);
      });

      const breakdown = Array.from(agentMap.values());

      // 1. Create payout history record
      const { error: historyError } = await supabase
        .from('payout_history')
        .insert({
          subscriber_id: targetSubscriberId,
          total_amount: totalAmount,
          month_year: monthYear,
          breakdown: breakdown,
          payout_date: new Date().toISOString()
        });

      if (historyError) {
        logSupabaseError('processMonthlyPayout:history', historyError);
        throw new Error('Failed to create payout history');
      }

      // 2. Update agreements to reconciled
      const formIds = records.map(r => r.form_id);
      const { error: updateError } = await supabase
        .from('agreements')
        .update({ status: 'reconciled', payout_status: 'paid' })
        .in('id', formIds)
        .eq('subscriber_id', targetSubscriberId);

      if (updateError) {
        logSupabaseError('processMonthlyPayout:update', updateError);
        throw new Error('Failed to update agreements to reconciled');
      }
    });
  },

  async getMarketingEvents(subscriberId: string): Promise<MarketingEvent[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('marketing_events')
        .select('*')
        .eq('subscriber_id', subscriberId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getMarketingEvents', error);
        return [];
      }
      return data || [];
    });
  },

  async addMarketingEvent(event: Omit<MarketingEvent, 'id' | 'created_at' | 'subscriber_id'>, subscriberId: string): Promise<MarketingEvent> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('marketing_events')
        .insert([{ ...event, subscriber_id: targetSubscriberId }])
        .select()
        .single();
      
      if (error) {
        logSupabaseError('addMarketingEvent', error);
        throw new Error('Failed to add marketing event');
      }
      return data;
    });
  },

  async deleteMarketingEvent(id: string, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      const { error } = await supabase
        .from('marketing_events')
        .delete()
        .eq('id', id)
        .eq('subscriber_id', targetSubscriberId);
      
      if (error) {
        logSupabaseError('deleteMarketingEvent', error);
        throw new Error('Failed to delete marketing event');
      }
    });
  }
};
