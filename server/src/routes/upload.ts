import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const customerId = req.params.customerId;
    const dir = path.join(process.cwd(), 'uploads', 'customer-documents', customerId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({ storage });

router.post('/:customerId', verifyToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { customerId } = req.params;
    const filePath = `${customerId}/${req.file.filename}`;
    res.json({ path: filePath, filename: req.file.filename });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:customerId/:filename', verifyToken, async (req: Request, res: Response) => {
  try {
    const { customerId, filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'customer-documents', customerId, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;