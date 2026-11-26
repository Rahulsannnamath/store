# Store Rating Platform

A full-stack store rating application built with React, Vite, Material UI, Express, MySQL/mysql2, JWT and bcryptjs. Users discover and rate stores, owners review their stores' feedback, and administrators manage accounts and stores.

Repository: https://github.com/Rahulsannnamath/store

## Features and architecture

React calls Express through `frontend/src/api.js`. Authentication verifies the JWT and loads the account's current role and token version from MySQL. Role middleware protects controllers; SQL values are parameterized.

- **Normal User:** signup, unified login, search stores by name/address, sort stores, submit/modify own rating, change password, logout.
- **Admin:** database statistics, create normal/admin/owner accounts, create stores with verified owners, filter/sort user and store tables, inspect user details and individual owner store averages.
- **Owner:** own stores separately, submitting users and ratings, weighted average, sorting, password change and logout.
- **Guest:** public store summaries; rating submission is disabled.

The navigation provides **Log in**, **Login as Store Owner**, and **Login as Admin** buttons. Each opens a clearly labeled login dialog. All three use the same secure authentication endpoint; the verified account role determines the dashboard and permissions. Public signup always creates a Normal User.

The optional demo includes **6 stores with local photographs, 30 ratings, 3 store owners, 5 users, and 1 administrator**.

```text
backend/
  controllers/          Authentication, admin, store and owner operations
  middlewares/          Verified authentication and role authorization
  routes/               API routes
  utils/                Configuration, database, JWT and validation
  database/schema.sql   Fresh schema
  scripts/              Initialization, migration, first administrator
  test/platform.test.js Real MySQL API/security tests
  server.js
frontend/
  src/components/       Existing dashboards and auth/password dialogs
  src/test/             React behavior and API client tests
  src/api.js            Requests, errors and session handling
  src/validation.js     Form rules and numeric/text sorting
  public/images/        Bundled demo store photographs and source links
project screen shots/   Application screenshots and original ER reference
AUDIT_REPORT.md          Requirement mapping and verification evidence
```

## Setup

Use Node.js 22+ and **MySQL 8.0.16+**; tested on Node.js 26.8.1 and MySQL 8.0.43. MariaDB is not supported by these scripts. The minimum MySQL version ensures [CHECK constraints are enforced](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html).

PowerShell:

```powershell
git clone https://github.com/Rahulsannnamath/store.git
cd store/backend
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
notepad .env
```

Set the generated random value as `JWT_SECRET` and enter your database configuration:

```dotenv
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=store_rating
JWT_SECRET=
CLIENT_ORIGIN=http://localhost:5173
```

`DB_PASSWORD` must be explicitly configured, even when empty for local development. `JWT_SECRET` must contain at least 32 random characters. Missing configuration fails startup. The server also verifies the MySQL version and authentication schema. Keep `.env` private; it is ignored by Git.

