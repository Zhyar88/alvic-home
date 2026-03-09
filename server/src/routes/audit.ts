import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = Router();

// Get all audit logs
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { limit = 100, offset = 0, tableName, action } = req.query;

    let sql = `
      SELECT a.*, u.full_name_en as user_name_en, u.full_name_ku as user_name_ku
      FROM audit_log a
      LEFT JOIN user_profiles u ON a.user_id = u.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (tableName) {
      sql += ` AND a.table_name = $${paramIndex}`;
      params.push(tableName);
      paramIndex++;
    }

    if (action) {
      sql += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    sql += ` ORDER BY a.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs for specific record
router.get('/record/:tableName/:recordId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { tableName, recordId } = req.params;

    const result = await query(
      `SELECT a.*, u.full_name_en as user_name_en, u.full_name_ku as user_name_ku
       FROM audit_log a
       LEFT JOIN user_profiles u ON a.user_id = u.user_id
       WHERE a.table_name = $1 AND a.record_id = $2
       ORDER BY a.timestamp DESC`,
      [tableName, recordId]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
