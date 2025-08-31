# 🚀 VocabKiller Git Branch Workflow

## 📋 **Branch Structure**

```
main branch          → https://vocabkiller.com (PRODUCTION)
development branch   → https://vocabkiller-staging.pages.dev (STAGING)
feature/* branches   → https://<branch>.vocabkiller-staging.pages.dev
```

---

## 🔄 **Daily Development Workflow**

### **1. Starting New Feature:**
```bash
# Switch to development branch
git checkout development

# Create new feature branch
git checkout -b feature/feature-name

# Work on your feature...
# Test locally: npm start
```

### **2. Deploy Feature for Testing:**
```bash
# Build your feature
npm run build

# Deploy to feature-specific URL
npx wrangler pages deploy build --project-name vocabkiller-staging --branch feature/feature-name

# Test at: https://feature-feature-name.vocabkiller-staging.pages.dev
```

### **3. When Feature is Ready:**
```bash
# Switch to development branch
git checkout development

# Merge your feature
git merge feature/feature-name

# Deploy to staging
npm run build
npx wrangler pages deploy build --project-name vocabkiller-staging

# Test at: https://vocabkiller-staging.pages.dev
```

### **4. Deploy to Production (When Everything is Perfect):**
```bash
# Switch to main branch
git checkout main

# Merge development
git merge development

# Deploy to production
npm run build
npx wrangler pages deploy build --project-name vocabkiller

# Live at: https://vocabkiller.com ✨
```

---

## 🛡️ **AI Assistant Instructions**

### **For Development Work:**
```
"Work on the development branch or create a feature branch.
Deploy only to vocabkiller-staging project.
NEVER deploy to the main vocabkiller project unless explicitly told to deploy to production."
```

### **For Production Deployment:**
```
"Switch to main branch, merge from development, then deploy to vocabkiller project.
Only do this when I explicitly say 'deploy to production'."
```

---

## 🌐 **URL Reference**

| Environment | URL | Branch | Purpose |
|-------------|-----|---------|---------|
| **Production** | https://vocabkiller.com | `main` | Live site |
| **Staging** | https://vocabkiller-staging.pages.dev | `development` | Test all features |
| **Feature Test** | https://feature-name.vocabkiller-staging.pages.dev | `feature/*` | Individual features |
| **Local** | http://localhost:3000 | Any | Development |

---

## ✅ **Current Setup Status:**

- ✅ Main branch: Contains all recent fixes
- ✅ Development branch: Ready for new features  
- ✅ Staging deployment: vocabkiller-staging project created
- ✅ Feature branch: feature/test-workflow created
- ✅ Production: https://vocabkiller.com (safe and working)

---

## 🚀 **You're Ready to Develop!**

Your workflow is now set up. You can safely:
1. Create feature branches
2. Test on staging URLs
3. Merge when ready
4. Deploy to production only when perfect

**Happy coding!** 🎯