# Frontend architecture

This guide is the contract for changing the frontend. The application uses a Clean Architecture-style separation around the **portfolio** bounded context. Directories are architectural boundaries, not merely a way to group files.

## Layers and responsibilities

| Layer            | Directory                                             | Owns                                                                                                              | Must not own                                                      |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Domain           | `src/domain/portfolio/`                               | Portfolio concepts, invariants, entities, value objects, and pure domain services                                 | React, HTTP, storage, JSON DTOs, or orchestration                 |
| Application      | `src/application/`                                    | Use cases, commands/queries, workflow validation, transaction boundaries, and ports required by those workflows   | Fetch, `window`, React, rendering, or API response shapes         |
| Infrastructure   | `src/infrastructure/`                                 | Adapters for HTTP and browser storage, wire DTOs, serialization, and mapping between external and internal models | Business policy or UI state                                       |
| Presentation     | `src/presentation/`                                   | React pages/components, controller hooks, form state, view models, formatting, and user feedback                  | Fetch/storage calls, adapter construction, or business invariants |
| Composition root | `src/app/compositionRoot.ts` (used by `src/main.tsx`) | Construct concrete adapters and inject them into use cases/controllers                                            | Business decisions or reusable application behavior               |

`src/app/AppRouter.tsx` is application-shell presentation (routing and layout). The composition root is the one intentionally impure location that knows both abstractions and concrete adapters.

## Dependency Rule

Source-code dependencies point **inward**, toward policy:

```text
presentation ───────> application ───────> domain
      │                     ▲
      │                     │ implements ports owned here
      └──────────────> domain

infrastructure ─────> application and domain

app/compositionRoot ─> presentation/application/infrastructure
main.tsx ────────────> app
```

Allowed imports are:

- Domain imports only domain modules (and platform/standard-library types with no I/O).
- Application imports domain and other application modules, including its own ports.
- Infrastructure imports application ports/types and domain types to implement and map them.
- Presentation imports application and domain types/behavior plus presentation modules and React.
- The composition root may import every layer solely to wire objects.

Forbidden directions include domain to application, any inner layer to infrastructure or presentation, application to React/browser APIs, presentation directly to infrastructure, and feature code importing the composition root. A port inversion is crucial: the use case imports the port; the Fetch adapter imports and implements that port. The use case never imports the adapter.

## Portfolio bounded context

The portfolio context answers: **what does a person or household own, how did value change, how is it allocated, and how is it performing?** It does not model HTTP resources, React forms, or database rows.

Use this ubiquitous language consistently in code, tests, and review:

- **Portfolio**: the investments considered for a scope and optional filters.
- **Owner**: a person identified by `OwnerId`; an **owner portfolio** has exactly one owner.
- **Household portfolio**: the aggregate of multiple owners, not a new owner.
- **Investment entry**: a dated valuation of an asset/classification for an owner.
- **Investment operation**: a dated cash flow or trade: deposit, withdrawal, buy, or sell.
- **Portfolio change**: the application command that records an operation or valuation and its resulting value.
- **Snapshot**: the latest applicable entry per asset at a point in time.
- **Performance**: contributed capital, result, rate of return, and related measures for a scope.
- **Allocation**: weights by global asset class or stock subcategory.
- **Allocation target**: the desired weights used for planning.
- **Rebalancing**: calculating differences between current and target allocation.
- **Scope**: either `OwnerPortfolio` or `HouseholdPortfolio`; do not encode household as a magic owner ID.
- **Asset type**, **global asset class**, and **stock subcategory**: classifications with distinct meanings; do not use them interchangeably.

When another area develops different language, invariants, or lifecycle, give it its own bounded context rather than expanding `portfolio` into a generic shared model.

## Building blocks and conventions

### Domain

