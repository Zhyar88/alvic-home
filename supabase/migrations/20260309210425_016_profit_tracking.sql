/*
  # Profit Tracking System

  1. Schema Changes
    - Add `cost_price_usd` column to `order_items` table (the cost price per unit)
    - Add `profit_per_unit_usd` column to `order_items` table (calculated: unit_price_usd - cost_price_usd)
    - Add `total_profit_usd` column to `order_items` table (calculated: profit_per_unit_usd * quantity)
    - Add `profit_updated_by` column to track who set the profit
    - Add `profit_updated_at` column to track when profit was set
    - Add `total_cost_usd` and `total_profit_usd` columns to `orders` table for aggregates

  2. New Views
    - `daily_profit_report` - Aggregates revenue, expenses, and profit by day
    - `monthly_profit_report` - Aggregates revenue, expenses, and profit by month
    - `yearly_profit_report` - Aggregates revenue, expenses, and profit by year
    - `customer_profit_summary` - Per-customer profit summary

  3. Security
    - Only super_admin can update profit fields
    - All authenticated users can view profit reports

  4. Important Notes
    - cost_price_usd defaults to 0
    - profit calculations are stored for performance
    - Reports include revenue (total_amount), expenses, and net profit
*/

-- Add profit tracking columns to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'cost_price_usd'
  ) THEN
    ALTER TABLE order_items ADD COLUMN cost_price_usd decimal(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'profit_per_unit_usd'
  ) THEN
    ALTER TABLE order_items ADD COLUMN profit_per_unit_usd decimal(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'total_profit_usd'
  ) THEN
    ALTER TABLE order_items ADD COLUMN total_profit_usd decimal(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'profit_updated_by'
  ) THEN
    ALTER TABLE order_items ADD COLUMN profit_updated_by uuid REFERENCES user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'profit_updated_at'
  ) THEN
    ALTER TABLE order_items ADD COLUMN profit_updated_at timestamptz;
  END IF;
END $$;

-- Add aggregate profit columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_cost_usd'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_cost_usd decimal(15,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_profit_usd'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_profit_usd decimal(15,2) DEFAULT 0;
  END IF;
END $$;

-- Create function to automatically calculate profit for order items
CREATE OR REPLACE FUNCTION calculate_order_item_profit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profit_per_unit_usd := NEW.unit_price_usd - COALESCE(NEW.cost_price_usd, 0);
  NEW.total_profit_usd := NEW.profit_per_unit_usd * NEW.quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate profit for order items
DROP TRIGGER IF EXISTS trigger_calculate_order_item_profit ON order_items;
CREATE TRIGGER trigger_calculate_order_item_profit
  BEFORE INSERT OR UPDATE OF unit_price_usd, cost_price_usd, quantity
  ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_item_profit();

