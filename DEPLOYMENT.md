# SurveyDisco.ai Deployment Guide

---

## SECTION 1: PREREQUISITES

**1.** Install gcloud CLI (Google Cloud SDK)

**2.** Install Node.js (v18 or higher)

**3.** Install GitHub CLI (`gh`)

**4.** Install Docker Desktop

**5.** Go to Google Cloud Console → Create new project: `surveydisco-ai`

**6.** Enable billing for the project (use existing warp-ratio billing account)

**7.** 🔴 **RED: Note the PROJECT_ID** (will need for deployment)

**8.** Authenticate with Google Cloud:
```bash
gcloud auth login
```

**9.** Set your project:
```bash
gcloud config set project YOUR-PROJECT-ID
```

**10.** Enable required APIs:
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable drive.googleapis.com
```

---

## SECTION 2: APPLICATION SETUP

**11.** Create project structure:
```bash
mkdir frontend backend
```

**12.** Create React frontend:
```bash
npx create-react-app frontend
```

**13.** Install Supabase in frontend:
```bash
cd frontend
npm install @supabase/supabase-js
cd ..
```

**14.** Initialize Node.js backend:
```bash
cd backend
npm init -y
npm install express cors dotenv helmet morgan
npm install --save-dev nodemon
cd ..
```

**15.** Create root `package.json`:
```json
{
  "name": "surveydisco-ai",
  "version": "1.0.0",
  "scripts": {
    "start": "node backend/index.js",
    "dev": "cd backend && npm run dev"
  }
}
```

**16.** Create `backend/index.js`:
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve React static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'SurveyDisco.ai' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

**17.** Update `backend/package.json` scripts:
```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

**18.** Create `Dockerfile`:
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

**19.** Create `.dockerignore`:
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

**20.** Create `.gitignore`:
```
node_modules/
.env
.env.local
npm-debug.log*
key.json
.DS_Store
```

---

## SECTION 3: SUPABASE SETUP

**21.** Go to supabase.com → Create new project: `surveydisco-ai`

**22.** Wait for project setup to complete

**23.** Go to Settings → API

**24.** 🔴 **RED: Copy SUPABASE_URL**

**25.** 🔴 **RED: Copy SUPABASE_ANON_KEY**

**26.** 🔴 **RED: Copy SUPABASE_SERVICE_ROLE_KEY**

**27.** Go to SQL Editor → Create new query

**28.** Create projects table:
```sql
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id VARCHAR,
  client_email VARCHAR NOT NULL,
  client_name VARCHAR,
  project_type VARCHAR NOT NULL,
  address VARCHAR,
  parcel_info TEXT,
  status VARCHAR DEFAULT 'incoming',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**29.** Create project stages table:
```sql
CREATE TABLE project_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  stage VARCHAR NOT NULL,
  completed_at TIMESTAMP,
  notes TEXT
);
```

**30.** Create team members table:
```sql
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**31.** Enable Row Level Security:
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
```

**32.** Create security policies:
```sql
CREATE POLICY "Team members can view projects" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Team members can create projects" ON projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

---

## SECTION 4: GOOGLE APIS SETUP

**33.** Create service account:
```bash
gcloud iam service-accounts create surveydisco-service
```

**34.** Generate service account key:
```bash
gcloud iam service-accounts keys create key.json --iam-account=surveydisco-service@YOUR-PROJECT-ID.iam.gserviceaccount.com
```

**35.** 🔴 **RED: Open key.json and copy entire contents** (becomes GCP_SA_KEY)

**36.** Grant Cloud Run permissions:
```bash
gcloud projects add-iam-policy-binding YOUR-PROJECT-ID --member="serviceAccount:surveydisco-service@YOUR-PROJECT-ID.iam.gserviceaccount.com" --role="roles/run.admin"
```

**37.** Grant Storage permissions:
```bash
gcloud projects add-iam-policy-binding YOUR-PROJECT-ID --member="serviceAccount:surveydisco-service@YOUR-PROJECT-ID.iam.gserviceaccount.com" --role="roles/storage.admin"
```

**38.** Go to Google Cloud Console → APIs & Services → Credentials

**39.** Click "Create Credentials" → "OAuth 2.0 Client ID"

**40.** Choose "Web application" → Name: "SurveyDisco OAuth"

**41.** Add redirect URIs:
- `http://localhost:3000/auth/callback`
- `https://YOUR-DOMAIN/auth/callback`

**42.** 🔴 **RED: Copy Client ID**

**43.** 🔴 **RED: Copy Client Secret**

**44.** Enable Gmail API:
- APIs & Services → Library → Search "Gmail API" → Enable

**45.** Enable Google Drive API:
- APIs & Services → Library → Search "Google Drive API" → Enable

---

## SECTION 5: ENVIRONMENT CONFIGURATION

**46.** Create `.env` file:
```env
SUPABASE_URL=RED_SUPABASE_URL
SUPABASE_ANON_KEY=RED_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=RED_SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID=RED_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=RED_GOOGLE_CLIENT_SECRET
NODE_ENV=development
PORT=8080
```

---

## SECTION 6: MANUAL DEPLOYMENT

**47.** Create Artifact Registry repository:
```bash
gcloud artifacts repositories create surveydisco-ai --repository-format=docker --location=us-central1
```

**48.** Configure Docker authentication:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

