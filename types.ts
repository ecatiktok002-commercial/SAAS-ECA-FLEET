
export interface Car {
  id: string;
  name: string;
  type: 'Economy' | 'Luxury' | 'SUV' | 'Electric';
  plate: string;
  status?: 'active' | 'maintenance' | 'inactive';
}

// Updated Member interface for Fleet Management
export interface Member {
  id: string;
  name: string;
  color: string; // Tailwind class like 'bg-blue-500'
  email?: string;
  phone?: string;
}

export interface Booking {
  id: string;
  carId: string;
  memberId: string; // Link to Member
  start: string; // ISO string
  duration: number; // in days
  track?: number; // assigned vertical slot
  status?: 'active' | 'completed' | 'cancelled';
  total_price?: number;
}

export interface Expense {
  id: string;
  carId: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface DayData {
  date: Date;
  bookings: Booking[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface LogEntry {
  id: string;
  userId: string;
  staff_name?: string; // Name of the actual staff member performing the action
  action: 'Created' | 'Updated' | 'Deleted';
  details: string;
  timestamp: string;
}

export interface StaffMember {
  id: string;
  name: string;
  pin_hash?: string; // Hashed PIN
  role?: 'admin' | 'staff';
  created_at?: string;
}
