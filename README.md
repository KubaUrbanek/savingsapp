# Oszczędności

Aplikacja do kontroli oszczędności: ile wpłaciłem, ile mam, ile zarobiłem i co dokupić według własnych wag. Java 21 / Spring Boot oraz React / TypeScript / Vite, pakowane do jednego JAR-a.

## Korzystanie

- **Przegląd** pokazuje wpłaty, obecną wartość i zysk lub stratę. Filtry rachunków i inwestycji są rozwijane tylko w tym widoku; wybór „Razem” pokazuje pełne wspólne oszczędności. Na telefonie inwestycje mają karty, na komputerze tabelę. Historię wartości można rozwinąć osobno.
- **Dodaj zmianę** otwiera formularz z bezpośrednimi wyborami „Wpłaciłem”, „Kupiłem”, „Wypłaciłem”, „Sprzedałem” i „Aktualizuję wartość”. Właściciel wpisu jest zawsze widoczny. Przy pierwszym użyciu wpisz posiadane oszczędności i znaną kwotę wpłat; bez tej informacji wynik pozostaje nieznany. Zakup i sprzedaż przenoszą pieniądze między inwestycją a wybranym kontem. IKE i IKZE mogą zawierać obligacje oraz aktywa rynkowe. Wycena może wynosić zero.
- **Co dokupić?** zaczyna od budżetu i konkretnych kwot zakupów. Zapisane proporcje obligacji/akcji/opcjonalnego złota i podział samych akcji na rynki rozwinięte i rozwijające się są poniżej; edycję otwiera „Zmień mój plan”. Suma zakupów mieści się w budżecie, bez sprzedaży. Wagi muszą sumować się do 100% na obu poziomach. Niepoprawny lub niezapisany plan nie generuje podpowiedzi. Szczegóły pokazują obecne udziały, cele i brakujące kwoty.
- **Historia** łączy wpłaty, zakupy i wyceny chronologicznie. „Popraw” koryguje całe zdarzenie z powiązanymi saldami; „Cofnij zmianę” usuwa je po potwierdzeniu. Późniejsze operacje są przeliczane, a ręczne wyceny pozostają punktami odniesienia. Zmiana powodująca ujemne saldo jest odrzucana bez zapisu. Starsze niezależne operacje zachowują osobne wyceny oraz opłaty, podatki i notatki.
- **Ustawienia** obok nagłówka zawierają pobieranie i przywracanie kopii danych oraz informacje o aplikacji. Wszystkie trzy zakładki są dostępne także w widoku wspólnym.

### Znaczenie liczb

„Wpłaciłem” oznacza wpłaty zewnętrzne i zadeklarowany wkład początkowy. Kapitał w szczegółach obejmuje także zakupy i wpływy ze sprzedaży danej inwestycji. Dwie strony wewnętrznego transferu znoszą się w całym portfelu. Zakup nie tworzy zysku i nie tworzy dodatkowych pieniędzy.

Wynik = aktualna wartość − kapitał po wypłatach / sprzedażach. Wartość jest rzeczywistym saldem po kosztach, więc opłaty i podatki ujawnione w historii nie są odejmowane z wyniku drugi raz. Przy brakującym koszcie lub wycenie wynik pozostaje nieznany. Wynik miesiąca pozostaje nieznany również przy brakującej wycenie otwarcia lub wpisaniu posiadanych oszczędności w tym miesiącu. Wykres przedstawia zmianę wartości, obejmującą wpłaty i wypłaty; nie jest wykresem stopy zysku.

Stan początkowy można wykorzystać do uzupełnienia nieznanego kosztu istniejącej inwestycji. Jest to nowy punkt odniesienia na wskazaną datę: jego wkład zastępuje wcześniejsze przepływy tej inwestycji w obliczeniach. Nie zmienia historycznych wycen. Dla jednej inwestycji można zapisać jeden taki stan; poprawę wykonuje się przez cofnięcie poprzedniego i zapisanie prawidłowego.

Gotówka nie bierze udziału w wagach inwestycyjnych. PPK/PPO o nieznanym składzie pozostają osobno: są częścią oszczędności, lecz nie są automatycznie traktowane jako gotówka ani pomijane w łącznym majątku. Plan informuje o ich wyłączeniu. Plan określa kwoty zakupów, a nie liczbę jednostek instrumentu.

## Uruchomienie

Wymagane: Java 21, Maven, Node/npm do samodzielnej pracy nad frontendem. Produkcyjny Maven pobiera własne Node/npm i używa `npm ci`.

```bash
mvn clean package
java -jar backend/target/app-0.0.1-SNAPSHOT.jar
```

Aplikacja: http://localhost:8080. Dane zapisuje **H2 w trybie dyskowym**, w tabelach SQL z transakcjami; przetrwają restart JVM. Dla jednej instancji na QNAP-ie nie wymaga to osobnego serwera bazy. Przy wielu instancjach aplikacji wybierz PostgreSQL i osobny adapter.

