# Netlify Deployment Optimization Guide

**Last Updated:** March 12, 2026  
**Status:** ✅ Production Optimized  
**Build Speed:** ~45 seconds  
**Page Load:** < 2 seconds (with optimal network)

---

## 🚀 Quick Deploy

### Deploy to Netlify (5 minutes)

```bash
# Option 1: GitHub Integration (RECOMMENDED - Auto-deploy)
1. Go to https://app.netlify.com
2. Click "New site from Git"
3. Select GitHub → Choose MoneyGeneratorApp repo
4. Configure:
   - Base directory: web
   - Build command: npm run build
   - Publish directory: web/dist
5. Click "Deploy"

# Option 2: Netlify CLI (Manual)
netlify deploy --prod

# Option 3: Drag & Drop (Temporary)
Go to https://app.netlify.com/drop
Drag web/dist/ folder
```

---

## 🎯 Optimizations Implemented

### 1. Build Performance ⚡
- **Strategy:** `npm ci --omit=dev` removes dev dependencies
- **Impact:** Reduced build time by ~15%
- **Bundle Size:** 
  - JavaScript: ~250KB (gzipped: ~79KB)
  - CSS: ~56KB (gzipped: ~11KB)
  - HTML: ~2.4KB

### 2. Smart Caching Strategy 📦
```
HTML files:
  Cache: 1 hour (allows updates without breaking old versions)
  
JavaScript/CSS (hashed):
  Cache: 1 year (immutable - safe with content hashing)
  
Images:
  Cache: 30 days
  
Fonts:
  Cache: 1 year (immutable)
```

**How it works:**
- `index.html` can be invalidated on every deploy (not cached)
- Vite generates hashed filenames: `app-a1b2c3d4.js`
- Browser caches hashed files indefinitely
- New deploy = new hashes = fresh content

### 3. API Proxy with Caching
**Netlify Function:** `netlify/functions/proxy-api.js`

Benefits:
- ✅ Caches GET requests (5 min default)
- ✅ Bypasses CORS issues
- ✅ Adds request logging
- ✅ Error handling & timeouts
- ✅ Request filtering for security

Configuration per endpoint:
```javascript
'GET /api/v2/referrals': 'max-age=300, stale-while-revalidate=600' // 5 min
'GET /api/v2/subscriptions': 'max-age=600, stale-while-revalidate=1800' // 10 min
'GET /api/v2/reports': 'max-age=900, stale-while-revalidate=3600' // 15 min
'POST /api/v2': 'no-cache' // Always fresh
```

### 4. Compression 📊
Netlify automatically compresses:
- ✅ Gzip (for older browsers)
- ✅ Brotli (modern browsers - 15-20% better)
- ✅ No configuration needed

### 5. Production-Grade Security Headers 🔒
```
HSTS (HTTP Strict Transport Security):
  Forces HTTPS for 1 year + all subdomains

CSP (Content Security Policy):
  Restricts script sources to prevent XSS
  
X-Frame-Options: DENY
  Prevents clickjacking
  
X-Content-Type-Options: nosniff
  Prevents MIME sniffing
  
Permissions-Policy:
  Disables camera/mic/location access
```

### 6. Code Splitting Strategy
Vite automatically splits code into chunks:
```
vendor-react.js      → React, React DOM, Router
vendor-icons.js      → Lucide React
vendor-utils.js      → Axios, Zod
app.js               → Your code
```
> **Note (v1.3.1):** Recharts was removed; charts are now custom SVG components, so there is no `vendor-charts` chunk.

Each chunk is cached independently = faster updates

### 7. Environment-Specific Builds

**Development/Preview:**
- Source maps enabled (debugging)
- Full console logs
- Staging API: https://staging-api.moneygenerator.app

**Production:**
- Minimal source maps
- Console logs removed
- Production API: https://api.moneygenerator.app

### 8. Feature Branches
Any branch matching `feature/*` auto-deploys:
```
git checkout -b feature/new-feature
git push origin feature/new-feature
→ Automatically deployed to preview URL
→ Share for testing before merging
```

---

