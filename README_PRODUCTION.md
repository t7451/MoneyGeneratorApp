# Money Generator App - README

## Overview

Money Generator App helps users turn time into money with smart job matching and financial tools. The platform provides job boards, financial management, and integrations with payment providers.

## Architecture

```
MoneyGeneratorApp/
├── server/              # Backend API (Node.js + Express)
├── web/                 # Web frontend (React + TypeScript + Vite)
├── android/            # Android app (React Native)
├── ios/                # iOS app (React Native)
├── androidApp/         # Android app (Kotlin Multiplatform)
└── composeApp/         # Shared Kotlin code
```

## Tech Stack

### Backend
- Node.js + Express
- PayPal & Plaid integrations
- Helmet, CORS, rate limiting
- Webhook handling with signature verification
- Health checks and metrics

### Web Frontend
- React 19 + TypeScript
- Vite (fast builds)
- Responsive design (mobile + desktop)
- API integration

### Mobile
- React Native (Android & iOS)
- Kotlin Multiplatform (alternative)

## Quick Start

### Backend Development
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your secrets
npm run dev
```

Server runs on `http://localhost:4000`

### Web Development
```bash
cd web
npm install
echo "VITE_API_URL=http://localhost:4000" > .env
npm run dev
```

Web app runs on `http://localhost:3000`

### Mobile Development
```bash
npm install
npm run android  # or npm run ios
```

## Features

- **Job Boards**: Local Missions, Digital Services, Shift-Based Ops
- **Smart Workflows**: Delivery Mode, Freelance Mode, Support Mode
- **Financial Stack**: Liquidity, Benefits, Expense Intelligence
- **Integration Hub**: PayPal, Plaid, and more
- **Master Key Architecture**: Secure routing and billing
- **Monetization Engine**: Subscriptions, cost-plus billing, commissions
- **Compliance**: Enterprise-grade security and audit trails

## Deployment

See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for complete deployment guide.

### Quick Deploy

**Backend** (Railway):
```bash
cd server
railway login && railway init && railway up
```

**Frontend** (Netlify):
```bash
netlify login && netlify deploy --prod
```

## API Endpoints

- `GET /health` - Health check with metrics
- `GET /catalog` - Product catalog
- `POST /purchase` - Purchase product
- `POST /integrations/subscribe` - Create subscription
- `POST /integrations/plaid/link-token` - Get Plaid link token
- `POST /webhooks/paypal` - PayPal webhook handler
- `POST /webhooks/plaid` - Plaid webhook handler
- `POST /metrics/events` - Track custom events

## Documentation

- [Production Deployment](PRODUCTION_DEPLOYMENT.md) - Complete deployment guide
- [Backend Deployment](server/DEPLOYMENT.md) - Backend-specific deployment
- [Web Deployment](WEB_DEPLOYMENT.md) - Frontend-specific deployment
- [Build Instructions](BUILD_INSTRUCTIONS.md) - React Native build guide
- [Kotlin Native](README_KOTLIN_NATIVE.md) - Kotlin Multiplatform guide
- [Integration Map](INTEGRATION_MAP.md) - API integration details
- [Testing Guide](TESTING_GUIDE.md) - Testing documentation
- [Security Note](SECURITY_NOTE.md) - Security considerations

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=development
BACKEND_PORT=4000
PAYPAL_WEBHOOK_SECRET=your-secret
PLAID_WEBHOOK_SECRET=your-secret
AUTH_USER_TOKEN=demo-user-token
AUTH_ADMIN_TOKEN=demo-admin-token
CORS_ORIGIN=http://localhost:3000
```

### Web (.env)
```bash
VITE_API_URL=http://localhost:4000
```

## Testing

```bash
# Backend tests
cd server
npm test

# Mobile tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

See LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [link to repo issues]
- Documentation: [link to docs]

---

**Production Status**: Ready for deployment ✅

**Last Updated**: March 2026
