# Money Generator App - Full-Stack Web Edition

**Full-Stack Web Application** | React 18 Frontend + Node.js/Express Backend  
**Status:** Active Development | Deployed to Railway + Netlify  
**Latest:** v1.3.1 (March 16, 2026)

---

## Overview

Money Generator App is a comprehensive financial SaaS platform helping users:
- 💰 Track income from multiple sources (jobs, freelancing, gig work)
- 📊 Manage expenses and budgets with AI-powered categorization
- 🎯 Find and apply to income opportunities via job marketplace
- 📈 Monitor financial health with advanced analytics
- 👥 Grow earnings through referral program

## Technology Stack

### Frontend
- **Framework:** React 18.2.0 with TypeScript 5.3
- **Build Tool:** Vite 7.3.1 (Lightning-fast bundling)
- **Styling:** CSS with dark mode & responsive design
- **State:** Context API + React Hooks
- **Routing:** React Router v7.13.1
- **Charts:** Custom SVG report previews (Recharts removed)
- **Icons:** Lucide React 0.577.0
- **Maps:** MapLibre GL with lazy route and viewport-gated initialization

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js 4.19.2
- **Language:** JavaScript (ES Modules)
- **Database:** Postgres (connection pooling ready)
- **Authentication:** JWT tokens + securely hashed passwords
- **Security:** Helmet, CORS, Rate limiting, Input validation (Zod)
- **Caching:** Node-cache for performance

### DevOps
- **Containerization:** Docker
- **Deployment:** Railway platform
- **CI/CD:** Git-based automatic deployments
- **Monitoring:** Error logging, performance metrics

---

## Project Structure

```
MoneyGeneratorApp/
├── web/                              # React Frontend SPA
│   ├── src/
│   │   ├── components/               # Reusable React components
│   │   │   ├── ReferralPage.tsx      # Referral system UI
│   │   │   ├── PricingPage.tsx       # Subscription tiers
│   │   │   ├── ReportsPage.tsx       # Analytics dashboard
│   │   │   └── ShareButtons.tsx      # Share functionality
│   │   ├── pages/                    # Route pages
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── context/                  # Context providers
│   │   ├── data/                     # Static/sample data
│   │   ├── App.tsx                   # Root component
│   │   └── main.tsx                  # Entry point
│   ├── package.json                  # Web dependencies
│   ├── vite.config.ts                # Bundler config
│   ├── tsconfig.json                 # TypeScript config
│   └── index.html                    # HTML template
│
├── server/                           # Express Backend API
│   ├── src/
│   │   ├── app.js                    # Express app setup
│   │   ├── index.js                  # Server entry point
│   │   ├── routes/                   # API route handlers
│   │   │   ├── referrals.js         # Referral endpoints
│   │   │   ├── subscriptions.js     # Subscription endpoints
│   │   │   ├── reports.js           # Analytics endpoints
│   │   │   └── ...
│   │   ├── services/                 # Business logic
│   │   │   ├── referralService.js   # Referral logic
│   │   │   ├── subscriptionService.js
│   │   │   ├── reportingService.js
│   │   │   └── ...
│   │   ├── models/                   # Data models & schema
│   │   ├── middleware/               # Express middleware
│   │   ├── config.js                 # Configuration
│   │   └── __tests__/                # Backend tests
│   ├── package.json                  # Server dependencies
│   ├── Dockerfile                    # Container config
│   ├── railway.toml                  # Railway deployment config
│   └── vercel.json                   # Alternative deployment
│
├── scripts/
│   └── deploy.sh                     # Deployment script
│
├── .github/
│   └── workflows/                    # GitHub Actions CI/CD
│
├── package.json                      # Root package (workspace)
├── tsconfig.json                     # Root TypeScript config
└── README.md                         # This file
```

---

## Quick Start

### Prerequisites
- **Node.js** 20 or higher
- **npm** or **yarn**
- **Git**

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd MoneyGeneratorApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # This installs root package which coordinates web & server
   ```

3. **Install backend dependencies**
   ```bash
   npm install --prefix server
   ```

4. **Install frontend dependencies**
   ```bash
   npm install --prefix web
   ```

5. **Setup environment variables**
   ```bash
   # .env files needed in root and server/
   # See documentation for required values
   ```

6. **Start development servers (in separate terminals)**
   
   ***Terminal 1 - Frontend (http://localhost:3000)***
   ```bash
   npm run dev
   # Runs: cd web && npm run dev
   ```

   ***Terminal 2 - Backend (http://localhost:4000)***
   ```bash
   npm run dev --prefix server
   # Runs: node src/index.js
   ```

---

## Available Commands

### Root Package

```bash
npm run dev              # Start web dev server
npm run build            # Build web for production
npm run preview          # Preview production build locally
npm run lint             # Lint web code
npm run test             # Run backend tests
npm run deploy           # Deploy to production
npm run deploy:staging   # Deploy to staging
```

### Web Package (cd web)

```bash
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Build production bundle (dist/)
npm run preview          # Preview dist/ locally
npm run lint             # ESLint + TypeScript checks
```

### Server Package (cd server)

```bash
npm run dev              # Start Express server (http://localhost:3000)
npm run start            # Start with NODE_ENV=production
npm test                 # Run Jest tests
```

---

## API Documentation

### Base URL
**Development:** `http://localhost:4000/api/v2`  
**Production:** `https://moneygenerator.app/api/v2`

