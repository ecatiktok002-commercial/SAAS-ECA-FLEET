
import { Booking, Car, Member, LogEntry, Expense, StaffMember, Agreement, DigitalForm, Company } from '../types';
import { supabase } from './supabase';

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

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
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

const mapBookingFromDB = (dbBooking: any): Booking => ({
  id: dbBooking.id,
  carId: dbBooking.car_id,
  memberId: dbBooking.member_id,
  agent_id: dbBooking.agent_id,
  start: dbBooking.start,
  duration: dbBooking.duration,
  status: dbBooking.status,
  total_price: dbBooking.total_price,
  created_by: dbBooking.created_by
});

const mapBookingToDB = (booking: any) => ({
  car_id: booking.carId || booking.car_id,
  member_id: booking.memberId || booking.member_id,
  agent_id: booking.agent_id,
  start: booking.start,
  duration: booking.duration,
  status: booking.status,
  total_price: booking.total_price,
  created_by: booking.created_by
});

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
  carId: dbExpense.car_id,
  category: dbExpense.category,
  amount: dbExpense.amount,
  date: dbExpense.date,
  notes: dbExpense.notes,
  created_by: dbExpense.created_by
});

const mapExpenseToDB = (expense: any) => ({
  car_id: expense.carId || expense.car_id,
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
  designated_uid: dbStaff.designated_uid,
  pin_hash: dbStaff.pin_hash,
  role: dbStaff.role,
  created_at: dbStaff.created_at
});

const mapStaffToDB = (staff: any) => {
  const db: any = {};
  if (staff.name !== undefined) db.name = staff.name;
  if (staff.designated_uid !== undefined) db.designated_uid = staff.designated_uid;
  if (staff.pin_hash !== undefined) db.pin_hash = staff.pin_hash;
  if (staff.role !== undefined) db.role = staff.role;
  return db;
};

