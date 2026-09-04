# AGENTS.md

## Purpose and scope

These instructions apply to the entire repository. Keep changes focused, preserve the existing Clean Architecture boundaries, and update tests and documentation whenever behavior or project conventions change.

## Repository map

- `backend/` contains the Java 21 / Spring Boot application. Read `backend/ARCHITECTURE.md` before changing backend code.
- `frontend/` contains the React 19 / TypeScript / Vite SPA. Read `frontend/ARCHITECTURE.md` before changing frontend code.
- `docs/domain/` contains shared domain documentation. Keep terminology aligned with the architecture guides and implementation.
- The root `pom.xml` is the Maven aggregator. The backend Maven build also installs Node dependencies, builds the frontend, and packages its output in the executable JAR.
- `.github/workflows/` is the source of truth for CI behavior.

## General workflow

1. Inspect the relevant architecture guide, nearby implementation, and tests before editing.
2. Prefer the smallest coherent change. Do not perform unrelated refactors or reformat unrelated files.
3. Add or update tests at the lowest useful layer for every behavior change. Include affected boundary, integration, component, or architecture tests where appropriate.
4. Run the checks relevant to every area touched. Run the full build when a change crosses frontend/backend boundaries or alters packaging.
5. Keep `README.md`, architecture guides, API documentation, and domain documentation accurate.
6. Review `git diff` and `git status` before committing. Do not commit generated output, dependencies, credentials, local data, editor files, or OS metadata.

## Architecture rules

### Backend

- Dependencies point inward: `adapter` -> `application` -> `domain`; `configuration` is the composition root.
- Keep domain code framework-free and transport/persistence-agnostic. Business invariants belong in domain models or pure domain services.
- Put orchestration and technology-neutral ports in `application`. Controllers depend on input ports, and outbound adapters implement application-owned output ports.
- Keep HTTP requests/responses and web mappers in `adapter.in.web`. Keep JSON records, Jackson/filesystem details, and persistence mappers in `adapter.out.persistence.json`.
- Translate exceptions to HTTP only in `ApiExceptionHandler`. Do not leak HTTP status, Spring, Jakarta, Jackson, or vendor types into inner layers.
- Obtain business time and UUIDs through the application `Clock` and `IdGenerator` ports. Introduce application-owned ports for new external integrations.
- Treat one use-case invocation as the transaction boundary. Extend the unit-of-work abstraction when atomic multi-write behavior is needed.
- Follow the detailed naming, invariant, persistence, and testing rules in `backend/ARCHITECTURE.md`.

### Frontend

- Dependencies point inward toward policy: presentation -> application -> domain; infrastructure implements application-owned ports; `src/app/compositionRoot.ts` performs wiring.
- Keep domain code pure. Do not import React, browser APIs, transport DTOs, or infrastructure into domain/application code.
- Presentation receives injected use cases and owns rendering, user intent, form state, and async UI state. Components must not call `fetch`, access `localStorage`, or construct adapters.
- Infrastructure owns HTTP/storage mechanics and validates unknown external data before mapping it to internal types. Preserve `AbortError` as cancellation.
- Use the portfolio ubiquitous language consistently. Do not interchange owner/household, valuation/operation, or asset-type/classification concepts.
- Keep global styling in `frontend/src/styles.css`, reuse semantic tokens and existing responsive breakpoints, and preserve keyboard, focus, reduced-motion, and screen-reader behavior.
- Follow the detailed layer, validation, error, naming, testing, and stylesheet rules in `frontend/ARCHITECTURE.md`.

## Testing and checks

Run backend tests from the repository root:

```bash
mvn test
```

Run all frontend checks from `frontend/`:

```bash
npm ci
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Use `npm install` only when intentionally updating dependencies or the lockfile; otherwise prefer reproducible `npm ci`. Run the complete production build from the repository root when packaging or integration is affected:

```bash
mvn clean package
```

For documentation-only changes, at minimum inspect rendered Markdown where possible and run:

```bash
git diff --check
```

If a required check cannot run, report the exact command and reason. Do not weaken tests, lint rules, type safety, architecture tests, or security controls merely to make a check pass.

## API, persistence, and security

- Preserve `/api` contracts and Spring's SPA routing behavior unless the task explicitly changes them. Update both clients and documentation for intentional contract changes.
- Treat persisted JSON and imported backups as untrusted input. Preserve version validation, invariant checks, locking, and atomic replacement behavior.
- Never commit passwords, tokens, secret files, production data, or insecure fallback credentials. Keep authorization requirements intact and expose only sanitized errors to clients.
- Validate at the owning boundary: input usability in presentation, workflow preconditions in application, invariants in domain, and external data shapes in infrastructure/adapters.

## Code and review conventions

- Match the language and style of neighboring code. Use descriptive domain names rather than generic `Helper`, `Utils`, `Manager`, or `data` abstractions.
- Do not wrap imports in `try`/`catch` blocks.
- Avoid new dependencies when existing platform or project facilities are sufficient. If a dependency is necessary, update its lock/build metadata and explain the reason.
- Keep commits focused and use an imperative, descriptive subject consistent with repository history.
- In the final summary or pull request, describe user-visible and architectural effects, identify tests run, and call out limitations or follow-up work explicitly.
