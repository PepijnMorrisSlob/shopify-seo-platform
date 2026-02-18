# Deployment Guide

**Last Updated:** 2026-02-16 14:00 (CET)

## Quick Deploy Commands

### Step 1: GitHub Authentication
Run this in your terminal:
```bash
~/scoop/shims/gh auth login
```
- Choose: GitHub.com
- Choose: HTTPS
- Choose: Login with a web browser
- Enter the code shown in your browser

### Step 2: Create GitHub Repository
```bash
cd C:/Users/pepij/shopify-seo-platform
~/scoop/shims/gh repo create shopify-seo-platform --public --source=. --push
```

### Step 3: Deploy Backend to Railway
```bash
cd C:/Users/pepij/shopify-seo-platform/backend
railway up
```

### Step 4: Deploy Frontend to Vercel
```bash
cd C:/Users/pepij/shopify-seo-platform/frontend
npx vercel --prod
```

---

## Environment Variables Needed

### Backend (Railway)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.railway.app
```

---

## Current Status

- [x] Git repository initialized
- [x] Initial commit: 393 files
- [x] Railway project created
- [ ] GitHub repo created
- [ ] Pushed to GitHub
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
