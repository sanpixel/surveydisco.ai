# New Warp-Ratio React Container - Starter Prompt

## Input Required
```powershell
$APP_NAME = Split-Path -Leaf (Get-Location)
```
**App Name:** $APP_NAME (from current directory)
**Description:** What does $APP_NAME do?
**Database:** Supabase (from begin.env)

## Automated Checklist

### 1. Project Structure Setup
```bash
git init
mkdir frontend backend
Copy-Item "C:\dev\begin.env" ".env"
npx create-react-app frontend
cd frontend && npm install @supabase/supabase-js && cd ..
cd backend && npm init -y && npm install express cors dotenv helmet morgan && npm install --save-dev nodemon && cd ..
```

### 2. .env Validation
- [ ] Verify .env copied with static keys:
  - PROJECT_ID = warp-ratio
  - SUPABASE_URL = (from begin.env)
  - SUPABASE_ANON_KEY = (from begin.env)
  - SUPABASE_SERVICE_ROLE_KEY = (from begin.env)
- [ ] Keys to be generated during deployment:
  - SERVICE_ACCOUNT_JSON = (will be generated)
  - GOOGLE_CLIENT_ID = (will be generated via gcloud)
  - GOOGLE_CLIENT_SECRET = (will be generated via gcloud)
  - CLOUD_RUN_URL = (will be generated)

### 3. Create Files
- [ ] Root package.json
- [ ] backend/index.js (minimal API)
- [ ] Dockerfile
- [ ] .dockerignore
- [ ] .gitignore (include .env, key.json)

### 4. Warp-Ratio Deployment
```bash
# Set project
gcloud config set project warp-ratio

# Create registry
gcloud artifacts repositories create [APP-NAME] --repository-format=docker --location=us-central1

# Create service account
gcloud iam service-accounts create [APP-NAME]-service

# Generate key
gcloud iam service-accounts keys create key.json --iam-account=[APP-NAME]-service@warp-ratio.iam.gserviceaccount.com

# Automatically add SERVICE_ACCOUNT_JSON to .env
$SERVICE_ACCOUNT_JSON = Get-Content key.json -Raw
(Get-Content .env) -replace 'SERVICE_ACCOUNT_JSON = \(CLI generated\)', "SERVICE_ACCOUNT_JSON = $SERVICE_ACCOUNT_JSON" | Set-Content .env

# Grant permissions
gcloud projects add-iam-policy-binding warp-ratio --member="serviceAccount:[APP-NAME]-service@warp-ratio.iam.gserviceaccount.com" --role="roles/run.admin" --condition=None
gcloud projects add-iam-policy-binding warp-ratio --member="serviceAccount:[APP-NAME]-service@warp-ratio.iam.gserviceaccount.com" --role="roles/storage.admin" --condition=None

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and deploy
docker build -t us-central1-docker.pkg.dev/warp-ratio/[APP-NAME]/[APP-NAME]:latest .
docker push us-central1-docker.pkg.dev/warp-ratio/[APP-NAME]/[APP-NAME]:latest
gcloud run deploy [APP-NAME] --image us-central1-docker.pkg.dev/warp-ratio/[APP-NAME]/[APP-NAME]:latest --region us-central1 --allow-unauthenticated --memory 1Gi --cpu 1 --max-instances 10
```

### 5. Update .env
- [ ] Verify SERVICE_ACCOUNT_JSON was added automatically
- [ ] Add CLOUD_RUN_URL from deployment output
- [ ] Verify all keys are populated

### 6. Git Operations
- [ ] git add .
- [ ] git commit -m "Initial [APP-NAME] setup and deployment"
- [ ] git push origin master

### 7. Start Local Servers
```bash
# Backend (separate window)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\dev\$APP_NAME\backend'; npm run dev"

# Frontend (separate window)  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\dev\$APP_NAME\frontend'; npm start"
```

### 8. Test Container Deployment
- [ ] Cloud Run service visible in warp-ratio project
- [ ] Service responds at generated URL
- [ ] Local development servers running

### 9. Google OAuth Setup (CLI Generated)
```bash
# Create OAuth client
gcloud auth application-default set-quota-project warp-ratio
gcloud services enable iamcredentials.googleapis.com

# This creates OAuth credentials programmatically
gcloud iam oauth-clients create [APP-NAME]-oauth \
  --project=warp-ratio \
  --application-type=web \
  --client-name="[APP-NAME] OAuth Client" \
  --redirect-uris="http://localhost:3000/auth/callback,https://[DOMAIN]/auth/callback"
```

### 10. Final .env Update
- [ ] Add GOOGLE_CLIENT_ID from OAuth creation output
- [ ] Add GOOGLE_CLIENT_SECRET from OAuth creation output
- [ ] Verify all keys are populated

## Success Validation
- [ ] Cloud Run service visible in warp-ratio project
- [ ] Service responds at generated URL
- [ ] Local development servers running
- [ ] .env file complete with all values
- [ ] Git repo updated

## Template Files

### Root package.json
```json
{
  "name": "[APP-NAME]",
  "version": "1.0.0",
  "scripts": {
    "start": "node backend/index.js",
    "dev": "cd backend && npm run dev"
  }
}
```

### backend/index.js
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: '[APP-NAME]', port: PORT });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### backend/package.json scripts
```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

COPY . .

RUN cd frontend && npm run build

EXPOSE 8080

CMD ["node", "backend/index.js"]
```

### .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
frontend/node_modules
backend/node_modules
```

### .gitignore
```
node_modules/
.env
.env.local
npm-debug.log*
key.json
.DS_Store
```

## Error Handling
- If service account already exists: Continue with existing
- If registry already exists: Continue with existing
- If Docker build fails: Check for .env issues
- If permissions denied: Verify warp-ratio project access
- If deployment fails: Check logs with `gcloud run services logs read [APP-NAME] --region=us-central1`
- If OAuth creation fails: Use manual console method as fallback
