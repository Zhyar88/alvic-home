import { Router, Request, Response } from 'express';
import pool from '../config/database.js';

const router = Router();

router.get('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const { select, count, limit, offset, or } = req.query;

    // Sanitize table name (only allow alphanumeric and underscore)
    const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedTable !== table) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

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

    // Sanitize column names in select
    let columns = '*';
    if (select && select !== '*') {
      const cols = String(select).split(',').map(c => c.trim());
      const sanitizedCols = cols.filter(c => /^[a-zA-Z0-9_]+$/.test(c));
      if (sanitizedCols.length !== cols.length) {
        return res.status(400).json({ error: 'Invalid column names' });
      }
      columns = sanitizedCols.join(', ');
    }

    let sql = `SELECT ${columns} FROM ${sanitizedTable}`;
    const values: any[] = [];
    let paramIndex = 1;

    if (or) {
      const orConditions = String(or).split(',').map(cond => {
        const match = cond.match(/(\w+)\.ilike\.%(.+)%/);
        if (match) {
          const column = match[1];
          const searchValue = match[2];
          // Sanitize column name
          if (!/^[a-zA-Z0-9_]+$/.test(column)) return '';
          values.push(`%${searchValue}%`);
          return `${column} ILIKE $${paramIndex++}`;
        }
        return '';
      }).filter(Boolean);

      if (orConditions.length > 0) {
        sql += ` WHERE (${orConditions.join(' OR ')})`;
      }
    } else if (filters.length > 0) {
      const conditions = filters.map(f => {
        // Sanitize column name
        if (!/^[a-zA-Z0-9_]+$/.test(f.column)) return '';

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
      const orderClauses = orders.map(o => {
        // Sanitize column name and direction
        if (!/^[a-zA-Z0-9_]+$/.test(o.column)) return '';
        const dir = o.dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        return `${o.column} ${dir}`;
      }).filter(Boolean);

      if (orderClauses.length > 0) {
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }
    }

    let totalCount: number | undefined;
    if (count === 'exact') {
      const countSql = `SELECT COUNT(*) FROM ${sanitizedTable}` +
        (filters.length > 0 ? ` WHERE ${filters.map((f, i) => `${f.column} ${f.op === 'eq' ? '=' : '!='} $${i + 1}`).join(' AND ')}` : '');
      const countResult = await pool.query(countSql, filters.map(f => f.value));
      totalCount = parseInt(countResult.rows[0].count);
    }

    if (limit) {
      const limitNum = parseInt(String(limit));
      if (isNaN(limitNum) || limitNum < 0) {
        return res.status(400).json({ error: 'Invalid limit' });
      }
      sql += ` LIMIT ${limitNum}`;
    }
    if (offset) {
      const offsetNum = parseInt(String(offset));
      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({ error: 'Invalid offset' });
      }
      sql += ` OFFSET ${offsetNum}`;
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

    // Sanitize table name
    const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedTable !== table) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const records = Array.isArray(req.body) ? req.body : [req.body];

    if (records.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const keys = Object.keys(records[0]);

    // Sanitize column names
    const sanitizedKeys = keys.filter(k => /^[a-zA-Z0-9_]+$/.test(k));
    if (sanitizedKeys.length !== keys.length) {
      return res.status(400).json({ error: 'Invalid column names' });
    }

    console.log(`📝 Inserting into ${sanitizedTable}:`, sanitizedKeys);

    const values: any[] = [];
    const valueRows: string[] = [];
    let paramIndex = 1;

    records.forEach(record => {
      const rowPlaceholders = sanitizedKeys.map(() => `$${paramIndex++}`);
      valueRows.push(`(${rowPlaceholders.join(', ')})`);
      sanitizedKeys.forEach(key => values.push(record[key]));
    });

    const sql = `INSERT INTO ${sanitizedTable} (${sanitizedKeys.join(', ')}) VALUES ${valueRows.join(', ')} RETURNING *`;
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

    // Sanitize table name
    const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedTable !== table) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const updates = Object.keys(data);

    // Sanitize column names
    const sanitizedUpdates = updates.filter(k => /^[a-zA-Z0-9_]+$/.test(k));
    if (sanitizedUpdates.length !== updates.length) {
      return res.status(400).json({ error: 'Invalid column names' });
    }

    const values: any[] = [];
    let paramIndex = 1;

    const setClause = sanitizedUpdates.map(key => {
      values.push(data[key]);
      return `${key} = $${paramIndex++}`;
    }).join(', ');

    let sql = `UPDATE ${sanitizedTable} SET ${setClause}`;

    if (filters && filters.length > 0) {
      const conditions = filters.map((f: any) => {
        // Sanitize column name
        if (!/^[a-zA-Z0-9_]+$/.test(f.column)) return '';

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

    // Sanitize table name
    const sanitizedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    if (sanitizedTable !== table) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    let sql = `DELETE FROM ${sanitizedTable}`;
    const values: any[] = [];
    let paramIndex = 1;

    if (filters && filters.length > 0) {
      const conditions = filters.map((f: any) => {
        // Sanitize column name
        if (!/^[a-zA-Z0-9_]+$/.test(f.column)) return '';

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