`app.database.path` (lub `APP_DATABASE_PATH`) określa ścieżkę bazy **bez rozszerzenia**, domyślnie `./backend/data/portfolio`. H2 tworzy plik `portfolio.mv.db`. W Dockerze domyślna ścieżka to `/app/data/portfolio`; katalog `/app/data` musi być trwałym wolumenem używanym ponownie po odtworzeniu kontenera. Nie uruchamiaj dwóch JVM-ów na tej bazie; H2 blokuje dostęp drugiego procesu. Serwer TCP i konsola H2 nie są włączone.

Aplikacja zaczyna od pustej bazy; stare pliki JSON i wcześniejsza konfiguracja `APP_DATABASE_FILE` nie są używane. Przy starcie Liquibase aktualizuje schemat według `backend/src/main/resources/db/changelog/db.changelog-master.xml`. Kolejne uruchomienia zachowują dane H2. Przejście ze starej wersji nie wymaga zachowania danych ani automatycznej migracji JSON.

Kolejne zmiany schematu dodawaj jako nowe changesety Liquibase; nie zmieniaj migracji już wykonanych. Historia i sumy kontrolne są zapisywane w bazie.

Import/eksport JSON przez API pozostaje zgodny. Do kopii działającej aplikacji używaj eksportu; pliki H2 kopiuj po zatrzymaniu aplikacji, najlepiej cały katalog danych. Kwoty w SQL mają dokładność dwóch miejsc i maksymalnie 36 cyfr części całkowitej; przekroczenie zakresu wycofuje całą transakcję.

Rozwój:

```bash
mvn -pl backend spring-boot:run
```

W drugim terminalu:

```bash
cd frontend
npm ci
npm run dev
```

Vite działa na http://localhost:5173 i kieruje `/api` do serwera 8080. Produkcyjny JAR serwuje SPA oraz obsługuje bezpośrednie wejścia i odświeżenia tras.

## Wdrożenia na QNAP

Pipeline może automatycznie wdrażać po zielonym CI na `main` przez Tailscale i SSH do istniejącej usługi Docker Compose w Container Station. Buduje obraz z przetestowanego JAR-a, zachowuje wolumen danych, tworzy kopię przed aktualizacją i przy nieudanym starcie przywraca poprzedni obraz. Wdrożenia są domyślnie wyłączone do czasu skonfigurowania NAS-a i sekretów. Konfigurację oraz zasady ręcznej obsługi opisuje [instrukcja wdrożenia](deploy/README.md).

## API

| Metoda     | Ścieżka                                                                                                   | Znaczenie                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| GET        | `/api/users`, `/api/investment-types`, `/api/investment-subcategories`, `/api/investment-operation-types` | Słowniki                                                                    |
| GET/POST   | `/api/investments`                                                                                        | Wylistowanie lub niezależna wycena                                          |
| PUT/DELETE | `/api/investments/{id}`                                                                                   | Zmiana niezależnej wyceny / cofnięcie zapisu                                |
| GET/POST   | `/api/investment-operations`                                                                              | Historia lub niezależna operacja dla zgodności ze starszym API              |
| DELETE     | `/api/investment-operations/{id}`                                                                         | Cofnięcie operacji; dla nowych zdarzeń obejmuje wszystkie powiązania        |
| POST       | `/api/portfolio-changes`                                                                                  | Atomowy zapis operacji i wyceny, obu stron transferu lub stanu początkowego |
| PUT        | `/api/portfolio-changes/{id}` | Atomowa korekta całego zdarzenia z zachowaniem identyfikatora |
| DELETE     | `/api/portfolio-changes/{id}`                                                                             | Atomowe cofnięcie całego zdarzenia                                          |
| GET        | `/api/portfolio-performance?owner=jakub`                                                                  | Wynik; opcjonalne `type`, `subcategory`, `date`                             |
| GET/PUT    | `/api/portfolio-plans?scope=jakub`                                                                        | Plan osoby; `scope=household` dla wspólnego planu                           |
| GET        | `/api/database/export`                                                                                    | Kopia całych danych i planów                                                |
| POST       | `/api/database/import`                                                                                    | Zastąpienie danych kopią (`multipart`, pole `file`)                         |
| GET        | `/actuator/health`                                                                                        | Stan serwera                                                                |

Przykład nowej wpłaty (UUID `requestId` identyfikuje zamiar, ponowienie używa tego samego UUID):

```json
{
  "requestId": "ddc36cab-a704-4a38-b5ac-e39711ab5bb9",
  "kind": "DEPOSIT",
  "owner": "jakub",
  "type": "KONTO_BANKOWE",
  "date": "2026-10-10",
  "amountPln": 1000
}
```

