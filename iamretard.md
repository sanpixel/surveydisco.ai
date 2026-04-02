# I Am Retard - Things I Keep Forgetting

## Resend SDK
- Installed version: 4.0.1
- `resend.emails.receiving` does NOT exist in 4.0.1
- Latest version: 6.10.0
- `resend.emails.receiving.get()` was added in a newer version
- Need to update to 6.x for inbound email fetching

## Deployment
- Pushes to GitHub → GitHub Actions → builds Docker image → deploys to Google Cloud Run
- npm install happens during Docker build, so package.json changes take effect on next deploy
- Cloud Run URL: https://surveydisco-ai-222526998280.us-central1.run.app
- App URL: https://gus.clocknumbers.com

## Database
- Supabase PostgreSQL
- Table: surveydisco_projects
- Added columns flood_zone, firm_panel manually via node script (not in migration file initially)
- Migration file: backend/migrations/002_add_fema_columns.sql

## Windows PowerShell
- Use semicolons not && for chaining commands
- Never use cd, use cwd parameter

## FEMA
- getFemaFloodData() throws errors now (not returns null)
- Endpoint: /api/projects/:id/refresh-fema
- Button: 🌊 FEMA in ProjectCards

## Resend Webhook
- URL: https://surveydisco-ai-222526998280.us-central1.run.app/api/webhooks/resend
- Listening for: email.received
- Inbound email address: newjob@gus.clocknumbers.com
- Background processing with 5 retries
- Currently broken because resend.emails.receiving doesn't exist in v4.0.1
