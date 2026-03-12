# Money Generator App - Phase 2 Implementation Roadmap

**Phase 1 Completion:** March 12, 2026 ✅  
**Phase 2 Start:** March 13, 2026  
**Phase 2 Complete:** June 2026 (estimated)

---

## 🎯 Phase 2 Overview

Three critical growth & monetization features to drive user retention, viral growth, and revenue generation.

| Initiative | Priority | Effort | Timeline | Revenue Impact |
|-----------|----------|--------|----------|-----------------|
| **Referral Program** | High | 2 weeks | Week 1-2 | 20-30% growth |
| **Tiered Subscriptions** | High | 3 weeks | Week 2-4 | $5-10K MRR |
| **Advanced Reporting** | Medium | 2 weeks | Week 3-4 | Retention ↑25% |

---

## Feature 1: Referral Program

### Business Case
- **Goal:** Viral growth through user referrals
- **Target:** 30% of new users from referrals within 60 days
- **Revenue Impact:** Free users → Paid subscribers through tiered plans

### Technical Architecture

```
User A (Referrer)
├── Generate unique code: REF_A1B2C3D4
├── Share link: moneygenerator.app/?ref=REF_A1B2C3D4
├── Track shares (WhatsApp, Twitter, Email, SMS)
└── Display stats in dashboard

↓ (User clicks link)

User B (Referred)
├── Land on app with ?ref=REF_A1B2C3D4
├── Store referral code in signup flow
├── Complete onboarding
└── Award both users: +$5 credits

Referrer Dashboard
├── "Invite Friends" screen
├── Show referral code (copy button)
├── Track referral stats
│   ├── Invites sent
│   ├── Signups from invites
│   ├── Credits earned ($)
│   └── Conversion rate (%)
└── Leaderboard (top referrers)
```

### Implementation Roadmap

#### Week 1: Backend Setup
**Files to Create/Update:**
- [ ] `server/src/models/Referral.js` - Referral schema
- [ ] `server/src/routes/v2/referrals.js` - New referral endpoints
- [ ] `server/src/services/referralService.js` - Business logic

**API Endpoints to Implement:**
```
POST   /api/v2/referrals/generate      - Generate referral code
GET    /api/v2/referrals/me            - Get user's referral code & stats
POST   /api/v2/referrals/redeem        - Redeem referral code (on signup)
GET    /api/v2/referrals/leaderboard   - Top referrers this month
POST   /api/v2/referrals/track-share   - Track share action
```

**Database Schema:**
```javascript
{
  _id: ObjectId,
  referrerId: String,
  referralCode: String,           // e.g., "REF_A1B2C3D4"
  referredUserId: String,         // null until redeemed
  status: "active|redeemed",
  createdAt: Date,
  redeemedAt: Date,
  creditsAwarded: Number,         // e.g., 500
  shareCount: {
    whatsapp: Number,
    twitter: Number,
    email: Number,
    sms: Number,
    direct_link: Number
  }
}
```

**Test Cases:**
- Generate code for new user → returns unique code
- Redeem valid code on signup → awards credits to both users
- Redeem expired code → error message
- Invalid code on signup → continues without referral
- User can view their stats → shows conversions

#### Week 1.5: Frontend - Referral Screen

**Files to Create:**
- [ ] `web/src/pages/ReferralPage.tsx` (400 lines)
- [ ] `web/src/components/ReferralCard.tsx` (200 lines)
- [ ] `web/src/components/ReferralStats.tsx` (300 lines)
- [ ] `web/src/components/ReferralLeaderboard.tsx` (250 lines)
- [ ] `web/src/styles/ReferralPage.css` (400 lines)

**Components to Build:**

**ReferralPage.tsx:**
```typescript
export const ReferralPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  // Display:
  // - Referral code (big, copyable)
  // - "Invites sent" counter
  // - "Signups" counter
  // - "Credits earned" ($X.XX)
  // - Social share buttons (WhatsApp, Twitter, Email, SMS)
  // - Leaderboard of top referrers
  // - Share tracking analytics
};
```

**Share Buttons:**
- WhatsApp: Share link with "Join me on MoneyGen and earn $5!"
- Twitter: "I'm earning on MoneyGen! Join and get $5: {link}"
- Email: HTML template with referral info
- SMS: Text-friendly message with link
- Direct: Copy link to clipboard