`kind`: `INITIAL`, `DEPOSIT`, `WITHDRAWAL`, `BUY`, `SELL`, `VALUATION`. `INITIAL` wymaga `valuePln` i kosztu `amountPln` (może wynosić zero); `VALUATION` wymaga `valuePln`. `BUY`/`SELL` wymagają `cashType` (`KONTO_BANKOWE` lub `KONTO_OSZCZEDNOSCIOWE`). Nowe zmiany nie przyjmują dat przyszłych. Serwer wylicza saldo na datę operacji; nie ufa saldu z przeglądarki. Dla transferu kwota obu stron jest taka sama.

Odpowiedź: `id`, `nextValue`, `kind`, `atomic: true`. Powtórzenie tego samego zamiaru nie dopisuje operacji. Zmiana treści pod użytym identyfikatorem jest odrzucana. Przeglądarka zachowuje identyfikator niepewnej próby również po odświeżeniu tej samej karty; nowy, celowy zapis po sukcesie otrzymuje nowy identyfikator.

W wyniku `contributedCapitalPln`, `nominalResultPln`, `resultAfterFeesAndTaxesPln` i `monthlyResultPln` mogą być `null`. `depositsTotalPln` oraz `withdrawalsTotalPln` ujawniają znane przepływy. `xirrStatus=INCOMPLETE_HISTORY` oznacza brak podstaw do obliczenia stopy. UI nie zamienia `null` na zero.

Kopia JSON w wersji 2 zawiera wyceny, operacje z `groupId` oraz plany zakresów. Czytanie poprzedniej wersji 1 i starszej tablicy wycen jest zachowane. Nie odgadujemy powiązań starych, niezależnych operacji z wycenami. Starych rekordów nie przeliczamy automatycznie na nowy model transakcji.

Aplikacja nie ma logowania ani autoryzacji: każdy klient z dostępem do serwera ma dostęp do danych i operacji administracyjnych. Ogranicz dostęp sieciowy do zaufanych klientów. Domyślnie CORS nie dopuszcza obcych originów.

## Testy

Pipeline [CI](.github/workflows/frontend.yml) automatycznie sprawdza każdy push i pull request:

- formatowanie frontendu i workflow, lint, TypeScript i białe znaki w diffie;
- testy jednostkowe i architektury frontendu oraz testy komponentów i dostępności;
- wszystkie testy backendu: domena, use case’y, kontrakty repozytoriów, HTTP i architektura;
- produkcyjny build frontendu i kompletny JAR aplikacji;
- testy Chromium na komputerze i telefonie, uruchamiane na JAR-ze z tymczasową bazą;
- testy skryptu wdrożenia na QNAP oraz rzeczywistego kontenera: zdrowie, zapis i zachowanie danych po restarcie.

Raporty backendu, raport HTML Playwright oraz zrzuty ekranu i ślady błędów przeglądarki są dostępne jako artefakt `verification-reports` przez 14 dni. Przed mergem wymagamy zielonego CI dla bieżącego commita. Nie trzeba powtarzać całego zestawu ręcznie po jego zaliczeniu; lokalnie uruchamiaj wybrane kontrole potrzebne do pracy lub diagnozy. Workflow można też uruchomić ręcznie z GitHub Actions.

Pełny zestaw komend do lokalnej diagnostyki:

```bash
mvn clean package
cd frontend
npm ci
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:browser
```

Testy obejmują wynik bez kosztu, wpłaty i transfery bez pozornego zysku, opłaty bez podwójnego odliczenia, brak salda otwarcia, cofanie i historyczne przeliczenia, retry (również współbieżny i po utracie odpowiedzi), atomowość błędów zapisu, kopie i plany, budżet zakupów z zaokrągleniem groszy, niepoprawne wagi, filtry i widoczność zakładek, obsługę błędów oraz dostępność. Granice warstw opisują `backend/ARCHITECTURE.md`, `frontend/ARCHITECTURE.md` i testy architektury backendu.

Testy przeglądarkowe uruchamiają osobny serwer na porcie 8082 z tymczasową bazą. Sprawdzają Chromium na ekranie komputera i telefonu; nie zmieniają lokalnej bazy użytkownika. Wszystkie te kontrole są skonfigurowane w GitHub Actions.

W planie zakupów „Akcje i ETF-y” obejmują złoty ETF. Domyślny podział tej części to 50% złota, 35% rynków rozwiniętych i 15% wschodzących; przy udziale części akcyjnej 50% cel złota wynosi 25% całego planu. Starsze zapisane plany są dostosowywane do tego podziału z zachowaniem udziału obligacji oraz proporcji między rynkami. API planu wymaga `allocationVersion: 2`; szczegóły migracji opisuje `docs/domain/README.md`.

Zapis zmian działa również przez HTTP w sieci lokalnej (np. QNAP w Tailscale). Generowanie identyfikatorów żądań i skrótów do ponawiania zapisu nie wymaga HTTPS ani funkcji `crypto.randomUUID` / `crypto.subtle`. Testy przeglądarkowe obejmują osobny kontekst HTTP, ponieważ `localhost` udostępnia te funkcje i sam nie odtwarza warunków połączenia z NAS-em.
