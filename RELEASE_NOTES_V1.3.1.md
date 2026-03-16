# Money Generator App v1.3.1 - Official Release

Release Date: March 16, 2026  
Version: 1.3.1  
Status: Stable

## Highlights

- Replaced the frontend `Recharts` dependency with lightweight SVG report previews.
- Added strict bundle budget governance and verified passing production budget builds.
- Deferred Jobs map initialization until the map section is near the viewport.
- Moved onboarding and mobile-only CSS out of the entry bundle and reduced always-on CSS significantly.
- Simplified release metadata in `index.html` and removed duplicate global styling in `index.css`.

## Performance

- Entry CSS reduced to roughly 31 kB in the final validated budget build.
- Reports chart chunks are now small SVG preview modules instead of chart-library runtime chunks.
- The Jobs map remains lazy and gated behind the map view toggle.

## Verification

- `npm run build:budget` completed successfully.
- `web/dist/bundle-budget-report.json` reported zero budget violations.
- `v1.3.1` was tagged and pushed to GitHub.

## Notes

- MapLibre remains the largest optional frontend payload and is only loaded for Jobs map usage.
- A follow-up security cleanup on `main` removed the unused `vite-plugin-pwa` dependency chain after this release tag.