**UI Layout:**
```
┌─────────────────────────────────┐
│   INVITE FRIENDS, EARN REWARDS  │
├─────────────────────────────────┤
│                                 │
│  Your Referral Code             │
│  ┌──────────────────────────┐   │
│  │  REF_A1B2C3D4    [COPY]  │   │
│  └──────────────────────────┘   │
│                                 │
│  Share via:                     │
│  [WhatsApp] [Twitter] [Email]   │
│  [SMS] [Direct Link]            │
│                                 │
├─────────────────────────────────┤
│  Your Stats This Month          │
│  ┌────────────────────────────┐ │
│  │ Invites: 12                │ │
│  │ Signups: 8                 │ │
│  │ Rate: 67%                  │ │
│  │ Credits Earned: $40.00     │ │
│  └────────────────────────────┘ │
│                                 │
│  Top Referrers This Month       │
│  1. Sarah - $125 earned (25)    │
│  2. Marcus - $75 earned (15)    │
│  3. You - $40 earned (8)        │
│                                 │
└─────────────────────────────────┘
```

**Testing:**
- Copy button works without page refresh
- Share buttons open correct apps (mobile)
- Stats update in real-time
- Leaderboard updates hourly
- Mobile layout responsive (320px+)

#### Week 2: Signup Integration
- [ ] Add optional referral code field to signup form
- [ ] Pre-fill code if coming from ?ref= URL param
- [ ] Show referrer's name after redeeming
- [ ] Activate referral code on first login
- [ ] Award credits immediately after signup

**Signup Flow:**
```
1. User clicks: moneygenerator.app/?ref=REF_A1B2C3D4
2. Signup page loads
3. "Referred by Sarah" appears at bottom
4. User completes signup
5. POST /api/v2/referrals/redeem
6. Both users awarded $5 credits
7. Confirmation toast: "Welcome! You earned $5 from Sarah"
```

### Monitoring & Analytics

**Metrics to Track:**
```javascript
analytics.track('referral_code_viewed', { user_id })
analytics.track('referral_shared', { channel: 'whatsapp|twitter|email|sms' })
analytics.track('referral_code_copied', { user_id })
analytics.track('signup_from_referral', { 
  referrer_id, 
  referred_id,
  referral_code 
})
analytics.track('referral_credited', { 
  user_id, 
  credits_awarded,
  referral_code 
})
analytics.track('referral_leaderboard_viewed', { rank: 1 })
```

---

## Feature 2: Tiered Subscription Plans

### Business Case
- **Goal:** Monetize user base with sustainable revenue
- **Target:** 10-15% of users upgrade to paid plans within 60 days
- **Revenue Impact:** $5-10K MRR from paid subscriptions

### Tier Structure

```
┌─────────────────────────────────────────────────────────────┐
│  BASIC (Free)         PRO ($9.99/mo)     ENTERPRISE (Custom) │
├─────────────────────────────────────────────────────────────┤
│  • 5 jobs/month       • Unlimited jobs   • Unlimited jobs    │
│  • Basic analytics    • Advanced analytics • Premium support │
│  • Mobile app         • API access       • Custom reporting  │
│  • 1 saved profile    • 5 saved profiles • Team accounts     │
│  • Community support  • Email support    • Dedicated manager │
│                       • Ad-free          • Custom features   │
│                       • Export reports   • White-label (TBD) │
│                       • Job notifications                     │
│                       • Resume builder                        │
│                                                               │
│  FREE                 $9.99/month        Contact sales       │
│                       Or $99/year (2 mo free)                │
│                                                               │
│  [Continue with Free] [Upgrade to Pro]   [Schedule demo]     │
└─────────────────────────────────────────────────────────────┘
```

### Technical Architecture

```
Subscription Service
├── Stripe Integration
│   ├── Create customer (first time)
│   ├── Create subscription
│   ├── Handle payment success
│   ├── Handle payment failure
│   ├── Handle cancellation
│   └── Webhook processing
├── Subscription Schema
│   ├── userId
│   ├── plan: 'basic|pro|enterprise'
│   ├── stripeCustomerId
│   ├── stripeSubscriptionId
│   ├── status: 'active|cancelled|suspended'
│   ├── currentPeriodEnd
│   └── billingCycle: 'monthly|annual'
└── Feature Gating
    ├── Check user's plan tier
    ├── Restrict features based on tier
    └── Show upgrade CTA

Pricing Page
├── Display all three tiers
├── Comparison table
├── Toggle annual/monthly pricing
├── Testimonials/reviews
├── FAQ section
└── CTA buttons

Subscription Management Portal
├── View current plan
├── View billing history
├── Update payment method
├── Upgrade/downgrade plan
├── Cancel subscription
├── View usage (jobs, exports, etc.)
└── Support contact
```

