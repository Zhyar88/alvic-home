# Cash Register Management System - Backend

This is a complete Node.js/Express backend for the Cash Register Management System with PostgreSQL database.

## Backend Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.ts          # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.ts              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.ts              # Login/Register
│   │   ├── users.ts             # User management
│   │   ├── customers.ts         # Customer CRUD
│   │   ├── orders.ts            # Orders and order items
│   │   ├── payments.ts          # Payment records
│   │   ├── installments.ts      # Installment schedules
│   │   ├── expenses.ts          # Expenses and categories
│   │   ├── exchange-rates.ts    # Currency exchange rates
│   │   ├── lock-sessions.ts     # Cash register sessions
│   │   ├── reports.ts           # Analytics and reports
│   │   └── audit.ts             # Audit logs
│   └── index.ts                 # Express server setup
├── .env                         # Environment variables
└── package.json
```

## Database Setup

The PostgreSQL database from Bolt is already configured. A new `auth_users` table has been created for Express authentication separate from Supabase auth.

Connection string is in `server/.env`:
```
DATABASE_URL=postgresql://[connection-string]
```

## Running the Backend

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   Edit `server/.env` and update:
   ```
   PORT=3000
   DATABASE_URL=postgresql://[your-connection]
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

   The server will run at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order with items
- `POST /api/orders` - Create order with items
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/order/:orderId` - Get payments for order
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Installments
- `GET /api/installments` - Get all installments
- `GET /api/installments/order/:orderId` - Get installments for order
- `POST /api/installments` - Create installment
- `PUT /api/installments/:id` - Update installment
- `DELETE /api/installments/:id` - Delete installment

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/categories` - Get expense categories
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Exchange Rates
- `GET /api/exchange-rates` - Get all rates
- `GET /api/exchange-rates/current` - Get current active rates
- `POST /api/exchange-rates` - Create rate
- `PUT /api/exchange-rates/:id` - Update rate

### Lock Sessions (Cash Register)
- `GET /api/lock-sessions` - Get all sessions
- `GET /api/lock-sessions/current` - Get current open session
- `GET /api/lock-sessions/:id/transactions` - Get session transactions
- `POST /api/lock-sessions` - Open new session
- `PUT /api/lock-sessions/:id/close` - Close session
- `POST /api/lock-sessions/:id/transactions` - Add transaction

### Reports
- `GET /api/reports/dashboard?startDate=&endDate=` - Dashboard stats
- `GET /api/reports/sales?startDate=&endDate=&groupBy=` - Sales report
- `GET /api/reports/collections?startDate=&endDate=` - Payment collections
- `GET /api/reports/expenses?startDate=&endDate=` - Expense report
- `GET /api/reports/customers` - Customer report
- `GET /api/reports/installments` - Installment status

### Audit Logs
- `GET /api/audit?limit=&offset=&tableName=&action=` - Get audit logs
- `GET /api/audit/record/:tableName/:recordId` - Get logs for record

## Authentication

All endpoints (except `/api/auth/login` and `/api/auth/register`) require JWT authentication.

Include the token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## Frontend Integration

The frontend has been updated with a new API client at `src/lib/api.ts` that handles all backend communication. The client automatically:
- Adds JWT tokens to requests
- Handles errors
- Manages authentication state

Set the API URL in `.env`:
```
VITE_API_URL=http://localhost:3000/api
```

## Database Tables

All tables from the Supabase migrations have been preserved:
- `auth_users` - Authentication (new for Express)
- `user_profiles` - User profile data
- `customers` - Customer information
- `orders` - Order records
- `order_items` - Order line items
- `payments` - Payment transactions
- `installment_schedules` - Payment installments
- `expenses` - Expense records
- `expense_categories` - Expense categories
- `exchange_rates` - Currency rates
- `lock_sessions` - Cash register sessions
- `lock_transactions` - Cash movements
- `audit_log` - System audit trail

## Notes

- The backend uses the existing PostgreSQL database from Bolt
- JWT tokens expire after 7 days
- All dates are stored in UTC
- Currency amounts stored as USD equivalent with exchange rates
- Row Level Security policies from Supabase migrations are preserved
- Audit logging is automatic via database triggers