Create an empty database using the MySQL password prompt (adjust the executable path if needed):

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' -u root -p -e "CREATE DATABASE store_rating CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
npm run db:init
```

`db:init` refuses a nonempty database. It does not drop tables or replace rows. The schema preserves `users`, `storedata`, and `ratings`, with unique user emails, mandatory owner references, foreign keys, timestamps, rating checks, and unique `(user_id, store_id)` for rating upserts.

For an existing database, verify a backup first, point `.env` at it and run `npm run db:migrate` during maintenance. The additive migration checks existing data before DDL: duplicate/unnormalized emails, invalid names/addresses/roles, invalid owners, duplicate ratings and invalid/orphan ratings cause an explicit failure. Reconcile conflicts deliberately and rerun; no rows are silently deleted or merged. It expects the columns used by the original queries. Unrelated schemas need a reviewed migration. MySQL DDL implicitly commits, so a later failure may leave earlier additive changes applied; rerunning is supported.

Bootstrap the first administrator by setting `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_ADDRESS`, and `ADMIN_PASSWORD` in the current terminal environment, then run:

```powershell
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
npm start
```

Use a private terminal and a strong password; do not save credentials in source or shell scripts. Bootstrap refuses if an administrator already exists. Use the authenticated dashboard to create subsequent privileged accounts.

In a second terminal, from the repository root:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173. API: http://localhost:5000. `npm run dev` in `backend` enables Node watch mode. `npm run build` and `npm run preview` in `frontend` create and serve the production preview. Set `VITE_API_URL` before building for another API host. Production should use HTTPS, a dedicated database account and the actual `CLIENT_ORIGIN`.

## Optional demo stores, photographs and ratings

For a local demo, set `DEMO_PASSWORD` in the private `backend/.env` to a strong 8-16 character password. After initializing the empty database, run this from `backend`:

```powershell
npm run db:seed
```

This creates 6 fictional stores, 3 owners, 5 normal users, 1 admin and 30 ratings. Each store has a bundled photograph under `frontend/public/images/`. Re-running preserves existing records and modified ratings; it does not reset account passwords or create duplicate demo records. Do not seed demo accounts in production.

| Role | Demo email |
|---|---|
| Normal User | `rahul@demo.store.test` |
| Store Owner | `ananya@demo.store.test` |
| Administrator | `admin@demo.store.test` |

These accounts initially share the **value** provided as `DEMO_PASSWORD`, not the literal text `DEMO_PASSWORD`. For this local workspace, a random demo password is already saved in the ignored `backend/.env`; open that file privately to retrieve it. The app is connected to `store_rating`, separately from test fixtures. Photograph source URLs are recorded in [SOURCES.md](frontend/public/images/SOURCES.md).

Use **Log in** for `rahul@demo.store.test`, **Login as Store Owner** for `ananya@demo.store.test`, and **Login as Admin** for `admin@demo.store.test`. The seeded administrator replaces the need to run `admin:create` for a demo installation. The bootstrap command is intended for installations without an administrator.

If login fails, confirm you are using the full email and the configured password value, then confirm the backend points to the database that was seeded. Changing `DEMO_PASSWORD` after seeding does not reset existing account passwords. Use the authenticated password-change interface to change an account password.

## API

Errors use `{ "message": "..." }`. Protected endpoints require `Authorization: Bearer <token>`. Public signup ignores submitted roles. Login uses database identity, regardless of any client-selected role. Database role `store_owner` is returned as `owner` in authentication/user details for UI compatibility.

| Method | Endpoint | Access / purpose |
|---|---|---|
| POST | `/api/auth/signup` | Public: name, email, address, password |
| POST | `/api/auth/login` | Public: email, password |
| GET | `/api/auth/me` | Authenticated identity |
| POST | `/api/auth/change-password` | Authenticated: currentPassword, newPassword |
| POST | `/api/auth/logout` | Authenticated; client clears token |
| GET | `/api/getstores?q=` | Public summaries; verified token adds own rating |
| POST / PUT | `/api/stores/:storeId/ratings` | Normal User: integer numeric rating |
| GET | `/api/owner/stores` | Owner's stores and score totals |
| GET | `/api/owner/stores/:storeId/raters` | Verified owner of that store |
| GET | `/api/admin/stats` | Admin: real counts |
| GET / POST | `/api/admin/users` | Admin: list/create; q and role filters |
| GET | `/api/admin/users/:id` | Admin: user details and individual stores |
| GET / POST | `/api/admin/stores` | Admin: list/create; q filter |

Stores require name, email, address and owner_id. Optional image_url must use HTTP(S). Sorting happens in React across all filtered results, with visible direction indicators and state retained on refresh. SQL identifiers never come from user input.

## Validation and security

- User names: trimmed, 20-60 characters. Store names: trimmed, 1-60 characters.
- Emails: valid format, trimmed and lowercase, maximum 254 characters; user email is unique.
- Address: required, maximum 400 characters after trimming.
- Passwords: 8-16 characters, uppercase and special character required; bcrypt cost 12.
- Ratings: JSON integer number 1-5. Strings, fractions, null and missing values are rejected.
- User identity comes from verified authentication. Password hashes are excluded from API responses.
- JWTs expire in two hours and verify HS256, issuer and audience. Protected requests check current database role and token_version.
- Password changes increment token_version, invalidating all previous tokens. React handles expiration and 401 responses.
- Logout clears the client token; **it does not revoke a previously issued token**. That token remains valid until expiry or password-change invalidation.
- Tokens remain in localStorage for compatibility. Protect against XSS and deploy with HTTPS. HttpOnly cookies would require a separate CSRF/CORS design.

**Secret rotation:** the original source exposed a database credential and predictable JWT fallback. Rotate the database credential in MySQL and every deployment, and generate a new JWT_SECRET. Removing the values from source does not remove them from Git history. Old tokens need a fresh login because verified claims have changed. No live secrets are included in examples.

The ignored application `.env` now points at the seeded `store_rating` database and retains the existing local database credential. Tests use the separately ignored `.env.test`. The original `store` database contains customers/orders rather than this application's rating tables and was not modified. Credential rotation remains an operator action.

## Testing

Backend tests use real Express routes and real MySQL. They refuse database names without the `store_rating_test_` prefix. Fixtures have unique names and are retained for inspection. Never run them against production.

When `backend/.env.test` exists, tests load it in preference to the app configuration. Copy `.env.test.example` to `.env.test` and configure its database credentials and random JWT secret to keep test fixtures separate from demo/application data. Initialize that test database using the matching `DB_NAME` before running tests.

From `backend`, with credentials already in `.env`:

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' -u root -p -e "CREATE DATABASE store_rating_test_local CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
$env:DB_NAME = 'store_rating_test_local'
npm run db:init
npm run db:migrate
npm test
npm audit
Remove-Item Env:DB_NAME
```