- **Entity**: has identity and a lifecycle. Put portfolio entities in `domain/portfolio/entities.ts` (or a named module when large), name them with domain nouns such as `InvestmentEntry`, and keep invariants close to construction/change behavior.
- **Value object**: immutable, compared by value, and valid when constructed. Examples include `OwnerId`, `Money`, `ValuationDate`, and `AllocationWeight` in `values.ts`. Prefer a parsing/factory function that rejects invalid values over propagating primitive strings/numbers.
- **Domain service**: pure, stateless policy that spans entities/value objects. Name it for the policy (`RebalancingService`, `HouseholdAggregationService`) under `domain/portfolio/services/`. It must not retrieve data or update UI state.

### Application

- **Use case**: one user/application intent, normally a class with an `execute` method, such as `LoadPortfolio` or `RecordPortfolioChange`. It coordinates domain behavior and ports; it does not know how a port is implemented. Commands change state; queries return information and should not produce hidden writes.
- **Port**: an application-owned TypeScript interface describing the smallest capability a use case needs. Put it in `application/ports/` and use a role suffix: `PortfolioQueryGateway`, `InvestmentEntryRepository`, or `UserPreferenceRepository`. Avoid leaking `Response`, `RequestInit`, `Storage`, endpoint paths, or wire DTOs through a port.
- Application request/result objects are internal boundary models. Name them after intent (`LoadPortfolioRequest`, `PortfolioChangeCommand`), not transport (`...Dto`).

### Infrastructure

- **Adapter**: a concrete implementation of an application port. Prefix it with the technology (`FetchPortfolioQueryGateway`, `LocalStoragePreferenceRepository`) and place it under `infrastructure/http/` or `infrastructure/storage/`.
- **DTO**: the exact external wire/storage shape. Keep DTO types private to infrastructure where possible and suffix exported ones `Dto`. A DTO may contain backend naming, nullable fields, and strings that have not yet been validated; it is never a domain entity.
- **Mapper**: translates across a boundary and performs structural checks. HTTP DTO mappers belong in `infrastructure/http/mappers/`; mapping failures use a boundary-specific error such as `MappingError`. Do not make domain code understand JSON.

### Presentation

- **Controller hook**: coordinates React lifecycle, calls injected use cases, represents idle/loading/success/failure state, cancels stale work, and invalidates affected queries. Name it `use<Feature>Controller`, such as `usePortfolioController`. It accepts use cases (or an application-facing dependency object), never constructs adapters.
- **View-model mapper**: turns application/domain results into render-ready labels and series in `presentation/viewModels/`. **Form mappers** translate raw controls into commands in `presentation/mappers/`.
- **Component**: renders props and emits user intent. Prefer focused components under `presentation/components/`; route-level composition belongs under `presentation/pages/`. Components should not call `fetch`, `localStorage`, or instantiate a use case.

## Validation ownership

Validate at every boundary, once for that boundary's concern:

1. **Presentation/form mapper** checks input usability (required controls, parsing, and field-oriented feedback) and converts strings into an application command. HTML validation improves UX but is not authoritative.
2. **Application use case** checks workflow preconditions that require command context or existing data and reports stable, UI-independent failure codes. `RecordPortfolioChange` owns rules such as a positive operation amount and sufficient current value.
3. **Domain** enforces invariants that must always hold, regardless of caller, such as valid money, owner IDs, dates, and allocation weights.
4. **Infrastructure mapper** validates untrusted response/storage shape before constructing internal types. Never cast unknown JSON directly into a domain type.
5. The backend remains authoritative for security, permissions, and persisted-data integrity; frontend checks are not a security boundary.

Do not duplicate a business rule in a component and adapter. Components may translate a typed failure into field text, but the rule stays inward.

## Errors crossing boundaries

### HTTP

`FetchHttpClient` catches network failures, non-success statuses, and malformed success bodies and converts them to `HttpError` (with optional status and cause). It deliberately lets `AbortError` pass through so controllers can treat cancellation as cancellation rather than failure. Endpoint adapters map DTOs and may raise `MappingError` for an incompatible payload.

