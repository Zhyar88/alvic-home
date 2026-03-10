# Alvich Home - Cash Register System

## Database Setup Complete

Your Neon PostgreSQL database has been successfully configured with all tables and data.

### Database Information

- **Database**: Neon PostgreSQL
- **Connection**: Configured in `.env` and `server/.env`
- **Tables Created**: 14 tables including users, orders, customers, payments, installments, etc.

### Default Login Credentials

```
Username: admin
Password: admin123
Email: admin@alvichome.com
```

## Running the Application

### 1. Start the Backend Server

```bash
cd server
npm start
```

The backend API will run on `http://localhost:3000`

### 2. Start the Frontend (in a new terminal)

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Access the Application

Open your browser and navigate to `http://localhost:5173`

Log in with the admin credentials above.

## Architecture

The application uses:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Neon PostgreSQL
- **Authentication**: JWT tokens

### How Data Flows

1. Frontend components use the `supabase` client from `src/lib/database.ts`
2. This client makes HTTP requests to the backend API at `/api/db/*`
3. The backend server (`server/src/routes/database.ts`) translates these into PostgreSQL queries
4. Data is fetched from/written to your Neon database

## Database Tables

- `auth_users` - User authentication
- `user_profiles` - User profile information
- `customers` - Customer records
- `customer_documents` - Customer document uploads
- `orders` - Sales orders
- `order_items` - Order line items
- `payments` - Payment records
- `installment_schedules` - Installment payment plans
- `installment_entries` - Individual installment payments
- `expenses` - Business expenses
- `exchange_rates` - Currency exchange rates
- `lock_sessions` - Cash register sessions
- `lock_transactions` - Session transactions
- `audit_logs` - System audit trail

## Troubleshooting

### If you can't see data:

1. Make sure the backend server is running on port 3000
2. Check that `.env` has `VITE_API_URL=http://localhost:3000/api`
3. Check browser console for any errors
4. Verify you're logged in with valid credentials

### If Orders page is blank:

1. Open browser developer tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab to see if API calls are succeeding
4. Ensure backend server is running

### Database Connection Issues:

The database connection string is in:
- `server/.env` - Used by backend server
- `.env` - Not used directly but kept for reference

## Next Steps

1. Log in with admin credentials
2. Create additional users if needed (Users page)
3. Add customers (Customers page)
4. Create exchange rates (Exchange Rates page)
5. Start creating orders (Orders page)

## Support

For issues or questions, check the application logs:
- Frontend: Browser console (F12)
- Backend: Terminal where server is running