export const apiService = {
  // Cars
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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let targetSubscriberId = subscriberId;
      
      // If superadmin, we must use the actual auth UID for the DB record
      if (subscriberId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetSubscriberId = user.id;
      }

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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('cars')
        .update(mapCarToDB(car))
        .eq('id', car.id);
      
      query = query.eq('subscriber_id', subscriberId);

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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      // Delete all existing cars for this company
      await supabase.from('cars').delete().eq('subscriber_id', subscriberId);
      
      // Insert new ones
      const carsToInsert = cars.map(c => ({
        ...mapCarToDB(c),
        subscriber_id: subscriberId
      }));
      
      const { error } = await supabase.from('cars').insert(carsToInsert);
      if (error) {
        logSupabaseError('saveCars', error);
        throw new Error(error.message || 'Failed to save cars');
      }
    });
  },

  async deleteCar(id: string, subscriberId: string): Promise<void> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('cars')
        .delete()
        .eq('id', id);
      
      query = query.eq('subscriber_id', subscriberId);

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
        query = query.eq('staff_id', staffId);
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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let targetSubscriberId = subscriberId;
      if (subscriberId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetSubscriberId = user.id;
      }

      const { data, error } = await supabase
        .from('members')
        .insert([{ ...mapMemberToDB(member), subscriber_id: targetSubscriberId }])
        .select();

      if (error) {
        logSupabaseError('addMember', error);
        throw new Error(error.message || 'Failed to add member');
      }
      return mapMemberFromDB(data?.[0]);
    });
  },

  async deleteMember(id: string, subscriberId: string): Promise<void> {
    validateSubscriber(subscriberId);
    let query = supabase
      .from('members')
      .delete()
      .eq('id', id);
    
    if (subscriberId !== 'superadmin') {
      query = query.eq('subscriber_id', subscriberId);
    }

    const { error } = await query;
    
    if (error) {
      logSupabaseError('deleteMember', error);
      throw new Error(error.message || 'Failed to delete member');
    }
  },

  async updateMember(id: string, subscriberId: string, updates: Partial<Member>): Promise<Member> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('members')
        .update(mapMemberToDB(updates))
        .eq('id', id);
      
      query = query.eq('subscriber_id', subscriberId);

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
  async getBookings(subscriberId: string, startDate?: string, endDate?: string, agentId?: string, createdBy?: string): Promise<Booking[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('bookings').select('*');
      query = query.eq('subscriber_id', subscriberId);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }
      
      if (startDate && endDate) {
        const bufferDate = new Date(startDate);
        bufferDate.setDate(bufferDate.getDate() - 60);
        
        query = query.gte('start', bufferDate.toISOString());
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

  async checkBookingConflict(booking: { carId: string, start: string, duration: number }, subscriberId: string, excludeBookingId?: string): Promise<boolean> {
    validateSubscriber(subscriberId);
    const startTime = new Date(booking.start);
    const endTime = new Date(startTime.getTime() + booking.duration * 24 * 60 * 60 * 1000);
    
    const bufferStart = new Date(startTime);
    bufferStart.setDate(bufferStart.getDate() - 60); // Look back 60 days
    
    let query = supabase
      .from('bookings')
      .select('start, duration, id')
      .eq('subscriber_id', subscriberId)
      .eq('car_id', booking.carId)
      .gte('start', bufferStart.toISOString());
      
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    
    if (error || !data) return false; 
    
    const newStart = startTime.getTime();
    const newEnd = endTime.getTime();
    
    return data.some(b => {
      const bStart = new Date(b.start).getTime();
      const bEnd = bStart + (b.duration * 24 * 60 * 60 * 1000);
      return (bStart < newEnd && bEnd > newStart);
    });
  },

  async saveBooking(booking: Omit<Booking, 'id'>, subscriberId: string, id?: string): Promise<Booking> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      if (id) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ ...mapBookingToDB(booking), subscriber_id: subscriberId })
          .eq('id', id)
          .eq('subscriber_id', subscriberId)
          .select();
        
        if (error) {
          logSupabaseError('updateBooking', error);
          throw new Error(error.message || 'Failed to update booking');
        }
        if (!data || data.length === 0) throw new Error('Update failed');
        return mapBookingFromDB(data[0]);
      } else {
        // For new bookings, ensure agent_id is set
        let finalBooking = { ...booking };
        if (!finalBooking.agent_id) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) finalBooking.agent_id = user.id;
        }

        const { data, error } = await supabase
          .from('bookings')
          .insert([{ ...mapBookingToDB(finalBooking), subscriber_id: subscriberId }])
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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      // 1. Fetch all handover records for this booking to get photo URLs
      const { data: handoverRecords, error: fetchError } = await supabase
        .from('handover_records')
        .select('photos_url')
        .eq('booking_id', id)
        .eq('subscriber_id', subscriberId);

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
          .eq('subscriber_id', subscriberId);

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
        .eq('subscriber_id', subscriberId);
      
      if (error) {
        logSupabaseError('deleteBooking', error);
        throw new Error(error.message || 'Failed to delete booking');
      }
    });
  },

  // Expenses
  async getExpenses(subscriberId: string, createdBy?: string): Promise<Expense[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('expenses').select('*');
      query = query.eq('subscriber_id', subscriberId);

      if (createdBy) {
        query = query.eq('created_by', createdBy);
      }

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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let targetSubscriberId = subscriberId;
      if (subscriberId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetSubscriberId = user.id;
      }

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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      query = query.eq('subscriber_id', subscriberId);

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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let targetSubscriberId = subscriberId;
      if (subscriberId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetSubscriberId = user.id;
      }

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
      let query = supabase.from('staff_members').select('*');
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query;
      
      if (error) {
        logSupabaseError('getStaffMembers', error);
        return [];
      }
      return (data || []).map(mapStaffFromDB);
    });
  },

  async getStaffMemberByUid(uid: string, subscriberId: string): Promise<StaffMember | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('staff_members')
        .select('*')
        .eq('designated_uid', uid);

      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        logSupabaseError('getStaffMemberByUid', error);
        return null;
      }
      return mapStaffFromDB(data);
    });
  },

  async getStaffMemberByName(name: string, subscriberId: string): Promise<StaffMember | null> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('staff_members')
        .select('*')
        .eq('name', name);

      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query.maybeSingle();

      if (error) {
        logSupabaseError('getStaffMemberByName', error);
        return null;
      }
      return data ? mapStaffFromDB(data) : null;
    });
  },

  async addStaffMember(name: string, subscriberId: string, role: 'admin' | 'staff' = 'staff', pinHash?: string, designatedUid?: string): Promise<StaffMember> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let targetSubscriberId = subscriberId;
      if (subscriberId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetSubscriberId = user.id;
      }

      const { data, error } = await supabase
        .from('staff_members')
        .insert([{ 
          name, 
          subscriber_id: targetSubscriberId, 
          role, 
          pin_hash: pinHash,
          designated_uid: designatedUid || name.toLowerCase().replace(/\s+/g, '')
        }])
        .select()
        .single();

      if (error) {
        logSupabaseError('addStaffMember', error);
        throw new Error(error.message || 'Failed to add staff member');
      }
      return mapStaffFromDB(data);
    });
  },

  async updateStaffMember(staffId: string, subscriberId: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('staff_members')
        .update(mapStaffToDB(updates))
        .eq('id', staffId);
      
      query = query.eq('subscriber_id', subscriberId);

      const { data, error } = await query
        .select()
        .single();

      if (error) {
        logSupabaseError('updateStaffMember', error);
        throw new Error('Failed to update staff member');
      }
      return mapStaffFromDB(data);
    });
  },

  async updateStaffPin(staffId: string, pinHash: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('staff_members')
        .update({ pin_hash: pinHash })
        .eq('id', staffId);

      if (error) {
        logSupabaseError('updateStaffPin', error);
        throw new Error('Failed to update PIN');
      }
    });
  },

  async deleteStaffMember(staffId: string, subscriberId: string): Promise<void> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase
        .from('staff_members')
        .delete()
        .eq('id', staffId);
      
      query = query.eq('subscriber_id', subscriberId);

      const { error, count } = await query.select();

      if (error) {
        logSupabaseError('deleteStaffMember', error);
        throw new Error(`Failed to delete staff member: ${error.message}`);
      }
      
      if (count === 0) {
        console.warn(`No staff member found with ID ${staffId} for subscriber ${subscriberId}`);
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
        .eq('id', subscriberId);
      
      if (error) {
        logSupabaseError('updateCompanySettings', error);
        throw new Error(error.message || 'Failed to update branding settings');
      }
    });
  },

  async addCompany(name: string, tier: string, isTrial: boolean = false, expiryDate: string | null = null): Promise<Company> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{ 
          name, 
          tier, 
          is_active: true, 
          status: 'ACTIVE', 
          is_trial: isTrial,
          expiry_date: expiryDate,
          subscription_start_date: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        logSupabaseError('addCompany', error);
        throw new Error(error.message || 'Failed to add company');
      }
      return data;
    });
  },

  // Agreements
  async getAgreements(subscriberId: string, agentId?: string, createdBy?: string): Promise<Agreement[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('agreements').select('*');
      query = query.eq('subscriber_id', subscriberId);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      if (createdBy) {
        query = query.eq('created_by', createdBy);
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
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let finalAgreement = { ...agreement };
      if (subscriberId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) finalAgreement.subscriber_id = user.id;
      } else {
        finalAgreement.subscriber_id = subscriberId;
      }

      const { data, error } = await supabase
        .from('agreements')
        .insert([finalAgreement])
        .select()
        .single();
      
      if (error) {
        logSupabaseError('createAgreement', error);
        throw new Error('Failed to create agreement');
      }
      return data;
    });
  },

  async updateAgreement(id: string, subscriberId: string | null | undefined, updates: Partial<Agreement>): Promise<void> {
    return withRetry(async () => {
      let query = supabase
        .from('agreements')
        .update(updates)
        .eq('id', id);
        
      if (subscriberId) {
        query = query.eq('subscriber_id', subscriberId);
      }
      
      const { error } = await query;
      
      if (error) {
        logSupabaseError('updateAgreement', error);
        throw new Error('Failed to update agreement');
      }
    });
  },

  async deleteAgreement(id: string, subscriberId: string): Promise<void> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { error } = await supabase
        .from('agreements')
        .delete()
        .eq('id', id)
        .eq('subscriber_id', subscriberId);
      
      if (error) {
        logSupabaseError('deleteAgreement', error);
        throw new Error('Failed to delete agreement');
      }
    });
  },

  // Digital Forms
  async getDigitalForms(subscriberId: string, agentId?: string, createdBy?: string): Promise<DigitalForm[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      let query = supabase.from('digital_forms').select('*');
      query = query.eq('subscriber_id', subscriberId);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }
      if (createdBy) {
        query = query.eq('created_by', createdBy);
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
  async getCustomersCRM(subscriberId: string): Promise<any[]> {
    validateSubscriber(subscriberId);
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('customer_crm_view')
        .select('*')
        .eq('subscriber_id', subscriberId);
      
      if (error) {
        logSupabaseError('getCustomersCRM', error);
        return [];
      }
      return data || [];
    });
  }
};
