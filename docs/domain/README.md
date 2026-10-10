# Savings and investment domain

This is the product-level description of the implemented backend. See [`backend/ARCHITECTURE.md`](../../backend/ARCHITECTURE.md) for contributor rules.

## Vocabulary, categories, and owners

An **investment entry** is a dated PLN valuation snapshot for one asset category and portfolio owner; it is not a deposit or trade. An **investment operation** is a separately recorded movement or trade. The configured owner IDs are `jakub` and `zosia`. Owner is required for writes, lists, and performance queries; legacy external values `JAKUB` and `ZOSIA` normalize to lowercase.

An asset category is a type plus a compatible subcategory:

| Type                                                   | Subcategory rule                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `OBLIGACJE`                                            | requires `TRZYLETNIE`, `DZIESIECIOLETNIE`, or `DWUNASTOLETNIE`   |
| `GIELDA`, `IKE`, `IKZE`                                | requires `ZLOTO`, `RYNKI_ROZWINIETE`, or `RYNKI_ROZWIJAJACE_SIE` |
| `KONTO_OSZCZEDNOSCIOWE`, `KONTO_BANKOWE`, `PPK`, `PPO` | must not have a subcategory                                      |

## Entries, operations, and filters

An entry contains generated UUID `id`, `type`, required `owner`, conditional `subcategory`, non-negative `valuePln`, business `date`, generated `createdAt`, and nullable `updatedAt`. PLN values use two decimal places and half-up rounding; HTTP input accepts up to 17 integer and two fractional digits and at least `0.00`. Create sets creation time. Update preserves ID and creation time and sets an update time that cannot precede creation. Entries can be deleted; a missing update/delete target returns `404`.

An operation contains a generated UUID, `INITIAL`, `DEPOSIT`, `WITHDRAWAL`, `BUY`, or `SELL`, category, owner, non-negative initial cost or positive gross movement amount, non-negative fee and tax (default zero), date, optional trimmed note of at most 250 characters, and creation time. Operations can be created, listed, and deleted.

Entry and operation lists require `owner`; optional `type` and/or `subcategory` narrow results. A supplied pair must be compatible. Results sort by business date descending and creation time descending.

## Performance

Performance uses an optional valuation date (UTC today by default), the latest snapshot on or before it for each asset, and operations through that date. It returns current value, net contributed capital, nominal result and simple return, fees, taxes, result after costs, XIRR and status, and current-month result and return. Queries may cover an owner's portfolio or filter by type and/or subcategory.

Known initial costs, deposits and purchases add to contributed capital; withdrawals and sales subtract. Transfers cancel within the whole portfolio. XIRR uses investment-level purchase/sale flows and external portfolio flows after excluding grouped internal transfers, with current value as the final flow. Status is `CALCULATED`, `ZERO_CASH_FLOWS`, `SAME_DAY_FLOWS`, `NO_SIGN_CHANGE`, `MULTIPLE_ROOTS`, or `CONVERGENCE_FAILURE`.

## HTTP API

Portfolio query endpoints require `owner` unless stated otherwise.

| Method          | Path                                                                              | Behavior                                                   |
| --------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `GET`           | `/api/investment-types`                                                           | Lists investment types.                                    |
| `GET`           | `/api/investment-subcategories?type=...`                                          | Lists compatible subcategories.                            |
| `GET`           | `/api/investment-operation-types`                                                 | Lists operation types.                                     |
| `GET`           | `/api/users`                                                                      | Lists configured owners.                                   |
| `GET`, `POST`   | `/api/investments`                                                                | Lists filtered entries or creates one.                     |
| `PUT`, `DELETE` | `/api/investments/{id}`                                                           | Updates or deletes an entry.                               |
| `GET`, `POST`   | `/api/investment-operations`                                                      | Lists filtered operations or creates one.                  |
| `DELETE`        | `/api/investment-operations/{id}`                                                 | Deletes an operation.                                      |
| `GET`           | `/api/portfolio-performance?owner=...&type=...&subcategory=...&valuationDate=...` | Calculates performance.                                    |
| `GET`           | `/api/database/export`                                                            | Downloads the complete JSON backup.                        |
| `POST`          | `/api/database/import`                                                            | Replaces data from multipart field `file` (maximum 5 MiB). |
| `POST` | `/api/portfolio-changes` | Records a tracked change atomically, retrying by request ID. |
| `PUT`, `DELETE` | `/api/portfolio-changes/{id}` | Corrects or undoes a complete tracked change. |
| `GET`, `PUT` | `/api/portfolio-plans?scope=...` | Reads or saves an owner/household allocation plan. |
| `GET` | `/actuator/health` | Operational health. |

