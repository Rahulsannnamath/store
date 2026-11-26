# Store platform audit and repair

Verified on November 23, 2026. Scope: repair the existing React/Material UI + Express + MySQL application. No production database migration, deployment, Git commit or push was performed.

## Confirmed defects and changes

| Confirmed defect | Repair |
|---|---|
| Public signup accepted client-supplied privileged roles | Public accounts always use `user`; privileged creation remains admin-only |
| Database password and predictable JWT fallback in source | Environment configuration, secret-free examples, fail-closed startup and rotation instructions |
| JWT authorization relied only on claims | Verify algorithm/issuer/audience/expiry and current database role/token version |
| Ratings accepted admins, owners and fractions | Normal-user-only middleware and strict JSON integer validation |
| No password changes | Verify current hash, validate/hash replacement, atomically update and invalidate old sessions |
| User signup/admin creation used inconsistent validation | Common backend validator, matching frontend rules, normalization and duplicate conflicts |
| Signup omitted address | Required address field and API payload |
| Owner average was an average of averages | Exact total rating score divided by total rating count |
| No reproducible SQL schema or migration | Fresh schema, additive preflighted migration, safe admin bootstrap |
| No visible table sorting or admin user details | Text/numeric sorting, direction indicators, addresses, user details and individual owner stores |
| Stale session/rating behavior and missing feedback | Session verification, expiry/401 handling, identity-based store remounts, refreshed rating data and form feedback |
| Missing useful scripts/tests and vulnerable dependencies | Working start/dev/db/test scripts, lockfile updates, real API/MySQL and React tests; zero reported dependency vulnerabilities |

Existing layout classes, reference screenshots, routes and role response compatibility are retained. Store creation now requires a valid owner; public signup roles and rating numeric strings are intentionally no longer accepted. Frontend requests match these corrections.

## Actual verification results

| Command/check | Result |
|---|---|
| `cd backend; npm run db:init` | PASS: fresh isolated database initialized |
| `cd backend; npm run db:migrate` | PASS: additive migration succeeded and reran with fixtures retained |
| Backend `initDB()` startup check | PASS: database connection/version/authentication schema verified |
| `cd backend; npm test` | PASS: 70 tests, 0 failures (69 behavior subtests plus parent) |
| `cd frontend; npm test` | PASS: 27 tests, 0 failures, 2 test files |
| `cd frontend; npm run lint` | PASS: no lint errors or warnings |
| `cd frontend; npm run build` | PASS: production build; final entry bundle 445.42 kB, dashboards split into separate chunks |
| `npm audit` in each package | PASS: zero reported vulnerabilities in each |
| Running backend `/` and frontend `/` | PASS: HTTP 200 from both |
| Browser visual/end-to-end/mobile check | NOT VERIFIED: browser tooling unavailable/blocked |
| Migration against an original production database copy | NOT VERIFIED: only isolated database used |

Backend tests use Supertest against the real Express application and MySQL 8.0.43. They cover registration, normalization, duplicate emails, validation, privilege escalation, login, missing/expired/invalid tokens, role boundaries, owner isolation, store creation, rating edge cases and ownership, updates/averages, real statistics, searches/filters, database uniqueness/checks/foreign keys, password changes and configuration failure.

Frontend tests use Vitest, React Testing Library and jsdom with mocked APIs for behavior, plus separate API-client tests with mocked fetch. They cover signup/login, verified role rendering, new/modified ratings, error/empty states, password changes, numeric sorting, table sorting in both directions, admin details/filter preservation, weighted owner average, and session-clearing API behavior. They do not prove full browser network integration or visual layout.

## Final requirement compliance

PASS means the described behavior was exercised by automated tests or an actual successful command; it is not a blanket security certification.

| Requirement | Status | Files | Verification |
|---|---|---|---|
| Admin dashboard | PASS | `backend/controllers/admin.controller.js`, `frontend/src/components/AdminDashboard.jsx` | Real count queries, creation/detail/filter API tests and dashboard component tests |
| User signup | PASS | `backend/controllers/auth.controller.js`, `frontend/src/components/AuthDialog.jsx` | Valid/invalid signup, normalization, duplicate conflict, escalation and form tests |
| Login | PASS | Auth controller, `frontend/src/App.jsx`, `frontend/src/api.js` | Database role wins; invalid credentials and role rendering tested |
| Password change | PASS | Auth controller/routes, `frontend/src/components/PasswordDialog.jsx` | Correct/incorrect password, policy, old credentials/JWT invalidation, form submission/failure |
| Store listing | PASS | `backend/controllers/store.controller.js`, `frontend/src/components/StoreList.jsx` | Listing/search, zero-rating and empty states; component rendering |
| Rating submission | PASS | Store controller/routes and StoreList | Role restriction, invalid values, identity spoofing and frontend submission |
| Rating modification | PASS | Store controller, schema, StoreList | POST upsert and PUT modification, uniqueness, average/count refresh |
| Owner dashboard | PASS | Owner controller, `frontend/src/components/OwnerDashboard.jsx` | Ownership isolation, raters, separate stores, exact score sum and weighted average |
| Filtering | PASS | Admin/store controllers and dashboard components | Name/address searches, admin user role/text/store filters and retained filter after creation |
| Sorting | PASS | `frontend/src/validation.js`, dashboard/list components | Numeric comparator both ways, admin column interaction and store sorting |
| Validations | PASS | Backend/frontend validation helpers and forms | Name/email/password/address/rating boundaries and invalid types |
| Database constraints | PASS | `backend/database/schema.sql` | Real unique/check/foreign-key rejection tests and successful initialization |
| Security repairs | PASS | Auth middleware/helpers/controllers/routes/config | Privilege escalation, unauthorized roles, owner isolation, token checks and secret configuration tests |
| Legacy data migration | NOT VERIFIED | `backend/scripts/migrate.js` | Fresh-schema additive/idempotent run passed; production-copy reconciliation not exercised |
| Visual/mobile compatibility | NOT VERIFIED | Existing frontend JSX/CSS | Browser access host unavailable; native fallback could not establish current URL |

