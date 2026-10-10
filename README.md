# Oszczędności

Aplikacja do kontroli oszczędności: ile wpłaciłem, ile mam, ile zarobiłem i co dokupić według własnych wag. Java 21 / Spring Boot oraz React / TypeScript / Vite, pakowane do jednego JAR-a.

## Korzystanie

- **Podsumowanie** zaczyna od całego portfela. Filtr osoby, rachunku i rodzaju inwestycji obejmuje wartość, wynik i historię wartości. Tabela pokazuje wkład po wypłatach, wartość, wynik i datę każdej inwestycji.
- **Aktualizacja** pozwala wpisać stan początkowy (z kosztem lub bez znanego kosztu), wpłatę, wypłatę, wycenę lub zakup/sprzedaż finansowane wybranym kontem. IKE i IKZE mogą zawierać obligacje oraz aktywa rynkowe. Wycenę można ustawić na zero.
- **Co dokupić?**: najpierw proporcje obligacje/akcje/opcjonalne złoto, potem podział samych akcji na rynki rozwinięte i rozwijające się. Podaj budżet; suma zakupów nie przekracza go, a plan nie wymaga sprzedaży. Wagi muszą sumować się do 100% na obu poziomach. Wagi zapisujemy dopiero po zatwierdzeniu.
- **Historia** pozwala cofnąć całe zdarzenie z jego powiązanymi saldami. Ręczne wyceny pozostają historycznymi punktami odniesienia. Nie można cofnąć zdarzenia, jeśli spowodowałoby to ujemne saldo późniejszej operacji; najpierw popraw późniejsze zdarzenia.
- **Ustawienia** zawierają kopię i przywracanie danych, a dla gospodarstwa również dotychczasowy wspólny cel.

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

Aplikacja: http://localhost:8080. Baza JSON: `backend/data/investment-entries.json`; można zmienić `app.database.file`. Nie uruchamiaj dwóch procesów na tym samym pliku: blokada koordynuje tylko jeden JVM.

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

## API

| Metoda     | Ścieżka                                                                                                   | Znaczenie                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| GET        | `/api/users`, `/api/investment-types`, `/api/investment-subcategories`, `/api/investment-operation-types` | Słowniki                                                                    |
| GET/POST   | `/api/investments`                                                                                        | Wylistowanie lub niezależna wycena                                          |
| PUT/DELETE | `/api/investments/{id}`                                                                                   | Zmiana niezależnej wyceny / cofnięcie zapisu                                |
| GET/POST   | `/api/investment-operations`                                                                              | Historia lub niezależna operacja dla zgodności ze starszym API              |
| DELETE     | `/api/investment-operations/{id}`                                                                         | Cofnięcie operacji; dla nowych zdarzeń obejmuje wszystkie powiązania        |
| POST       | `/api/portfolio-changes`                                                                                  | Atomowy zapis operacji i wyceny, obu stron transferu lub stanu początkowego |
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
