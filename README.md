# Tally – inventory tracker

Tally keeps track of what's on the shelf for a small distributor. You set up products with a SKU, barcode and reorder point, record orders against them, and the stock numbers update as things go in and out. Products below their reorder point get flagged so you know what to buy next. It is a Next.js app on MongoDB through Prisma, and it only needs a database and a JWT secret to run.

## Quick start

You need Node.js 24 and MongoDB 7 running as a replica set (Prisma requires one).

```console
$ docker run -d --name tally-mongo -p 127.0.0.1:27017:27017 mongo:7 --replSet rs0 --bind_ip_all
$ docker exec tally-mongo mongosh --quiet --eval "rs.initiate()"
```

Then:

```console
$ npm install
$ cp .env.example .env
$ npx prisma db push
$ npm run dev
```

The app is at http://localhost:3000.

## Notes

- `.env` needs `DATABASE_URL`, `JWT_SECRET` and `NEXT_PUBLIC_API_URL`.
- Use `?replicaSet=rs0&directConnection=true` on the Mongo URI or Prisma will refuse to write.
- Products have SKU, barcode, category, supplier and reorder point.
- Products show as low or out of stock once they drop to their reorder point.
- Orders get an invoice each.
- Stripe, email and the rest are optional and stay off until their keys are set.