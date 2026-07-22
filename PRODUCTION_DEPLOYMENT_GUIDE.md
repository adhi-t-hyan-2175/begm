# 🚀 PRODUCTION DEPLOYMENT GUIDE

This guide provides the necessary steps to deploy the BETX platform to a production environment (e.g., Render, Railway, Heroku, or VPS).

## 1. Environment Variables
You must configure the following environment variables on both your backend and frontend deployment services.

### Backend (`backend/.env`)
```env
PORT=5002
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_PASSWORD=your_secure_admin_password
```

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend-domain.com/api
```

> [!WARNING]
> Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend environment variables. Only the `ANON_KEY` should be present in the frontend.

## 2. Process Management (PM2)
If you are deploying to a VPS (like AWS EC2, DigitalOcean Droplet), use PM2 to keep the backend running reliably.

```bash
cd backend
npm install -g pm2
pm2 start server.js --name "betx-backend"
pm2 save
pm2 startup
```

## 3. Architecture Context: `round_id`
The system synchronizes all realtime updates, wallet settlements, and history tracking using the `round_id` column, not the `period` string.
- `period`: Retained solely for UI display (loops `001` -> `999`).
- `round_id`: A monotonically increasing integer assigned uniquely to every round globally.

## 4. Monitoring & Health
The backend exposes health monitoring endpoints:
- **Liveness:** `GET /api/ready`
- **Readiness/Health:** `GET /api/health`

You should point your load balancer or deployment platform's health check to `/api/health` to ensure the instance is restarted automatically if it loses connection to the database.
