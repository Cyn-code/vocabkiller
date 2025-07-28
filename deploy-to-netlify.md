# Deploy VocabKiller to Netlify

## Step 1: Prepare Your Repository

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Ensure your repository structure**:
   ```
   VocabKiller/
   ├── public/
   │   ├── index.html
   │   ├── learn-unknown-words-subpage.html
   │   ├── css/
   │   ├── js/
   │   └── [other assets]
   ├── netlify.toml
   └── README.md
   ```

## Step 2: Deploy to Netlify

### Method A: Netlify UI (Recommended)

1. **Go to [netlify.com](https://netlify.com)** and sign up/login
2. **Click "New site from Git"**
3. **Connect to GitHub** and select your VocabKiller repository
4. **Configure build settings**:
   - Build command: `(leave empty)`
   - Publish directory: `public`
5. **Click "Deploy site"**

### Method B: Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod --dir=public
   ```

## Step 3: Configure Custom Domain

1. **In Netlify dashboard**, go to your site settings
2. **Click "Domain management"**
3. **Click "Add custom domain"**
4. **Enter**: `prepdy.com`
5. **Configure DNS** at Flarecloud:
   - Add CNAME record: `prepdy.com` → `your-site.netlify.app`
   - Or add A record: `prepdy.com` → Netlify's IP

## Step 4: Test Your Deployment

1. **Visit your site**: `https://prepdy.com`
2. **Test all features**:
   - Text input and processing
   - Dictionary popup
   - Unknown words list
   - Translation features
   - Speech functionality

## Step 5: Update API Configuration

Since spaCy API is on VPS, you have two options:

### Option A: Keep VPS for spaCy (Recommended)
- Frontend: Netlify (`prepdy.com`)
- spaCy API: VPS (internal use only)
- External APIs: Free Dictionary API, Lingva Translate

### Option B: Remove spaCy temporarily
- Comment out lemmatization features
- Use simple rule-based fallback
- Deploy spaCy later when budget allows

## Benefits of This Setup

✅ **Free hosting** with unlimited bandwidth
✅ **Custom domain** `prepdy.com`
✅ **Automatic HTTPS** with SSL certificates
✅ **Global CDN** for fast loading worldwide
✅ **Easy updates** - just push to GitHub
✅ **No server management** needed
✅ **Professional appearance** with custom domain

## Troubleshooting

- **Build errors**: Check `netlify.toml` configuration
- **Domain issues**: Verify DNS settings at Flarecloud
- **API errors**: Check browser console for CORS issues
- **404 errors**: Ensure `netlify.toml` redirects are correct 