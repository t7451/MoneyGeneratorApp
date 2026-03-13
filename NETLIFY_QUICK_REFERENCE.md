# Netlify Deployment Quick Reference

## ✅ Setup Verification Checklist (2 minutes)

### Build Settings (Netlify UI → Site configuration → Build & deploy)
- [ ] Base directory is `web` (or leave blank and let `netlify.toml` drive it)
- [ ] Build command is `npm ci --include=dev && npm run build`
- [ ] Publish directory is `dist`
- [ ] Node version is 20

### Environment Variables (Netlify UI → Site configuration → Environment)
- [ ] `VITE_API_URL` points to your backend (`https://api.moneygenerator.app` for prod)
- [ ] `VITE_V2_ENABLED=true`

### Smoke Tests (after a deploy)
- [ ] App loads and SPA routing works on refresh (deep link → reload)
- [ ] API proxy works: open `https://<your-site>.netlify.app/api/v2/features/flags?userId=demo-user`
- [ ] No console errors on first load

## 🚀 Deploy in 5 Minutes

```bash
# Already configured! Just push to GitHub
git push origin main

# Netlify automatically:
# 1. Detects changes
# 2. Installs dependencies
# 3. Builds (npm run build)
# 4. Deploys to CDN
# 5. Updates domain
```

---

## 📊 Configuration Summary

| Setting | Value |
|---------|-------|
| **Base Directory** | `web` |
| **Build Command** | `npm ci --include=dev && npm run build` |
| **Publish Directory** | `dist` |
| **Node Version** | 20 |
| **Build Time** | ~45 seconds |
| **Deployment** | Auto on main branch |

---

## 🔒 Environment Variables

### Production (main branch)
```
VITE_API_URL = https://api.moneygenerator.app
VITE_PLAID_ENV = production
```

### Preview (pull requests)
```
VITE_API_URL = https://staging-api.moneygenerator.app
VITE_PLAID_ENV = sandbox
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `netlify.toml` | Build & deploy config |
| `vite.config.ts` | Build optimization |
| `netlify.toml` redirects | SPA routing + API proxy |
| `.env.example` | Environment template |

---

## 🎯 Performance

| Metric | Value |
|--------|-------|
| **Bundle Size** | 250KB (uncompressed) |
| **Gzipped** | 90KB |
| **Page Load** | < 2 seconds |
| **Cache** | 1 year for hashed assets |

---

## 🔗 Important Links

- **Netlify Dashboard:** https://app.netlify.com
- **Site Deploys:** Deploys tab in Netlify
- **Error Tracking:** Analytics tab or Settings
- **Build Logs:** Click any deploy → View logs

---

## ⚡ Quick Tips

### Test locally before pushing
```bash
cd web
npm run build
npm run preview
# Visit http://localhost:3000
```

### Deploy specific branch (preview)
```bash
git checkout feature/my-feature
git push origin feature/my-feature
# Netlify creates preview URL
```

### Rollback to previous deploy
1. Go to Netlify Dashboard
2. Deploys tab
3. Find previous deploy
4. Click "Publish deploy"

### Watch build logs
```bash
# Real-time monitoring
netlify deploy --build --prod
```

---

## 🚨 If Something Goes Wrong

### Site won't load
```bash
# Try local build
npm run build --prefix web
# Check for errors
```

### API calls fail
1. Check VITE_API_URL in Netlify
2. Verify backend is running
3. Check Network tab in DevTools

### Old content appears
```
Hard refresh: Ctrl + Shift + R
Or: Clear browser cache completely
```

### Build fails
```
Check Netlify build logs for error message
Common: npm install fails → Check package.json
```

---

## 📋 Deploy Checklist

- [ ] All code pushed to GitHub
- [ ] Build passes locally
- [ ] No console errors
- [ ] API calls work
- [ ] Environment variables set in Netlify
- [ ] Visit deployed URL
- [ ] Test key features
- [ ] Check mobile responsiveness

---

## 🔄 Auto-Deploy Workflow

```
Your Code Repository (GitHub)
           ↓
    You push to main
           ↓
  GitHub webhook → Netlify
           ↓
    npm ci (install)
    npm run build
           ↓
  Deploy to CDN
           ↓
✅ Live at your domain
```

---

## 📞 Common Tasks

**Check deployment status:**
Visit: https://app.netlify.com/sites/[your-site]

**Share preview URL:**
Push to feature branch → Copy preview URL from Netlify

**Monitor performance:**
Site → Analytics tab → Core Web Vitals

**Update domain:**
Site settings → Domains → Add custom domain

---

**Version:** 1.3.0  
**Last Updated:** March 12, 2026  
**Status:** ✅ Production Ready