### Implementation Roadmap

#### Week 2: Backend Setup
**Files to Create/Update:**
- [ ] `server/src/models/Subscription.js` - Subscription schema
- [ ] `server/src/services/stripeService.js` - Stripe integration logic
- [ ] `server/src/routes/v2/subscriptions.js` - Subscription endpoints
- [ ] `server/src/webhooks/stripe.js` - Webhook handlers
- [ ] `server/src/middleware/featureGating.js` - Feature access control

**Stripe Setup:**
```bash
# Install Stripe
npm install stripe

# Create Stripe account at stripe.com
# Get API keys: pk_live_* and sk_live_*
# Add to .env: STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY

# Create products in Stripe dashboard:
# - Product: "MoneyGen Pro"
#   - Price: $9.99/month (price_pro_monthly)
#   - Price: $99/year (price_pro_annual)
```

**API Endpoints:**
```
GET    /api/v2/subscriptions/current    - Get user's current plan
POST   /api/v2/subscriptions/plans      - List available plans
POST   /api/v2/subscriptions/upgrade    - Upgrade to plan
POST   /api/v2/subscriptions/downgrade  - Downgrade plan
POST   /api/v2/subscriptions/cancel     - Cancel subscription
GET    /api/v2/subscriptions/billing    - Billing history
POST   /api/v2/subscriptions/payment    - Update payment method
POST   /api/v2/webhooks/stripe          - Webhook endpoint
```

**Webhook Handlers:**
```javascript
// Handle events from Stripe
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
charge.dispute.created
```

**Feature Gating Logic:**
```javascript
// In DashboardPage.tsx
const canAccessAdvancedAnalytics = plan === 'pro' || plan === 'enterprise';

// In JobsPage.tsx
const jobsRemaining = user.subscription.maxJobs - user.jobsAppliedThis month;
if (jobsRemaining <= 0 && plan === 'basic') {
  return <UpgradePrompt />;
}
```

#### Week 2.5: Frontend - Pricing Page

**Files to Create:**
- [ ] `web/src/pages/PricingPage.tsx` (500 lines)
- [ ] `web/src/components/PricingCard.tsx` (200 lines)
- [ ] `web/src/components/PricingComparison.tsx` (400 lines)
- [ ] `web/src/components/PricingFAQ.tsx` (300 lines)
- [ ] `web/src/styles/PricingPage.css` (500 lines)

**PricingPage Layout:**
```typescript
export const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly'|'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Components:
  // 1. Header: "Simple, Transparent Pricing"
  // 2. Billing toggle: Monthly / Annual (save 15%)
  // 3. Three pricing cards with CTA buttons
  // 4. Comparison table (detailed feature breakdown)
  // 5. FAQ section (10 common questions)
  // 6. Bottom CTA: "Start free, upgrade anytime"
};
```

**Comparison Table:**
```
Feature              Basic    Pro      Enterprise
Jobs/month           5        Unlimited  Unlimited
Analytics            Basic    Advanced   Premium
API Access           -        Yes        Yes
Saved Profiles       1        5          Unlimited
Support              Community Email    Dedicated
Export Reports       -        Yes        Yes
Resume Builder       -        Yes        Yes
Ad-free              -        Yes        Yes
Job Notifications    -        Yes        Yes
Custom Branding      -        -          Yes
SLA                  -        -          Yes
```

#### Week 3: Subscription Management Portal

**Files to Create:**
- [ ] `web/src/pages/SubscriptionPage.tsx` (400 lines)
- [ ] `web/src/components/SubscriptionStatus.tsx` (250 lines)
- [ ] `web/src/components/BillingHistory.tsx` (300 lines)
- [ ] `web/src/components/UpgradePrompt.tsx` (200 lines)
- [ ] `web/src/styles/SubscriptionPage.css` (400 lines)

**SubscriptionPage Layout:**
```
Current Plan
├── Plan name (Pro)
├── Annual subscription
├── Next billing date
├── Amount per month/year
├── Upgrade / Downgrade / Cancel buttons

Usage This Month
├── Jobs applied: 45/unlimited
├── Exports used: 8/20
├── API calls: 1,250/5,000
├── Storage: 250MB / 1GB

Billing History
├── Invoice table
│   ├── Date
│   ├── Amount
│   ├── Status (Paid/Pending)
│   └── Download PDF
└── Next invoice: $9.99 on March 20

Payment Method
├── Current card (Visa ****4242)
├── Expiry: 12/2027
└── [Update Payment Method]

Danger Zone
└── [Cancel Subscription]
```