## Files created

- `backend/.env.example`, `backend/utils/validation.js`
- `backend/database/schema.sql`
- `backend/scripts/init-db.js`, `backend/scripts/migrate.js`, `backend/scripts/create-admin.js`
- `backend/test/platform.test.js`
- `frontend/.env.example`, `frontend/src/validation.js`
- `frontend/src/components/PasswordDialog.jsx`, `frontend/public/store-placeholder.svg`
- `frontend/src/test/setup.js`, `frontend/src/test/platform.test.jsx`, `frontend/src/test/api.test.js`
- `AUDIT_REPORT.md`

## Files modified

- `.gitignore`, `README.md`
- `backend/controllers/{auth,admin,owner,store}.controller.js`
- `backend/middlewares/auth.middleware.js`
- `backend/routes/{auth,store}.routes.js`
- `backend/utils/{auth,config,db}.js`, `backend/server.js`
- `backend/package.json`, `backend/package-lock.json`
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.js`
- `frontend/src/App.jsx`, `frontend/src/api.js`, `frontend/src/styles.css`
- `frontend/src/components/{AdminDashboard,AuthDialog,Navbar,OwnerDashboard,StoreList}.jsx`

## Database and local operation

Fresh installs: configure `.env`, create an empty MySQL database, run `npm run db:init`, bootstrap the first admin using private environment variables, then `npm start`. Existing installs: back up first, run `npm run db:migrate`, explicitly resolve any preflight conflicts, then restart. Detailed SQL and PowerShell commands are in README.

An ignored local `backend/.env` was generated with a random JWT secret and existing local database credentials. Verification used the newly created `store_rating_test_1795423404867` database, leaving original databases unchanged. Test fixtures remain there for inspection. Do not treat test fixtures or the previously exposed database credential as a production setup. The `.env` contents were not printed or committed.

The old exposed database credential still needs rotation by the database operator; changing a shared root credential was outside this repair. Logout clears the browser session but does not revoke a stolen token. Password changes do invalidate tokens. Deployment concerns such as TLS, rate limiting, pagination, operational monitoring and load testing are not certified by this audit.

For this already configured local workspace, in separate terminals:

```powershell
cd E:\store\backend
npm start
```

```powershell
cd E:\store\frontend
npm run dev
```

Use http://localhost:5173 and http://localhost:5000. Both servers were started and responded successfully during verification; avoid starting a second copy on the same ports.

## Follow-up: restore useful local application data

The initial audit left the app connected to its isolated test database, which had no store photographs. On inspection, the original `store` database contained only `customers` and `orders`; no original store-rating tables were found in the other non-system databases. That database was preserved.

Created the separate application database `store_rating`, initialized the current schema, and seeded 9 demo accounts, 6 stores and 30 ratings. Six stock photographs are bundled under `frontend/public/images/`, with source URLs documented there. `backend/scripts/seed.js` is available through `npm run db:seed`; two consecutive runs retained exactly 9 users, 6 stores and 30 ratings. Live API results returned all 6 stores with their averages; each image returned HTTP 200. Admin, owner and user demo login requests each returned HTTP 200.

The app now uses `backend/.env` with `DB_NAME=store_rating`. The original audit test connection is saved in ignored `backend/.env.test`, which the test suite loads separately; all 70 backend tests passed after separating the databases. Demo accounts use a generated password in the private `DEMO_PASSWORD` setting. No password was printed or added to tracked files.

Additional files: `backend/scripts/seed.js`, `backend/.env.test.example`, six JPEGs and `frontend/public/images/SOURCES.md`. Updated the package seed command, environment examples, ignore rules, test configuration and setup guide.

## Follow-up: role login buttons and current screenshots

Added separate Store Owner/Admin login buttons with labeled dialogs while retaining database-verified authorization. Frontend tests now pass 29/29, including the new entry points; lint and production build passed.

With explicit permission to use a separate headless browser, `frontend/scripts/capture-screenshots.mjs` captured ten current screenshots using installed Chrome and Playwright. The script signs in through the live forms for the seeded user, owner and administrator, captures their dashboards and empty authentication/password forms, expands owner rating details, and checks a 390px mobile listing. It reports zero page exceptions, failed local requests, broken images or mobile horizontal page overflow. Captures and a manifest are stored in `project screen shots/current/` and linked in README.

This supersedes the earlier browser-capture blocker for these sampled views; it is not exhaustive browser compatibility testing. Original screenshot files remain preserved.
