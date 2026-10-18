# HOUSEHUB

Expense splitting, settlements and chores for shared houses — with XP, levels, achievements and a
leaderboard so tidying up the kitchen is at least mildly competitive.

Built as a MERN application: React + Vite on the front, Express + MongoDB on the back, with the money
and XP mathematics living in one shared module that both sides import.

---

## Contents

- [Quick start](#quick-start)
- [Repository layout](#repository-layout)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [What is in this release](#what-is-in-this-release)
- [The parts worth reading](#the-parts-worth-reading)
- [Running the tests](#running-the-tests)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Not in this release](#not-in-this-release)

---

## Quick start

**Prerequisites:** Node 18.17 or newer, and MongoDB running locally (or a MongoDB Atlas connection
string).

```bash
# 1. Install everything (root, server and client)
npm install

# 2. Configure the API
cp server/.env.example server/.env
#    then edit server/.env and set a real JWT_SECRET.
#    Generate one with:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Start MongoDB if it is not already running
mongod --dbpath /path/to/data

# 4. Optional: fill the database with a demo house
npm run seed

# 5. Run the API and the web app together
npm run dev
```

The API listens on `http://localhost:5000` and the web app on `http://localhost:5173`. Open the app
and register — or, if you ran the seed, sign in as one of the demo users below.

### Demo data

`npm run seed` creates a house called **College Flat** with four members, twelve expenses spread over
six months, sixteen chores (ten of them completed through the real completion flow, so the XP,
levels, achievements and activity feed are all genuine), and two settlements — one confirmed and one
still pending.

| Name  | Email                | Password      |
| ----- | -------------------- | ------------- |
| Atul  | atul@househub.dev    | `Password123` |
| Rahul | rahul@househub.dev   | `Password123` |
| Aman  | aman@househub.dev    | `Password123` |
| Riya  | riya@househub.dev    | `Password123` |

The seed is destructive for the configured database — it clears the collections it owns first.

---

## Repository layout

```
.
├── server/                     Express API
│   ├── src/
│   │   ├── config/             env parsing + mongoose connection
│   │   ├── models/             User, House, Expense, Chore, Settlement,
│   │   │                       Notification, Activity, Achievement
│   │   ├── middleware/         auth, house access, validation, errors, rate limits
│   │   ├── services/           business logic (the interesting part)
│   │   ├── controllers/        HTTP in / HTTP out, nothing more
│   │   ├── routes/             one router per resource
│   │   ├── validators/         shared express-validator chains
│   │   └── utils/              serializers, pagination, response envelope, logger
│   ├── scripts/                seed, smoke test, db reset
│   └── tests/                  vitest + supertest suites
│
├── client/                     React SPA
│   ├── src/
│   │   ├── components/ui/      the UI kit (one folder, no other component library)
│   │   ├── components/layout/  sidebar, top bar, mobile navigation
│   │   ├── context/            Auth, Theme, Toast, Notification
│   │   ├── hooks/              useFetch and friends
│   │   ├── layouts/            AppLayout, AuthLayout
│   │   ├── lib/                api client, formatting, clipboard, cn
│   │   ├── pages/              one file per route
│   │   └── services/           one module per API resource
│   └── vite.config.js          `@` -> src, `@shared` -> ../shared, /api proxy
│
└── shared/                     imported by BOTH server and client
    ├── money.js                splits, ledger, min-cash-flow settlement
    ├── levels.js               the XP curve
    └── constants.js            categories, priorities, statuses, XP rewards
```

There is no duplication between the two halves on purpose. `shared/money.js` is the only place that
knows how to split a bill, and it is compiled into the browser bundle as well as required by Node —
so the split the user previews in the form is literally the function the server runs.

---

## Environment variables

Two files, both git-ignored. `.env.example` at the repository root documents every variable.

| File          | Required | Notes                                                                          |
| ------------- | -------- | ------------------------------------------------------------------------------ |
| `server/.env` | Yes      | Database, JWT secret, CORS origins. Copy from `server/.env.example`.            |
| `client/.env` | No       | Only needed to point the SPA at a remote API. Unset in development by design.   |

The client has no `.env` locally because Vite proxies `/api` to `localhost:5000`. That means no
absolute URL to keep in sync and no CORS preflight during development.

---

## Scripts

Run from the repository root:

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `npm run dev`      | API + web app together, with colour-prefixed output              |
| `npm run dev:server` | Just the API (nodemon)                                        |
| `npm run dev:client` | Just the web app (vite)                                       |
| `npm run build`    | Production build of the SPA into `client/dist`                  |
| `npm start`        | Start the API without nodemon (production mode)                 |
| `npm test`         | The full API test suite                                         |
| `npm run seed`     | Load the demo house                                             |
| `npm run smoke`    | End-to-end journey against a throwaway database over real HTTP   |

---

## What is in this release

This is the full MVP:

- **Accounts** — register, sign in, JWT sessions, profile editing, change password, forgot/reset
  password, delete account.
- **Houses** — create, join by invite link or code, member list with roles (owner / admin / member),
  change roles, transfer ownership, remove a member, leave (and the house cleans itself up when the
  last person goes).
- **Expenses** — search, filter by category, member, payer and date range, sort, paginate. Split
  equally, by exact amounts, or by percentage. Attach a receipt URL and a description.
- **Balances** — derived on read, never stored, so they cannot drift. Shows both your pairwise
  position ("you owe Rahul, Aman owes you") and the minimal set of payments that would settle the
  whole house.
- **Settlements** — record a payment between two members; it only moves the ledger once the receiver
  confirms it. Confirm, reject with a reason, remind, cancel.
- **Chores** — create with an assignee, due date, priority and XP reward. Start, complete, edit,
  delete. Overdue is derived, never stored.
- **My Chores** — the server buckets your chores into overdue / today / upcoming / completed.
- **Gamification** — XP credited exactly once per chore, a level curve, achievements that unlock from
  real counters, a house leaderboard with dense ranking, and an activity feed.
- **Dashboard** — total spend, what you owe, what you are owed, your net position, your chores, the
  house chore board, the top three on the leaderboard and recent activity, all in one request.
- **House analytics** — spend by month, by category and by member.
- **Notifications** — generated by the house's activity, with an unread count in the header.
- **Theming** — light, dark and system, persisted per account and applied before first paint.

---

## The parts worth reading

A few decisions are load-bearing. If you are reviewing this codebase, start here.

### Money is integer paise, everywhere

`₹2,400` is stored as `240000`. Floating-point rupees are never a thing that exists in this
codebase — not in the database, not in the API, not in a request body. Rupees appear only as
formatted strings in the interface, produced by `formatPaise`.

### Splits have to add up, and the remainder is deterministic

`₹100` split three ways is `3334 / 3333 / 3333` paise. The remainder is handed out one paise at a
time, with participants sorted by user id first, so the same expense always produces the same three
shares no matter what order the client sent them in.

The server never trusts client-computed shares. Equal and percentage splits are recomputed from the
participants; a custom split is validated to sum to the total. Any mismatch is a `400`, not a ledger
that is quietly off by a paisa.

### Balances are derived, never stored

There is no `currentBalance` field anywhere in MongoDB. Every read rebuilds the ledger from all
expenses plus all confirmed settlements. Delete an expense and every balance is instantly correct
again — there is no reconciliation step that can be forgotten.

Two independent views come out of the same data:

- the **pairwise ledger** answers "who owes whom", which is what the dashboard shows;
- **minimise transfers** answers "what is the fewest payments that zeroes the house out", which is
  what the settle-up suggestions show.

### XP is credited exactly once

`POST /api/chores/:id/complete` takes no request body at all. The XP amount comes from the chore
document, which the server created and validated against an allowlist. A client cannot submit its
own XP.

The completion itself is two idempotent conditional writes rather than a transaction, because the
project targets a standalone MongoDB that has no replica set and therefore no multi-document
transactions:

1. flip `status` to `completed` only if it is not already completed;
2. flip `xpAwarded` to `true` only if it is not already true — this is the claim token.

If the process dies between the two, the chore is completed but unclaimed, so XP is credited on the
next attempt. It can never be credited twice. Five concurrent completions of the same chore is one of
the test cases.

### A house id in a URL is not authorisation

Every house-scoped route runs through `houseScope`, which loads the house *and* proves the caller is
a member before any controller executes. Changing a house id in a URL returns `403`, not another
house's data. The test suite exercises that across every resource.

The client helps by never putting a house id in a URL in the first place — it reads the one house the
signed-in user belongs to from their session.

### One error shape, and no raw errors on screen

Every failure is `{ "success": false, "message": "..." }`. The client normalises network errors and
unexpected HTML responses into the same shape, so `error.message` is always safe to show a user.
Nothing renders a stack trace.

---

## Running the tests

```bash
npm test
```

143 tests across seven suites, hitting a real `househub_test` database with supertest:

| Suite                      | Covers                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| `money.test.js`            | Rounding, remainder distribution, the four split types                     |
| `balance.test.js`          | Pairwise ledger, min-cash-flow, the "sum of all nets is zero" invariant     |
| `levels.test.js`           | The XP curve and its extension past level 7                               |
| `auth.test.js`             | Registration, login, sessions, password change and reset                   |
| `security.test.js`         | The cross-house 403 matrix, rate limits, input validation                  |
| `choreFlow.test.js`        | Completion, single-credit XP, concurrent completions, achievements          |
| `expenseAndSettlement.test.js` | Expense CRUD, split validation, settlement lifecycle                    |

The end-to-end journey from the product spec has its own runner:

```bash
npm run smoke
```

It boots the API on an ephemeral port against a scratch database and walks the whole story over real
HTTP: register, create "College Flat", three housemates join by invite link, a ₹4,000 grocery run,
Atul owes Rahul ₹1,000, settle it, confirm it, complete a chore for +30 XP, unlock an achievement,
check the leaderboard, and confirm that an outsider gets a `403` on every house-scoped endpoint.
Every rupee figure in that story is asserted.

---

## API reference

All routes are prefixed with `/api`. Everything except register, login and password reset requires
`Authorization: Bearer <token>`.

```
POST   /auth/register                 POST   /auth/login
GET    /auth/me                       PATCH  /auth/me
PATCH  /auth/password                 POST   /auth/forgot-password
POST   /auth/reset-password           DELETE /auth/me

POST   /houses                        POST   /houses/join
GET    /houses/:id                    PATCH  /houses/:id
GET    /houses/:id/invite             POST   /houses/:id/invite/regenerate
GET    /houses/:id/dashboard          GET    /houses/:id/balances
GET    /houses/:id/leaderboard        GET    /houses/:id/analytics
GET    /houses/:id/activity           GET    /houses/:id/achievements
GET    /houses/:id/members            PATCH  /houses/:id/members/:userId
DELETE /houses/:id/members/:userId    POST   /houses/:id/transfer-ownership
POST   /houses/:id/leave

GET    /houses/:id/expenses           POST   /houses/:id/expenses
GET    /houses/:id/expenses/:expId    PATCH  /houses/:id/expenses/:expId
DELETE /houses/:id/expenses/:expId

GET    /houses/:id/chores             POST   /houses/:id/chores
GET    /houses/:id/chores/mine        GET    /houses/:id/chores/:choreId
PATCH  /houses/:id/chores/:choreId    DELETE /houses/:id/chores/:choreId
POST   /houses/:id/chores/:choreId/start
POST   /houses/:id/chores/:choreId/complete

GET    /houses/:id/settlements        POST   /houses/:id/settlements
POST   /houses/:id/settlements/:id/confirm
POST   /houses/:id/settlements/:id/reject
POST   /houses/:id/settlements/:id/remind
DELETE /houses/:id/settlements/:id

GET    /notifications                 GET    /notifications/unread-count
PATCH  /notifications/:id/read        PATCH  /notifications/read-all
DELETE /notifications/:id             DELETE /notifications/clear
```

Paginated endpoints return `{ success, data: [...], meta: { page, limit, total, pages, hasNextPage, hasPrevPage } }`.

---

## Deployment

Three services, none of which need a container.

### Database — MongoDB Atlas

Create a free cluster, a database user, and allow access from `0.0.0.0/0` (Render's outbound IPs are
not fixed on the free tier). Copy the connection string into `MONGO_URI`.

### API — Render

- **Build command:** `cd server && npm install`
- **Start command:** `cd server && npm start`

Set these environment variables: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (a real random
one — the server refuses to start without it in production), `JWT_EXPIRES_IN`, and `CLIENT_URL` set
to your Vercel URL. `PORT` is provided by Render; do not set it yourself.

### Web app — Vercel

- **Root directory:** `client`
- **Build command:** `npm run build`
- **Output directory:** `dist`

Set `VITE_API_URL` to the Render URL including the `/api` suffix, for example
`https://househub-api.onrender.com/api`.

Note that `client/vite.config.js` aliases `@shared` to `../shared`, which sits outside the client
directory. Vercel builds from the repository root, so this resolves correctly — but if you change the
root directory setting to something narrower, the build will fail on that import.

---

## Not in this release

Deliberately deferred, listed here so nobody goes looking for them:

- Missions and badge tiers beyond the achievement catalogue
- Recurring chores and automatic chore rotation
- A notification settings page beyond the per-category toggles
- Weekly and monthly leaderboard windows (the leaderboard is all-time)
- Reports and export
- An admin panel
- Receipt OCR and UPI payment links
- Chat, polls and shared shopping lists
- Real-time updates over Socket.IO (the unread badge polls a count endpoint instead)

The `Notification` and `Activity` models and their writes are in place — only some of the browsing
surface is deferred.
#   H o u s e H u b  
 