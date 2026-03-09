import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all expenses
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM expenses ORDER BY expense_date DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get expense categories
router.get('/categories', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM expense_categories WHERE is_active = true ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create expense
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const {
      category_id,
      category_name_en = '',
      category_name_ku = '',
      description_en = '',
      description_ku = '',
      currency,
      amount_in_currency,
      exchange_rate_used,
      amount_usd,
      expense_date,
      receipt_url = '',
      notes_en = '',
      notes_ku = ''
    } = req.body;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO expenses (
        id, category_id, category_name_en, category_name_ku, description_en, description_ku,
        currency, amount_in_currency, exchange_rate_used, amount_usd, expense_date,
        receipt_url, notes_en, notes_ku, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *`,
      [
        id, category_id, category_name_en, category_name_ku, description_en, description_ku,
        currency, amount_in_currency, exchange_rate_used, amount_usd, expense_date,
        receipt_url, notes_en, notes_ku, req.user?.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
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
      `UPDATE expenses SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM expenses WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
