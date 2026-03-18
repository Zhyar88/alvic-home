export type Language = 'en' | 'ku';

export type UserRole = 'administrator' | 'admin' | 'employee' | 'custom';

export type OrderStatus =
  | 'draft'
  | 'approved'
  | 'deposit_paid'
  | 'in_production'
  | 'ready'
  | 'installed'
  | 'finished';

export type SaleType = 'cash' | 'installment';

export type Currency = 'USD' | 'IQD';

export type ProductType =
  | 'kitchen_cabinet'
  | 'bedroom_cabinet'
  | 'tv_console'
  | 'shoe_cabinet'
  | 'understairs_cabinet'
  | 'custom_console';

export type PaymentType = 'deposit' | 'installment' | 'final' | 'partial' | 'reversal';

export type InstallmentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name_en: string;
  full_name_ku: string;
  role: UserRole;
  custom_role_id?: string;
  is_active: boolean;
  phone: string;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface Role {
  id: string;
  name_en: string;
  name_ku: string;
  is_system: boolean;
  permissions: Record<string, Record<string, boolean>>;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  rate_cash: number;
  rate_installment: number;
  effective_date: string;
  set_by?: string;
  notes_en: string;
  notes_ku: string;
  created_at: string;
}

export interface Customer {
  id: string;
  full_name_en: string;
  full_name_ku: string;
  address_en: string;
  address_ku: string;
  phone: string;
  phone_secondary: string;
  national_id_number: string;
  national_id_image_url: string;
  guarantor_name_en: string;
  guarantor_name_ku: string;
  guarantor_workplace_en: string;
  guarantor_workplace_ku: string;
  guarantor_phone: string;
  salary_deduction_consent: boolean;
  notes_en: string;
  notes_ku: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  sale_type: SaleType;
  status: OrderStatus;
  total_amount_usd: number;
  discount_percent: number;
  discount_amount_usd: number;
  final_total_usd: number;
  deposit_required_usd: number;
  deposit_paid_usd: number;
  total_paid_usd: number;
  balance_due_usd: number;
  installment_months: number;
  installment_mode: string;
  installment_monthly_amount: number;
  start_date?: string;
  end_date?: string;
  notes_en: string;
  notes_ku: string;
  project_design_url: string;
  created_by?: string;
  assigned_to?: string;
  created_by_profile?: UserProfile;
  assigned_to_profile?: UserProfile;
  items?: OrderItem[];
  total_cost_usd: number;
  total_profit_usd: number;
  created_at: string;
  updated_at: string;
}

export interface KitchenBedroomConfig {
  start_date?: string;
  end_date?: string;
  upper_cabinet_door_color_en?: string;
  upper_cabinet_door_color_ku?: string;
  lower_cabinet_door_color_en?: string;
  lower_cabinet_door_color_ku?: string;
  cabinet_body_color_en?: string;
  cabinet_body_color_ku?: string;
  naxsh_en?: string;
  naxsh_ku?: string;
  crown_en?: string;
  crown_ku?: string;
  kiler_en?: string;
  kiler_ku?: string;
  cabinet_top_en?: string;
  cabinet_top_ku?: string;
  stove_en?: string;
  stove_ku?: string;
  countertop_en?: string;
  countertop_ku?: string;
  liner_led_en?: string;
  liner_led_ku?: string;
  suction_device_en?: string;
  suction_device_ku?: string;
  microwave_en?: string;
  microwave_ku?: string;
  mujameda_en?: string;
  mujameda_ku?: string;
  handle_type_en?: string;
  handle_type_ku?: string;
  oven_en?: string;
  oven_ku?: string;
  fridge_en?: string;
  fridge_ku?: string;
  washer_en?: string;
  washer_ku?: string;
  baza_en?: string;
  baza_ku?: string;
  glass_color_en?: string;
  glass_color_ku?: string;
  project_design_url?: string;
}