Ports must not mention `HttpError`. A use case may either let an unknown technical error cross its output boundary or translate a known adapter-neutral condition into an application error. Controller hooks catch `unknown`, ignore expected aborts, store a failure state, and presentation maps it to a safe user message. Never branch on HTTP status inside a component and never expose raw server payloads or stack traces to users.

### Browser storage

Only storage adapters access `localStorage`. They catch unavailable storage, quota/security failures, invalid JSON, and schema/version problems at that boundary. Return a documented default only when the port defines absence/corruption as recoverable; otherwise throw a storage-specific adapter error with the original cause. Application/presentation code must not depend on `DOMException` or storage keys. Controller behavior follows the same rule as HTTP: translate known application failures, represent unknown technical failures safely, and preserve diagnostics for logging.

## End-to-end dependency-inversion example

The following small query illustrates the direction. It is representative; use the existing portfolio names and mappers when implementing it.

**1. Define the port inward (`src/application/ports/PortfolioSummaryGateway.ts`):**

```ts
import type { OwnerId } from '../../domain/portfolio/values.js';
import type { PortfolioSummary } from '../../domain/portfolio/summary.js';

export interface PortfolioSummaryGateway {
  load(owner: OwnerId, signal?: AbortSignal): Promise<PortfolioSummary>;
}
```

**2. Implement the use case against only that port (`src/application/LoadPortfolioSummary.ts`):**

```ts
import type { PortfolioSummaryGateway } from './ports/PortfolioSummaryGateway.js';
import type { OwnerId } from '../domain/portfolio/values.js';

export class LoadPortfolioSummary {
  constructor(private readonly summaries: PortfolioSummaryGateway) {}

  execute(request: { owner: OwnerId; signal?: AbortSignal }) {
    return this.summaries.load(request.owner, request.signal);
  }
}
```

**3. Supply an outward Fetch adapter (`src/infrastructure/http/FetchPortfolioSummaryGateway.ts`):**

```ts
import type { PortfolioSummaryGateway } from '../../application/ports/PortfolioSummaryGateway.js';
import type { OwnerId } from '../../domain/portfolio/values.js';
import { mapPortfolioSummaryDto } from './mappers/portfolioDtoMapper.js';
import type { FetchHttpClient } from './FetchHttpClient.js';

export class FetchPortfolioSummaryGateway implements PortfolioSummaryGateway {
  constructor(private readonly http: FetchHttpClient) {}

  async load(owner: OwnerId, signal?: AbortSignal) {
    const dto: unknown = await this.http.json('/portfolio-summary', {
      query: { owner },
      signal
    });
    return mapPortfolioSummaryDto(dto);
  }
}
```

**4. Wire it only at the application boundary (`src/app/compositionRoot.ts`):**

```ts
const summaryGateway = new FetchPortfolioSummaryGateway(http);
const useCases = Object.freeze({
  // existing use cases...
  loadPortfolioSummary: new LoadPortfolioSummary(summaryGateway)
});
```

**5. Call the injected use case from a React controller (`src/presentation/portfolio/hooks/usePortfolioSummaryController.ts`):**

```ts
export function usePortfolioSummaryController(useCases, owner) {
  return useLatestQuery((signal) => useCases.loadPortfolioSummary.execute({ owner, signal }), [useCases, owner]);
}
```

The controller knows the use-case contract but not `FetchPortfolioSummaryGateway`; the use case knows its port but not Fetch. The composition root supplies the relationship, so no dependency is reversed.

## Adding a portfolio feature

