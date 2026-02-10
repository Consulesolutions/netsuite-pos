# Cloud Deployment Guide: NetSuite POS SaaS

Deploy your POS system to the cloud so customers can sign up and use it immediately. No local setup required.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR CUSTOMERS                           │
│  acme.yourpos.com    bestbuy.yourpos.com    shop.yourpos.com    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend Hosting)                     │
│                      yourpos.com                                 │
│                      *.yourpos.com (wildcard)                    │
│                         FREE TIER                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RAILWAY (Backend + Database)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Node.js   │  │  PostgreSQL │  │    Redis    │             │
│  │   Backend   │  │   Database  │  │    Cache    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                       ~$10-20/month                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NETSUITE                                 │
│              (Your customers' ERP systems)                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Push Code to GitHub (5 minutes)

### 1.1 Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - **Name:** `netsuite-pos`
   - **Visibility:** Private
   - Click **Create repository**

### 1.2 Push Your Code

```bash
cd /Users/prabodhkadam/netsuite-pos

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: NetSuite POS SaaS"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/netsuite-pos.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway (15 minutes)

Railway hosts your API server, database, and Redis cache.

### 2.1 Create Railway Account

1. Go to https://railway.app
2. Click **Login** → **Login with GitHub**
3. Authorize Railway

### 2.2 Create New Project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Select your `netsuite-pos` repository
4. Click **Add variables** (we'll add them later)

### 2.3 Configure Backend Service

1. Click on the deployed service
2. Go to **Settings** tab
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`

### 2.4 Add PostgreSQL Database

1. Click **New** → **Database** → **Add PostgreSQL**
2. Railway automatically creates the database
3. Click on PostgreSQL service → **Variables** tab
4. Copy the `DATABASE_URL` value

### 2.5 Add Redis

1. Click **New** → **Database** → **Add Redis**
2. Railway automatically creates Redis
3. Click on Redis service → **Variables** tab
4. Copy the `REDIS_URL` value

### 2.6 Configure Environment Variables

1. Click on your backend service
2. Go to **Variables** tab
3. Click **Raw Editor** and paste:

```env
# Database (Railway provides this automatically)
DATABASE_URL=postgresql://... (paste from PostgreSQL service)

# Redis
REDIS_URL=redis://... (paste from Redis service)

# JWT Secret (generate random string: openssl rand -base64 32)
JWT_SECRET=your_random_32_char_secret_here

# URLs (update after Vercel deployment)
FRONTEND_URL=https://yourpos.com
APP_DOMAIN=yourpos.com

# NetSuite (we'll fill these in Step 4)
NETSUITE_ACCOUNT_ID=
NETSUITE_CONSUMER_KEY=
NETSUITE_CONSUMER_SECRET=
NETSUITE_TOKEN_ID=
NETSUITE_TOKEN_SECRET=
NETSUITE_RESTLET_URL=

# Stripe (we'll fill these in Step 5)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=

# Environment
NODE_ENV=production
PORT=4000
LOG_LEVEL=info
```

### 2.7 Run Database Migrations

1. In Railway, click on backend service
2. Go to **Settings** → **Deploy** section
3. Add a **Deploy Command** (one-time):
   ```
   npx prisma migrate deploy
   ```
4. Click **Deploy** to run migrations

### 2.8 Get Your Backend URL

1. Go to backend service → **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy your URL (e.g., `netsuite-pos-production.up.railway.app`)
4. Save this - you'll need it for Vercel

---

## Step 3: Deploy Frontend to Vercel (10 minutes)

Vercel hosts your landing page and POS application.

### 3.1 Create Vercel Account

1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel

### 3.2 Import Project

1. Click **Add New** → **Project**
2. Select your `netsuite-pos` repository
3. Click **Import**

### 3.3 Configure Project

1. **Framework Preset:** Vite
2. **Root Directory:** Click **Edit** → type `frontend` → Click **Continue**
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`

### 3.4 Add Environment Variables

Click **Environment Variables** and add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api` |

### 3.5 Deploy

1. Click **Deploy**
2. Wait for deployment (2-3 minutes)
3. Your site is live at `https://netsuite-pos.vercel.app`

### 3.6 Add Custom Domain

1. Go to **Settings** → **Domains**
2. Add your domain: `yourpos.com`
3. Add wildcard subdomain: `*.yourpos.com`
4. Follow DNS instructions:

**For Cloudflare/GoDaddy/Namecheap:**
```
Type    Name    Value
A       @       76.76.21.21
CNAME   *       cname.vercel-dns.com
CNAME   www     cname.vercel-dns.com
```

### 3.7 Update Railway with Vercel URL

Go back to Railway and update these environment variables:
```env
FRONTEND_URL=https://yourpos.com
APP_DOMAIN=yourpos.com
```

---

## Step 4: NetSuite Setup (30 minutes)

This connects your POS to your customers' NetSuite accounts.

### 4.1 Log into NetSuite

1. Go to your NetSuite account (or sandbox)
2. Use administrator credentials

### 4.2 Enable Required Features

1. **Setup → Company → Enable Features**
2. **SuiteCloud tab** - Enable:
   - ✅ Client SuiteScript
   - ✅ Server SuiteScript
   - ✅ Token-Based Authentication
   - ✅ REST Web Services
3. Click **Save**

### 4.3 Create Integration Record

1. **Setup → Integration → Manage Integrations → New**
2. Fill in:
   - **Name:** `POS Integration`
   - **State:** `Enabled`
   - ✅ Token-Based Authentication
3. Click **Save**
4. **⚠️ COPY NOW** (shown only once):
   - Consumer Key → paste into Railway `NETSUITE_CONSUMER_KEY`
   - Consumer Secret → paste into Railway `NETSUITE_CONSUMER_SECRET`

### 4.4 Create API Role

1. **Setup → Users/Roles → Manage Roles → New**
2. **Name:** `POS API Role`
3. Add permissions:

   | Tab | Permission | Level |
   |-----|------------|-------|
   | Transactions | Cash Sale | Full |
   | Transactions | Sales Order | Full |
   | Transactions | Customer Payment | Full |
   | Lists | Items | View |
   | Lists | Customers | Full |
   | Lists | Locations | View |
   | Setup | Log in using Access Tokens | Full |
   | Setup | REST Web Services | Full |

4. Click **Save**

### 4.5 Create Access Token

1. **Setup → Users/Roles → Access Tokens → New**
2. Fill in:
   - **Application:** `POS Integration`
   - **User:** Select your user
   - **Role:** `POS API Role`
   - **Token Name:** `POS Production Token`
3. Click **Save**
4. **⚠️ COPY NOW** (shown only once):
   - Token ID → paste into Railway `NETSUITE_TOKEN_ID`
   - Token Secret → paste into Railway `NETSUITE_TOKEN_SECRET`

### 4.6 Get Account ID

1. **Setup → Company → Company Information**
2. Copy **Account ID** (e.g., `1234567` or `1234567_SB1`)
3. Paste into Railway `NETSUITE_ACCOUNT_ID`

### 4.7 Upload RESTlet Script

1. **Documents → Files → File Cabinet**
2. Create folder: `SuiteScripts/POS`
3. Upload file: `netsuite-scripts/restlets/pos_api.js`

### 4.8 Create Script Record

1. **Customization → Scripting → Scripts → New**
2. Select the uploaded `pos_api.js`
3. Click **Create Script Record**
4. **Name:** `POS API RESTlet`
5. Click **Save**

### 4.9 Deploy Script

1. Click **Deploy Script**
2. Fill in:
   - **Title:** `POS API`
   - **Status:** `Released`
   - **Roles:** Add `POS API Role`
3. Click **Save**
4. **Copy External URL** → paste into Railway `NETSUITE_RESTLET_URL`

---

## Step 5: Stripe Billing Setup (15 minutes)

Stripe handles customer subscriptions and payments.

### 5.1 Create Stripe Account

1. Go to https://stripe.com
2. Sign up and verify email

### 5.2 Get API Keys

1. Go to **Developers → API Keys**
2. Copy **Secret key** (starts with `sk_live_` or `sk_test_`)
3. Paste into Railway `STRIPE_SECRET_KEY`

### 5.3 Create Products

Go to **Products → Add Product**

**Product 1: Starter**
- Name: `Starter Plan`
- Price: `$49.00` / month
- Copy Price ID → Railway `STRIPE_STARTER_PRICE_ID`

**Product 2: Professional**
- Name: `Professional Plan`
- Price: `$99.00` / month
- Copy Price ID → Railway `STRIPE_PRO_PRICE_ID`

**Product 3: Enterprise**
- Name: `Enterprise Plan`
- Price: `$249.00` / month
- Copy Price ID → Railway `STRIPE_ENTERPRISE_PRICE_ID`

### 5.4 Create Webhook

1. **Developers → Webhooks → Add endpoint**
2. **URL:** `https://YOUR-RAILWAY-URL.up.railway.app/api/billing/webhook`
3. **Events:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy **Signing secret** → Railway `STRIPE_WEBHOOK_SECRET`

---

## Step 6: Final Verification

### 6.1 Test Your Deployment

1. Go to `https://yourpos.com`
2. You should see the landing page
3. Click **Start Free Trial**
4. Create an account
5. You should be logged into the POS

### 6.2 Test NetSuite Connection

1. Go to **Settings → Sync**
2. Click **Full Sync**
3. Items and customers should sync from NetSuite

### 6.3 Test Stripe Billing

1. Go to **Settings → Billing**
2. Click **Upgrade to Professional**
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Subscription should be active

---

## Your SaaS is Live! 🎉

### What Happens Now

1. **Customers visit** `yourpos.com`
2. **They sign up** for a free trial
3. **They get their own subdomain** (e.g., `acme.yourpos.com`)
4. **They configure NetSuite** in settings
5. **They upgrade** via Stripe when ready
6. **You collect monthly revenue** automatically

### Monthly Costs

| Service | Cost |
|---------|------|
| Vercel (Frontend) | Free |
| Railway (Backend + DB + Redis) | ~$10-20/month |
| Domain | ~$12/year |
| **Total** | **~$15/month** |

### Revenue Per Customer

| Plan | Monthly | Your Margin |
|------|---------|-------------|
| Starter | $49 | ~$45 |
| Professional | $99 | ~$95 |
| Enterprise | $249 | ~$245 |

With just 5 customers on Starter, you're making **$225/month profit**.

---

## Quick Reference

| Service | URL |
|---------|-----|
| Landing Page | https://yourpos.com |
| Customer Apps | https://[tenant].yourpos.com |
| API | https://your-app.up.railway.app |
| Vercel Dashboard | https://vercel.com/dashboard |
| Railway Dashboard | https://railway.app/dashboard |
| Stripe Dashboard | https://dashboard.stripe.com |

---

## Need Help?

- **Vercel Issues:** https://vercel.com/docs
- **Railway Issues:** https://docs.railway.app
- **Stripe Issues:** https://stripe.com/docs
- **NetSuite Issues:** Search SuiteAnswers in NetSuite