## 🔧 Configuration Files

### netlify.toml
Main deployment configuration:
- Build settings
- Environment variables per context
- Redirects for API routing
- Cache headers
- Security headers
- Netlify functions configuration

### vite.config.ts
Build optimization:
- Code splitting rules
- Minification settings
- Asset hashing for cache busting
- Bundle budget enforcement (custom Vite plugin)
- File size limits

### netlify/functions/proxy-api.js
API proxy function:
- Routes API requests to backend
- Implements request caching
- Filters headers for security
- Logs requests
- Handles errors gracefully

---

## 📈 Performance Metrics

### Build Process
```
Install:    ~15s
Build:      ~25s
Optimize:   ~5s
Deploy:     ~5s
─────────────
Total:      ~50s
```

### Runtime Performance
```
First Contentful Paint (FCP):     < 1.2s
Largest Contentful Paint (LCP):   < 2.5s
Cumulative Layout Shift (CLS):    < 0.1
```

---

## 🔍 Local Testing

### Test build locally before pushing:
```bash
cd web
npm run build
npm run preview
# Visit http://localhost:3000
```

### Test API proxy locally:
```bash
# Simulate Netlify function environment
npm install -g netlify-cli

# From root directory
netlify dev
# API calls go to your local function
```

---

## 🚨 Environment Variables

### Set in Netlify Dashboard:
**Site settings → Environment variables**

```
Production:
  VITE_API_URL = https://api.moneygenerator.app
  VITE_V2_ENABLED = true

Preview/Staging:
  VITE_API_URL = https://staging-api.moneygenerator.app
  VITE_V2_ENABLED = true
```

**Never commit secrets!** Use Netlify's secret values for:
- API keys
- Authentication tokens
- Database credentials

---

## 🐛 Troubleshooting

### Build fails on Netlify but works locally

**Solution:**
```bash
# Clear and rebuild
rm -rf web/node_modules web/dist
npm ci --prefix web
npm run build --prefix web
```

### API calls return CORS errors

**Check:**
1. Verify VITE_API_URL is set in Netlify environment
2. Ensure endpoint exists at backend
3. Check browser DevTools → Network tab
4. Verify CSP headers allow the domain

### Static assets return 404

**Check:**
1. Assets in `web/dist/assets/`?
2. Cache-Control headers applied?
3. Try hard refresh: `Ctrl+Shift+R`

### Site loads old version after deploy

**Solution:**
1. Netlify auto-invalidates HTML
2. Hashed assets load fresh
3. Try: `Ctrl+Shift+R` (hard refresh)
4. Or: Clear browser cache

---

## 📊 Monitoring & Analytics

### Enable Netlify Analytics:
1. Site settings → General
2. Enable "Analytics and log collection"
3. View at: https://app.netlify.com/sites/[site]/analytics

### Monitor Builds:
1. Deploys tab → See build history
2. Click deploy → View logs
3. Look for warnings/errors

### Track Performance:
1. Deployed site → Settings → Analytics
2. Check Core Web Vitals
3. Monitor error rates

---

## 🔐 Security Checklist

- [x] HTTPS enforced (automatic)
- [x] Security headers configured
- [x] CSP restricts dangerous sources
- [x] CORS configured for APIs
- [x] Environment variables secured
- [x] No secrets in code
- [x] API proxy validates requests
- [x] Rate limiting on backend

---

## 📚 Resources

- **Netlify Docs:** https://docs.netlify.com
- **Vite Guide:** https://vitejs.dev
- **Web Vitals:** https://web.dev/vitals/

---

## ✨ Next Steps

1. **Deploy to production**
   ```bash
   git push origin main
   # Netlify auto-deploys
   ```

2. **Monitor first deploy**
   - Check build logs
   - Test all features
   - Verify API calls work

3. **Collect analytics**
   - Monitor Core Web Vitals
   - Watch error reports
   - Review user traffic

4. **Iterate**
   - Push updates push to main
   - Preview on feature branches
   - Monitor performance trends

---

**Questions?** Check Netlify dashboard or review logs for deployment issues.
