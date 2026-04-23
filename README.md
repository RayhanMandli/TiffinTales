# TiffinTales 🍱

A full-stack tiffin marketplace where customers discover and order homemade meals, providers manage menus and orders, and admins oversee users and platform activity.

## Overview

TiffinTales is built as a **monorepo** with:

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: Node.js + Express + MongoDB + Mongoose
- **Realtime**: Socket.IO for live menu/order updates
- **Media**: Cloudinary for profile, meal, and review image uploads

---

## Repository Structure

```text
TiffinTales/
├─ frontend/   # Next.js client app
├─ backend/    # Express API server
└─ FRONTEND_BACKEND_INTEGRATION.md
```

---

## Core Features

### Customer
- Register/login and manage profile
- Browse tiffins, search, filter, and view details
- Find nearby meals (location-based discovery)
- Add meals + extras to cart
- Place and track orders
- Cancel eligible orders
- Add/edit/delete meal reviews with photos

### Provider (Chef)
- Create/edit/delete tiffin menus
- Configure included items and optional extras
- Toggle menu availability
- Update provider location for nearby discovery
- Manage order lifecycle (`pending → confirmed → preparing → ready → delivered`)
- Receive real-time order notifications

### Admin
- View platform users
- Filter users by role
- Delete users (with restrictions enforced by backend)
- View aggregate platform stats on dashboard

### Realtime
- `menu:updated`, `meal:deleted`
- `order:new`, `order:updated`, `order:cancelled`

---

## Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- Framer Motion
- socket.io-client

### Backend
- Express.js
- MongoDB + Mongoose
- JWT authentication
- bcryptjs
- Multer + Cloudinary
- Socket.IO

---

## Environment Variables

### Backend (`backend/.env`)
Copy from `.env.example` and set real values:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secure_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

> Important: never commit real credentials.

---

## Getting Started

### 1) Install dependencies

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

### 2) Start backend

```bash
cd backend
npm run dev
```

Backend defaults to: `http://localhost:5000`

### 3) Start frontend

```bash
cd frontend
npm run dev
```

Frontend defaults to: `http://localhost:3000`

---

## Scripts

### Backend
```bash
npm run dev    # nodemon server
npm start      # production server
npm test       # jest (currently no test files)
```

### Frontend
```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

## API Summary

Base URL: `http://localhost:5000/api`

- **Auth**: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`
- **Users**: `/users`, `/users/:id`, `/users/:id/profile-photo`, `/users/location`
- **Meals**: `/meals`, `/meals/:id`, `/meals/nearby`, `/meals/provider/me`, `/meals/:id/photo`
- **Orders**: `/orders`, `/orders/:id`
- **Reviews**: `/meals/:mealId/reviews`, `/reviews/:id`

See `backend/README.md` for full endpoint details.

---

## Real-time Socket Rooms

Backend socket subscriptions:

- `join:meal` / `leave:meal`
- `join:provider`
- `join:user`

Used for live menu and order updates in the frontend.

---

## Data Model Highlights

- **User**: role (`customer | provider | admin`), profile, geolocation (`location`)
- **Meal**: meal type, base price, included items, optional extras, provider geolocation mirror (`providerLocation`)
- **Order**: quantity, extras, computed `totalPrice`, status workflow
- **Review**: rating, text, photos

---

## Validation Notes (Current Repo Baseline)

During baseline checks in this environment:

- `backend npm test` exits with **No tests found** (no test files currently present)
- `frontend npm run lint` triggers interactive Next.js ESLint setup when no config exists
- `frontend npm run build` failed here due blocked network access to Google Fonts (`next/font` fetching Inter)

These are environment/repo-state constraints, not README-specific issues.

---

## Security Notes

- Use strong `JWT_SECRET` values in real deployments
- Keep all Cloudinary and DB credentials private
- Review `backend/.env.example` and rotate any exposed keys before production
- Restrict CORS `CLIENT_URL` to trusted origins

---

## Useful Pages

- `/` — landing + nearby tiffins + cart actions
- `/meals` and `/meals/[id]` — meal discovery/details
- `/cart` — checkout from selected tiffins
- `/orders` — customer/provider order management
- `/dashboard` — customer summary
- `/chef` and `/chef/meals` — provider dashboards
- `/admin` — admin dashboard
- `/test-connection` — frontend/backend integration smoke checks

---

## Contributing

1. Create a branch
2. Make scoped changes
3. Run relevant scripts
4. Open a PR with clear context

---

## License

Backend `package.json` declares `ISC`.
