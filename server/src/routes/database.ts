import { Router, Request, Response } from 'express';
import pool from '../config/database.js';

const router = Router();

router.get('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const { select, count, limit, offset, or } = req.query;

    const filters: Array<{ column: string; op: string; value: any }> = [];
    const orders: Array<{ column: string; dir: string }> = [];

    Object.keys(req.query).forEach(key => {
      if (key.startsWith('filter_')) {
        const parts = String(req.query[key]).split(':');
        if (parts.length === 3) {
          filters.push({ column: parts[0], op: parts[1], value: parts[2] });
        }
      } else if (key.startsWith('order_')) {
        const parts = String(req.query[key]).split(':');
        if (parts.length === 2) {
          orders.push({ column: parts[0], dir: parts[1] });
        }
      }
    });

    const columns = select && select !== '*' ? String(select) : '*';
    let sql = `SELECT ${columns} FROM ${table}`;
    const values: any[] = [];
    let paramIndex = 1;

    if (or) {
      const orConditions = String(or).split(',').map(cond => {
        const match = cond.match(/(\w+)\.ilike\.%(.+)%/);
        if (match) {
          values.push(`%${match[2]}%`);
          return `${match[1]} ILIKE $${paramIndex++}`;
        }
        return '';
      }).filter(Boolean);

      if (orConditions.length > 0) {
        sql += ` WHERE (${orConditions.join(' OR ')})`;
      }
    } else if (filters.length > 0) {
      const conditions = filters.map(f => {
        if (f.op === 'eq') {
          values.push(f.value);
          return `${f.column} = $${paramIndex++}`;
        } else if (f.op === 'neq') {
          values.push(f.value);
          return `${f.column} != $${paramIndex++}`;
        } else if (f.op === 'in') {
          const vals = JSON.parse(f.value);
          const placeholders = vals.map((v: any) => {
            values.push(v);
            return `$${paramIndex++}`;
          });
          return `${f.column} IN (${placeholders.join(',')})`;
        }
        return '';
      }).filter(Boolean);

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (orders.length > 0) {
      sql += ` ORDER BY ${orders.map(o => `${o.column} ${o.dir.toUpperCase()}`).join(', ')}`;
    }

    let totalCount: number | undefined;
    if (count === 'exact') {
      const countSql = `SELECT COUNT(*) FROM ${table}` +
        (filters.length > 0 ? ` WHERE ${filters.map((f, i) => `${f.column} ${f.op === 'eq' ? '=' : '!='} $${i + 1}`).join(' AND ')}` : '');
      const countResult = await pool.query(countSql, filters.map(f => f.value));
      totalCount = parseInt(countResult.rows[0].count);
    }

    if (limit) {
      sql += ` LIMIT ${parseInt(String(limit))}`;
    }
    if (offset) {
      sql += ` OFFSET ${parseInt(String(offset))}`;
    }

    const result = await pool.query(sql, values);
    res.json({ data: result.rows, count: totalCount });
  } catch (error: any) {
    console.error('Database GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const records = Array.isArray(req.body) ? req.body : [req.body];

    if (records.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const keys = Object.keys(records[0]);
    const values: any[] = [];
    const valueRows: string[] = [];
    let paramIndex = 1;

    records.forEach(record => {
      const rowPlaceholders = keys.map(() => `$${paramIndex++}`);
      valueRows.push(`(${rowPlaceholders.join(', ')})`);
      keys.forEach(key => values.push(record[key]));
    });

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${valueRows.join(', ')} RETURNING *`;
    const result = await pool.query(sql, values);

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Database POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const { data, filters } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const updates = Object.keys(data);
    const values: any[] = [];
    let paramIndex = 1;

    const setClause = updates.map(key => {
      values.push(data[key]);
      return `${key} = $${paramIndex++}`;
    }).join(', ');

    let sql = `UPDATE ${table} SET ${setClause}`;

    if (filters && filters.length > 0) {
      const conditions = filters.map((f: any) => {
        if (f.type === 'eq') {
          values.push(f.value);
          return `${f.column} = $${paramIndex++}`;
        }
        return '';
      }).filter(Boolean);

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    sql += ' RETURNING *';
    const result = await pool.query(sql, values);

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Database PATCH error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const { filters } = req.body;

    let sql = `DELETE FROM ${table}`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filters && filters.length > 0) {
      const conditions = filters.map((f: any) => {
        if (f.type === 'eq') {
          values.push(f.value);
          return `${f.column} = $${paramIndex++}`;
        } else if (f.type === 'in') {
          const vals = f.value;
          const placeholders = vals.map((v: any) => {
            values.push(v);
            return `$${paramIndex++}`;
          });
          return `${f.column} IN (${placeholders.join(',')})`;
        }
        return '';
      }).filter(Boolean);

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    sql += ' RETURNING *';
    const result = await pool.query(sql, values);

    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Database DELETE error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/rpc/:function', async (req: Request, res: Response) => {
  try {
    const { function: functionName } = req.params;

    if (functionName === 'generate_order_number') {
      const prefix = 'AH';
      const result = await pool.query(
        `SELECT order_number FROM orders WHERE order_number LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [`${prefix}-%`]
      );

      let nextNumber = 1;
      if (result.rows.length > 0) {
        const lastNumber = result.rows[0].order_number.split('-')[1];
        nextNumber = parseInt(lastNumber) + 1;
      }

      const orderNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;
      res.json({ data: orderNumber });
    } else {
      res.status(404).json({ error: 'Function not found' });
    }
  } catch (error: any) {
    console.error('RPC error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
