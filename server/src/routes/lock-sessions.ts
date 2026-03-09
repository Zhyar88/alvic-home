import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all lock sessions
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM lock_sessions ORDER BY session_date DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current open session
router.get('/current', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM lock_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`
    );
    res.json(result.rows[0] || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get lock transactions for a session
router.get('/:sessionId/transactions', verifyToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const result = await query(
      `SELECT * FROM lock_transactions WHERE session_id = $1 ORDER BY created_at DESC`,
      [sessionId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create lock session (open register)
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const {
      session_date,
      opening_balance_usd,
      notes_en = '',
      notes_ku = ''
    } = req.body;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO lock_sessions (
        id, session_date, opened_at, opened_by, opening_balance_usd,
        status, notes_en, notes_ku, created_at
      ) VALUES ($1, $2, NOW(), $3, $4, 'open', $5, $6, NOW())
      RETURNING *`,
      [id, session_date, req.user?.id, opening_balance_usd, notes_en, notes_ku]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Close lock session
router.put('/:id/close', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      closing_balance_usd,
      total_income_usd,
      total_expenses_usd,
      net_usd,
      notes_en = '',
      notes_ku = ''
    } = req.body;

    const result = await query(
      `UPDATE lock_sessions
       SET closed_at = NOW(),
           closed_by = $2,
           closing_balance_usd = $3,
           total_income_usd = $4,
           total_expenses_usd = $5,
           net_usd = $6,
           notes_en = $7,
           notes_ku = $8,
           status = 'closed'
       WHERE id = $1
       RETURNING *`,
      [id, req.user?.id, closing_balance_usd, total_income_usd, total_expenses_usd, net_usd, notes_en, notes_ku]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add transaction to session
router.post('/:sessionId/transactions', verifyToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const {
      transaction_type,
      reference_type = '',
      reference_id = null,
      description_en = '',
      description_ku = '',
      amount_usd
    } = req.body;

    const id = uuidv4();

    const result = await query(
      `INSERT INTO lock_transactions (
        id, session_id, transaction_type, reference_type, reference_id,
        description_en, description_ku, amount_usd, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [id, sessionId, transaction_type, reference_type, reference_id, description_en, description_ku, amount_usd, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