### Key Endpoints

#### Referral System
- `POST /referrals/generate` - Create referral code
- `GET /referrals/{code}` - Get referral details
- `POST /referrals/{code}/redeem` - Redeem referral bonus

#### Subscriptions
- `GET /subscriptions/plans` - Get available plans
- `POST /subscriptions/upgrade` - Upgrade tier
- `GET /subscriptions/{userId}` - Get user subscription
- `POST /subscriptions/{userId}/cancel` - Cancel subscription

#### Reports & Analytics
- `GET /reports/dashboard` - User dashboard data
- `GET /reports/income-summary` - Income breakdown
- `GET /reports/expenses-summary` - Expense breakdown
- `GET /reports/export` - Export data as CSV/JSON

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete spec.

---

## Features Implemented

### Phase 1: Core Platform ✅
- [x] User authentication & profiles
- [x] Income tracking (multiple sources)
- [x] Expense management with categories
- [x] Dashboard with KPIs
- [x] Basic analytics and SVG chart previews
- [x] Mobile-responsive UI

### Phase 2: Growth Features 🚀
- [x] Referral system (code generation, tracking, bonus distribution)
- [x] Subscription tier system (Free, Pro, Enterprise)
- [x] Advanced reporting
- [ ] Job marketplace integration
- [ ] Notification system

### Phase 3: Advanced Features 📋
- [ ] Predictive analytics (ML forecasting)
- [ ] Bank integration (Plaid)
- [ ] OCR receipt scanning
- [ ] Team collaboration
- [ ] API for third-party apps

See [ROADMAP.md](ROADMAP.md) for complete feature roadmap.

---

## Deployment

### Railway (Current)

```bash
npm run deploy
# Automatically deploys to Railway
# Frontend & Backend in same container
```

