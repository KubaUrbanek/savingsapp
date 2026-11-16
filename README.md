# Oszczędności

Aplikacja do kontroli oszczędności: ile wpłaciłem, ile mam, ile zarobiłem i co dokupić według własnych wag. Java 21 / Spring Boot oraz React / TypeScript / Vite, pakowane do jednego JAR-a.

## Korzystanie

- **Przegląd** pokazuje najpierw wartość oszczędności, wpłaty łącznie i wynik. Rozwijane „Filtruj inwestycje” wybiera konta/produkty lub rodzaje inwestycji; wybory, okres wykresu i kontekst są pamiętane osobno dla każdej osoby i Razem. Na telefonie wykresy są początkowo zwinięte. Lista inwestycji ma karty na telefonie i tabelę na komputerze. Brak danych, błąd sieci i pusty filtr są osobnymi stanami. Pełny kontrakt: [SDD początkującego użytkownika](docs/specs/beginner-ux-sdd.md).
- **Dodaj wpis** zaczyna od zamiaru: posiadane oszczędności, wpłata, zakup lub aktualizacja wartości; wypłata i sprzedaż są w „Więcej działań”. Produkt i osoba w Razem wymagają jawnego wyboru. Sumę wpłat można pozostawić nieznaną. Zakup nowej inwestycji nie wymaga fikcyjnego stanu początkowego; brak konta źródłowego można uzupełnić z zachowaniem szkicu. Zmieniony formularz ostrzega przed zamknięciem. Kwoty obsługują polski przecinek bez cichego zaokrąglania.
- **Co dokupić?** pokazuje jeden wspólny plan: obligacje 50%, złoto 25%, akcje rynków rozwiniętych 17,5%, wschodzących 7,5%. Cztery udziały sumują się do 100%. Zmiana osoby wybiera inwestycje do obliczeń. Zakupy wyrównują udziały portfela bez sprzedaży; budżet jest dowolną symulowaną kwotą i nie zapisuje transakcji.
- **Historia** pokazuje najnowsze wpisy w grupach dat, opisane kwoty i obie strony transferu. „Znajdź wpis” i filtr okresu/działania pomagają odnaleźć zdarzenie. „Edytuj” koryguje całe zdarzenie; „Usuń wpis” wymaga potwierdzenia z tymi samymi wartościami. Późniejsze salda są przeliczane atomowo, a samodzielne wyceny pozostają punktami odniesienia.
- **Ustawienia** zawierają pobranie kopii, podgląd i potwierdzone przywrócenie kopii oraz pomoc „Jak korzystać”. Obejmują obie osoby i wspólny plan. Powrót zachowuje poprzedni widok i kontekst.

### Znaczenie liczb

„Wpłaty łącznie” oznacza wpłaty zewnętrzne i zadeklarowany wkład początkowy. Kapitał w szczegółach obejmuje także zakupy i wpływy ze sprzedaży danej inwestycji. Dwie strony wewnętrznego transferu znoszą się w całym portfelu. Zakup nie tworzy zysku i nie tworzy dodatkowych pieniędzy.

Wynik = aktualna wartość − kapitał po wypłatach / sprzedażach. Wartość jest rzeczywistym saldem po kosztach, więc opłaty i podatki ujawnione w historii nie są odejmowane z wyniku drugi raz. Przy brakującym koszcie lub wycenie wynik pozostaje nieznany. Wynik miesiąca pozostaje nieznany również przy brakującej wycenie otwarcia lub wpisaniu posiadanych oszczędności w tym miesiącu. Wykres przedstawia zmianę wartości, obejmującą wpłaty i wypłaty; nie jest wykresem stopy zysku.

Stan początkowy można wykorzystać do uzupełnienia nieznanego kosztu istniejącej inwestycji. Jest to nowy punkt odniesienia na wskazaną datę: jego wkład zastępuje wcześniejsze przepływy tej inwestycji w obliczeniach. Nie zmienia historycznych wycen. Dla jednej inwestycji można zapisać jeden taki stan; „Edytuj” w historii poprawia go atomowo. Uzupełnienie brakujących wpłat koryguje wybraną wycenę, zachowując jej wartość i datę.

Przegląd obejmuje wszystkie oszczędności. Kalkulator liczy wyłącznie obligacje, złoto i akcje, również w IKE/IKZE. Budżet dodaje dokładnie raz do tych inwestycji; nie dodaje salda gotówki. Plan określa kwoty zakupów, a nie liczbę jednostek instrumentu.

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
| GET/PUT | `/api/portfolio-plans` | Jeden wspólny plan; `allocationVersion: 3`; GET bez planu: 204. Parametr `scope` zachowano dla zgodności adresów, nie wybiera osobnego planu. |
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

