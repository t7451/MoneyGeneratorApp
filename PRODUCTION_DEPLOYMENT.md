# Production Deployment - Complete Guide

## 📦 What's Been Built

### Backend API (`/server`)
- Express.js REST API with PayPal & Plaid integrations
- Security: Helmet, CORS, rate limiting
- Health checks and metrics endpoints
- Environment-based configuration
- Multiple deployment options (Railway, Render, Fly.io, Docker)

### Web Frontend (`/web`)
- React 19 + TypeScript + Vite
- Responsive UI (desktop & mobile)
- API integration with backend
- Production build optimized
- Ready for Netlify deployment

### Mobile Apps (Existing)
- React Native Android & iOS apps
- Kotlin Multiplatform version available
- Will use same backend as web app

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend

Choose one deployment platform:

#### Option A: Railway (Recommended - Easiest)
```bash
cd server

# Install Railway CLI
npm i -g @railway/cli

# Login and initialize
railway login
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set BACKEND_PORT=4000
railway variables set CORS_ORIGIN=https://your-app.netlify.app
railway variables set AUTH_USER_TOKEN=$(openssl rand -base64 32)
railway variables set AUTH_ADMIN_TOKEN=$(openssl rand -base64 32)
railway variables set PAYPAL_WEBHOOK_SECRET=your-paypal-secret
railway variables set PLAID_WEBHOOK_SECRET=your-plaid-secret
railway variables set CRM_WEBHOOK_SECRET=$(openssl rand -base64 32)

# Deploy
railway up

# Get your backend URL
railway status
```

#### Option B: Render
1. Go to [render.com](https://render.com)
2. Create New → Web Service
3. Connect GitHub repo
4. Configure:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
5. Add environment variables from `.env.production.example`
6. Deploy

#### Option C: Fly.io
```bash
cd server
fly auth login
fly launch
fly secrets set NODE_ENV=production CORS_ORIGIN=https://your-app.netlify.app
fly deploy
```

**Save your backend URL** (e.g., `https://your-app.railway.app`)

---

### Step 2: Deploy Frontend to Netlify

#### Option A: Netlify CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy from repository root
netlify deploy --prod

# When prompted:
# - Build command: npm run build
# - Publish directory: web/dist
```

#### Option B: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect GitHub repo
5. Configure:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `web/dist`
   - Node version: `20`
6. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.railway.app`
7. Click "Deploy site"

---

### Step 3: Update Configuration

After both are deployed:

#### Update Backend CORS
Set backend environment variable:
```bash
CORS_ORIGIN=https://your-netlify-app.netlify.app
```

#### Update Netlify Redirects
Edit `netlify.toml` line 11:
```toml
to = "https://your-actual-backend-url.railway.app/:splat"
```

Redeploy frontend.

---

### Step 4: Configure Payment Providers

#### PayPal Webhooks
1. Go to PayPal Developer Dashboard
2. Configure webhook URL: `https://your-backend-url/webhooks/paypal`
3. Copy webhook secret to backend env vars

#### Plaid Webhooks  
1. Go to Plaid Dashboard
2. Configure webhook URL: `https://your-backend-url/webhooks/plaid`
3. Copy webhook secret to backend env vars

---

## ✅ Verification

### Test Backend
```bash
curl https://your-backend-url/health
# Should return: {"status":"ok","metrics":{...}}
```

### Test Frontend
1. Visit `https://your-netlify-app.netlify.app`
2. Should see "API Status: ok" badge
3. Products should load
4. Try purchasing a product

### Test Mobile Apps
Update mobile app API URL to production backend:
```javascript
const API_URL = 'https://your-backend-url.railway.app';
```

---

## 🔒 Security Checklist

- [ ] Generated secure random tokens for AUTH_USER_TOKEN and AUTH_ADMIN_TOKEN
- [ ] Set production PayPal/Plaid credentials
- [ ] Configured CORS to only allow your frontend domain
- [ ] Enabled HTTPS (automatic on Netlify/Railway)
- [ ] Set up webhook signature verification
- [ ] Rate limiting is enabled (120 req/min)
- [ ] Helmet security headers configured

---

## 📊 Monitoring

### Backend Health
- **Health endpoint**: `https://your-backend-url/health`
- Returns metrics on subscriptions, webhooks processed

### Frontend Monitoring
- Netlify provides: Build logs, analytics, error tracking

### Logs
- Railway: `railway logs`
- Render: View in dashboard
- Netlify: View in dashboard

---

## 🔧 Environment Variables Reference

### Backend (.env)
```bash
NODE_ENV=production
BACKEND_PORT=4000
CORS_ORIGIN=https://your-netlify-app.netlify.app
AUTH_USER_TOKEN=<generate-with-openssl-rand>
AUTH_ADMIN_TOKEN=<generate-with-openssl-rand>
PAYPAL_WEBHOOK_SECRET=<from-paypal-dashboard>
PLAID_WEBHOOK_SECRET=<from-plaid-dashboard>
CRM_WEBHOOK_SECRET=<generate-with-openssl-rand>
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
WEBHOOK_RATE_LIMIT_MAX=60
```

### Frontend (Netlify)
```bash
VITE_API_URL=https://your-backend-url.railway.app
```

---

## 📱 Mobile App Updates

To connect mobile apps to production:

### React Native
Edit `app/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:4000'
  : 'https://your-backend-url.railway.app';
```

### Build & Release
```bash
# Android
npm run android:build

# iOS (macOS only)
npm run ios:build
```

---

## 🆘 Troubleshooting

### Frontend can't reach backend
- Check `VITE_API_URL` is set in Netlify
- Verify backend CORS_ORIGIN includes frontend URL
- Check backend is running: `curl https://backend-url/health`

### Build failures
```bash
# Netlify: Clear cache
netlify build --clear-cache

# Railway: Redeploy
railway up --force
```

### CORS errors
- Ensure backend `CORS_ORIGIN` matches exact frontend URL
- Include `https://` protocol
- No trailing slash

---

## 📚 Additional Resources

- Backend deployment details: `/server/DEPLOYMENT.md`
- Web deployment details: `/WEB_DEPLOYMENT.md`
- React Native build: `/BUILD_INSTRUCTIONS.md`
- Kotlin Native build: `/README_KOTLIN_NATIVE.md`

---

## 🎉 You're Live!

Once deployed, you'll have:
- ✅ Production web app on Netlify
- ✅ Production API on Railway/Render/Fly.io
- ✅ Mobile apps ready to connect
- ✅ Monitoring and logging
- ✅ Enterprise-grade security

**Your production URLs:**
- Frontend: `https://your-app.netlify.app`
- Backend: `https://your-backend.railway.app`
- Health check: `https://your-backend.railway.app/health`
