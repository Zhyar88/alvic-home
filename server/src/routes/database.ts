import { Router, Request, Response } from 'express';
import pool from '../config/database.js';

const router = Router();

router.get('/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    console.log('TABLE:', table);
console.log('QUERY:', req.query);
console.log('BUILT SQL will be logged below');
    const { select, count, limit, offset, or } = req.query;

    const filters: Array<{ column: string; op: string; value: any }> = [];
    const orders: Array<{ column: string; dir: string }> = [];

    Object.keys(req.query).forEach(key => {
      if (key.startsWith('filter_')) {
        const raw = String(req.query[key]);
        const firstColon = raw.indexOf(':');
        const secondColon = raw.indexOf(':', firstColon + 1);
        if (firstColon !== -1 && secondColon !== -1) {
          filters.push({
            column: raw.substring(0, firstColon),
            op: raw.substring(firstColon + 1, secondColon),
            value: raw.substring(secondColon + 1),
          });
        }
      } else if (key.startsWith('order_')) {
        const parts = String(req.query[key]).split(':');
        if (parts.length === 2) {
          orders.push({ column: parts[0], dir: parts[1] });
        }
      }
    });

    // Parse PostgREST-style join syntax: alias:join_table(col1,col2)
    // e.g. "*, category:expense_categories(name_en,name_ku)"
    const joins: Array<{ alias: string; joinTable: string; cols: string[] }> = [];
let cleanSelect = `${table}.*`;

if (select && String(select) !== '*') {
  const selectStr = String(select);
  
  // Split only on commas that are NOT inside parentheses
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of selectStr) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());

  const plainCols: string[] = [];

  parts.forEach(part => {
    const joinMatch = part.match(/^(\w+):(\w+)\((.+)\)$/);
    if (joinMatch) {
      joins.push({
        alias: joinMatch[1],
        joinTable: joinMatch[2],
        cols: joinMatch[3].split(',').map(c => c.trim()),
      });
    } else if (part !== '*') {
      plainCols.push(`${table}.${part}`);
    }
  });

  const selectParts: string[] = plainCols.length > 0 ? plainCols : [`${table}.*`];
  joins.forEach(j => {
    j.cols.forEach(col => {
      selectParts.push(`${j.joinTable}.${col} AS ${j.alias}__${col}`);
    });
  });
  cleanSelect = selectParts.join(', ');
}

    let sql = `SELECT ${cleanSelect} FROM ${table}`;

    // Add LEFT JOINs — need foreign key mapping
    const joinKeyMap: Record<string, { fk: string; pk: string }> = {
      expense_categories: { fk: `${table}.category_id`, pk: 'expense_categories.id' },
      customers:          { fk: `${table}.customer_id`, pk: 'customers.id' },
      user_profiles:      { fk: `${table}.user_id`,     pk: 'user_profiles.user_id' },
      orders:             { fk: `${table}.order_id`,    pk: 'orders.id' },
      installment_entries: { fk: `${table}.installment_entry_id`, pk: 'installment_entries.id' },
    };

    joins.forEach(j => {
      const key = joinKeyMap[j.joinTable];
      if (key) {
        sql += ` LEFT JOIN ${j.joinTable} ON ${key.fk} = ${key.pk}`;
      }
    });

    const values: any[] = [];
    let paramIndex = 1;

    if (or) {
      const orConditions = String(or).split(',').map(cond => {
        const match = cond.match(/(\w+)\.ilike\.%(.+)%/);
        if (match) {
          values.push(`%${match[2]}%`);
          return `${table}.${match[1]} ILIKE $${paramIndex++}`;
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
          return `${table}.${f.column} = $${paramIndex++}`;
        } else if (f.op === 'neq') {
          values.push(f.value);
          return `${table}.${f.column} != $${paramIndex++}`;
        } else if (f.op === 'gte') {
          values.push(f.value);
          return `${table}.${f.column}::date >= $${paramIndex++}::date`;
        } else if (f.op === 'lte') {
          values.push(f.value);
          return `${table}.${f.column}::date <= $${paramIndex++}::date`;
        } else if (f.op === 'in') {
          const vals = JSON.parse(f.value);
          const placeholders = vals.map((v: any) => {
            values.push(v);
            return `$${paramIndex++}`;
          });
          return `${table}.${f.column} IN (${placeholders.join(',')})`;
        }
        return '';
      }).filter(Boolean);
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (orders.length > 0) {
      sql += ` ORDER BY ${orders.map(o => `${table}.${o.column} ${o.dir.toUpperCase()}`).join(', ')}`;
    }

    let totalCount: number | undefined;
    if (count === 'exact') {
      const countSql = `SELECT COUNT(*) FROM ${table}` +
        (filters.length > 0 ? ` WHERE ${filters.map((f, i) => `${table}.${f.column} ${f.op === 'eq' ? '=' : '!='} $${i + 1}`).join(' AND ')}` : '');
      const countResult = await pool.query(countSql, filters.map(f => f.value));
      totalCount = parseInt(countResult.rows[0].count);
    }

    if (limit) sql += ` LIMIT ${parseInt(String(limit))}`;
    if (offset) sql += ` OFFSET ${parseInt(String(offset))}`;

    const result = await pool.query(sql, values);
console.log('FINAL SQL:', sql);
console.log('VALUES:', values);
    // Re-nest joined columns back into alias object: { category_name_en, category_name_ku } → { category: { name_en, name_ku } }
    const rows = result.rows.map(row => {
      const newRow = { ...row };
      joins.forEach(j => {
        const nested: Record<string, any> = {};
        j.cols.forEach(col => {
          const key = `${j.alias}__${col}`;
          if (key in newRow) {
            nested[col] = newRow[key];
            delete newRow[key];
          }
        });
        newRow[j.alias] = nested;
      });
      return newRow;
    });

    res.json({ data: rows, count: totalCount });
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
    console.log(`PATCH ${table}:`, JSON.stringify({ data, filters }, null, 2));

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