#### Week 4: Upgrade/Downgrade Flows

**Upgrade Flow:**
1. User clicks "Upgrade to Pro" button
2. Redirect to Stripe checkout (or embedded form)
3. Enter payment information
4. Choose annual/monthly billing
5. Payment processed
6. Subscription created in database
7. Feature access updated
8. Confirmation email sent
9. Toast: "Welcome to Pro! You have unlimited jobs."

**Downgrade Flow:**
1. User clicks "Downgrade" from subscription page
2. Show confirmation: "You'll lose premium features. Continue?"
3. Downgrade processed
4. Pro features disabled after current billing period
5. Confirmation email sent

**Cancellation Flow:**
1. User clicks "Cancel Subscription"
2. Show exit survey: "Why are you leaving?"
3. Offer retention discount: "Stay for $4.99/month"
4. If decline, process cancellation
5. Access revoked at period end
6. Confirmation email with reactivation link

### Monitoring & Analytics

**Metrics to Track:**
```javascript
// Pricing page
analytics.track('pricing_page_viewed', { user_id, is_authenticated })
analytics.track('billing_cycle_toggled', { cycle: 'monthly|annual' })
analytics.track('pricing_card_clicked', { plan: 'pro|enterprise' })

// Checkout
analytics.track('checkout_started', { plan, billing_cycle })
analytics.track('checkout_completed', { 
  plan, 
  billing_cycle, 
  amount_cents 
})
analytics.track('checkout_failed', { 
  plan, 
  error_message 
})

// Subscription management
analytics.track('upgrade_clicked', { from_plan, to_plan })
analytics.track('downgrade_requested', { plan })
analytics.track('cancel_attempted', { plan, reason })
analytics.track('cancel_confirmed', { plan, reason })
analytics.track('payment_failed', { error })

// Dashboard tracking
analytics.track('upgrade_prompt_shown', { 
  page: 'jobs|dashboard|settings',
  reason: 'feature_limit|job_quota', 
  limit_reached: true 
})
analytics.track('upgrade_cta_clicked', { 
  page: 'jobs|dashboard|settings' 
})
```

**Revenue Metrics:**
- MRR (Monthly Recurring Revenue)
- ARPU (Average Revenue Per User)
- Churn rate (% of users cancelling)
- Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)
- Upgrade rate (% of free → paid)

---

## Feature 3: Advanced Reporting

### Business Case
- **Goal:** Deep insights for users to maximize earnings
- **Target:** 60% of users create at least 1 custom report
- **Retention Impact:** Users who use reports churn 40% less

### Report Types

```
Income Reports
├── By Category (Jobs, Gigs, Sales, etc.)
├── By Time Period (Daily, Weekly, Monthly, YTD)
├── By Platform (All, MoneyGen, Upwork, Fiverr, etc.)
└── Trends (Chart: Income over time)

Expense Reports
├── By Category (Productivity, Equipment, Travel, etc.)
├── By Vendor
├── By Time Period
└── Trends

Profit Analysis
├── Net income (Income - Expenses)
├── Profit margin
├── Seasonal trends
└── Growth rate (YoY)

Time Analytics
├── Hours worked per week
├── Average hourly rate
├── Busiest days/times
└── Efficiency trends

Tax Reports
├── Income summary (all sources)
├── Deductible expenses
├── Estimated tax liability
├── Year-to-date comparison
└── Export for accountant (CSV, PDF)
```

### Technical Architecture

```
Report Builder Service
├── Aggregation Service
│   ├── Sum income by category
│   ├── Sum expenses by category
│   ├── Calculate statistics (avg, max, min)
│   ├── Calculate trends (growth, seasonal)
│   └── Handle date ranges
├── Chart Library (Recharts)
│   ├── Line chart (trends)
│   ├── Bar chart (comparisons)
│   ├── Pie chart (distribution)
│   ├── Area chart (cumulative)
│   └── Table (detailed)
└── Export Service
    ├── CSV export
    ├── PDF export (with charts)
    └── Email delivery

Database Queries
├── Efficient aggregation pipelines
├── Index on user_id + date
├── Cache results for 1 hour
└── Pre-compute daily/monthly summaries
```

