# Money Generator Backend - Production Deployment

## Quick Deploy

### Option 1: Railway (Recommended)
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Set environment variables: `railway variables set KEY=value`
5. Deploy: `railway up`

### Option 2: Render
1. Create account at render.com
2. Create New Web Service
3. Connect GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables in dashboard

### Option 3: Fly.io
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Set secrets: `fly secrets set KEY=value`
5. Deploy: `fly deploy`

## Environment Variables

Required for production:
```
NODE_ENV=production
BACKEND_PORT=4000
PAYPAL_WEBHOOK_SECRET=<your-secret>
PLAID_WEBHOOK_SECRET=<your-secret>
CRM_WEBHOOK_SECRET=<generate-random>
AUTH_USER_TOKEN=<generate-secure-token>
AUTH_ADMIN_TOKEN=<generate-secure-token>
CORS_ORIGIN=https://your-frontend.netlify.app
APP_BASE_URL=https://your-backend-domain.com
```

## Generate Secure Tokens

```bash
# Linux/Mac
openssl rand -base64 32

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Health Check

After deployment, verify:
```bash
curl https://your-backend-domain.com/health
```

Should return:
```json
{"status":"ok","metrics":{...}}
```

## Monitoring

- Health endpoint: `/health`
- Metrics included in health response
- Structured logs with correlation IDs
- Rate limiting enabled by default

## Security Features

✓ Helmet.js security headers
✓ CORS configuration
✓ Rate limiting (120 req/min general, 60 req/min webhooks)
✓ Webhook signature verification
✓ Request logging with correlation IDs
✓ Environment-based configuration
