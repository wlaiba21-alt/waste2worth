# Waste2Worth

A full-stack MERN recycling marketplace that connects waste generators with recycling vendors. Users submit pickup requests, vendors process waste into products, and those products are listed in an online store with automated commission distribution.

---

## Features

| Module | Description |
|--------|-------------|
| **Vendor Marketplace** | Browse vendors by waste category (Paper, Plastic, Metal, Glass, Rubber, Cloth), view portfolios, and submit pickup requests |
| **Recycling Workflow** | Full request lifecycle: submit ? accept ? assign rider ? pickup ? recycle ? product creation |
| **Recycled Store** | Vendors create products from recycled waste; original owners choose **Take Back** or **List in Store** |
| **Product Reviews & Ratings** | Buyers review purchased products and completed requests; vendors can reply |
| **Payments & Wallet** | Wallet top-up via Stripe Checkout + Cash on Delivery (COD); automated commission split on every sale |
| **Real-time Chat** | Live user ? vendor messaging via Socket.io |
| **AI Waste Detection** | Upload a waste image ? Gemini AI classifies category and suggests relevant vendors |
| **Rider Dashboard** | Riders manage assigned pickup and delivery tasks |
| **Admin Dashboard** | Full controls: users, vendors, riders, requests, orders, analytics, earnings |
| **Role-based Access** | Separate dashboards and permissions for User, Vendor, Rider, and Admin |

### Commission Split (Store Sales)

| Party | Share |
|-------|-------|
| Vendor (recycles & lists) | 60% |
| Waste Owner (original user) | 25% |
| Platform (Admin) | 15% |

---

## Tech Stack

### Frontend
- **React 18** + **Vite** (dev server: port 5180)
- **TypeScript**, **Tailwind CSS**
- **React Router v6**, **Axios**
- **Framer Motion**, **Lucide React**, **Recharts**, **Sonner**
- **Socket.io Client**, **@react-oauth/google**

### Backend
- **Node.js** + **Express** (port 5001)
- **MongoDB** + **Mongoose 8**
- **JWT** (`jsonwebtoken`) + **bcryptjs**
- **Multer** (file uploads), **Socket.io**
- **Stripe Node SDK** (payment intents & checkout sessions)
- **@google/generative-ai** (Gemini API — AI waste detection)
- **google-auth-library** (Google OAuth), **express-validator**
- **CORS**, **Morgan**

---

## Folder Structure

```
waste2worth/
+-- src/                          # React Frontend (Vite)
¦   +-- api/
¦   ¦   +-- index.js              # Axios client + all API endpoint functions
¦   +-- components/               # Shared UI components
¦   +-- context/
¦   ¦   +-- AuthContext.jsx       # Global auth state (JWT)
¦   +-- data/
¦   ¦   +-- mockData.js           # Static categories & mock data
¦   +-- lib/
¦   ¦   +-- socket.js             # Socket.io client singleton
¦   +-- pages/
¦   ¦   +-- admin/                # Admin dashboard pages
¦   ¦   +-- rider/                # Rider dashboard pages
¦   ¦   +-- store/                # Store listing, detail, checkout
¦   ¦   +-- user/                 # User dashboard pages
¦   ¦   +-- vendor/               # Vendor dashboard pages
¦   +-- App.jsx                   # Routes + protected routes + layouts
¦   +-- index.tsx                 # React entry point
¦   +-- index.css                 # Global styles + Tailwind directives
+-- backend/
¦   +-- src/
¦   ¦   +-- config/               # DB connection + commission constants
¦   ¦   +-- middleware/           # Auth, error handler, file upload
¦   ¦   +-- models/               # Mongoose schemas (12 models)
¦   ¦   +-- routes/               # Express REST route modules (13 routes)
¦   ¦   +-- services/             # AI, notifications, payments, wallet
¦   ¦   +-- sockets/              # Socket.io chat & notification handlers
¦   ¦   +-- utils/                # asyncHandler, commission split, token
¦   ¦   +-- app.js                # Express app setup
¦   ¦   +-- index.js              # Server entry point (HTTP + Socket.io)
¦   ¦   +-- seed.js               # Database seed script
¦   +-- uploads/                  # User-uploaded files (gitignored)
¦   +-- .env.example
¦   +-- package.json
+-- .env.example                  # Frontend env template
+-- vite.config.ts                # Vite config + backend proxy
+-- tailwind.config.js
+-- postcss.config.js
+-- tsconfig.json
+-- package.json
```

---

## Prerequisites