### Implementation Roadmap

#### Week 3: Backend Setup
**Files to Create/Update:**
- [ ] `server/src/services/reportService.js` - Aggregation logic
- [ ] `server/src/routes/v2/reports.js` - Report endpoints
- [ ] `server/src/models/Report.js` - Save custom reports
- [ ] `server/src/utils/aggregationPipelines.js` - MongoDB aggregation

**API Endpoints:**
```
GET    /api/v2/reports/summary           - Quick income/expense summary
POST   /api/v2/reports/income            - Build income report
POST   /api/v2/reports/expenses          - Build expense report
POST   /api/v2/reports/profit            - Build profit analysis
GET    /api/v2/reports/time-analysis     - Time tracking insights
POST   /api/v2/reports/tax               - Tax preparation report
GET    /api/v2/reports/saved             - List saved reports
POST   /api/v2/reports/save              - Save current report
DELETE /api/v2/reports/{id}              - Delete saved report
POST   /api/v2/reports/export            - Export as CSV/PDF
POST   /api/v2/reports/email             - Email report
```

**Report Model:**
```javascript
{
  _id: ObjectId,
  userId: String,
  name: String,           // "Q1 2026 Income"
  type: String,          // "income|expense|profit|tax|time"
  dateRange: {
    start: Date,
    end: Date
  },
  filters: {
    category: [String],   // or null for all
    platform: [String],   // or null for all
    source: [String]      // or null
  },
  chartType: String,      // "line|bar|pie|area"
  createdAt: Date,
  lastGeneratedAt: Date,
  cachedData: Object,     // Store aggregation result
  isTemplate: Boolean     // Reusable template
}
```

**Aggregation Pipeline Example:**
```javascript
db.transactions.aggregate([
  {
    $match: {
      userId: ObjectId(userId),
      date: { $gte: startDate, $lte: endDate }
    }
  },
  {
    $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 },
      avg: { $avg: "$amount" },
      max: { $max: "$amount" },
      min: { $min: "$amount" }
    }
  },
  { $sort: { total: -1 } }
])
```

#### Week 3.5: Frontend - Report Builder

**Files to Create:**
- [ ] `web/src/pages/ReportsPage.tsx` (600 lines)
- [ ] `web/src/components/ReportBuilder.tsx` (500 lines)
- [ ] `web/src/components/ReportChart.tsx` (400 lines)
- [ ] `web/src/components/ReportFilters.tsx` (300 lines)
- [ ] `web/src/components/ReportExport.tsx` (200 lines)
- [ ] `web/src/styles/ReportsPage.css` (400 lines)

**ReportBuilder UI:**
```
Reports Dashboard
├── "Create New Report" button
├── Sidebar: Filters
│   ├── Report Type dropdown (Income, Expense, Profit, Tax, Time)
│   ├── Date Range picker (Start / End date)
│   ├── Category filter (checkboxes)
│   ├── Platform filter (checkboxes)
│   └── Chart Type (Line, Bar, Pie, Area)
├── Main Area: Chart
│   ├── Title (auto-generated or custom)
│   ├── Chart visualization
│   ├── Summary stats below
│   │   ├── Total amount
│   │   ├── Average
│   │   ├── Count
│   │   └── Trend (↑ or ↓)
│   └── Detailed table
├── Bottom Actions:
│   ├── [Save Report]
│   ├── [Export as CSV]
│   ├── [Export as PDF]
│   ├── [Email Report]
│   └── [Share Link]
└── Saved Reports sidebar
    ├── List of saved reports
    ├── Delete button per report
    └── Quick regenerate button
```

**ReportChart Component:**
```typescript
// Using Recharts
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="income" stroke="#10b981" />
    <Line type="monotone" dataKey="expenses" stroke="#ef4444" />
  </LineChart>
</ResponsiveContainer>
```

#### Week 4: Export & Scheduling

**Export Functionality:**
- CSV export: Simple table format for spreadsheets
- PDF export: Formatted with charts and styling
- Email delivery: Automated scheduled reports
- Share link: Public/private report sharing (future)

**PDF Generation:**
```javascript
import { PDFDocument } from 'pdf-lib';

// Create PDF with:
// - Report title and date range
// - Chart images (via web3.js canvas → PNG)
// - Summary table
// - Detailed data tables
// - Footer with disclaimer
```

