# Deployment Guide - Enza Lead CRM

## Why not GitHub Pages?
This app has a Node.js backend (Express + SQLite). GitHub Pages only serves static files.

## Render Free Tier Deployment

### Pre-deploy checklist
- [x] Frontend built (`client/dist/` committed to git)
- [x] Database file included (`data/enza_leads.db` committed to git)
- [x] Security hardened (helmet, CORS lock, JWT_SECRET required, request size limit)
- [x] `npm start` script in package.json

### Step 1: Create a Render account
Go to https://render.com and sign up with your GitHub account.

### Step 2: Create a new Web Service
1. Click **"New" > "Web Service"**
2. Connect your GitHub repo: `Andrej-N/Enza_lead_crm`
3. Configure:
   - **Name:** enza-lead-crm
   - **Region:** Frankfurt (closest to Serbia)
   - **Branch:** main
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### Step 3: Set environment variables
In Render dashboard > Environment, add:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://enza-lead-crm.onrender.com` (your Render URL) |
| `ADMIN_PASSWORD` | Strong password for admin login |
| `ENZA_PASSWORD` | Strong password for enza login |

### Step 4: Seed users
After first deploy, open the Render **Shell** tab and run:
```bash
node server/seed-users.js
```

### Step 5: Login
Go to `https://enza-lead-crm.onrender.com` and login with `admin` or `enza` + your password.

## Free tier behavior
- Server sleeps after 15 min of inactivity, first request takes ~30s to wake up
- All existing leads from `data/enza_leads.db` are always available (shipped with git)
- New changes (added leads, edits) persist during the session but reset on server restart/redeploy
- For persistent data, upgrade to Render Starter ($7/mo) which includes persistent disk

## Upgrading later
| Platform | Cost | Persistent DB | Always On |
|----------|------|---------------|-----------|
| Render Starter | $7/mo | Yes (persistent disk) | Yes |
| Railway | $5 credit/mo | Yes | Yes |
| VPS (Hetzner) | ~$4/mo | Yes | Yes |
