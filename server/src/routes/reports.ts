import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();

// Get dashboard statistics
router.get('/dashboard', verifyToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const ordersResult = await query(
      `SELECT
        COUNT(*) as total_orders,
        SUM(final_amount_usd) as total_sales,
        SUM(remaining_balance_usd) as total_outstanding
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );

    const paymentsResult = await query(
      `SELECT
        COUNT(*) as total_payments,
        SUM(amount_usd) as total_collected
       FROM payments
       WHERE payment_date >= $1 AND payment_date <= $2`,
      [startDate, endDate]
    );

    const expensesResult = await query(
      `SELECT
        COUNT(*) as total_expenses,
        SUM(amount_usd) as total_expense_amount
       FROM expenses
       WHERE expense_date >= $1 AND expense_date <= $2`,
      [startDate, endDate]
    );

    const customersResult = await query(
      `SELECT COUNT(*) as total_customers FROM customers WHERE is_active = true`
    );

    res.json({
      orders: ordersResult.rows[0],
      payments: paymentsResult.rows[0],
      expenses: expensesResult.rows[0],
      customers: customersResult.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales report
router.get('/sales', verifyToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat = 'YYYY-MM-DD';
    if (groupBy === 'month') dateFormat = 'YYYY-MM';
    if (groupBy === 'year') dateFormat = 'YYYY';

    const result = await query(
      `SELECT
        TO_CHAR(created_at, $3) as period,
        COUNT(*) as order_count,
        SUM(final_amount_usd) as total_sales,
        AVG(final_amount_usd) as avg_order_value
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY period
       ORDER BY period`,
      [startDate, endDate, dateFormat]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment collection report
router.get('/collections', verifyToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await query(
      `SELECT
        payment_method,
        currency,
        COUNT(*) as payment_count,
        SUM(amount_usd) as total_collected_usd
       FROM payments
       WHERE payment_date >= $1 AND payment_date <= $2
       GROUP BY payment_method, currency
       ORDER BY total_collected_usd DESC`,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get expense report by category
router.get('/expenses', verifyToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const result = await query(
      `SELECT
        e.category_name_en,
        e.category_name_ku,
        COUNT(*) as expense_count,
        SUM(e.amount_usd) as total_amount_usd
       FROM expenses e
       WHERE e.expense_date >= $1 AND e.expense_date <= $2
       GROUP BY e.category_name_en, e.category_name_ku
       ORDER BY total_amount_usd DESC`,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer report
router.get('/customers', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
        c.id,
        c.full_name_en,
        c.full_name_ku,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.final_amount_usd) as total_purchases,
        SUM(o.remaining_balance_usd) as outstanding_balance
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.is_active = true
       GROUP BY c.id, c.full_name_en, c.full_name_ku
       ORDER BY total_purchases DESC`
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get installment status report
router.get('/installments', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT
        status,
        COUNT(*) as count,
        SUM(amount_usd) as total_amount,
        SUM(paid_amount_usd) as total_paid,
        SUM(remaining_amount_usd) as total_remaining
       FROM installment_schedules
       GROUP BY status
       ORDER BY status`
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
