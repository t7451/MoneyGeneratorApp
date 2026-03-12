# Automated Deployment Guide

**Status**: ✅ Ready for automated deployment  
**Setup**: Production & staging pipelines configured  
**Date**: March 11, 2026  

---

## 🤖 Automation Overview

Money Generator App now has full automated deployment with multiple options:

### 1. **GitHub Actions (Recommended)**
Automatically deploys to Netlify when you push to main branch.

### 2. **Deployment Script**
Manual deployment with validation and checks.

### 3. **Netlify Git Integration**
Direct integration between GitHub and Netlify (optional).

---

## 🚀 GitHub Actions Setup

### What It Does
- Automatically builds and deploys on `git push origin main`
- Runs TypeScript compilation and Vite build
- Validates before deploying
- Reports deployment status
- Only deploys on changes to `web/` or `netlify.toml`

### Configure GitHub Secrets

1. Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

2. Add these secrets:
   ```
   NETLIFY_AUTH_TOKEN  (your Netlify auth token)
   NETLIFY_SITE_ID     (your Netlify site ID)
   ```

### Get Your Netlify Credentials

**NETLIFY_AUTH_TOKEN:**
```bash
netlify login
# Token is stored in ~/.netlify/state.json
# Or go to: https://app.netlify.com/user/applications/personal-access-tokens
```

**NETLIFY_SITE_ID:**
```bash
netlify sites:list
# Or go to: https://app.netlify.com → Select your site → Site settings
```

### Enable Automatic Deployment

```bash
cd /home/skdev/MoneyGeneratorApp

# Ensure secrets are set in GitHub
# Then just push to main:
git push origin main

# GitHub Actions will automatically:
# 1. Build the web app
# 2. Deploy to Netlify
# 3. Post status and URL
```

---

## 📜 Deployment Script

Use the `npm run deploy` command for manual deployments with validation.

### Production Deployment

```bash
npm run deploy
```

This script will:
- ✅ Validate Node.js, npm, git
- ✅ Check git status and current branch
- ✅ Prompt for confirmation
- ✅ Install dependencies
- ✅ Build the web app
- ✅ Deploy to Netlify (production)
- ✅ Report results

### Staging Deployment

```bash
npm run deploy:staging
```

Same as production but deploys to staging environment.

### Script Features

- **Comprehensive validation** - Checks all prerequisites
- **Git integration** - Verifies repository status
- **Build verification** - Confirms successful build
- **Error handling** - Clear error messages
- **Confirmation prompts** - Prevents accidental deployment
- **Colored output** - Easy to read terminal output
- **Detailed reporting** - Deployment metrics and results

### Script Workflow

```
1. Validate Environment
   ├─ Check Node.js version
   ├─ Check npm version
   ├─ Check git
   └─ Verify project structure

2. Check Git Status
   ├─ Verify no uncommitted changes
   ├─ Confirm current branch
   └─ Get latest commit info

3. Build Web App
   ├─ Install dependencies
   ├─ Run npm run build
   └─ Verify build output

4. Deploy to Netlify
   ├─ Check Netlify CLI
   ├─ Verify authentication
   ├─ Confirm environment (prod/staging)
   └─ Run deployment

5. Post-Deployment
   ├─ Report results
   ├─ Show deployment metrics
   └─ Provide next steps
```

---

## 🔧 Manual Setup (Without Automation)

If you prefer to deploy manually without scripts:

```bash
# 1. Build locally
cd web
npm run build

# 2. Verify build output exists
ls -la dist/

# 3. Deploy to Netlify
netlify deploy --prod --dir=dist
```

---

## 📝 Configuration Files

### `.github/workflows/deploy.yml`
- GitHub Actions workflow configuration
- Triggers on push to main
- Runs build and deployment
- Requires GitHub secrets

### `scripts/deploy.sh`
- Executable deployment script
- Bash script with validation
- Interactive prompts
- Colored output

### `.deployment.json`
- Deployment configuration
- Documents automation setup
- Lists requirements and triggers

### `netlify.toml`
- Netlify build configuration
- Build command: `npm run build`
- Publish directory: `web/dist`
- Environment variables and redirects

---

## 🔐 Security Checklist

- ✅ Never commit Netlify tokens to git
- ✅ Always use GitHub Secrets for credentials
- ✅ Verify branch before production deploy
- ✅ Review build log before deployment
- ✅ Monitor Netlify dashboard post-deploy
- ✅ Check security headers after deploy

---

## 📊 Deployment Options Comparison

| Option | Setup | Manual | Auto | Branch-Based | Best For |
|--------|-------|--------|------|--------------|----------|
| GitHub Actions | 5 min | ❌ | ✅ | Yes (main) | CI/CD pipeline |
| Deploy Script | 2 min | ✅ | ❌ | No | Local control |
| Manual CLI | 1 min | ✅ | ❌ | No | Quick testing |
| Netlify Git | 3 min | ❌ | ✅ | Yes (any) | Simple setup |

---

## 🚀 Quick Start

### Option 1: GitHub Actions (Recommended)
```bash
# 1. Set GitHub secrets (one-time setup)
# 2. Just push to main:
git push origin main
# Deployment happens automatically!
```

### Option 2: Deploy Script
```bash
# Production
npm run deploy

# Or staging
npm run deploy:staging
```

### Option 3: Manual Netlify CLI
```bash
netlify deploy --prod --dir=web/dist
```

---

## 🐛 Troubleshooting

### GitHub Actions Fails
1. Check `.github/workflows/deploy.yml` exists
2. Verify GitHub secrets are set correctly
3. Check workflow logs in GitHub → Actions
4. Ensure `web/package.json` has build script

### Deploy Script Fails
1. Run `node --version` (should be 20+)
2. Run `npm --version`
3. Run `git status` (should be clean)
4. Check `scripts/deploy.sh` is executable: `ls -la scripts/`

### Build Fails
1. Run `cd web && npm run build` locally
2. Check for TypeScript errors
3. Verify all dependencies installed: `npm ci`
4. Check `netlify.toml` has correct paths

### Netlify Auth Fails
1. Run `netlify login` to authenticate
2. Check `NETLIFY_AUTH_TOKEN` secret in GitHub
3. Verify token hasn't expired
4. Generate new token at: https://app.netlify.com/user/applications

---

## 📈 Monitoring Deployment

### GitHub Actions Dashboard
Go to: **GitHub Repo → Actions → Deploy to Netlify**
- See build logs
- Track deployment status
- View workflow history

### Netlify Dashboard
Go to: **https://app.netlify.com**
- Monitor deployment in real-time
- View build logs
- Check analytics
- Track performance metrics

---

## Next Steps

1. **Set GitHub Secrets** (if using GitHub Actions)
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`

2. **Test Automation**
   - Make a small commit to web/
   - Push to main branch
   - Watch GitHub Actions run
   - Verify Netlify deployment

3. **Monitor Results**
   - Check GitHub Actions logs
   - Visit your Netlify site
   - Verify functionality
   - Monitor error tracking

---

**Setup Complete!** You can now deploy automatically. 🚀

For questions, see: [DEPLOYMENT_V1.md](DEPLOYMENT_V1.md)
