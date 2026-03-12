# Money Generator Web App - Netlify Deployment

## Quick Deploy to Netlify

### Option 1: Netlify CLI (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize project (from repository root)
netlify init

# Deploy
netlify deploy --prod
```

### Option 2: GitHub Integration
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect GitHub repo
5. Configure:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `web/dist`
6. Add environment variables in Netlify dashboard
7. Deploy

## Environment Variables

Set in Netlify Dashboard (Site settings → Environment variables):

```
VITE_API_URL=https://your-backend-domain.com
```

## Local Development

```bash
# Install dependencies
cd web
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:4000" > .env

# Start dev server
npm run dev
```

## Build Locally

```bash
cd web
npm run build
npm run preview
```

## Backend Setup

Before deploying the frontend, ensure your backend is deployed:

1. Deploy backend to Railway/Render/Fly.io (see `/server/DEPLOYMENT.md`)
2. Get the production backend URL
3. Update `netlify.toml` API redirect URL
4. Set `VITE_API_URL` in Netlify environment variables
5. Update backend `CORS_ORIGIN` to your Netlify URL

## Custom Domain

1. In Netlify dashboard: Domain settings → Add custom domain
2. Follow DNS configuration instructions
3. Enable HTTPS (automatic with Netlify)

## Features

✓ React 19 + TypeScript
✓ Vite for fast builds
✓ Responsive design (mobile + desktop)
✓ API integration with backend
✓ Production-ready configuration
✓ Security headers configured
✓ SPA routing with redirects
✓ Asset caching optimization

## Monitoring

- Netlify provides:
  - Build logs
  - Deploy previews
  - Analytics
  - Error tracking
  - Performance monitoring

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
netlify build --clear-cache
```

### API Calls Fail
- Check `VITE_API_URL` is set correctly
- Verify backend CORS allows your Netlify domain
- Check backend is running and accessible

### Routing Issues
- Ensure `_redirects` file is in dist folder
- Check `netlify.toml` SPA redirect is configured