- **Node.js** 18+ (v20 LTS recommended)
- **npm** 9+
- **MongoDB** 7+ — [MongoDB Community Server](https://www.mongodb.com/try/download/community)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/muhammadaswab18/waste2worth.git
cd waste2worth
```

### 2. Install dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### 3. Configure environment variables

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Fill in the values (see Environment Variables section below).

### 4. Start MongoDB

- **Windows:** Start via MongoDB Compass or Services panel
- **macOS:** `brew services start mongodb-community@7.0`
- **Linux:** `sudo systemctl start mongod`

### 5. Seed demo data (first time only)

```bash
npm run seed
```

### 6. Start the application

```bash
npm run dev:full        # Start frontend + backend together

# Or separately:
npm run dev             # Frontend ? http://localhost:5180
npm run dev:api         # Backend  ? http://localhost:5001
```

---

## Environment Variables

### Frontend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Backend base URL. Leave as `/api` in dev (Vite proxies automatically). |
| `VITE_GOOGLE_CLIENT_ID` | *(optional)* | Google OAuth 2.0 Client ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | *(optional)* | Stripe publishable key for wallet top-up |

### Backend (`backend/.env`)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `5001` | ? | Backend HTTP port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/waste2worth` | ? | MongoDB connection string |
| `JWT_SECRET` | *random string* | ? | JWT signing secret |
| `CLIENT_URL` | `http://localhost:5180` | ? | Frontend URL (CORS whitelist) |
| `COMMISSION_VENDOR` | `0.60` | ? | Vendor commission share |
| `COMMISSION_USER` | `0.25` | ? | Waste owner commission share |
| `COMMISSION_ADMIN` | `0.15` | ? | Platform commission share |
| `STRIPE_SECRET_KEY` | `sk_test_...` | ? | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | ? | Stripe publishable key |
| `GOOGLE_CLIENT_ID` | `*.apps.googleusercontent.com` | ? | Google OAuth Client ID |
| `GEMINI_API_KEY` | `AIza...` | ? | Gemini API key for AI detection |

---

## Demo Accounts

Password for **all** demo accounts: **`password123`**

| Role | Email | Dashboard |
|------|--------|-----------|
| User | `user@waste2worth.com` | `/dashboard` |
| User | `mike@waste2worth.com` | `/dashboard` |
| Vendor | `vendor@waste2worth.com` | `/vendor/dashboard` |
| Vendor | `metal@waste2worth.com` | `/vendor/dashboard` |
| Admin | `admin@waste2worth.com` | `/admin/dashboard` |
| Rider | Create via Admin dashboard | `/rider/dashboard` |

---

## Usage

1. **Submit a Recycling Request** — Login as User ? Browse `/vendors` ? Select vendor ? Submit pickup request ? Vendor accepts ? Rider assigned ? Waste recycled

2. **Post-Recycling Choice** — Visit `/dashboard/product-choice` ? Choose **Take Back** or **List in Store** to earn commission on sale

3. **Buy Recycled Products** — Visit `/store` ? Checkout with Wallet (Stripe top-up) or COD ? Leave review after delivery

4. **Vendor Workflow** — Accept requests ? Mark complete ? Create product ? Manage inventory & earnings

5. **Admin Controls** — Manage users/vendors/riders ? View requests/orders ? Monitor analytics

6. **AI Waste Detector** — Go to `/ai-detect` ? Upload waste image ? Get category + vendor suggestions

7. **Real-time Chat** — Navigate to `/chat` ? Message vendors directly

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite frontend (http://localhost:5180) |
| `npm run build` | Build frontend for production ? `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run dev:api` | Start backend (http://localhost:5001) |
| `npm run dev:full` | Start frontend + backend together |
| `npm run seed` | Seed database with demo data |

---

## API Reference

- **Base URL (Dev):** `http://localhost:5001/api`
- **Health Check:** `GET /api/health`
- **Static Uploads:** `GET /uploads/*`

| Route | Description |
|-------|-------------|
| `/api/auth` | Login, register, Google OAuth, profile, password reset |
| `/api/vendors` | Vendor listing, profiles, portfolios, availability |
| `/api/requests` | Recycling request CRUD, rider assign, status transitions |
| `/api/store` | Product listing, detail, checkout sessions, purchase |
| `/api/orders` | Order management, delivery flow, COD confirm |
| `/api/reviews` | Submit/edit reviews, vendor replies |
| `/api/wallet` | Balance, transactions, Stripe top-up |
| `/api/chat` | Message threads, messages, mark-as-read |
| `/api/notifications` | List and mark notifications |
| `/api/addresses` | User saved addresses CRUD |
| `/api/admin/*` | Admin stats, users, vendors, riders, analytics |
| `/api/rider/*` | Rider profile, availability, task list |
| `/api/ai` | Gemini-powered waste image detection |

---

## Deployment

### Frontend (Vercel / Netlify / Cloudflare Pages)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Env Var:** `VITE_API_URL=https://your-backend-domain.com/api`

### Backend (Render / Railway / Fly.io)
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Required Env Vars:** `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `PORT`
- **Health Check:** `/api/health`
- WebSockets must be enabled for Socket.io (chat & notifications)

> **Note on file uploads:** Default Multer config uses local disk storage. For production, replace with cloud storage (S3, Cloudinary, etc.) in `backend/src/middleware/upload.js`.

---

## License

MIT © 2025 Waste2Worth
