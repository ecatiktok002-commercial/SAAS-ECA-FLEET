export interface Car {
  id: string;
  name: string;
  type: 'Economy' | 'Luxury' | 'SUV' | 'Electric';
  plate: string;
  status?: 'active' | 'maintenance' | 'inactive'; // 'active' = ON, others = OFF
  current_mileage?: number;      // Actual odometer reading
  next_service_mileage?: number; // Target for next service
  service_interval?: number;     // Standard cycle (e.g., 10000)
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
  usage?: string;
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
  
  // FIX: Updated definitions to match current Supabase schema
  end_time?: string | null; // Now a TIME string from DB (HH:mm:ss), ignored by frontend
  actual_end_time?: string | null; // ISO string used for early returns
  end_date?: string | null; // Now a DATE string from DB (YYYY-MM-DD), ignored by frontend
  
  track?: number; // assigned vertical slot
  status?: 'active' | 'completed' | 'cancelled';
  total_price?: number;
  commission_earned?: number;
  created_by?: string;
  is_dates_matched?: boolean;
  has_discrepancy?: boolean;
  discrepancy_reason?: string;
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
  usage?: string;
  rental_purpose?: string;
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
  transaction_date?: string | null;
  signature_data?: string;
  photos_url?: string[];
  ic_license_photos?: string[];
  status: 'pending' | 'signed' | 'completed' | 'reconciled';
  signed_at?: string;
  details?: string;
  created_by?: string;
  created_at: string;
  booking_id?: string | null;
  commission_earned?: number;
  payout_status?: 'pending' | 'pending_review' | 'approved' | 'paid';
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
  usage?: string;
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
  transaction_date?: string | null;
  ic_license_photos?: string | null;
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
  pending_changes?: any;
}

export type SaaSAccountType = 
  | 'Commercial Customer' 
  | 'Internal' 
  | 'Demo / Trial' 
  | 'Test / Sandbox' 
  | 'Complimentary / Partner' 
  | 'Unclassified';

export type SaaSSubscriptionStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'grace_period' 
  | 'suspended' 
  | 'cancel_at_period_end' 
  | 'cancelled' 
  | 'expired';

export type SaaSPlanTier = 'Tier 1' | 'Tier 2' | 'Tier 3';

export interface SaaSInvoice {
  id: string;
  invoice_number: string;
  subscriber_id: string;
  subscriber_name: string;
  plan_tier: SaaSPlanTier;
  plan_name: string;
  billing_period: string; // e.g. "Aug 2026" or "Aug 2026 - Aug 2027"
  billing_cycle: 'monthly' | 'annual';
  amount: number;
  payment_date: string;
  payment_method: 'FPX' | 'Credit Card' | 'DuitNow' | 'Manual Bank Transfer' | 'Stripe';
  payment_gateway?: string;
  status: 'paid' | 'pending' | 'past_due' | 'failed' | 'refunded' | 'manual_override';
  transaction_ref?: string;
  notes?: string;
  created_at: string;
}

export interface SaaSCommission {
  id: string;
  salesperson_id: string;
  salesperson_name: string;
  salesperson_role?: 'primary' | 'supporting';
  subscriber_id: string;
  subscriber_name: string;
  plan_tier: SaaSPlanTier;
  plan_name: string;
  first_month_revenue: number;
  commission_amount: number;
  commission_rule: 'first_month_100' | 'percentage' | 'fixed' | 'team_split' | 'manual_override';
  commission_rate_percent?: number;
  split_percentage?: number;
  status: 'pending' | 'eligible' | 'approved' | 'paid' | 'cancelled';
  paid_date?: string | null;
  notes?: string;
  created_at: string;
}

export interface SaaSActivityLog {
  id: string;
  subscriber_id: string;
  subscriber_name: string;
  event_type: 
    | 'subscriber_created'
    | 'trial_started'
    | 'trial_converted'
    | 'trial_expired'
    | 'subscription_activated'
    | 'payment_recorded'
    | 'payment_failed'
    | 'plan_upgraded'
    | 'plan_downgraded'
    | 'subscription_suspended'
    | 'subscription_reactivated'
    | 'cancellation_scheduled'
    | 'subscription_cancelled'
    | 'commission_created'
    | 'commission_approved'
    | 'commission_paid'
    | 'signup' 
    | 'upgrade' 
    | 'downgrade' 
    | 'renewal' 
    | 'payment_success' 
    | 'past_due' 
    | 'grace_period_extended' 
    | 'suspended' 
    | 'reactivated' 
    | 'cancellation';
  description: string;
  plan_tier?: SaaSPlanTier;
  amount?: number;
  lead_source?: string;
  salesperson_name?: string;
  created_by?: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  brand_name?: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  is_active: boolean;
  status: string;
  is_trial: boolean;
  logistic_credits_enabled?: boolean;
  expiry_date: string | null;
  subscription_start_date?: string | null;
  logo_url?: string;
  ssm_logo_url?: string;
  spdp_logo_url?: string;
  signature_url?: string;
  address?: string;
  contact?: string;
  created_at: string;

  // Smart Drive SaaS Extension Fields
  account_type?: SaaSAccountType;
  include_in_analytics?: boolean;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  billing_cycle?: 'monthly' | 'annual';
  subscription_status?: SaaSSubscriptionStatus;
  lead_source?: string; // 'Threads Organic', 'Instagram Organic', 'TikTok Ads', 'Facebook', 'Referral', 'Founder', 'ECA Referral', 'Direct Sales'
  campaign_source?: string;
  salesperson_id?: string;
  salesperson_name?: string;
  primary_salesperson_id?: string;
  primary_salesperson_name?: string;
  supporting_salesperson_id?: string;
  supporting_salesperson_name?: string;
  commission_eligible?: boolean;
  commission_split?: string; // e.g. '100/0', '50/50', '70/30', '30/70'
  commission_rule?: 'first_month_100' | 'manual_override';
  commission_status?: 'pending' | 'approved' | 'paid' | 'cancelled';
  referrer?: string;
  payment_method?: string; // 'FPX', 'Credit Card', 'DuitNow', 'Manual Bank Transfer', 'Stripe'
  custom_mrr?: number;
  annual_amount?: number;
  outstanding_amount?: number;
  last_payment_date?: string | null;
  next_billing_date?: string | null;
  grace_period_until?: string | null;
  cancel_at_period_end?: boolean;
  saas_notes?: string;
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