import { Router, Request, Response } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();

// Get all users
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT up.id, up.user_id, up.full_name_en, up.full_name_ku, up.role, up.is_active, up.phone, up.created_at
       FROM user_profiles up
       ORDER BY up.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT up.id, up.user_id, up.full_name_en, up.full_name_ku, up.role, up.is_active, up.phone, up.created_at
       FROM user_profiles up
       WHERE up.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name_en, full_name_ku, role, is_active, phone } = req.body;

    const result = await query(
      `UPDATE user_profiles
       SET full_name_en = COALESCE($2, full_name_en),
           full_name_ku = COALESCE($3, full_name_ku),
           role = COALESCE($4, role),
           is_active = COALESCE($5, is_active),
           phone = COALESCE($6, phone),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, full_name_en, full_name_ku, role, is_active, phone]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM user_profiles WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
