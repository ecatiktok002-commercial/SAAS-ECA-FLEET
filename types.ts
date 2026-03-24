
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
  subscriber_id?: string;
  is_subscriber?: boolean;
  is_active?: boolean;
}

export interface Booking {
  id: string;
  car_id: string;
  member_id: string; // Link to Member
  agent_id?: string; // The staff member who created it
  agent_name?: string; // Snapshot of agent name for historical reference
  subscriber_id?: string;
  start_date: string; // YYYY-MM-DD
  pickup_time: string; // HH:mm
  duration_days: number; // in days
  end_time?: string | null; // ISO string
  track?: number; // assigned vertical slot
  status?: 'active' | 'completed' | 'cancelled';
  total_price?: number;
  commission_earned?: number;
  created_by?: string;
  is_dates_matched?: boolean;
  has_discrepancy?: boolean;
  discrepancy_reason?: string;
  end_date?: string;
  return_time?: string;
}

export interface Expense {
  id: string;
  car_id: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  created_by?: string;
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
  subscriber_id: string;
  name: string;
  staff_uid: string;
  pin_hash?: string; // Hashed PIN
  pin_code?: string; // Plain text PIN for new staff table
  role?: 'admin' | 'staff';
  is_active?: boolean;
  created_at?: string;
  commission_tier_override?: 'auto' | 'premium' | 'prestige' | 'privilege';
  commission_rate?: number;
}

export interface Agreement {
  id: string;
  reference_number?: string;
  subscriber_id: string;
  agent_id: string;
  agent_name: string;
  customer_id?: string;
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
  signature_data?: string;
  photos_url?: string[];
  status: 'pending' | 'signed' | 'completed' | 'reconciled';
  signed_at?: string;
  details?: string;
  created_by?: string;
  created_at: string;
  booking_id?: string | null;
  commission_earned?: number;
  payout_status?: 'pending' | 'approved' | 'paid';
  has_pending_changes?: boolean;
  pending_changes?: any;
}

export interface DigitalForm {
  id: string;
  subscriber_id: string;
  agent_id?: string;
  agent_name?: string;
  customer_id?: string;
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
  signature_data?: string;
  photos_url?: string[];
  status: 'pending' | 'signed' | 'completed';
  signed_at?: string;
  created_by?: string;
  created_at: string;
  booking_id?: string;
  commission_earned?: number;
  payout_status?: 'pending' | 'pending_review' | 'approved' | 'paid';
  is_receipt_verified?: boolean;
  has_pending_changes?: boolean;
  pending_changes?: any;
}

export interface MarketingEvent {
  id: string;
  subscriber_id: string;
  name: string;
  goal_type: 'Total Orders' | 'Total Sales (RM)';
  target_goal: number;
  reward_amount: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface AuditRecord {
  form_id: string;
  subscriber_id: string;
  agent_id: string;
  agent_name: string;
  customer_name: string;
  car_plate_number: string;
  form_price: number;
  form_start: string;
  form_end: string;
  payment_receipt: string | null;
  commission_earned: number;
  payout_status: 'pending' | 'pending_review' | 'approved' | 'paid';
  status: string;
  reference_number?: string;
  is_receipt_verified: boolean;
  created_at: string;
  booking_id: string | null;
  booking_price: number | null;
  booking_start: string | null;
  booking_duration: number | null;
  booking_start_date?: string | null;
  booking_end_date?: string | null;
  booking_pickup_time?: string | null;
  booking_return_time?: string | null;
  has_discrepancy: boolean;
  is_dates_matched: boolean;
  discrepancy_reason: string | null;
  has_pending_changes?: boolean;
}

export interface Company {
  id: string;
  name: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  is_active: boolean;
  status: string;
  is_trial: boolean;
  expiry_date: string | null;
  logo_url?: string;
  address?: string;
  contact?: string;
  created_at: string;
}

export interface PayoutHistory {
  id: string;
  subscriber_id: string;
  total_amount: number;
  month_year: string;
  breakdown: {
    agent_id: string;
    agent_name: string;
    total_bookings: number;
    total_revenue: number;
    payout_due: number;
  }[];
  created_at: string;
}
