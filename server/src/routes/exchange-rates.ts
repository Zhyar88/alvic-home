import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get current exchange rates
router.get('/current', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM exchange_rates WHERE is_active = true ORDER BY effective_date DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all exchange rates
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM exchange_rates ORDER BY effective_date DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create exchange rate
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const {
      currency,
      rate_to_usd,
      effective_date,
      is_active = true,
      notes_en = '',
      notes_ku = ''
    } = req.body;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO exchange_rates (
        id, currency, rate_to_usd, effective_date, is_active, notes_en, notes_ku,
        created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [id, currency, rate_to_usd, effective_date, is_active, notes_en, notes_ku, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update exchange rate
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
      `UPDATE exchange_rates SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