**Deployment URL:** [moneygenerator.app](https://moneygenerator.app)  
**Status:** ✅ Live  
**CI/CD:** Git push → Railway webhook → Auto-deploy

### Environment Variables

**Frontend (.env.local)**
```
VITE_API_BASE_URL=http://localhost:3000/api/v2
VITE_APP_NAME=Money Generator App
```

**Backend (.env)**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=...
STRIPE_API_KEY=...
```

See [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md) for detailed instructions.

---

## Testing

### Backend Tests
```bash
npm run test:server
# Runs Jest test suite in server/__tests__/
```

### Frontend Tests
```bash
cd web
npm test  # Not yet configured - coming soon
```

### Coverage
```bash
npm run test:server -- --coverage
```

---

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m "feat: add my feature"`
3. Push to branch: `git push origin feature/my-feature`
4. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

### Latest Version: v1.3.1 (March 16, 2026)
- ✅ Removed Recharts — charts now use custom SVG components
- ✅ Removed vite-plugin-pwa (PWA temporarily disabled, no service worker)
- ✅ Removed Inter from Google Fonts URL — only Space Grotesk loaded
- ✅ Tombstoned legacy design-system.css; active file is web/src/styles/designSystem.css
- ✅ Cleaned up 12 dead CSS tokens, entry CSS reduced to ~31 kB

### v1.3.0 (March 12, 2026)
- ✅ Removed Android, iOS, and Kotlin Multiplatform components
- ✅ Focused on full-stack web deployment
- ✅ Implemented referral system with ShareButtons
- ✅ Added subscription tier management
- ✅ Built analytics & reporting engine

---

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # macOS/Linux

# Kill process
taskkill /PID <PID> /F         # Windows
kill -9 <PID>                  # macOS/Linux
```

### Build Failures
```bash
# Clean installation
rm -rf node_modules
rm -rf web/node_modules
rm -rf server/node_modules
npm install
npm install --prefix web
npm install --prefix server
```

### API Connection Issues
- Check backend is running: `http://localhost:3000/health`
- Verify CORS settings in `server/src/config.js`
- Check network tab in browser DevTools

### Deployment Issues
See [WEB_DEPLOYMENT.md](WEB_DEPLOYMENT.md#troubleshooting) for deployment-specific help.

---

## Security

- ✅ HTTPS enforced in production
- ✅ CORS properly configured
- ✅ Rate limiting on API endpoints
- ✅ Input validation with Zod
- ✅ JWT token-based authentication
- ✅ Password security with bcrypt
- ✅ Helmet.js for HTTP headers

See [SECURITY_NOTE.md](SECURITY_NOTE.md) for security policy.

---

## Performance

- **Frontend Build:** ~5.2 seconds (Vite)
- **Bundle Size:** ~250KB JS, ~31KB CSS (production)
- **Page Load:** < 2 seconds (with optimal network)
- **API Response:** < 200ms (typical)
- **Lighthouse Score:** 92+ (all metrics)

---

## Support & Feedback

- 📧 Email: support@moneygenerator.app
- 🐛 Issues: [GitHub Issues](https://github.com/user/MoneyGeneratorApp/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/user/MoneyGeneratorApp/discussions)

---

## License

MIT License - See [LICENSE](LICENSE) for details

---

## Acknowledgments

Built with ❤️ using open-source technologies:
- React, Vite, Express.js, Node.js, and many others

For iOS builds (macOS only):
- **Xcode 15.0+**
- **CocoaPods**

## Building the Application

### Android

#### Debug Build
```bash
./gradlew :androidApp:assembleDebug
```

Output: `androidApp/build/outputs/apk/debug/androidApp-debug.apk`

#### Release Build
```bash
./gradlew :androidApp:assembleRelease
```

Output: `androidApp/build/outputs/apk/release/androidApp-release.apk`

#### Install to Device/Emulator
```bash
./gradlew :androidApp:installDebug
```

### iOS (macOS only)

#### Build Framework
```bash
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

For physical devices:
```bash
./gradlew :composeApp:linkReleaseFrameworkIosArm64
```

## Technology Stack

- **Kotlin 2.1.20**: Programming language for all platforms
- **Compose Multiplatform 1.8.1**: Cross-platform UI framework
- **Material 3**: Modern design system
- **Kotlin Native**: Native compilation for iOS
- **Android Gradle Plugin 8.5.2**: Build system

## Key Features

- **Single Codebase**: Shared UI and business logic across platforms
- **Native Performance**: Compiled to machine code (no JavaScript bridge)
- **Modern UI**: Compose Multiplatform with Material 3
- **Type Safety**: Full Kotlin type system across all code

## Application Features

The Money Generator app provides:

- **Job Boards**: Categorized job listings (Local Missions, Digital Services, Shift-Based Ops)
- **Smart Workflows**: Delivery Mode, Freelance Mode, Support Mode
- **Financial Stack**: Liquidity, Benefits, Expense Intelligence
- **Integration Hub**: Unified API Gateway and White-Label Marketplace
- **Master Key Architecture**: Secure routing and billing
- **Monetization Engine**: Subscriptions, cost-plus billing, commissions
- **Compliance**: Enterprise-grade security and audit trails
- **Roadmap**: MVP → Scale → Enterprise phases

## Development

### Clean Build
```bash
./gradlew clean
```

### Build All Modules
```bash
./gradlew build
```

### List Available Tasks
```bash
./gradlew tasks
```

## Migration Notes

The TypeScript/React UI has been fully ported to Kotlin Compose:

- **React Components** → **@Composable functions**
- **StyleSheet** → **Modifier chains**
- **useState/useEffect** → **remember/LaunchedEffect**
- **Props** → **Function parameters**
- **Type definitions** → **data classes**

All business logic, data models, and UI styling have been preserved in the conversion.

## Troubleshooting

### Gradle Sync Failures
```bash
./gradlew --stop
rm -rf ~/.gradle/caches/
./gradlew build --refresh-dependencies
```

### Android SDK Issues
Ensure correct SDK versions in Android Studio:
- SDK Platform 36
- Build Tools 36.0.0

### Network/Repository Issues
If Maven repositories are unavailable:
```bash
./gradlew build --offline
```

## Additional Documentation

See [README_KOTLIN_NATIVE.md](README_KOTLIN_NATIVE.md) for detailed Kotlin Native build instructions.

See [README_REACT_NATIVE.md.backup](README_REACT_NATIVE.md.backup) for the original React Native documentation (deprecated).

See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) for the original React Native build documentation (deprecated).

## License

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

## Backend (Express + integrations)

We ship a minimal backend under `/server` to keep secrets off-device and centralize integrations.

### Setup

1. Copy `.env.example` to `.env` and fill in PayPal/Plaid secrets (only on the backend).
2. Install server deps: `npm install --prefix server`.
3. Start the API: `npm run dev --prefix server` (default port 4000).

### Local webhook testing

- Use a tunneling tool (e.g., ngrok) pointing at `localhost:4000`. Configure the public URL in PayPal/Plaid console.
- Webhooks are signed (HMAC-SHA256) and idempotent. Duplicate `id`s will return `status: duplicate`.
- Correlation IDs and structured logs are emitted for every request; metrics counters available at `/health`.

### Tests

- Unit tests for webhook signature verification + idempotency: `npm test --prefix server`.

### PayPal webhook setup

- Point PayPal webhooks to `/webhooks/paypal`.
- Configure `PAYPAL_WEBHOOK_SECRET` in `.env` to match your PayPal app.
- Subscription flows use backend-only endpoints:
  - `POST /billing/paypal/subscription/create` -> returns `approvalUrl` + `providerSubscriptionId`.
  - After user approval, call `POST /billing/paypal/subscription/confirm` to activate and grant entitlements.
  - `POST /billing/paypal/subscription/cancel` to terminate.
- Webhooks are idempotent and state transitions are validated server-side; outbound CRM webhooks are queued with retries.
See LICENSE file for details.
