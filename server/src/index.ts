// Load environment variables FIRST before any other imports
import './env.js';

import express from 'express';
import cors from 'cors';
import { join } from 'path';

// Import routes (these will now have env variables available)
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import customersRoutes from './routes/customers.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import installmentsRoutes from './routes/installments.js';
import expensesRoutes from './routes/expenses.js';
import exchangeRatesRoutes from './routes/exchange-rates.js';
import lockSessionsRoutes from './routes/lock-sessions.js';
import reportsRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import databaseRoutes from './routes/database.js';
import uploadRoutes from './routes/upload.js';
import backupRouter from './routes/backup.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/installments', installmentsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/lock-sessions', lockSessionsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/db', databaseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/backup', backupRouter);
// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// local
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

// server
// app.listen(3000, '0.0.0.0', () => {
//   console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
//   console.log(`📊 API endpoints available at http://0.0.0.0:${PORT}/api`);
// });
export default app;
