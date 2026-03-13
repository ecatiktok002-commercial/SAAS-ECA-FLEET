
import { Booking, Car, Member, LogEntry, Expense, StaffMember, Agreement, DigitalForm, Company } from '../types';
import { supabase } from './supabase';

// Service for managing fleet data
const logSupabaseError = (context: string, error: any) => {
  const isNetworkError = error.message?.includes('Failed to fetch') || 
                        error.name === 'TypeError' || 
                        error.message?.includes('NetworkError') ||
                        !window.navigator.onLine;

  const isSchemaError = error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache');

  if (isSchemaError) {
    // Flexible regex to catch "relation 'cars' does not exist" or "relation 'public.cars' does not exist"
    // Handles both double quotes and single quotes which can vary by Postgres version/driver
    const tableNameMatch = error.message?.match(/relation ["'](?:public\.)?(.*?)["'] does not exist/i);
    const tableName = tableNameMatch ? tableNameMatch[1] : null;
    
    if (tableName) {
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

const mapCarToDB = (car: any) => ({
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
});

const mapBookingFromDB = (dbBooking: any): Booking => ({
  id: dbBooking.id,
  carId: dbBooking.car_id,
  memberId: dbBooking.member_id,
  start: dbBooking.start,
  duration: dbBooking.duration,
  status: dbBooking.status,
  total_price: dbBooking.total_price
});

const mapBookingToDB = (booking: any) => ({
  car_id: booking.carId || booking.car_id,
  member_id: booking.memberId || booking.member_id,
  start: booking.start,
  duration: booking.duration,
  status: booking.status,
  total_price: booking.total_price
});

const mapMemberFromDB = (dbMember: any): Member => ({
  id: dbMember.id,
  name: dbMember.name,
  color: dbMember.color,
  email: dbMember.email,
  phone: dbMember.phone
});

const mapMemberToDB = (member: any) => ({
  name: member.name,
  color: member.color,
  email: member.email,
  phone: member.phone
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
  notes: dbExpense.notes
});

const mapExpenseToDB = (expense: any) => ({
  car_id: expense.carId || expense.car_id,
  category: expense.category,
  amount: expense.amount,
  date: expense.date,
  notes: expense.notes
});

const mapStaffFromDB = (dbStaff: any): StaffMember => ({
  id: dbStaff.id,
  name: dbStaff.name,
  pin_hash: dbStaff.pin_hash,
  role: dbStaff.role,
  created_at: dbStaff.created_at
});

const mapStaffToDB = (staff: any) => ({
  name: staff.name,
  pin_hash: staff.pin_hash,
  role: staff.role
});

export const apiService = {
  // Cars
  async getCars(companyId: string): Promise<Car[]> {
    return withRetry(async () => {
      let query = supabase.from('cars').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

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

  async addCar(car: Omit<Car, 'id'>, companyId: string): Promise<Car> {
    return withRetry(async () => {
      let targetCompanyId = companyId;
      
      // If superadmin, we must use the actual auth UID for the DB record
      if (companyId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetCompanyId = user.id;
      }

      const { data, error } = await supabase
        .from('cars')
        .insert([{ ...mapCarToDB(car), company_id: targetCompanyId }])
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

  async updateCar(car: Partial<Car>, companyId: string): Promise<Car> {
    return withRetry(async () => {
      let query = supabase
        .from('cars')
        .update(mapCarToDB(car))
        .eq('id', car.id);
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

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

  async saveCars(cars: Car[], companyId: string): Promise<void> {
    return withRetry(async () => {
      let targetCompanyId = companyId;
      
      if (companyId === 'superadmin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) targetCompanyId = user.id;
      }

      // Delete all existing cars for this company
      await supabase.from('cars').delete().eq('company_id', targetCompanyId);
      
      // Insert new ones
      const carsToInsert = cars.map(c => ({
        ...mapCarToDB(c),
        company_id: targetCompanyId
      }));
      
      const { error } = await supabase.from('cars').insert(carsToInsert);
      if (error) {
        logSupabaseError('saveCars', error);
        throw new Error(error.message || 'Failed to save cars');
      }
    });
  },

  async deleteCar(id: string, companyId: string): Promise<void> {
    return withRetry(async () => {
      let query = supabase
        .from('cars')
        .delete()
        .eq('id', id);
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

      const { error } = await query;
      
      if (error) {
        logSupabaseError('deleteCar', error);
        throw new Error(error.message || 'Failed to delete car');
      }
    });
  },

  // Members
  async getMembers(companyId: string): Promise<Member[]> {
    return withRetry(async () => {
      let query = supabase.from('members').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      
      if (error) {
        logSupabaseError('getMembers', error);
        return []; 
      }
      return (data || []).map(mapMemberFromDB);
    });
  },

  async addMember(member: Omit<Member, 'id'>, companyId: string): Promise<Member> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('members')
        .insert([{ ...mapMemberToDB(member), company_id: companyId }])
        .select();

      if (error) {
        logSupabaseError('addMember', error);
        throw new Error(error.message || 'Failed to add member');
      }
      return mapMemberFromDB(data?.[0]);
    });
  },

  async deleteMember(id: string, companyId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('deleteMember', error);
        throw new Error(error.message || 'Failed to delete member');
      }
    });
  },

  // Bookings
  async getBookings(companyId: string, startDate?: string, endDate?: string): Promise<Booking[]> {
    return withRetry(async () => {
      let query = supabase.from('bookings').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
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

  async checkBookingConflict(booking: { carId: string, start: string, duration: number }, companyId: string, excludeBookingId?: string): Promise<boolean> {
    const startTime = new Date(booking.start);
    const endTime = new Date(startTime.getTime() + booking.duration * 24 * 60 * 60 * 1000);
    
    const bufferStart = new Date(startTime);
    bufferStart.setDate(bufferStart.getDate() - 60); // Look back 60 days
    
    let query = supabase
      .from('bookings')
      .select('start, duration, id')
      .eq('company_id', companyId)
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

  async saveBooking(booking: Omit<Booking, 'id'>, companyId: string, id?: string): Promise<Booking> {
    return withRetry(async () => {
      if (id) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ ...mapBookingToDB(booking), company_id: companyId })
          .eq('id', id)
          .eq('company_id', companyId)
          .select();
        
        if (error) {
          logSupabaseError('updateBooking', error);
          throw new Error(error.message || 'Failed to update booking');
        }
        if (!data || data.length === 0) throw new Error('Update failed');
        return mapBookingFromDB(data[0]);
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .insert([{ ...mapBookingToDB(booking), company_id: companyId }])
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

  async deleteBooking(id: string, companyId: string): Promise<void> {
    return withRetry(async () => {
      // 1. Fetch all handover records for this booking to get photo URLs
      const { data: handoverRecords, error: fetchError } = await supabase
        .from('handover_records')
        .select('photos_url')
        .eq('booking_id', id)
        .eq('company_id', companyId);

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
          .eq('company_id', companyId);

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
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('deleteBooking', error);
        throw new Error(error.message || 'Failed to delete booking');
      }
    });
  },

  // Expenses
  async getExpenses(companyId: string): Promise<Expense[]> {
    return withRetry(async () => {
      let query = supabase.from('expenses').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
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

  async addExpense(expense: Omit<Expense, 'id'>, companyId: string): Promise<Expense> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...mapExpenseToDB(expense), company_id: companyId }])
        .select();

      if (error) {
        logSupabaseError('addExpense', error);
        throw new Error(error.message || 'Failed to add expense');
      }
      return mapExpenseFromDB(data?.[0]);
    });
  },

  async deleteExpense(id: string, companyId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('deleteExpense', error);
        throw new Error(error.message || 'Failed to delete expense');
      }
    });
  },

  // Logs
  async getLogs(companyId: string, page: number = 0, pageSize: number = 20): Promise<LogEntry[]> {
    return withRetry(async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('logs').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

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

  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>, companyId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('logs')
        .insert([{
          ...mapLogToDB(entry),
          company_id: companyId,
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
        .eq('company_id', companyId)
        .lt('timestamp', thirtyDaysAgo.toISOString());
    });
  },

  // Handover Records
  async getHandoverRecords(bookingId: string, companyId: string): Promise<any[]> {
    return withRetry(async () => {
      let query = supabase.from('handover_records').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

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
  async getStaffMembers(companyId: string): Promise<StaffMember[]> {
    return withRetry(async () => {
      let query = supabase.from('staff_members').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      
      if (error) {
        logSupabaseError('getStaffMembers', error);
        return [];
      }
      return (data || []).map(mapStaffFromDB);
    });
  },

  async getStaffMemberByName(name: string, companyId: string): Promise<StaffMember | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('name', name)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        logSupabaseError('getStaffMemberByName', error);
        return null;
      }
      return mapStaffFromDB(data);
    });
  },

  async addStaffMember(name: string, companyId: string, role: 'admin' | 'staff' = 'staff', pinHash?: string): Promise<StaffMember> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .insert([{ name, company_id: companyId, role, pin_hash: pinHash }])
        .select()
        .single();

      if (error) {
        logSupabaseError('addStaffMember', error);
        throw new Error(error.message || 'Failed to add staff member');
      }
      return mapStaffFromDB(data);
    });
  },

  async updateStaffMember(staffId: string, companyId: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .update(mapStaffToDB(updates))
        .eq('id', staffId)
        .eq('company_id', companyId)
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

  async deleteStaffMember(staffId: string, companyId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', staffId)
        .eq('company_id', companyId);

      if (error) {
        logSupabaseError('deleteStaffMember', error);
        throw new Error('Failed to delete staff member');
      }
    });
  },

  // Companies (Superadmin)
  async getCompanies(): Promise<Company[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        logSupabaseError('getCompanies', error);
        throw new Error(error.message || 'Failed to fetch companies');
      }
      return data || [];
    });
  },

  async updateCompany(id: string, updates: any): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        logSupabaseError('updateCompany', error);
        throw new Error(error.message || 'Failed to update company');
      }
    });
  },

  async addCompany(name: string, tier: string): Promise<Company> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('companies')
        .insert([{ name, tier, is_active: true }])
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
  async getAgreements(companyId: string): Promise<Agreement[]> {
    return withRetry(async () => {
      let query = supabase.from('agreements').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getAgreements', error);
        return [];
      }
      return data || [];
    });
  },

  async getAgreementById(id: string): Promise<Agreement | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('agreements')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logSupabaseError('getAgreementById', error);
        return null;
      }
      return data;
    });
  },

  async createAgreement(agreement: Omit<Agreement, 'id' | 'created_at'>): Promise<Agreement> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('agreements')
        .insert([agreement])
        .select()
        .single();
      
      if (error) {
        logSupabaseError('createAgreement', error);
        throw new Error('Failed to create agreement');
      }
      return data;
    });
  },

  async updateAgreement(id: string, updates: Partial<Agreement>): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('agreements')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        logSupabaseError('updateAgreement', error);
        throw new Error('Failed to update agreement');
      }
    });
  },

  async deleteAgreement(id: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('agreements')
        .delete()
        .eq('id', id);
      
      if (error) {
        logSupabaseError('deleteAgreement', error);
        throw new Error('Failed to delete agreement');
      }
    });
  },

  // Digital Forms
  async getDigitalForms(companyId: string): Promise<DigitalForm[]> {
    return withRetry(async () => {
      let query = supabase.from('digital_forms').select('*');
      
      if (companyId !== 'superadmin') {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getDigitalForms', error);
        return [];
      }
      return data || [];
    });
  }
};
