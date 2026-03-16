# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Removed the unused `vite-plugin-pwa` dependency chain from `web/` after audit identified a high-severity advisory through `workbox-build` and `serialize-javascript`.
- Removed stale PWA references from the Vite config and frontend type declarations so the source matches the installed dependency graph.

## [1.3.1] - 2026-03-16

### Added
- Strict bundle budget reporting and retained build artifacts for release verification.
- Lazy-loaded SVG chart preview components for the reports builder.
- Deferred Jobs map initialization with an in-view loading placeholder.

### Changed
- Removed `Recharts` from the frontend in favor of lightweight SVG report previews.
- Replaced the remote MapLibre demo style with a local app-owned style and removed cluster text glyph dependencies.
- Split onboarding and mobile-only CSS out of the entry stylesheet, trimmed shared layout/component CSS, and reduced entry CSS to roughly 31 kB.
- Simplified `index.html` metadata and cleaned overlapping global styles in `web/src/index.css`.

### Fixed
- Cleared reported frontend diagnostics in `index.html`, TypeScript config, and auth/connect styling.
- Synchronized the web lockfile to match the shipped dependency graph.

## [1.3.0] - 2026-03-12

### Added
- Accessibility Improvements (Phase 1, Item 3).
- Keyboard and screen reader support for onboarding role, platform, and plan selection.
- Live step announcements and labeled range sliders for goals.
- Restored overlay structure with semantic buttons and focus outlines.

### Changed
- Onboarding styles now leverage CSS variables for high-contrast themes across light/dark.

## [1.2.0] - 2026-03-12

### Added
- Dark Mode Enhancement (Phase 1, Item 2).
- `ThemeContext` for global theme management (light/dark).
- Theme toggle in `AppLayout` (Mobile Header & Desktop Sidebar).
- CSS Variables implementation for dynamic theming across the app.
- Updated `OnboardingWizard` and layout components to support dark mode.

## [1.1.0] - 2026-03-12

### Added
- Personalized Onboarding Wizard implementation (Phase 1).
- Dynamic role-based user flows:
    - Freelancer: Connect platforms, link bank, set income goal.
    - Business: Link bank, set revenue goal.
    - Individual: Link bank, set savings goal.
- User intent tracking and role persistence via Local Storage.
- Global `UserRole` context management.
- Complete visual overhaul of the onboarding process with responsive design.

### Changed
- Refactored `App.tsx` to support the new role selection handler.
- Updated `AppContext` to include `useEntitlements`-like functionality for role management.

### Fixed
- Addressed minor TypeScript warnings in `JobsPage`.

## [1.0.0] - 2026-03-11

### Added
- Initial release of Money Generator App web application
- React 19 with TypeScript support
- Vite ultra-fast build system
- Production-ready build configuration
- Netlify deployment configuration with security headers
- SPA routing configuration with fallback
- Asset caching optimization (1 year)
- Environment variables setup for backend API integration
- Comprehensive deployment documentation:
  - DEPLOYMENT_V1.md (complete deployment guide)
  - NETLIFY_DEPLOY_GUIDE.md (quick-start guide)
  - BUILD_COMPLETION_REPORT_V1.md (technical details)
  - RELEASE_NOTES_V1.0.0.md (release information)
- TypeScript strict mode enabled
- ESLint configuration with React hooks support
- Responsive design supporting mobile, tablet, and desktop

### Technical
- React 19.1.1
- React DOM 19.1.1
- TypeScript 5.8.3
- Vite 5.4.21
- Vite React Plugin 4.3.0
- ESLint 8.57.0 with React hooks plugin

### Build Metrics
- Bundle size: 191 KB (61 KB gzipped)
- CSS size: 3.76 KB (1.23 KB gzipped)
- Build time: 2.79 seconds
- 35 modules transformed
- Zero warnings

### Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- CORS headers configured

### Fixed
- Root tsconfig.json React Native reference removed
- TypeScript configuration optimized for web build
- Clean build with zero warnings

### Deployment Ready
- Netlify GitHub integration configured
- Environment variables setup
- Production build verified
- All security configurations in place
- Ready for three deployment methods:
  1. GitHub Integration (Recommended)
  2. Netlify CLI
  3. Drag & Drop

---

## Upcoming Versions

### [1.1.0] - Planned
- Backend API integration
- User authentication
- Product catalog UI
- User dashboard
- Testing suite

### [2.0.0] - Roadmap  
- Advanced analytics
- Payment integration
- Real-time notifications
- Admin dashboard
- Advanced features

---

[Unreleased]: https://github.com/PublicPNWEK/MoneyGeneratorApp/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/PublicPNWEK/MoneyGeneratorApp/releases/tag/v1.3.1
[1.3.0]: https://github.com/PublicPNWEK/MoneyGeneratorApp/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/PublicPNWEK/MoneyGeneratorApp/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/PublicPNWEK/MoneyGeneratorApp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/PublicPNWEK/MoneyGeneratorApp/releases/tag/v1.0.0