**Scheduled Reports (Future):**
- Users can set up weekly/monthly email reports
- Automatic PDF generation and delivery
- Customizable report templates
- Export to accounting software (QuickBooks, Wave)

### Monitoring & Analytics

**Metrics to Track:**
```javascript
analytics.track('reports_page_opened', { user_id })
analytics.track('report_builder_started', { report_type })
analytics.track('report_generated', { 
  report_type, 
  date_range_days,
  chart_type 
})
analytics.track('report_saved', { name, report_type })
analytics.track('report_exported', { format: 'csv|pdf', user_id })
analytics.track('report_emailed', { user_id })
analytics.track('saved_reports_list_viewed', { count })
analytics.track('report_deleted', { report_id })
```

---

## Implementation Timeline

```
Week 1   [Referral Program Backend]
├── Referral schema & endpoints
├── Share tracking
└── Referral code generation
├── Week 1.5: Referral frontend
└── Week 2: Signup integration

Week 2-3 [Tiered Subscriptions]
├── Stripe integration
├── Subscription schema & endpoints
├── Pricing page
└── Feature gating
├── Week 3: Subscription portal
└── Feature restriction middleware

Week 3-4 [Advanced Reporting]
├── Aggregation service
├── Report endpoints
├── Backend filtering
└── Front-end report builder
├── Week 4: Charts & visualization
└── Export functionality

Weeks 2-4 (Parallel)
├── Phase 2 Testing & QA
├── User feedback collection
├── Performance optimization
└── Documentation

Week 5 (Buffer)
├── Bug fixes
├── Optimization
├── Cross-feature integration tests
├── Launch preparation
```

## Success Metrics

### Referral Program
- KPI: Referral signup rate > 30% of new users
- KPI: Average lifetime value of referred users = LTV × 1.3
- KPI: Share engagement rate > 50%

### Tiered Subscriptions
- KPI: 10-15% of users upgrade within 60 days
- KPI: MRR reaches $5-10K
- KPI: Churn rate < 5% per month
- KPI: CAC payback period < 6 months

### Advanced Reporting
- KPI: 60% of users create ≥1 report
- KPI: Users with reports have 40% ↓ churn
- KPI: Average session time +25%
- KPI: Feature adoption grows 5% per week

---

## Success Criteria for Phase 2

- [ ] All three features deployed and working
- [ ] Zero critical bugs in production
- [ ] Performance metrics maintained (LCP < 2.5s, FID < 100ms)
- [ ] User feedback positive (>4/5 stars on new features)
- [ ] Phase 2 KPIs on track
- [ ] Documentation updated
- [ ] Team trained on new systems
- [ ] Monitoring & analytics capturing all metrics

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|---------|------------|
| Stripe integration bugs | Critical | Extensive testing in sandbox environment |
| Feature gate logic errors | High | Unit tests + canary rollout (10% users) |
| Report generation slow | Medium | Implement caching + async job queue |
| Payment webhook failures | High | Implement retry logic + manual reconciliation |
| Over-promised features | Medium | Trim scope to MVP, plan Phase 3 for advanced features |

---

## Dependencies & Prerequisites

**Phase 2 Start Requirements:**
- [ ] Phase 1 production stable for 1 week (no critical bugs)
- [ ] Stripe account set up with API keys
- [ ] PDF generation library selected & tested
- [ ] Chart library (Recharts) installed in web
- [ ] Analytics service capturing events (Segment/Mixpanel)
- [ ] Team trained on Stripe, WebHooks, payment processing

**Recommended Reading:**
- Stripe documentation: https://stripe.com/docs
- Recharts documentation: https://recharts.org
- MongoDB aggregation: https://docs.mongodb.com/manual/aggregation/

**Tools & Services:**
- Stripe (payment processing)
- Recharts (charting)
- pdf-lib (PDF generation)
- SendGrid or Mailgun (email delivery)
- PagerDuty or Sentry (error monitoring)

---

## Questions & Discussion

1. **Referral Program:** Should we have a cap on credits earned per user?
2. **Subscriptions:** Do we want a free trial period (14 days)?
3. **Reports:** What's the priority for scheduled/automated reports?
4. **Rollout:** Should we A/B test pricing or roll out immediately?
5. **Support:** Who owns customer support for subscription issues?

---

**Last Updated:** March 12, 2026  
**Phase 1 Status:** ✅ COMPLETE  
**Phase 2 Status:** 📋 PLANNING  
**Phase 2 Start Date:** March 13, 2026
