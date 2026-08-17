# Domain README

This document describes the business/domain capabilities currently present in the Oszczednosci savings and investment tracking application.

## Product purpose

Oszczednosci is a savings and investment tracker. Its current domain focuses on recording dated investment entries in Polish zloty (PLN), making them available through an HTTP API, and serving a React single-page application from the same Spring Boot application.

## Investment entry domain

An investment entry represents one saved or invested amount at a specific date.

Entries are valuation snapshots only. Money movements and trades are represented by separate investment operations, so a higher valuation is not automatically treated as investment profit.

## Investment operations and performance

An operation records a `DEPOSIT`, `WITHDRAWAL`, `BUY`, or `SELL` for an investment type and optional subcategory. It contains the gross PLN amount, optional fee and tax, business date, owner, and an optional note. Operations never replace valuation snapshots.

The performance endpoint combines the latest valuation snapshot for each asset with external cash flows. It reports current value, net contributed capital (deposits minus withdrawals), nominal result, simple return rate, fees, taxes, result after costs, and annualized XIRR. Purchases and sales remain useful transaction history but are not treated as external portfolio cash flows for XIRR. A result can be calculated for the complete owner portfolio, an investment type, or an individual subcategory.

### Entry attributes

Each investment entry contains:

| Attribute | Description |
| --- | --- |
| `id` | A UUID generated for every entry. |
| `type` | The investment category. Currently supported values are `BOND`, `STOCK`, and `SAVINGS`. |
| `valuePln` | The entry value in PLN, stored with two decimal places. |
| `date` | The business date assigned to the entry. |
| `createdAt` | The timestamp when the entry was persisted. |

### Supported investment types

The application currently supports these investment types:

- `BOND` — bond investments.
- `STOCK` — stock investments.
- `SAVINGS` — savings holdings.

The API exposes the supported values so clients can build type selectors without hard-coding the enum list.

### Creation rules

When an entry is created:

- `type` is required and must be one of the supported investment types.
- `valuePln` is required, must be at least `0.01`, and can contain up to 17 integer digits and 2 fractional digits.
- `date` is required.
- The backend normalizes the PLN value to exactly two decimal places using half-up rounding.
- The entry receives a generated UUID.
- `createdAt` is set automatically when the entry is first persisted.

### Listing and filtering rules

Investment entries can be listed in two ways:

- All entries, ordered by `date` descending and then `createdAt` descending.
- Entries filtered by a single investment `type`, using the same ordering.

### Deletion rules

Entries can be deleted by UUID. A successful delete request returns no response body.

## Seeded domain data

The database migrations create the `investment_entries` table and seed initial bond entries. The seeded records demonstrate the investment entry model with `BOND` values dated January 15, 2026, March 10, 2026, and June 1, 2026.

## Domain API capabilities

The backend exposes the following domain-oriented API endpoints under `/api`:

| Method | Path | Functionality |
| --- | --- | --- |
| `GET` | `/api/investment-types` | Returns all supported investment type names. |
| `GET` | `/api/investments` | Lists investment entries, optionally filtered with `?type=BOND`, `?type=STOCK`, or `?type=SAVINGS`. |
| `POST` | `/api/investments` | Creates a validated investment entry. |
| `DELETE` | `/api/investments/{id}` | Deletes an investment entry by UUID. |

The app also exposes non-domain operational/demo endpoints:

| Method | Path | Functionality |
| --- | --- | --- |
| `GET` | `/api/hello` | Returns a sample backend greeting with a timestamp. |
| `GET` | `/api/status` | Returns basic service status metadata. |

## User-facing web functionality

The React single-page application currently provides:

- A home page at `/` that demonstrates backend connectivity by fetching `/api/hello`.
- An about page at `/about` that explains client-side routing support.
- A not-found page for unknown client-side routes, with a link back to the home page.
- Top navigation between the home and about pages.

## Persistence and runtime behavior

- Data is stored in an H2 database file configured for PostgreSQL compatibility mode.
- Flyway owns schema creation and seed data migrations.
- Hibernate validates the schema instead of generating it automatically.
- The H2 console is enabled at `/h2-console` for local inspection.
- API CORS is configured for the Vite development server origins `http://localhost:5173` and `http://127.0.0.1:5173`.

## Packaging and delivery functionality

- The repository is a Maven monorepo with a Spring Boot backend and a Vite/React frontend.
- The backend build installs Node/npm, runs the frontend build, copies the generated SPA assets into Spring Boot static resources, and packages the app as a single executable JAR.
- Spring MVC forwards non-API, extensionless browser routes to `index.html`, so refreshing or directly opening SPA routes works in production.
