#!/usr/bin/env bash
# 1Commerce — MoneyGeneratorApp Deploy Readiness Check
# Run before every production deploy: bash scripts/check-deploy-ready.sh

set -e
ERRORS=0
WARNINGS=0

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✅ $label"
  else
    echo "  ❌ $label"
    ERRORS=$((ERRORS + 1))
  fi
}

warn() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✅ $label"
  else
    echo "  ⚠️  $label (warning)"
    WARNINGS=$((WARNINGS + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════"
echo "  MoneyGeneratorApp — Deploy Readiness Check"
echo "═══════════════════════════════════════════"
echo ""

echo "── ENV VARS (server) ──"
check "STRIPE_SECRET_KEY set"     '[ -n "$STRIPE_SECRET_KEY" ]'
check "JWT_SECRET set"             '[ -n "$JWT_SECRET" ]'
check "DATABASE_URL set"           '[ -n "$DATABASE_URL" ]'
check "JWT_SECRET length (>=32)"   '[ "${#JWT_SECRET}" -ge 32 ]'
warn  "STRIPE_WEBHOOK set"         '[ -n "$STRIPE_SUBSCRIPTION_WEBHOOK_SECRET" ]'
warn  "APP_URL set"                '[ -n "$APP_URL" ]'
warn  "FRONTEND_URL set"           '[ -n "$FRONTEND_URL" ]'

echo ""
echo "── BUILD CHECK ──"
check "Node >=18"     'node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)"'
check "server deps"   'cd server && npm ci --production --silent 2>/dev/null || npm install --production --silent'
check "bundle budget gate" 'cd web && npm run build:budget 2>/dev/null'
check "web build"     'cd web && npm run build 2>/dev/null'

echo ""
echo "── SECURITY ──"
warn  "No hardcoded secrets"   '! grep -rn "sk_live_\|sk_test_" server/src web/src 2>/dev/null | grep -v ".env"'
warn  "No TODO/FIXME in prod"  '! grep -rn "TODO\|FIXME\|HACK" server/src 2>/dev/null | grep -v ".test." | head -1'

echo ""
if [ $ERRORS -gt 0 ]; then
  echo "❌ DEPLOY BLOCKED — $ERRORS error(s), $WARNINGS warning(s)"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  DEPLOY WITH CAUTION — 0 errors, $WARNINGS warning(s)"
  exit 0
else
  echo "✅ READY TO DEPLOY — All checks passed"
  exit 0
fi
