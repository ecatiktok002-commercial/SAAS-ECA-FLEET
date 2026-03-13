
export interface Car {
  id: string;
  name: string;
  type: 'Economy' | 'Luxury' | 'SUV' | 'Electric';
  plate: string;
  status?: 'active' | 'maintenance' | 'inactive';
  // Fleet Guardian properties
  plateNumber?: string;
  make?: string;
  model?: string;
  roadtaxExpiry?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
}

export interface ExpiryStatus {
  type: 'roadtax' | 'insurance' | 'inspection';
  daysRemaining: number;
  status: 'good' | 'warning' | 'expired';
  date: string;
}

export interface CarStatus {
  roadtax: ExpiryStatus;
  insurance: ExpiryStatus;
  inspection: ExpiryStatus;
}

// Updated Member interface for Fleet Management
export interface Member {
  id: string;
  name: string;
  color: string; // Tailwind class like 'bg-blue-500'
  email?: string;
  phone?: string;
  identity_number?: string;
  billing_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  staff_id?: string;
}

export interface Booking {
  id: string;
  carId: string;
  memberId: string; // Link to Member
  agent_id?: string; // The staff member who created it
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
  company_id: string;
  name: string;
  designated_uid: string;
  pin_hash?: string; // Hashed PIN
  role?: 'admin' | 'staff';
  created_at?: string;
}

export interface Agreement {
  id: string;
  company_id: string;
  agent_id: string;
  agent_name: string;
  customer_name: string;
  identity_number?: string;
  customer_phone?: string;
  billing_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  car_plate_number?: string;
  car_model?: string;
  start_date?: string;
  end_date?: string;
  total_price: number;
  deposit?: number;
  duration_days?: number;
  pickup_time?: string;
  return_time?: string;
  need_einvoice?: boolean;
  payment_receipt?: string;
  status: 'pending' | 'signed';
  details?: string;
  created_at: string;
}

export interface DigitalForm {
  id: string;
  company_id: string;
  agent_id?: string;
  agent_name?: string;
  customer_name: string;
  identity_number?: string;
  customer_phone?: string;
  billing_address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  car_plate_number?: string;
  car_model?: string;
  start_date?: string;
  end_date?: string;
  total_price: number;
  deposit?: number;
  duration_days?: number;
  pickup_time?: string;
  return_time?: string;
  need_einvoice?: boolean;
  payment_receipt?: string;
  status: 'pending' | 'signed';
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  is_active: boolean;
  expiry_date: string | null;
  created_at: string;
}