Legacy create endpoints return `201`; tracked changes and corrections return `200`; successful deletes and import return `204`. Validation/malformed import returns structured `400`, missing aggregates `404`, and persistence errors a sanitized `500`.

## Persistence and backup scope

The live store is JSON at `app.database.file` (default `./backend/data/investment-entries.json`), not H2/JPA/Flyway. A missing file is an empty store. Mutations use a JVM-wide per-path lock, read-modify-write the versioned document, write a temporary file, and atomically replace the live file. Separate entry and operation repositories share this unit of work and preserve the untouched collection.

Export includes `formatVersion`, **all entries**, and **all operations** including event group IDs, and **all plans** in one consistent v2 document. Import validates version, required collections, domain rules, and unique IDs before replacing both collections; it does not merge. Legacy top-level entry arrays load as entries with no operations. Configuration-backed owners are not backed up. The backend also serves the built React SPA, forwards non-API extensionless routes, and permits local Vite CORS origins on port 5173.

## Wpłaty, koszt i wynik

`INITIAL` określa stan i znany koszt posiadanej inwestycji na datę rozpoczęcia śledzenia. Brak kosztu nie oznacza kosztu zero. Stan początkowy nie jest zyskiem miesiąca ani nową wpłatą. Wpłata/wypłata to przepływ zewnętrzny, a zakup/sprzedaż z konta to dwie strony przesunięcia wewnętrznego. Obie strony zapisują się i cofają razem. Późniejsze salda wynikające ze zdarzeń odtwarzamy chronologicznie; ręczne wyceny pozostają punktami odniesienia.

Wynik pojedynczej inwestycji uwzględnia koszt zakupów i wpływy ze sprzedaży. W całym portfelu transfery się znoszą. Nieznany koszt lub brak wyceny nie pozwala obliczyć wyniku; brak wyceny otwarcia nie pozwala obliczyć wyniku miesiąca. Opłaty zawarte w rzeczywistym saldzie nie są odliczane ponownie.

Plan: wagi obligacje/akcje/opcjonalne złoto, a wewnątrz akcji podział na rynki. Gotówka i nieznany skład PPK/PPO są pokazywane osobno. Brak do celu przy dzisiejszej wartości nie jest tą samą liczbą co zakup za nowy budżet. Zakupy są nieujemne, ograniczone budżetem i zaokrąglone do groszy.


## Correcting a tracked change

PUT `/api/portfolio-changes/{id}` corrects an event using the same request identifier as its path. A correction cannot move it to another owner or asset. Purchase/sale corrections change both transfer legs atomically and replay dependent generated balances. Explicit valuations remain historical anchors. An invalid correction or an overdraw leaves the stored document unchanged. Legacy independent operations retain fees, taxes and notes and do not generate a linked valuation. POST and DELETE use the same atomic event boundary; plans use GET/PUT `/api/portfolio-plans?scope=...`.

The UI presents one chronological event row per tracked change, regardless of how many linked balances it updates. Household performance uses the full owner scope and excludes entirely empty owners from known-profit aggregation. A held asset with unknown contributions still makes profit unknown.