Initialize each empty database once; subsequent tests can reuse it. From `frontend`:

```powershell
npm test
npm run lint
npm run build
npm audit
```

Latest successful checks: **70/70 backend tests, 29/29 frontend tests, lint passed, production build passed**. The last dependency audits reported zero vulnerabilities in both packages. Backend count includes a parent test and 69 behavior subtests. Both HTTP servers returned 200; all six demo photographs returned HTTP 200, and demo logins succeeded for all three roles. See [AUDIT_REPORT.md](AUDIT_REPORT.md) for the audit history and verification scope.

## Current application screenshots

Captured from the running application on November 23, 2026, using real seeded MySQL data. Desktop captures use a 1440px-wide viewport; the mobile capture uses 390px. Login screenshots contain empty password fields. The capture process signs in through the actual login forms for each role.

### Store listing with photographs and ratings

![Public store listing with separate login buttons, search, sorting and six store photographs](project%20screen%20shots/current/01-store-listing.png)

### Separate login entry points

| User login | Store Owner login | Admin login |
|---|---|---|
| ![User login dialog](project%20screen%20shots/current/02-user-login.png) | ![Store Owner login dialog](project%20screen%20shots/current/03-owner-login.png) | ![Admin login dialog](project%20screen%20shots/current/04-admin-login.png) |

<details>
<summary>Signup and password-change forms</summary>

![Normal User signup with name, email, password, address and validation](project%20screen%20shots/current/05-signup.png)

![Password-change dialog with current and new password fields](project%20screen%20shots/current/09-change-password.png)

</details>

<details>
<summary>Normal User dashboard: current ratings and modification controls</summary>

![Normal User dashboard showing the signed-in user's submitted ratings](project%20screen%20shots/current/06-user-dashboard.png)

</details>

<details>
<summary>Store Owner dashboard: owned stores, weighted average and submitting users</summary>

![Store Owner dashboard with individual store averages and expanded submitted ratings](project%20screen%20shots/current/07-owner-dashboard.png)

</details>

<details>
<summary>Admin dashboard: statistics, accounts and store management</summary>

![Admin dashboard showing nine users, six stores, thirty ratings and management tables](project%20screen%20shots/current/08-admin-dashboard.png)

</details>

<details>
<summary>Mobile store listing</summary>

<img src="project%20screen%20shots/current/10-mobile-store-listing.png" alt="Store listing at a 390px mobile viewport with wrapping login navigation and single-column cards" width="390" />

</details>

The original screenshots remain in `project screen shots/` for reference. The [original ER diagram](project%20screen%20shots/ER%20diagram%28schema%29.png) predates the repair; [schema.sql](backend/database/schema.sql) is the current database definition.

### Reproduce the screenshots

Start the backend on port 5000 and frontend on port 5173, seed the demo database, and keep the matching `DEMO_PASSWORD` in the private `backend/.env`. Then, from `frontend`:

```powershell
npm ci
npm run screenshots
```

The script uses headless Playwright with an installed Google Chrome, signs in with each demo account, and writes ten PNGs plus `manifest.json` to `project screen shots/current/`. It does not submit ratings, create accounts or change passwords. It reports failed local requests, page exceptions, broken photographs and mobile page overflow. If using installed Microsoft Edge instead, set `$env:SCREENSHOT_BROWSER = 'msedge'`. `SCREENSHOT_URL` can override the frontend address; configure the backend's allowed origin to match.

## Verification limits

Headless Chrome screenshots verified the public listing, all three login dialogs, signup/password forms and role dashboards against the live local API. All six photographs loaded; the run reported no page exceptions, failed local requests or horizontal page overflow at the sampled mobile width. The screenshot manifest records capture details. This supplements the jsdom component tests and does not cover every browser, viewport or interactive path. Legacy migration was tested on the fresh schema, not a production copy. TLS, hosting, backups, rate limiting, monitoring, pagination and load testing remain deployment work. Admin and owner dashboards load on demand; the final build has no bundle-size warning. These results do not certify production readiness or complete visual compatibility.
