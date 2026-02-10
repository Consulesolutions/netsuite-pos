# Complete Setup Guide: NetSuite POS System

This guide walks you through setting up the POS system from scratch, including local development, NetSuite integration, Stripe billing, and production deployment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Database Setup](#3-database-setup)
4. [NetSuite Setup](#4-netsuite-setup)
5. [Stripe Billing Setup](#5-stripe-billing-setup)
6. [Running the Application](#6-running-the-application)
7. [Production Deployment](#7-production-deployment)
8. [Testing the Integration](#8-testing-the-integration)

---

## 1. Prerequisites

### Software Requirements

Install these on your computer:

1. **Node.js 20+**
   ```bash
   # Check if installed
   node --version

   # Install via Homebrew (Mac)
   brew install node

   # Or download from https://nodejs.org
   ```

2. **PostgreSQL 16+**
   ```bash
   # Mac
   brew install postgresql@16
   brew services start postgresql@16

   # Or use Docker (recommended)
   docker run -d --name postgres \
     -e POSTGRES_USER=pos \
     -e POSTGRES_PASSWORD=your_password \
     -e POSTGRES_DB=netsuite_pos \
     -p 5432:5432 \
     postgres:16
   ```

3. **Redis 7+**
   ```bash
   # Mac
   brew install redis
   brew services start redis

   # Or use Docker
   docker run -d --name redis -p 6379:6379 redis:7
   ```

4. **Git**
   ```bash
   git --version
   # Install from https://git-scm.com if not present
   ```

### Accounts Needed

- **NetSuite Sandbox Account** (for development/testing)
- **Stripe Account** (for payment processing and billing)
- **GitHub Account** (for version control)

---

## 2. Local Development Setup

### Step 2.1: Clone and Install Dependencies

```bash
# Navigate to the project
cd /Users/prabodhkadam/netsuite-pos

# Install all dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Go back to root
cd ..
```

### Step 2.2: Create Environment File

```bash
# Copy the example env file
cp .env.example .env
```

### Step 2.3: Edit the .env File

Open `.env` in your editor and fill in the values:

```env
# Database (update password)
POSTGRES_USER=pos
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=netsuite_pos
DATABASE_URL=postgresql://pos:your_secure_password_here@localhost:5432/netsuite_pos

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_here

# Frontend URL
FRONTEND_URL=http://localhost:3000
VITE_API_URL=/api

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

# Multi-tenant
APP_DOMAIN=localhost:3000

# Environment
NODE_ENV=development
PORT=4000
LOG_LEVEL=info
```

---

## 3. Database Setup

### Step 3.1: Create the Database

```bash
# If using local PostgreSQL
createdb netsuite_pos

# If using Docker, the database is already created
```

### Step 3.2: Run Prisma Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# (Optional) Seed with sample data
npx prisma db seed
```

### Step 3.3: Verify Database

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

This opens a browser at http://localhost:5555 where you can see all tables.

---

## 4. NetSuite Setup

This is the most complex part. Follow each step carefully.

### Step 4.1: Enable Required Features

1. Log in to your **NetSuite Sandbox** account
2. Go to **Setup → Company → Enable Features**
3. Enable these features:
   - **SuiteCloud tab:**
     - ✅ Client SuiteScript
     - ✅ Server SuiteScript
     - ✅ SuiteScript Server Pages
     - ✅ Token-Based Authentication
     - ✅ REST Web Services
   - **Web Services tab:**
     - ✅ REST Web Services

4. Click **Save**

### Step 4.2: Create an Integration Record

1. Go to **Setup → Integration → Manage Integrations → New**

2. Fill in the form:
   - **Name:** `POS Integration`
   - **State:** `Enabled`
   - **Authentication:**
     - ✅ Token-Based Authentication
     - ❌ TBA: Authorization Flow (uncheck)
     - ❌ User Credentials (uncheck)

3. Click **Save**

4. **IMPORTANT:** Copy and save these values immediately (shown only once):
   - **Consumer Key:** `paste into NETSUITE_CONSUMER_KEY in .env`
   - **Consumer Secret:** `paste into NETSUITE_CONSUMER_SECRET in .env`

### Step 4.3: Create a Role for POS

1. Go to **Setup → Users/Roles → Manage Roles → New**

2. Create a new role:
   - **Name:** `POS API Role`
   - **ID:** `pos_api_role`

3. Under **Permissions**, add these:

   **Transactions Tab:**
   | Permission | Level |
   |------------|-------|
   | Cash Sale | Full |
   | Sales Order | Full |
   | Customer Payment | Full |
   | Customer Refund | Full |

   **Lists Tab:**
   | Permission | Level |
   |------------|-------|
   | Items | View |
   | Customers | Full |
   | Inventory | View |
   | Locations | View |
   | Subsidiaries | View |
   | Employees | View |

   **Setup Tab:**
   | Permission | Level |
   |------------|-------|
   | Log in using Access Tokens | Full |
   | REST Web Services | Full |
   | SuiteScript | Full |

4. Click **Save**

### Step 4.4: Assign Role to User

1. Go to **Setup → Users/Roles → Manage Users**
2. Edit the user who will be used for API access
3. Under **Access** tab, add the `POS API Role`
4. Click **Save**

### Step 4.5: Create Access Token

1. Go to **Setup → Users/Roles → Access Tokens → New**

2. Fill in:
   - **Application Name:** Select `POS Integration` (created in Step 4.2)
   - **User:** Select the user with POS API Role
   - **Role:** Select `POS API Role`
   - **Token Name:** `POS Token`

3. Click **Save**

4. **IMPORTANT:** Copy and save these values immediately:
   - **Token ID:** `paste into NETSUITE_TOKEN_ID in .env`
   - **Token Secret:** `paste into NETSUITE_TOKEN_SECRET in .env`

### Step 4.6: Get Your Account ID

1. Go to **Setup → Company → Company Information**
2. Find your **Account ID** (looks like `1234567` or `1234567_SB1` for sandbox)
3. Paste into `NETSUITE_ACCOUNT_ID` in your `.env` file

### Step 4.7: Upload SuiteScripts

1. Go to **Documents → Files → File Cabinet**

2. Create folder structure:
   - Click **New Folder**
   - Name: `SuiteScripts`
   - Inside `SuiteScripts`, create subfolder: `POS`

3. Upload the RESTlet script:
   - Navigate to `SuiteScripts/POS`
   - Click **Add File**
   - Upload: `/netsuite-pos/netsuite-scripts/restlets/pos_api.js`

4. Upload other scripts:
   - Upload: `/netsuite-pos/netsuite-scripts/user-events/pos_transaction.js`
   - Upload: `/netsuite-pos/netsuite-scripts/scheduled/pos_sync.js`

### Step 4.8: Create Script Records

#### RESTlet Script Record:

1. Go to **Customization → Scripting → Scripts → New**

2. Select the uploaded `pos_api.js` file

3. Click **Create Script Record**

4. Fill in:
   - **Name:** `POS API RESTlet`
   - **ID:** `customscript_pos_api`
   - **Script Type:** RESTlet (auto-detected)

5. Under **Scripts** subtab, verify functions:
   - **GET Function:** `get`
   - **POST Function:** `post`
   - **PUT Function:** `put`
   - **DELETE Function:** `delete`

6. Click **Save**

### Step 4.9: Deploy the RESTlet

1. From the Script Record page, click **Deploy Script**

2. Fill in:
   - **Title:** `POS API Deployment`
   - **ID:** `customdeploy_pos_api`
   - **Status:** `Released`
   - **Log Level:** `Debug` (for development)
   - **Audience:**
     - **Roles:** Add `POS API Role`

3. Click **Save**

4. **IMPORTANT:** Copy the **External URL** shown on the deployment page
   - It looks like: `https://1234567.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=123&deploy=1`
   - Paste into `NETSUITE_RESTLET_URL` in your `.env` file

### Step 4.10: Verify Your .env NetSuite Section

Your `.env` should now have:

```env
NETSUITE_ACCOUNT_ID=1234567_SB1
NETSUITE_CONSUMER_KEY=abc123...
NETSUITE_CONSUMER_SECRET=def456...
NETSUITE_TOKEN_ID=ghi789...
NETSUITE_TOKEN_SECRET=jkl012...
NETSUITE_RESTLET_URL=https://1234567.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=123&deploy=1
```

---

## 5. Stripe Billing Setup

### Step 5.1: Create Stripe Account

1. Go to https://stripe.com
2. Sign up for an account
3. Complete email verification

### Step 5.2: Get API Keys

1. In Stripe Dashboard, go to **Developers → API Keys**
2. Copy the **Secret key** (starts with `sk_test_...`)
3. Paste into `STRIPE_SECRET_KEY` in your `.env`

### Step 5.3: Create Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Click **Add Product**

**Create Starter Plan:**
- **Name:** `Starter Plan`
- **Description:** `1 Location, 2 Registers, 5 Users`
- Click **Add Product**
- Add Price:
  - **Price:** `$49.00`
  - **Billing Period:** `Monthly`
  - Click **Add Price**
- Copy the **Price ID** (starts with `price_...`)
- Paste into `STRIPE_STARTER_PRICE_ID`

**Create Professional Plan:**
- **Name:** `Professional Plan`
- **Description:** `3 Locations, 10 Registers, 20 Users`
- **Price:** `$99.00` / Monthly
- Copy Price ID → `STRIPE_PRO_PRICE_ID`

**Create Enterprise Plan:**
- **Name:** `Enterprise Plan`
- **Description:** `Unlimited Everything`
- **Price:** `$249.00` / Monthly
- Copy Price ID → `STRIPE_ENTERPRISE_PRICE_ID`

### Step 5.4: Set Up Webhook

1. Go to **Developers → Webhooks**
2. Click **Add Endpoint**
3. Fill in:
   - **Endpoint URL:** `https://your-domain.com/api/billing/webhook`
     - For local testing: Use ngrok (see below)
   - **Events to send:**
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
4. Click **Add Endpoint**
5. Copy the **Signing Secret** (starts with `whsec_...`)
6. Paste into `STRIPE_WEBHOOK_SECRET`

### Step 5.5: Local Webhook Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:4000/api/billing/webhook

# Copy the webhook signing secret shown and update .env
```

### Step 5.6: Verify Your .env Stripe Section

```env
STRIPE_SECRET_KEY=sk_test_abc123...
STRIPE_WEBHOOK_SECRET=whsec_def456...
STRIPE_STARTER_PRICE_ID=price_starter123...
STRIPE_PRO_PRICE_ID=price_pro456...
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise789...
```

---

## 6. Running the Application

### Step 6.1: Start All Services

**Option A: Using Docker Compose (Recommended)**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Option B: Manual Start**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Step 6.2: Access the Application

- **Landing Page:** http://localhost:3000
- **API Health Check:** http://localhost:4000/health
- **Database Admin:** http://localhost:5555 (Prisma Studio)

### Step 6.3: Create Your First Account

1. Go to http://localhost:3000
2. Click **Start Free Trial**
3. Fill in:
   - Company Name: `My Test Company`
   - Your Name
   - Email
   - Password
4. Click **Start Free Trial**
5. You're now logged in!

---

## 7. Production Deployment

### Option A: Vercel + Railway (Recommended)

#### Deploy Frontend to Vercel:

1. Push code to GitHub
2. Go to https://vercel.com
3. Click **New Project**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Add Environment Variables:
   - `VITE_API_URL=https://your-api.railway.app/api`
7. Click **Deploy**

#### Deploy Backend to Railway:

1. Go to https://railway.app
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your repository
5. Configure:
   - **Root Directory:** `backend`
   - **Start Command:** `npm start`
6. Add a **PostgreSQL** service
7. Add a **Redis** service
8. Add Environment Variables (copy from your `.env`)
9. Deploy

#### Configure Custom Domain:

1. In Vercel, go to **Domains**
2. Add your domain (e.g., `yourpos.com`)
3. Add wildcard subdomain: `*.yourpos.com`
4. Update DNS records as instructed

### Option B: DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Create new App
3. Connect GitHub repository
4. Add components:
   - Web Service (Backend)
   - Static Site (Frontend)
   - Database (PostgreSQL)
   - Redis
5. Configure environment variables
6. Deploy

---

## 8. Testing the Integration

### Test 1: Health Check

```bash
curl http://localhost:4000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test 2: NetSuite Connection

```bash
curl http://localhost:4000/api/netsuite/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 3: Create a Test Transaction

1. Log in to the POS
2. Add items to cart
3. Complete a cash payment
4. Check NetSuite for the new Cash Sale record

### Test 4: Stripe Subscription

1. Go to Settings → Billing
2. Click **Upgrade to Professional**
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify subscription is active

---

## Troubleshooting

### Common Issues

**"Cannot connect to database"**
```bash
# Check if PostgreSQL is running
pg_isready

# Check connection string in .env
# Make sure password has no special characters that need escaping
```

**"NetSuite authentication failed"**
- Verify all 5 credentials are correct
- Check that the user has the POS API Role
- Ensure Token-Based Authentication is enabled
- Check the RESTlet deployment status is "Released"

**"Stripe webhook not working"**
- Make sure you're using the correct webhook secret
- For local testing, ensure Stripe CLI is running
- Check that all required events are selected

**"Frontend can't reach backend"**
- Check CORS settings in backend
- Verify VITE_API_URL is correct
- Check if backend is running on port 4000

### Getting Help

- Check the logs: `docker-compose logs -f`
- Open an issue on GitHub
- Check NetSuite SuiteAnswer for script errors
- Check Stripe Dashboard for payment issues

---

## Next Steps

1. **Add Sample Data:** Import products, customers from NetSuite
2. **Configure Hardware:** Set up receipt printer, barcode scanner
3. **Train Staff:** Walk through POS operations
4. **Go Live:** Switch to production credentials

---

## Quick Reference

| Service | Local URL | Production |
|---------|-----------|------------|
| Landing Page | http://localhost:3000 | https://yourpos.com |
| POS App | http://localhost:3000/app | https://tenant.yourpos.com/app |
| API | http://localhost:4000 | https://api.yourpos.com |
| Database | localhost:5432 | Railway/DigitalOcean |
| Redis | localhost:6379 | Railway/DigitalOcean |

---

**Congratulations!** You've successfully set up the NetSuite POS system. 🎉
