
import { Booking, Car, Member, LogEntry, Expense, StaffMember, Agreement, DigitalForm } from '../types';
import { supabase } from './supabase';

// Service for managing fleet data
const logSupabaseError = (context: string, error: any) => {
  if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
    // Extract table name from error message if possible, otherwise use context
    const tableNameMatch = error.message?.match(/relation "public\.(.*?)" does not exist/);
    const tableName = tableNameMatch ? tableNameMatch[1] : context;
    console.error(`Supabase Schema Error: The table '${tableName}' does not exist in your database. Please run the SQL schema in your Supabase SQL Editor.`);
  } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
    console.error(`Supabase Network Error [${context}]: Could not connect to the server. This often happens if the Supabase project is paused or there is a network restriction.`);
  } else {
    console.error(`Supabase Error [${context}]:`, JSON.stringify(error, null, 2));
  }
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isNetworkError = error.message?.includes('Failed to fetch') || 
                          error.name === 'TypeError' || 
                          error.message?.includes('NetworkError');
    
    if (retries > 0 && isNetworkError) {
      console.warn(`Supabase Network Retry: ${retries} attempts remaining...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

export const apiService = {
  // Cars
  async getCars(companyId: string): Promise<Car[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('getCars', error);
        if (error.code === '42P01' || error.message?.includes('cache')) {
          const err = new Error('DATABASE_TABLES_MISSING');
          (err as any).code = '42P01';
          throw err;
        }
        throw new Error(error.message || 'Failed to fetch cars');
      }
      return data || [];
    });
  },

  async addCar(car: Omit<Car, 'id'>, companyId: string): Promise<Car> {
    return withRetry(async () => {
      // Strict RLS Check: Retrieve current user and verify ID match
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Authentication required: No active session found.');
      }
      
      if (user.id !== companyId) {
        throw new Error(`RLS Violation: Company ID (${companyId}) does not match Auth ID (${user.id}).`);
      }

      const { data, error } = await supabase
        .from('cars')
        .insert([{ ...car, company_id: companyId }])
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
      
      return data[0];
    });
  },

  async deleteCar(id: string, companyId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('deleteCar', error);
        throw new Error(error.message || 'Failed to delete car');
      }
    });
  },

  // Members
  async getMembers(companyId: string): Promise<Member[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('getMembers', error);
        return []; 
      }
      return data || [];
    });
  },

  async addMember(member: Omit<Member, 'id'>, companyId: string): Promise<Member> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('members')
        .insert([{ ...member, company_id: companyId }])
        .select();

      if (error) {
        logSupabaseError('addMember', error);
        throw new Error(error.message || 'Failed to add member');
      }
      return data?.[0];
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
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('company_id', companyId);
      
      if (startDate && endDate) {
        // Fetch bookings that start or end within the range, or overlap it
        // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
        // Since we can't easily do complex ORs, we'll fetch bookings that start within a reasonable buffer
        // or just fetch based on start time for the calendar view.
        // A safe bet for a calendar view is to fetch bookings starting >= (ViewStart - MaxDuration)
        // Let's assume max duration is 60 days for safety.
        const bufferDate = new Date(startDate);
        bufferDate.setDate(bufferDate.getDate() - 60);
        
        query = query.gte('start', bufferDate.toISOString());
        // We don't strictly filter the end date to ensure we get long bookings
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
      return data || [];
    });
  },

  async checkBookingConflict(booking: { carId: string, start: string, duration: number }, companyId: string, excludeBookingId?: string): Promise<boolean> {
    const startTime = new Date(booking.start);
    const endTime = new Date(startTime.getTime() + booking.duration * 24 * 60 * 60 * 1000);
    
    // Overlap: (StartA <= EndB) and (EndA >= StartB)
    // We check if there are any bookings where:
    // Existing.start <= New.end AND Existing.end >= New.start
    
    // Note: 'end_time' column might not exist if it wasn't added to the schema.
    // If 'end_time' doesn't exist, we can't do server-side check easily without a function.
    // Assuming 'end_time' exists or we calculate it. 
    // If not, we fall back to client-side or fetch all for that car.
    // Let's assume we can query by start time at least.
    
    // Optimized: Fetch only bookings for this car that might overlap
    const bufferStart = new Date(startTime);
    bufferStart.setDate(bufferStart.getDate() - 60); // Look back 60 days
    
    let query = supabase
      .from('bookings')
      .select('start, duration, id')
      .eq('company_id', companyId)
      .eq('carId', booking.carId)
      .gte('start', bufferStart.toISOString());
      
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    
    if (error || !data) return false; // Fail open or handle error
    
    // Client-side check on the reduced dataset
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
      // Strict RLS Check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== companyId) {
         throw new Error('Security Violation: Company ID mismatch.');
      }

      if (id) {
        const { data, error } = await supabase
          .from('bookings')
          .update({ ...booking, company_id: companyId }) // Ensure company_id is preserved/set
          .eq('id', id)
          .eq('company_id', companyId)
          .select();
        
        if (error) {
          logSupabaseError('updateBooking', error);
          throw new Error(error.message || 'Failed to update booking');
        }
        if (!data || data.length === 0) throw new Error('Update failed');
        return data[0];
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .insert([{ ...booking, company_id: companyId }])
          .select();
        
        if (error) {
          logSupabaseError('insertBooking', error);
          throw new Error(error.message || 'Failed to create booking');
        }
        if (!data || data.length === 0) throw new Error('Insert failed');
        return data[0];
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
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
           const err = new Error('DATABASE_TABLES_MISSING');
           (err as any).code = '42P01';
           throw err;
        }
        logSupabaseError('getExpenses', error);
        return [];
      }
      return data || [];
    });
  },

  async addExpense(expense: Omit<Expense, 'id'>, companyId: string): Promise<Expense> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...expense, company_id: companyId }])
        .select();

      if (error) {
        logSupabaseError('addExpense', error);
        throw new Error(error.message || 'Failed to add expense');
      }
      return data?.[0];
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

      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('company_id', companyId)
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
      return data || [];
    });
  },

  async addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>, companyId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('logs')
        .insert([{
          userId: entry.userId,
          staff_name: entry.staff_name, // Map to snake_case column
          action: entry.action,
          details: entry.details,
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
      const { data, error } = await supabase
        .from('handover_records')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('company_id', companyId)
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
  async getStaffMembers(companyId: string): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) {
        logSupabaseError('getStaffMembers', error);
        return [];
      }
      return data || [];
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
      return data;
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
      return data;
    });
  },

  async updateStaffMember(staffId: string, companyId: string, updates: Partial<StaffMember>): Promise<StaffMember> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .update(updates)
        .eq('id', staffId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        logSupabaseError('updateStaffMember', error);
        throw new Error('Failed to update staff member');
      }
      return data;
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
  async getCompanies(): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .neq('id', 'superadmin')
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

  // Agreements
  async getAgreements(companyId: string): Promise<Agreement[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('agreements')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getAgreements', error);
        return [];
      }
      return data || [];
    });
  },

  // Digital Forms
  async getDigitalForms(companyId: string): Promise<DigitalForm[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('digital_forms')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logSupabaseError('getDigitalForms', error);
        return [];
      }
      return data || [];
    });
  }
};
