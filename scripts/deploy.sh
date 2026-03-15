#!/bin/bash

# ============================================================================
# Money Generator App - Automated Deployment Script
# ============================================================================
# This script automates the entire deployment process to Netlify
# Usage: ./scripts/deploy.sh [production|staging]
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/web"
BUILD_DIR="$WEB_DIR/dist"
DEPLOYMENT_ENV="${1:-production}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

log_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║ ${1}"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# ============================================================================
# Validation
# ============================================================================

validate_environment() {
    print_header "VALIDATING ENVIRONMENT"

    log_info "Checking Node.js..."
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION found"

    log_info "Checking npm..."
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    NPM_VERSION=$(npm --version)
    log_success "npm $NPM_VERSION found"

    log_info "Checking git..."
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    log_success "git found"

    log_info "Checking if in project root..."
    if [ ! -f "$PROJECT_ROOT/netlify.toml" ]; then
        log_error "netlify.toml not found. Are you in the project root?"
        exit 1
    fi
    log_success "Project root verified"

    log_info "Checking web directory..."
    if [ ! -d "$WEB_DIR" ]; then
        log_error "web/ directory not found"
        exit 1
    fi
    log_success "web/ directory found"
}

# ============================================================================
# Build Process
# ============================================================================

build_web_app() {
    print_header "BUILDING WEB APPLICATION"

    log_info "Installing dependencies..."
    cd "$WEB_DIR"
    npm ci || {
        log_error "Failed to install dependencies"
        exit 1
    }
    log_success "Dependencies installed"

    log_info "Enforcing bundle budgets..."
    npm run build:budget || {
        log_error "Bundle budget check failed"
        exit 1
    }
    log_success "Bundle budgets passed"

    log_info "Running build..."
    npm run build || {
        log_error "Build failed"
        exit 1
    }
    log_success "Build completed successfully"

    log_info "Verifying build output..."
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "Build output missing (index.html not found)"
        exit 1
    fi
    
    BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
    FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l)
    log_success "Build verified: $FILE_COUNT files, $BUILD_SIZE total"
    
    cd "$PROJECT_ROOT"
}

# ============================================================================
# Git Checks
# ============================================================================

check_git_status() {
    print_header "CHECKING GIT STATUS"

    log_info "Checking git status..."
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Working directory has uncommitted changes"
        log_info "Uncommitted files:"
        git status --short | sed 's/^/  /'
        read -p "Continue with deployment? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi
    log_success "Git status verified"

    log_info "Getting current branch..."
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_success "Current branch: $CURRENT_BRANCH"

    if [ "$CURRENT_BRANCH" != "main" ]; then
        log_warning "Current branch is not 'main' ($CURRENT_BRANCH)"
        read -p "Continue with deployment from $CURRENT_BRANCH? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi

    log_info "Getting latest commit..."
    LATEST_COMMIT=$(git log -1 --oneline)
    log_success "Latest commit: $LATEST_COMMIT"
}

# ============================================================================
# Deployment
# ============================================================================

deploy_to_netlify() {
    print_header "DEPLOYING TO NETLIFY (${DEPLOYMENT_ENV})"

    log_info "Checking for Netlify CLI..."
    if ! command -v netlify &> /dev/null; then
        log_warning "Netlify CLI not found. Installing globally..."
        npm install -g netlify-cli || {
            log_error "Failed to install Netlify CLI"
            exit 1
        }
        log_success "Netlify CLI installed"
    fi

    log_info "Checking authentication..."
    if [ -z "$NETLIFY_AUTH_TOKEN" ]; then
        log_warning "NETLIFY_AUTH_TOKEN not set"
        log_info "Run: netlify login"
        read -p "Have you authenticated with Netlify? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Netlify authentication required"
            exit 1
        fi
    else
        log_success "Netlify authentication token found"
    fi

    if [ "$DEPLOYMENT_ENV" == "production" ]; then
        log_warning "Deploying to PRODUCTION environment"
        read -p "Are you sure? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
        DEPLOY_CMD="netlify deploy --prod --dir=$BUILD_DIR"
    else
        log_info "Deploying to staging environment"
        DEPLOY_CMD="netlify deploy --dir=$BUILD_DIR"
    fi

    log_info "Running deployment..."
    $DEPLOY_CMD || {
        log_error "Deployment failed"
        exit 1
    }
    log_success "Deployment completed"
}

# ============================================================================
# Post-Deployment
# ============================================================================

post_deployment() {
    print_header "POST-DEPLOYMENT VERIFICATION"

    log_info "Deployment successful!"
    log_success "Timestamp: $TIMESTAMP"
    log_success "Environment: $DEPLOYMENT_ENV"
    log_success "Build size: $BUILD_SIZE"
    log_success "Files deployed: $FILE_COUNT"
    log_success "Latest commit: $LATEST_COMMIT"

    echo ""
    echo "Next steps:"
    echo "  1. Visit your Netlify site to verify deployment"
    echo "  2. Test functionality in production"
    echo "  3. Monitor error logs and analytics"
    echo "  4. Share the live URL with your team!"
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    print_header "MONEY GENERATOR APP - AUTOMATED DEPLOYMENT"

    log_info "Deployment script started at $TIMESTAMP"
    log_info "Environment: $DEPLOYMENT_ENV"
    log_info "Project root: $PROJECT_ROOT"
    echo ""

    validate_environment
    check_git_status
    build_web_app
    deploy_to_netlify
    post_deployment

    log_success "Deployment completed successfully!"
    exit 0
}

# Run main function
main
