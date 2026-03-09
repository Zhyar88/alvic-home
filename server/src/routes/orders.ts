import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query, getClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all orders
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT o.*, c.full_name_en as customer_name_en, c.full_name_ku as customer_name_ku
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID with items
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orderResult = await query(
      `SELECT o.*, c.full_name_en as customer_name_en, c.full_name_ku as customer_name_ku
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at`,
      [id]
    );

    res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', verifyToken, async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const {
      customer_id,
      total_amount_usd,
      discount_amount_usd = 0,
      final_amount_usd,
      payment_type,
      payment_schedule,
      down_payment_usd = 0,
      remaining_balance_usd,
      installment_months,
      monthly_installment_usd = 0,
      notes_en = '',
      notes_ku = '',
      items = []
    } = req.body;

    await client.query('BEGIN');

    const orderId = uuidv4();

    const orderResult = await client.query(
      `INSERT INTO orders (
        id, customer_id, total_amount_usd, discount_amount_usd, final_amount_usd,
        payment_type, payment_schedule, down_payment_usd, remaining_balance_usd,
        installment_months, monthly_installment_usd, notes_en, notes_ku,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        orderId, customer_id, total_amount_usd, discount_amount_usd, final_amount_usd,
        payment_type, payment_schedule, down_payment_usd, remaining_balance_usd,
        installment_months, monthly_installment_usd, notes_en, notes_ku, req.user?.id
      ]
    );

    // Insert order items
    for (const item of items) {
      const itemId = uuidv4();
      await client.query(
        `INSERT INTO order_items (
          id, order_id, description_en, description_ku, quantity, unit_price_usd, total_price_usd, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [itemId, orderId, item.description_en, item.description_ku, item.quantity, item.unit_price_usd, item.total_price_usd]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update order
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'items') {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM orders WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