1. Write the ubiquitous-language scenario and identify new versus existing invariants.
2. Add or extend value objects/entities and pure domain services; unit-test edge cases without React or I/O.
3. Define the narrow application port needed by the workflow. Do not design it around an endpoint.
4. Implement one named use case, inject the port, and unit-test it with a hand-written fake/stub (success, validation, and failure propagation).
5. Define the external DTO and mapper in infrastructure. Implement the Fetch or storage adapter and adapter tests for URL/method/body, status/network errors, malformed payloads, and mapping.
6. Register adapter and use case in `app/compositionRoot.ts`. Do not export the adapter to presentation.
7. Add a form/view-model mapper if raw UI values differ from the command/result.
8. Add or extend a controller hook to call the injected use case and model async/cancellation/refresh behavior.
9. Render the state in a focused component and assemble it in a page.
10. Run all checks and add an architecture test when a new directory/import pattern is introduced.

## Required tests

- **Domain and use-case unit tests** (`test/unit/`): pure behavior, invariants, boundary values, all command/query branches, and port interactions with fakes. They must not require DOM, network, or real storage.
- **Adapter unit tests** (`test/unit/`): Fetch request construction, serialization, DTO mapping, 204/success behavior, network/status/invalid-response errors, abort preservation; storage absence, round trip, invalid data, and unavailable/quota behavior.
- **Component tests** (`test/component/`): observable rendering and user behavior through Testing Library, including loading, empty, success, validation, failure, retry/refresh, and relevant routing. Inject fake use cases; do not mock adapter internals.
- **Architecture tests** (`test/unit/`): scan imports and fail on forbidden directions, direct `fetch`/`localStorage` outside infrastructure/composition, infrastructure imports in presentation, or React imports in domain/application. Update rules when adding a new architectural directory.

For every change, run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` from `frontend/`. A feature is not complete if the correct test level is missing even when the full suite passes.

## Naming and directory example

```text
src/
├── domain/portfolio/
│   ├── entities.ts, values.ts, snapshot.ts
│   └── services/RebalancingService.ts
├── application/
│   ├── LoadPortfolio.ts
│   ├── portfolio/RecordPortfolioChange.ts
│   ├── queries/PortfolioPlanningQueries.ts
│   └── ports/
│       ├── InvestmentEntryRepository.ts
│       └── PortfolioCommandGateway.ts
├── infrastructure/
│   ├── http/
│   │   ├── FetchPortfolioCommandGateway.ts
│   │   └── mappers/portfolioDtoMapper.ts
│   └── storage/LocalStoragePreferenceRepository.ts
├── presentation/
│   ├── portfolio/hooks/usePortfolioController.ts
│   ├── mappers/portfolioChangeFormMapper.ts
│   ├── viewModels/portfolioViewModelMappers.ts
│   ├── components/GlobalAllocationPanel.tsx
│   └── pages/Home.tsx
└── app/compositionRoot.ts
```

Use verbs for use cases (`Load`, `Record`, `Delete`, `Import`), technology prefixes for adapters (`Fetch`, `LocalStorage`), domain nouns for entities/value objects, `mapXDto`/`mapXViewModel` for boundary maps, `useXController` for hooks, and PascalCase domain/UI files. Avoid vague names such as `Service`, `Helper`, `Utils`, `Manager`, or `data.ts`.

## Review checklist

- [ ] Does the change use portfolio ubiquitous language and remain inside the correct bounded context?
- [ ] Do all imports follow the Dependency Rule, with no React/browser/transport concept in domain or application?
- [ ] Is each business invariant in domain/application rather than a component or adapter?
- [ ] Is the application port minimal, application-owned, and free of HTTP/storage types?
- [ ] Does the adapter validate/map untrusted DTO or stored data instead of casting it?
- [ ] Are HTTP, abort, mapping, and storage failures translated at the correct boundary and shown safely?
- [ ] Is wiring confined to the composition root, with no adapter construction in React?
- [ ] Does the controller receive use cases and own async state, cancellation, and invalidation?
- [ ] Are components focused on rendering and user intent, with accessible loading/error/empty states?
- [ ] Are domain/use-case, adapter, component, and architecture tests present as applicable?
- [ ] Do test, typecheck, lint, format, and production build commands pass?
- [ ] Are this guide and project documentation still accurate after the change?
