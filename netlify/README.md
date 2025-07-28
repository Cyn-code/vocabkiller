# VocabKiller spaCy Lemmatization - Netlify Functions

## Overview
This directory contains the Netlify Functions implementation for spaCy-based lemmatization in VocabKiller.

## Structure
```
netlify/
├── functions/
│   ├── lemmatize.py          # Main spaCy lemmatization function
│   ├── requirements.txt      # Python dependencies
│   └── runtime.txt          # Python version specification
├── netlify.toml             # Netlify configuration
└── README.md               # This file
```

## Features
- **spaCy Integration**: Uses spaCy's `en_core_web_sm` model for accurate lemmatization
- **Caching**: Client-side caching to reduce API calls
- **Manual Editing**: Users can manually edit lemmatization results
- **Error Handling**: Graceful fallback when spaCy fails
- **CORS Support**: Configured for cross-origin requests

## API Endpoint
- **URL**: `/.netlify/functions/lemmatize`
- **Method**: POST
- **Content-Type**: application/json

### Request Format
```json
{
  "word": "books"
}
```

### Response Format
```json
{
  "original": "books",
  "lemma": "book",
  "pos": "NOUN",
  "success": true
}
```

## Local Development

### Prerequisites
- Node.js and npm
- Netlify CLI: `npm install -g netlify-cli`

### Running Locally
1. Start the development server:
   ```bash
   npx netlify dev
   ```

2. Test the function:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/lemmatize \
     -H "Content-Type: application/json" \
     -d '{"word": "books"}'
   ```

## Deployment

### Automatic Deployment (Recommended)
1. Connect your repository to Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

### Manual Deployment
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Login to Netlify: `netlify login`
3. Initialize project: `netlify init`
4. Deploy: `netlify deploy --prod`

## Configuration

### netlify.toml
```toml
[build]
  functions = "netlify/functions"
  publish = "public"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions."lemmatize"]
  runtime = "python3.9"
```

## Dependencies

### Python Dependencies (requirements.txt)
```
spacy==3.7.2
```

### Runtime
- Python 3.9 (specified in runtime.txt)

## Cost Analysis
- **Netlify Free Tier**: 125,000 function calls/month
- **spaCy**: Completely free (open source)
- **Estimated Cost**: $0 (within free tier limits)

## Performance
- **Cold Start**: ~2-3 seconds (first request)
- **Warm Start**: ~100-200ms (subsequent requests)
- **Caching**: Reduces response times significantly

## Troubleshooting

### Common Issues
1. **403 Forbidden**: Check CORS configuration and function permissions
2. **Model Loading Error**: Ensure spaCy model is properly installed
3. **Timeout**: Function may timeout on first request due to model download

### Debug Steps
1. Check Netlify Function logs in the dashboard
2. Test locally with `netlify dev`
3. Verify Python runtime and dependencies
4. Check CORS headers in function response

## Integration with Frontend

The frontend integrates with this function through the `LemmatizerService` class in `public/js/learn-unknown-words-subpage.js`.

### Usage Example
```javascript
const lemmatizer = new LemmatizerService();
const result = await lemmatizer.lemmatize('books');
console.log(result.lemma); // 'book'
```

## Future Enhancements
- Batch processing for multiple words
- Additional language support
- Advanced caching strategies
- Performance optimization 