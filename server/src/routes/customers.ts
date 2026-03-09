import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface CustomerBody {
  full_name_en: string;
  full_name_ku: string;
  address_en?: string;
  address_ku?: string;
  phone: string;
  phone_secondary?: string;
  national_id_number?: string;
  national_id_image_url?: string;
  guarantor_name_en?: string;
  guarantor_name_ku?: string;
  guarantor_workplace_en?: string;
  guarantor_workplace_ku?: string;
  guarantor_phone?: string;
  salary_deduction_consent?: boolean;
  notes_en?: string;
  notes_ku?: string;
  is_active?: boolean;
}

// Get all customers
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM customers ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by ID
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM customers WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
router.post('/', verifyToken, async (req: Request<{}, {}, CustomerBody>, res: Response) => {
  try {
    const {
      full_name_en,
      full_name_ku,
      address_en = '',
      address_ku = '',
      phone,
      phone_secondary = '',
      national_id_number = '',
      national_id_image_url = '',
      guarantor_name_en = '',
      guarantor_name_ku = '',
      guarantor_workplace_en = '',
      guarantor_workplace_ku = '',
      guarantor_phone = '',
      salary_deduction_consent = false,
      notes_en = '',
      notes_ku = '',
      is_active = true,
    } = req.body;

    if (!full_name_en || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO customers (
        id, full_name_en, full_name_ku, address_en, address_ku, phone, phone_secondary,
        national_id_number, national_id_image_url, guarantor_name_en, guarantor_name_ku,
        guarantor_workplace_en, guarantor_workplace_ku, guarantor_phone,
        salary_deduction_consent, notes_en, notes_ku, is_active, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
       RETURNING *`,
      [
        id, full_name_en, full_name_ku, address_en, address_ku, phone, phone_secondary,
        national_id_number, national_id_image_url, guarantor_name_en, guarantor_name_ku,
        guarantor_workplace_en, guarantor_workplace_ku, guarantor_phone,
        salary_deduction_consent, notes_en, notes_ku, is_active, req.user?.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.put('/:id', verifyToken, async (req: Request<{ id: string }, {}, Partial<CustomerBody>>, res: Response) => {
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
      `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM customers WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
