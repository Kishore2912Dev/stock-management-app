# Kishore Cloth & Cut Pieces – Simple Stock Management

A lightweight, modern, and easy-to-use stock management system designed specifically for Kishore Cloth & Cut Pieces. Built with simplicity so that anyone can manage godown and shop stock effortlessly with 1-tap actions.

## Key Features
- **Pure & Clean English Interface**: Zero accounting jargon — simple everyday terms: **Stock In**, **Move to Shop**, and **Sold**.
- **Unified Single-Screen Dashboard**: No confusing sub-pages or deep nested menus. Everything is visible right on one screen.
- **Clear Location Stock Counters**:
  - 🏢 **Godown Stock**: Bales stored in central storage
  - 🏠 **Shop Stock**: Bales ready for customers
  - 💰 **Total Sold**: Total sales volume
- **1-Tap Action Buttons on Every Cloth**:
  - 🟢 **+ Stock In**: Record incoming bales directly into godown
  - 🔵 **Move to Shop**: Transfer bales from godown to shop
  - 🟠 **Sold**: Deduct bales upon sale to a customer
- **Big Tactile Stepper**: Quick `+1`, `+5`, `+10` buttons for effortless quantity selection.
- **Today's Activity Log**: Clear chronological receipts of today's movements with an **Undo** button in case of mistakes.
- **Instant Excel / CSV Report**: Download the consolidated inventory report with one click.
- **1-Tap Quick Sign In**: Instant login button without requiring manual typing.

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB (Atlas)
- **Auth**: JWT

## Project Structure
```
Stock Management App/
├── client/         ← React frontend (Vite)
│   └── src/
│       ├── components/   Layout, Sidebar, ProtectedRoute
│       ├── context/      AuthContext (JWT state)
│       ├── pages/        Dashboard, Login, (more in later phases)
│       └── services/     api.js (axios)
├── server/         ← Node.js + Express backend
│   ├── config/     db.js (MongoDB connection)
│   ├── controllers/ authController, userController, itemController, transactionController
│   ├── middleware/ auth.js (JWT protect + adminOnly)
│   ├── models/     User, Item, StockTransaction
│   ├── routes/     auth, users, items, transactions
│   ├── server.js   Entry point
│   └── seed.js     Initial data seed script
└── .gitignore
```

## Setup Instructions

### 1. MongoDB Atlas Setup
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a cluster and get the connection string
3. Whitelist your IP address in Network Access

### 2. Server Setup
```bash
cd server
# Copy and fill in your MongoDB URI
copy .env.example .env
# Edit .env with your real MONGO_URI

npm install
# Create initial admin user and sample items
node seed.js
# Start development server
npm run dev
```

### 3. Client Setup
```bash
cd client
npm install
npm run dev
```

### 4. Access the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

### Default Login (after seeding)
- **Username**: `admin`
- **Password**: `admin123`
- ⚠️ **Change the password immediately after first login!**

## Development Phases
- [x] **Phase 1** – Project Setup (React + Node + Express + MongoDB)
- [x] **Phase 2** – Authentication & User Management (JWT Auth, Login, User Management, Password Reset & Change)
- [x] **Phase 3** – Item Management (CRUD, Search & Filter, Status toggle, Opening Stock)
- [x] **Phase 4** – Stock Management (Purchase to Godown, Godown Stock View, Dispatch to Home, Home Sales)
- [x] **Phase 5** – Dashboard & Reports (Real-time KPI metrics, Stock Reports with CSV export, Transaction Ledger with Admin Reversal)
- [x] **Phase 6** – Responsive Design (Mobile drawer navigation, adaptive tables, cards, and modals)
- [ ] **Phase 7** – Testing & Production Deployment (MongoDB Atlas configuration, environment setup, hosting)

## API Endpoints
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | /api/auth/login | Public | Login with username and password |
| GET | /api/auth/me | Auth | Get current authenticated user |
| PUT | /api/auth/change-password | Auth | Change password for logged-in user |
| GET | /api/users | Admin | List all staff/admin users |
| POST | /api/users | Admin | Create a new user |
| PUT | /api/users/:id | Admin | Update user name, role, or status |
| PUT | /api/users/:id/reset-password | Admin | Reset user password |
| GET | /api/items | Auth | List items with search and status filter |
| GET | /api/items/:id | Auth | Get single item details |
| POST | /api/items | Admin | Create new textile item |
| PUT | /api/items/:id | Admin | Update item name, description, or status |
| GET | /api/transactions/dashboard | Auth | Dashboard metrics and recent 10 transactions |
| GET | /api/transactions/stock-report | Auth | Stock summary per item (Godown, Home, Sold, Total) |
| GET | /api/transactions | Auth | Paginated transaction audit ledger with filters |
| POST | /api/transactions/purchase | Auth | Record incoming purchase into godown |
| POST | /api/transactions/dispatch | Auth | Transfer stock from godown to home |
| POST | /api/transactions/sale | Auth | Record outgoing sale from home stock |
| POST | /api/transactions/opening-stock | Admin | Record opening stock entry |
| POST | /api/transactions/:id/reverse | Admin | Reverse transaction with mandatory reason |