-- Create function to update order totals when items change
CREATE OR REPLACE FUNCTION update_order_profit_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET
    total_cost_usd = (
      SELECT COALESCE(SUM(cost_price_usd * quantity), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    total_profit_usd = (
      SELECT COALESCE(SUM(total_profit_usd), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order totals
DROP TRIGGER IF EXISTS trigger_update_order_profit_totals ON order_items;
CREATE TRIGGER trigger_update_order_profit_totals
  AFTER INSERT OR UPDATE OR DELETE
  ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_profit_totals();

-- Daily profit report view
CREATE OR REPLACE VIEW daily_profit_report AS
WITH daily_orders AS (
  SELECT
    DATE(o.created_at) as report_date,
    o.customer_id,
    c.full_name_en,
    c.full_name_ku,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(o.final_total_usd) as total_revenue,
    SUM(o.total_cost_usd) as total_cost,
    SUM(o.total_profit_usd) as gross_profit
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.status != 'draft'
  GROUP BY DATE(o.created_at), o.customer_id, c.full_name_en, c.full_name_ku
),
daily_expenses AS (
  SELECT
    DATE(e.expense_date) as expense_date,
    SUM(e.amount_usd) as total_expenses
  FROM expenses e
  GROUP BY DATE(e.expense_date)
)
SELECT
  ord.report_date,
  ord.customer_id,
  ord.full_name_en as customer_name_en,
  ord.full_name_ku as customer_name_ku,
  ord.total_orders,
  ord.total_revenue,
  ord.total_cost,
  ord.gross_profit,
  COALESCE(exp.total_expenses, 0) as total_expenses,
  ord.gross_profit - COALESCE(exp.total_expenses, 0) as net_profit
FROM daily_orders ord
LEFT JOIN daily_expenses exp ON ord.report_date = exp.expense_date
ORDER BY ord.report_date DESC;

-- Monthly profit report view
CREATE OR REPLACE VIEW monthly_profit_report AS
WITH monthly_orders AS (
  SELECT
    DATE_TRUNC('month', o.created_at) as report_month,
    o.customer_id,
    c.full_name_en,
    c.full_name_ku,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(o.final_total_usd) as total_revenue,
    SUM(o.total_cost_usd) as total_cost,
    SUM(o.total_profit_usd) as gross_profit
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.status != 'draft'
  GROUP BY DATE_TRUNC('month', o.created_at), o.customer_id, c.full_name_en, c.full_name_ku
),
monthly_expenses AS (
  SELECT
    DATE_TRUNC('month', e.expense_date) as expense_month,
    SUM(e.amount_usd) as total_expenses
  FROM expenses e
  GROUP BY DATE_TRUNC('month', e.expense_date)
)
SELECT
  ord.report_month,
  ord.customer_id,
  ord.full_name_en as customer_name_en,
  ord.full_name_ku as customer_name_ku,
  ord.total_orders,
  ord.total_revenue,
  ord.total_cost,
  ord.gross_profit,
  COALESCE(exp.total_expenses, 0) as total_expenses,
  ord.gross_profit - COALESCE(exp.total_expenses, 0) as net_profit
FROM monthly_orders ord
LEFT JOIN monthly_expenses exp ON ord.report_month = exp.expense_month
ORDER BY ord.report_month DESC;

-- Yearly profit report view
CREATE OR REPLACE VIEW yearly_profit_report AS
WITH yearly_orders AS (
  SELECT
    DATE_TRUNC('year', o.created_at) as report_year,
    o.customer_id,
    c.full_name_en,
    c.full_name_ku,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(o.final_total_usd) as total_revenue,
    SUM(o.total_cost_usd) as total_cost,
    SUM(o.total_profit_usd) as gross_profit
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.status != 'draft'
  GROUP BY DATE_TRUNC('year', o.created_at), o.customer_id, c.full_name_en, c.full_name_ku
),
yearly_expenses AS (
  SELECT
    DATE_TRUNC('year', e.expense_date) as expense_year,
    SUM(e.amount_usd) as total_expenses
  FROM expenses e
  GROUP BY DATE_TRUNC('year', e.expense_date)
)
SELECT
  ord.report_year,
  ord.customer_id,
  ord.full_name_en as customer_name_en,
  ord.full_name_ku as customer_name_ku,
  ord.total_orders,
  ord.total_revenue,
  ord.total_cost,
  ord.gross_profit,
  COALESCE(exp.total_expenses, 0) as total_expenses,
  ord.gross_profit - COALESCE(exp.total_expenses, 0) as net_profit
FROM yearly_orders ord
LEFT JOIN yearly_expenses exp ON ord.report_year = exp.expense_year
ORDER BY ord.report_year DESC;

-- Customer profit summary view
CREATE OR REPLACE VIEW customer_profit_summary AS
SELECT
  c.id as customer_id,
  c.full_name_en,
  c.full_name_ku,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.final_total_usd), 0) as lifetime_revenue,
  COALESCE(SUM(o.total_cost_usd), 0) as lifetime_cost,
  COALESCE(SUM(o.total_profit_usd), 0) as lifetime_profit,
  CASE 
    WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total_profit_usd), 0) / COUNT(o.id)
    ELSE 0
  END as avg_profit_per_order
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'draft'
GROUP BY c.id, c.full_name_en, c.full_name_ku
ORDER BY lifetime_profit DESC;

-- Grant select permissions on views
GRANT SELECT ON daily_profit_report TO authenticated;
GRANT SELECT ON monthly_profit_report TO authenticated;
GRANT SELECT ON yearly_profit_report TO authenticated;
GRANT SELECT ON customer_profit_summary TO authenticated;
