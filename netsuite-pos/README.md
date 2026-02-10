# NetSuite POS System

Enterprise-grade Point of Sale system with full NetSuite ERP integration.

## Features

- **Full POS Functionality**: Product catalog, cart management, multiple payment methods
- **NetSuite Integration**: Real-time sync of items, customers, inventory, and transactions
- **Offline Support**: PWA with IndexedDB for offline operation
- **Multi-Location**: Support for multiple subsidiaries and locations
- **Hardware Integration**: Receipt printers, barcode scanners, cash drawers, card terminals
- **Reports & Analytics**: Daily summaries, payment breakdowns, top-selling items

## Tech Stack

### Frontend
- React 18 + TypeScript
- Zustand (state management)
- Tailwind CSS + Headless UI
- Dexie.js (IndexedDB)
- Workbox (PWA/Service Workers)
- Recharts (analytics)

### Backend
- Node.js 20 + Express
- TypeScript
- Prisma (PostgreSQL ORM)
- Socket.io (real-time updates)
- Redis (caching)
- Bull (job queues)

### NetSuite
- SuiteScript 2.1
- OAuth 1.0 / Token-Based Auth
- Custom RESTlets

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- NetSuite sandbox account (for integration)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/netsuite-pos.git
cd netsuite-pos
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

5. Start development servers:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000 and the API at http://localhost:4000.

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
netsuite-pos/
├── frontend/               # React PWA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── stores/         # Zustand state
│   │   ├── services/       # API & offline DB
│   │   └── types/          # TypeScript types
│   └── public/
├── backend/                # Node.js API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utilities
│   └── prisma/             # Database schema
├── netsuite-scripts/       # SuiteScripts
│   ├── restlets/           # API endpoints
│   ├── user-events/        # Transaction hooks
│   └── scheduled/          # Sync jobs
└── shared/                 # Shared types
```

## NetSuite Setup

### 1. Deploy SuiteScripts

1. Upload scripts to File Cabinet under `/SuiteScripts/POS/`
2. Create Script Records:
   - RESTlet: `pos_api.js`
   - User Event: `pos_transaction.js`
   - Scheduled: `pos_sync.js`
3. Deploy scripts with appropriate roles

### 2. Create Integration Record

1. Go to Setup > Integration > Manage Integrations > New
2. Enable Token-Based Authentication
3. Note the Consumer Key and Consumer Secret

### 3. Create Access Token

1. Go to Setup > Users/Roles > Access Tokens > New
2. Select Application (integration created above)
3. Select User and Role
4. Note the Token ID and Token Secret

### 4. Configure POS Backend

Add NetSuite credentials to your `.env` file:

```env
NETSUITE_ACCOUNT_ID=your_account_id
NETSUITE_CONSUMER_KEY=your_consumer_key
NETSUITE_CONSUMER_SECRET=your_consumer_secret
NETSUITE_TOKEN_ID=your_token_id
NETSUITE_TOKEN_SECRET=your_token_secret
NETSUITE_RESTLET_URL=https://xxxx.restlets.api.netsuite.com/...
```

## API Documentation

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Transactions

```http
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "sale",
  "items": [...],
  "payments": [...],
  "customerId": "optional"
}
```

See full API documentation in `/docs/api.md`.

## Hardware Setup

### Receipt Printer

1. Connect USB/network printer
2. Go to Settings > Hardware
3. Click "Connect Printer" and select device
4. Test print

### Barcode Scanner

Barcode scanners in keyboard mode work automatically. Just connect and scan.

### Card Terminal

1. Configure payment provider in Settings > Payments
2. Pair Bluetooth terminal or connect USB/network terminal
3. Test with a small transaction

## Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - All rights reserved.
