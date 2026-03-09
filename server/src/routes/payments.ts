import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all payments
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT p.*, o.order_number, c.full_name_en as customer_name_en
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY p.payment_date DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get payments by order ID
router.get('/order/:orderId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await query(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY payment_date DESC`,
      [orderId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const {
      order_id,
      currency,
      amount_in_currency,
      exchange_rate_used,
      amount_usd,
      payment_method,
      payment_date,
      receipt_number = '',
      notes_en = '',
      notes_ku = ''
    } = req.body;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO payments (
        id, order_id, currency, amount_in_currency, exchange_rate_used, amount_usd,
        payment_method, payment_date, receipt_number, notes_en, notes_ku,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        id, order_id, currency, amount_in_currency, exchange_rate_used, amount_usd,
        payment_method, payment_date, receipt_number, notes_en, notes_ku, req.user?.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update payment
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    const result = await query(
      `UPDATE payments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete payment
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM payments WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ message: 'Payment deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
