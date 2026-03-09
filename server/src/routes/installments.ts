import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all installment schedules
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT i.*, o.order_number, c.full_name_en as customer_name_en
       FROM installment_schedules i
       LEFT JOIN orders o ON i.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY i.due_date ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get installments by order ID
router.get('/order/:orderId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await query(
      `SELECT * FROM installment_schedules WHERE order_id = $1 ORDER BY installment_number`,
      [orderId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create installment schedule
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const {
      order_id,
      installment_number,
      due_date,
      amount_usd,
      status = 'pending',
      paid_amount_usd = 0,
      remaining_amount_usd,
      paid_date = null,
      notes_en = '',
      notes_ku = ''
    } = req.body;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO installment_schedules (
        id, order_id, installment_number, due_date, amount_usd, status,
        paid_amount_usd, remaining_amount_usd, paid_date, notes_en, notes_ku,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        id, order_id, installment_number, due_date, amount_usd, status,
        paid_amount_usd, remaining_amount_usd, paid_date, notes_en, notes_ku
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update installment
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

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE installment_schedules SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete installment
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM installment_schedules WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    res.json({ message: 'Installment deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
