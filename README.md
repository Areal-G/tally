# Tally – inventory tracker

Tally is a multi-role inventory system for small distributors. The store owner manages the catalog, warehouses and stock operations, and suppliers and clients each get their own portal for orders, invoices and support tickets. Every stock change goes through one ledger so on-hand quantities, warehouse allocations and movement history agree. Only MongoDB and a JWT secret are required; Stripe, Shippo, Brevo, ImageKit, Upstash Redis and AI insights switch on when their keys are present.

## FEATURES

- Products with SKU, barcode, lot, reorder point and reorder quantity
- Filters by status, category and supplier
- CSV / Excel import and export
- Warehouses with per-warehouse allocations
- Inter-warehouse transfers
- Purchase orders: draft, ordered, partially received, received
- Reorder suggestions grouped by supplier with one-click Create PO
- Stock movements timeline (receipts, sales, transfers, adjustments, counts, returns)
- Cycle counts with variance review
- Returns tied to the original order line
- Orders with tax, shipping, discounts and a status pipeline
- PDF invoices, email send, partial Stripe payments
- Shippo rates, labels and tracking
- Support tickets with threaded replies
- Product reviews with an approval queue
- Client and supplier portals
- `/scan` for QR codes and 1D barcodes (camera or USB scanner)
- EAN-13 label sheets
- Business insights and demand forecasting
- `Ctrl + K` command search
- Light and dark themes

## TECH STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.3 | App Router, Route Handlers, Turbopack |
| UI | React | 19.2 | |
| Styling | Tailwind CSS | 3.4 | |
| Components | shadcn/ui | - | on Radix |
| Theming | next-themes | - | |
| Language | TypeScript | 5 | strict |
| Database | MongoDB | 7 | replica set |
| ORM | Prisma | 6.19 | 27 models |
| Auth | JWT session cookie | - | |
| Hashing | bcryptjs | - | |
| OAuth | Google | - | optional |
| Server state | TanStack Query | 5 | |
| Forms | react-hook-form | - | |
| Validation | Zod | 3 | |
| Tables | TanStack Table | 8 | |
| Charts | Recharts | 3 | |
| QR | jsQR | - | |
| Barcodes | @zxing/library | 0.23 | fallback decoder |
| Labels | jsbarcode | 3.12 | |
| QR labels | qrcode | - | |
| Payments | Stripe | - | optional |
| Shipping | Shippo | - | optional |
| Email | Brevo | - | optional |
| Images | ImageKit | - | optional |
| Cache | Upstash Redis | - | optional |
| Queue | QStash | - | optional |
| AI | OpenRouter | - | optional |
| AI fallback | Groq | - | optional |
| Tests | Vitest | 4 | |

## INSTALLATION

Node.js 24 and npm. MongoDB 7 must run as a replica set:

```console
$ docker run -d --name tally-mongo -p 127.0.0.1:27017:27017 mongo:7 --replSet rs0 --bind_ip_all
$ docker exec tally-mongo mongosh --quiet --eval "rs.initiate()"
```

```console
$ git clone <your-fork-url> tally
$ cd tally
$ npm install
$ cp .env.example .env
$ npx prisma db push
$ npm run seed:demo
$ npm run dev
```

Open http://localhost:3000/login and click **Try demo**.

## ENVIRONMENT

```
DATABASE_URL=mongodb://127.0.0.1:27017/tally?replicaSet=rs0&directConnection=true
JWT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=
PLATFORM_ADMIN_EMAILS=
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SHIPPO_API_KEY=
SHIPPO_WEBHOOK_SECRET=
SHIPPO_FROM_*=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
IMAGEKIT_*=
NEXT_PUBLIC_IMAGEKIT_*=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_*=
OPENROUTER_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
INTERNAL_API_KEY=
```

## SCRIPTS

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run lint`
- `npm test`
- `npm run test:invalidate`
- `npm run seed:demo`
- `npm run prisma:push`
- `npm run prisma:studio`
- `npm run script:reset-demo-db`

## TESTING

```console
$ npx tsc --noEmit
$ npm run lint
$ npm test
```

## TODO

- [x] Stock ledger
- [x] Purchase orders
- [x] Scan page
- [x] Cycle counts
- [ ] Lot and expiry tracking with FEFO picking
- [ ] Bin locations inside each warehouse
- [ ] Pick lists for orders
- [ ] Scheduled PO drafts from reorder suggestions
- [ ] Offline scan page (PWA)
- [ ] Playwright tests for receive, count and return