Kopia JSON w wersji 2 zawiera wyceny, operacje z `groupId` oraz jeden plan `household`. Czytanie wersji 1, starszej tablicy wycen i planów alokacji v1/v2 jest zachowane. Podgląd kopii niczego nie zmienia. Stara kopia bez planu Razem wymaga jawnego wyboru planu przed zatwierdzeniem. Import pozostaje atomowy.

Aplikacja nie ma logowania ani autoryzacji: każdy klient z dostępem do serwera ma dostęp do danych i operacji administracyjnych. Ogranicz dostęp sieciowy do zaufanych klientów. Domyślnie CORS nie dopuszcza obcych originów.

## Testy

Pipeline [CI](.github/workflows/frontend.yml) automatycznie sprawdza każdy push i pull request:

- formatowanie frontendu i workflow, lint, TypeScript i białe znaki w diffie;
- testy jednostkowe i architektury frontendu oraz testy komponentów i dostępności;
- wszystkie testy backendu: domena, use case’y, kontrakty repozytoriów, HTTP i architektura;
- produkcyjny build frontendu i kompletny JAR aplikacji;
- testy Chromium na komputerze i telefonie, uruchamiane na JAR-ze z tymczasową bazą;
- testy skryptu wdrożenia na QNAP oraz rzeczywistego kontenera: zdrowie, zapis i zachowanie danych po restarcie.

Zadanie `verify` korzysta z Ubuntu 24.04, obsługiwanego przez przypiętą wersję Playwright. Aktualizację systemu runnera należy sprawdzać razem ze zgodnością Playwright i instalacją Chromium.

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

Plan alokacji v3 jest płaski. Udziały są dokładnymi dziesiętnymi tekstami w API i kopiach, aby migracja nie traciła precyzji. Migracja H2 `003-shared-flat-plan` wybiera dotychczasowy plan Razem i mnoży jego podudziały przez wielkość dawnej części akcyjnej. Plany osobiste archiwizuje w tabeli `archived_personal_plans`. Brak planu Razem nie tworzy automatycznego zapisu domyślnego. Szczegóły: `docs/domain/README.md`, checklista E01–E32: `docs/specs/beginner-ux-implementation.md`.

Zapis zmian działa również przez HTTP w sieci lokalnej (np. QNAP w Tailscale). Generowanie identyfikatorów żądań i skrótów do ponawiania zapisu nie wymaga HTTPS ani funkcji `crypto.randomUUID` / `crypto.subtle`. Testy przeglądarkowe obejmują osobny kontekst HTTP, ponieważ `localhost` udostępnia te funkcje i sam nie odtwarza warunków połączenia z NAS-em.

W „Razem / Przegląd” inwestycje są sumowane między osobami i rachunkami (np. złoto
w IKE i IKZE tworzy jeden wiersz). Szczegóły pokazują wspólny wkład i zakres dat wycen.
Brak danych o wpłatach części inwestycji pozostawia jej wspólny wynik nieznany.
Zmiana wartości i uzupełnianie wpłat są dostępne po wybraniu konkretnej osoby.
Specyfikacja zmiany: [wspólny przegląd (SDD)](docs/specs/household-overview.md).

Podgląd importu: POST `/api/database/preview` z plikiem multipart `file`. Zwraca rozpoznany format, liczbę wycen/operacji, osoby i obecność wspólnego planu, po pełnej walidacji bez zapisu. Dzień biznesowy formularzy i domeny: Europe/Warsaw.

### Rebalans obecnego portfela

W zakładce „Co dokupić?” wybierz „Rebalans obecnego portfela”. Widok pokazuje obecne odchylenia w PLN i punktach procentowych oraz co sprzedać i kupić bez dopłaty według zapisanego wspólnego planu, dla aktualnie wybranej osoby lub razem. Sprzedaż finansuje zakupy co do grosza. Gotówka oraz PPK/PPO pozostają poza proporcjami. Kwoty wynikają z zapisanych wycen, przed kosztami i podatkami; podgląd nie zapisuje transakcji.

Widok odchyleń porównuje obecne udziały z celami na poziomych słupkach z wartościami w PLN i pp. W rebalansie można odznaczyć dowolną kategorię (np. obligacje lub złoto). Odznaczone aktywa zachowują wartość; wybrane aktywa są rebalansowane według ich wzajemnych proporcji w zapisanym planie. Rebalans częściowy nie musi przywrócić proporcji całego portfela.


Bitcoin integration: the shared flat household plan includes bitcoin as a direct percentage of the entire plan (default zero). Allocation API/version 4 requires exact decimal weights including bitcoin. Backup allocation versions 1–3 migrate with bitcoin=0; backup format remains 2. Liquibase 004-bitcoin adds NUMERIC(100,50) after the existing shared-plan migration. Bitcoin participates in purchases and selective rebalancing.
Specyfikacja kolejnej zmiany (implementacja osobno): [SDD uporządkowania ekranu „Plan portfela”](docs/specs/2026-11-16-planning-screen-order.md).