**49.** Build Docker image:
```bash
docker build -t us-central1-docker.pkg.dev/YOUR-PROJECT-ID/surveydisco-ai/surveydisco:latest .
```

**50.** Push Docker image:
```bash
docker push us-central1-docker.pkg.dev/YOUR-PROJECT-ID/surveydisco-ai/surveydisco:latest
```

**51.** Deploy to Cloud Run:
```bash
gcloud run deploy surveydisco-ai \
  --image us-central1-docker.pkg.dev/YOUR-PROJECT-ID/surveydisco-ai/surveydisco:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars="SUPABASE_URL=RED_SUPABASE_URL,SUPABASE_ANON_KEY=RED_SUPABASE_ANON_KEY,GOOGLE_CLIENT_ID=RED_GOOGLE_CLIENT_ID,SUPABASE_SERVICE_ROLE_KEY=RED_SUPABASE_SERVICE_ROLE_KEY,GOOGLE_CLIENT_SECRET=RED_GOOGLE_CLIENT_SECRET"
```

**52.** 🔴 **RED: Copy the Cloud Run URL from deployment output**

**53.** Test deployment by visiting the URL

---

## SECTION 7: GITHUB ACTIONS SETUP

**54.** Go to GitHub repo → Settings → Secrets and variables → Actions

**55.** Add these secrets:

| Secret Name | Value |
|-------------|--------|
| `GCP_PROJECT_ID` | 🔴 **RED_YOUR_PROJECT_ID** |
| `GCP_SA_KEY` | 🔴 **RED_SERVICE_ACCOUNT_JSON** |
| `SUPABASE_URL` | 🔴 **RED_SUPABASE_URL** |
| `SUPABASE_ANON_KEY` | 🔴 **RED_SUPABASE_ANON_KEY** |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 **RED_SUPABASE_SERVICE_ROLE_KEY** |
| `GOOGLE_CLIENT_ID` | 🔴 **RED_GOOGLE_CLIENT_ID** |
| `GOOGLE_CLIENT_SECRET` | 🔴 **RED_GOOGLE_CLIENT_SECRET** |

**56.** Create directory:
```bash
mkdir -p .github/workflows
```

**57.** Create `.github/workflows/deploy-cloud-run.yml`:
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GAR_LOCATION: us-central1
  SERVICE: surveydisco-ai
  REGION: us-central1

jobs:
  deploy:
    permissions:
      contents: read
      id-token: write
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Google Auth
      uses: 'google-github-actions/auth@v2'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'

    - name: Docker Auth
      uses: 'docker/login-action@v3'
      with:
        registry: ${{ env.GAR_LOCATION }}-docker.pkg.dev
        username: _json_key
        password: ${{ secrets.GCP_SA_KEY }}

    - name: Build and Push Container
      run: |-
        docker build -t "${{ env.GAR_LOCATION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/surveydisco-ai/${{ env.SERVICE }}:${{ github.sha }}" ./
        docker push "${{ env.GAR_LOCATION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/surveydisco-ai/${{ env.SERVICE }}:${{ github.sha }}"

    - name: Deploy to Cloud Run
      uses: google-github-actions/deploy-cloudrun@v2
      with:
        service: ${{ env.SERVICE }}
        region: ${{ env.REGION }}
        image: ${{ env.GAR_LOCATION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/surveydisco-ai/${{ env.SERVICE }}:${{ github.sha }}
        env_vars: |
          SUPABASE_URL=${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GOOGLE_CLIENT_ID=${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET=${{ secrets.GOOGLE_CLIENT_SECRET }}
        labels: |
          managed-by=github-actions
          commit-sha=${{ github.sha }}

    - name: Show Output
      run: echo ${{ steps.deploy.outputs.url }}
```

**58.** Commit and push:
```bash
git add .
git commit -m "Add deployment workflow"
git push origin main
```

**59.** Watch GitHub Actions → Actions tab → Verify workflow runs successfully

---

## SECTION 8: LOCAL DEVELOPMENT

**60.** Update `frontend/src/App.js`:
```javascript
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>SurveyDisco.ai</h1>
        <p>Email-driven surveying workflow management</p>
        <a href="/api/health" target="_blank" rel="noopener noreferrer">
          Test API Health
        </a>
      </header>
    </div>
  );
}

export default App;
```

**61.** Test locally:
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

**62.** Commit updates:
```bash
git add .
git commit -m "Add basic React frontend"
git push origin main
```

---

## RED ITEMS CHECKLIST

🔴 **Items you need to provide:**

- **Step 7:** Google Cloud PROJECT_ID
- **Step 24:** Supabase URL
- **Step 25:** Supabase ANON_KEY  
- **Step 26:** Supabase SERVICE_ROLE_KEY
- **Step 35:** Service Account JSON key content
- **Step 42:** Google OAuth Client ID
- **Step 43:** Google OAuth Client Secret
- **Step 52:** Cloud Run URL (after deployment)

---

## TROUBLESHOOTING

**Local Docker test:**
```bash
docker build -t test .
docker run -p 8080:8080 --env-file .env test
```

**Check Cloud Run logs:**
```bash
gcloud run services logs read surveydisco-ai --region=us-central1
```

**Redeploy if needed:**
```bash
gcloud run services delete surveydisco-ai --region=us-central1
# Then repeat deployment steps
```
