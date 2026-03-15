# Development Roadmap

## Phase 1: UX & Core Polish (Complete ✅)
- [x] **Item 1: Personalized Onboarding**
  - Dynamic wizard flow (Role -> Platforms -> Goals)
  - Role persistence
- [x] **Item 2: Dark Mode Enhancement**
  - `ThemeContext` & Toggle
  - CSS Variables implementation
  - Consistent theming across components
- [x] **Item 3: Accessibility Improvements**
  - Keyboard-friendly role/platform/plan selection
  - Focus-visible outlines and aria labels on onboarding steps
  - Live step announcements and labeled sliders
- [x] **Item 4: Responsive Layout Polish**
  - Mobile bottom nav with "More" menu (5 primary items)
  - Collapsible desktop sidebar
  - Notifications dropdown
  - Safe area support for notched devices

## Phase 2: Backend & Logic (Complete ✅)
- [x] **Item 1: API Service Layer**
  - Connected React apiClient to Express backend
  - Vite proxy configuration for dev
- [x] **Item 2: Authentication**
  - Login/Register pages with AuthContext
  - JWT storage & session management
  - Protected routes & public-only routes
  - Token verification on mount
- [x] **Item 3: Dashboard Integration**
  - Real-time analytics data from `/api/v2/analytics/summary`
  - Auto-refresh every 5 minutes
  - Loading states and refresh button

## Phase 3: Monetization (Complete ✅)
- [x] **Item 1: Payments**
  - Stripe integration with stripeService.js
  - Subscription management with upgrade/cancel
  - Billing portal integration
  - Stripe Connect for marketplace (V2 API)
  - Webhook handlers for payment events

## Phase 4: Growth Features (Complete ✅)
- [x] **Item 1: Referral Program**
  - Referral code generation and redemption
  - Share buttons (WhatsApp, Twitter, Email, SMS)
  - Leaderboard
  - Stats tracking
- [x] **Item 2: Notification System**
  - Real-time notifications dropdown
  - Activity feed API
  - Push notification infrastructure
  - Notification preferences management
- [x] **Item 3: Advanced Reporting**
  - Custom chart builder with multi-metric support
  - Chart saving and loading
  - Export to CSV/PDF
  - Scheduled reports with email delivery

## Phase 5: Advanced Features (Planned)
- [~] **Item 1: Multi-Payment Method Support**
  - Stripe integration (complete)
  - Crypto payment option in checkout
  - Saved payment methods API + checkout integration
  - Auto-retry billing preferences
- [ ] **Item 2: Advanced Job Board Features**
  - Smart filters
  - Job alerts
  - Application tracking
  - Employer profiles
  - Map view
- [ ] **Item 3: Offline-First Capabilities**
  - Offline browsing
  - Expense logging
  - Action queue
  - Conflict resolution
- [ ] **Item 4: Progressive Web App (PWA)**
  - Service worker
  - Install prompt
  - Push notifications
  - Background sync
- [ ] **Item 5: Tax Preparation Assistance**
  - Year-end summary
  - Export for tax filing
  - Quarterly estimation
  - Deduction tracking
