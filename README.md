# Oszczednosci

Oszczednosci is a monorepo for a savings and investment tracking application. It currently combines a Spring Boot backend with a React single-page application (SPA). In production, the frontend is built by Vite and served by Spring Boot from one executable JAR.

## What the project currently has

- **Spring Boot backend** in `backend/`, using Java 21 and Maven.
- **React frontend** in `frontend/`, using Vite, React, and React Router.
- **Single-JAR production packaging**: the backend Maven build installs Node/npm, builds the frontend, copies the Vite output into Spring Boot static resources, and packages everything into one JAR.
- **SPA routing support**: Spring forwards non-API, extensionless browser requests to `index.html`, so direct links and page refreshes work for client-side routes.
- **Persistence layer** with Spring Data JPA, Flyway migrations, and an H2 runtime database.
- **Investment entry domain** with API support for listing investment types, creating entries, listing entries, filtering by type, and deleting entries.
- **Investment operations and performance** keep deposits, withdrawals, purchases, and sales separate from valuation snapshots and calculate contributed capital, nominal/net result, return rate, and XIRR.
- **Seed data migrations** for initial investment/bond entries.

## Supported features

### Frontend

- Home page at `/`.
- About page at `/about`.
- Client-side fallback page for unknown routes.
- Development server with Vite at `http://localhost:5173`.
- Development proxy for `/api` requests to the backend at `http://localhost:8080`.

### Backend API

The backend exposes these routes under `/api`:

| Method     | Path                              | Description                                                           |
| ---------- | --------------------------------- | --------------------------------------------------------------------- |
| `GET`      | `/api/investment-types`           | Returns the supported investment type enum values.                    |
| `GET`      | `/api/investments`                | Lists investment entries. Accepts an optional `type` query parameter. |
| `POST`     | `/api/investments`                | Creates an investment entry from a validated JSON request body.       |
| `DELETE`   | `/api/investments/{id}`           | Deletes an investment entry by UUID.                                  |
| `GET/POST` | `/api/investment-operations`      | Lists or records portfolio cash flows and trades.                     |
| `DELETE`   | `/api/investment-operations/{id}` | Deletes an operation by UUID.                                         |
| `GET`      | `/api/portfolio-performance`      | Calculates performance for an owner and optional asset filters.       |

The domain API uses HTTP Basic authentication. Read operations accept either the
configured reader or administrator account; writes, deletes, imports, and exports
require the administrator role. Configure credentials with `APP_READER_USERNAME`,
`APP_READER_PASSWORD`, `APP_ADMIN_USERNAME`, and `APP_ADMIN_PASSWORD`.

Operational health is exposed separately at `GET /actuator/health` and does not
require domain API authentication. The former demo `/api/hello` and custom
`/api/status` endpoints are not part of the application.

## Project structure

```text
.
├── backend
│   ├── src/main/java                    # Spring Boot source code
│   ├── src/main/resources/db/migration  # Flyway database migrations
│   ├── src/main/resources/static        # Built frontend assets served by Spring Boot
│   └── pom.xml                          # Backend Maven build
├── frontend
│   ├── src                              # React application source
│   ├── ARCHITECTURE.md                  # Frontend boundaries and contribution guide
│   ├── index.html                       # Vite HTML entry point
│   ├── package.json                     # Frontend scripts and dependencies
│   └── vite.config.ts                   # Vite build/proxy configuration
├── pom.xml                              # Root Maven aggregator
├── .gitignore                           # Ignored generated/local files
└── README.md
```

## Requirements

- Java 21 for the backend.
- Maven for root/backend builds.
- Node.js and npm for standalone frontend development.

The production Maven build downloads and uses its configured Node/npm versions through `frontend-maven-plugin`, so a separate Node installation is mainly needed when running the frontend directly during development.

## Production build and run

From the repository root, build the full application:

```bash
mvn clean package
```

Run the packaged application:

```bash
java -jar backend/target/app-0.0.1-SNAPSHOT.jar
```

Open the application at:

```text
http://localhost:8080
```

## Docker build and run

Build a self-contained container image from the repository root:

```bash
docker build -t oszczednosci-app .
```

Run the application in Docker:

```bash
docker run --rm -p 8080:8080 -v oszczednosci-data:/app/data oszczednosci-app
```

The container serves the React SPA and Spring Boot API together at:

```text
http://localhost:8080
```

The image stores runtime investment data at `/app/data/investment-entries.json` by default. Mount a Docker volume, as shown above, to preserve data across container restarts. You can pass additional JVM options with `JAVA_OPTS`, for example:

```bash
docker run --rm -p 8080:8080 -e JAVA_OPTS="-Xmx512m" -v oszczednosci-data:/app/data oszczednosci-app
```

### Docker secrets/config tree

Credentials can be supplied as environment variables or through Spring config-tree
secrets. For example, create files matching the `APP_*` credential variable names
in the mounted config-tree directory and start the container with:

```yaml
services:
  savingsapp:
    image: savingsapp:latest
    volumes:
      - /share/Container/secrets:/run/secrets:ro
    environment:
      SPRING_CONFIG_IMPORT: optional:configtree:/run/secrets/
```

At runtime, Spring Boot maps these values into the authentication adapter. When
credentials are omitted, random passwords are generated, so an unconfigured
production instance does not silently expose the domain API. Cross-origin browser
access is denied by default; set `APP_CORS_ALLOWED_ORIGINS` to a comma-separated
list of trusted HTTP(S) origins when a separately hosted frontend requires it.

## Development workflow

Run the backend from the repository root or the `backend/` module with Maven/Spring Boot tooling. When the backend is running on port `8080`, start the frontend development server separately:

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:8080`.

Before changing frontend features, read the [frontend architecture guide](frontend/ARCHITECTURE.md). It defines the layer boundaries, Dependency Rule, portfolio language, validation and error conventions, implementation workflow, and required tests. From `frontend/`, use these checks during development:

```bash
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Frontend and backend integration

`frontend/vite.config.ts` builds the React app into:

```text
../backend/target/generated-resources/static
```

During `mvn clean package`, `backend/pom.xml` runs the frontend build before packaging the Spring Boot JAR. This means production deployment does not require a separate static web server for the React app.

## SPA routing

The React app uses browser-based routing for `/` and `/about`. The Spring MVC configuration forwards non-API requests without a file extension to `index.html`, which allows direct navigation and refreshes such as:

```text
http://localhost:8080/about
```

## Notes

- Generated folders such as `target/`, `node_modules/`, frontend build output, logs, local environment files, and editor metadata are ignored by Git.
- The checked-in static files under `backend/src/main/resources/static` represent built frontend assets that Spring Boot can serve.