export interface ConsoleConfig {
  start_date?: string;
  end_date?: string;
  measurement_en?: string;
  measurement_ku?: string;
  color_en?: string;
  color_ku?: string;
  material?: 'MDF' | 'Acrylic' | 'Ballonpress';
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_type: ProductType;
  product_type_name_en: string;
  product_type_name_ku: string;
  item_name_en: string;
  item_name_ku: string;
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  cost_price_usd: number;
  profit_per_unit_usd: number;
  total_profit_usd: number;
  profit_updated_by?: string;
  profit_updated_at?: string;
  config: KitchenBedroomConfig | ConsoleConfig | Record<string, string>;
  notes_en: string;
  notes_ku: string;
  sort_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  order?: Order;
  payment_number: string;
  payment_type: PaymentType;
  currency: Currency;
  amount_in_currency: number;
  exchange_rate_used: number;
  amount_usd: number;
  payment_date: string;
  installment_entry_id?: string;
  is_reversed: boolean;
  reversed_by?: string;
  reversal_reference_id?: string;
  accountant_name: string;   // ← add this
  notes_en: string;
  notes_ku: string;
  created_by?: string;
  created_by_profile?: UserProfile;
  created_at: string;
}

export interface InstallmentSchedule {
  id: string;
  order_id: string;
  order?: Order;
  total_amount_usd: number;
  deposit_usd: number;
  remaining_usd: number;
  months: number;
  monthly_amount_usd: number;
  start_date: string;
  original_snapshot: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  entries?: InstallmentEntry[];
}

export interface InstallmentEntry {
  id: string;
  schedule_id: string;
  order_id: string;
  installment_number: number;
  due_date: string;
  amount_usd: number;
  paid_amount_usd: number;
  status: InstallmentStatus;
  is_modified: boolean;
  modification_reason_en: string;
  modification_reason_ku: string;
  modified_by?: string;
  modified_at?: string;
  original_amount_usd?: number;
  original_due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name_en: string;
  name_ku: string;
  description_en: string;
  description_ku: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category_id?: string;
  category?: ExpenseCategory;
  category_name_en: string;
  category_name_ku: string;
  description_en: string;
  description_ku: string;
  currency: Currency;
  amount_in_currency: number;
  exchange_rate_used: number;
  amount_usd: number;
  expense_date: string;
  linked_order_id?: string;
  linked_order?: Order;
  receipt_url: string;
  notes_en: string;
  notes_ku: string;
  created_by?: string;
  created_by_profile?: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface LockSession {
  id: string;
  session_date: string;
  opened_at: string;
  closed_at?: string;
  opened_by?: string;
  closed_by?: string;
  opened_by_profile?: UserProfile;
  closing_balance_usd?: number;
  opening_balance_usd: number;
  total_income_usd: number;
  total_expenses_usd: number;
  net_usd: number;
  status: 'open' | 'closed';
  notes_en: string;
  notes_ku: string;
  transactions?: LockTransaction[];
  created_at: string;
}

export interface LockTransaction {
  id: string;
  session_id: string;
  transaction_type: 'income' | 'expense';
  reference_type: 'payment' | 'expense' | 'manual' | '';
  reference_id?: string;
  description_en: string;
  description_ku: string;
  amount_usd: number;
  created_by?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name_en: string;
  user_name_ku: string;
  action: string;
  module: string;
  record_id: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  details: Record<string, unknown>;
  created_at: string;
}

export type DocumentType = 'national_id' | 'passport' | 'driving_license' | 'work_permit' | 'residence_card' | 'other';

export interface CustomerDocument {
  id: string;
  customer_id: string;
  document_type: DocumentType;
  label_en: string;
  label_ku: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_by?: string;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string;
  to_status: string;
  changed_by?: string;
  changed_by_name_en: string;
  changed_by_name_ku: string;
  reason_en: string;
  reason_ku: string;
  created_at: string;
}

export interface ProfitReport {
  report_date?: string;
  report_month?: string;
  report_year?: string;
  customer_id?: string;
  customer_name_en?: string;
  customer_name_ku?: string;
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
}
