# SPEC: Bitcoin w portfelu

Status: **zaakceptowana — zaimplementowana, zweryfikowana lokalnie**.

Data: 2026-11-16. Podejście: Specification-Driven Development (SDD).

## Aktualizacja integracyjna po zmianach na main

Podczas scalania main zawiera już wspólny, płaski plan (specyfikacja rebalansu).
Poniższe ustalenia zastępują dwupoziomowe zasady BTC-04/BTC-05 i przykład kontraktu:

- Jeden wspólny plan household obejmuje obligacje, złoto, akcje rozwinięte,
  akcje wschodzące i Bitcoin. Ich udziały sumują się dokładnie do 100%.
- bitcoin jest bezpośrednim udziałem całego planu, domyślnie 0%. Przykład:
  bonds=50, gold=20, developed=17.5, emerging=7.5, bitcoin=5.
  Budżet 1000 zł daje zakupy 500/200/175/75/50 zł.
- API planu używa allocationVersion 4 i dziesiętnych ciągów znaków;
  wymaga pola bitcoin i odrzuca zapisy starszych klientów.
- Kopie wersji alokacji 3 otrzymują bitcoin=0. Wersje 1/2 przechodzą istniejącą
  migrację do płaskiego planu i otrzymują bitcoin=0. Format kopii pozostaje 2.
- Nowa migracja 004-bitcoin następuje po 003-shared-flat-plan i dodaje dokładną
  kolumnę NUMERIC(100,50). Istniejące migracje i archiwum planów są zachowane.
- Bitcoin bierze udział również w rebalansie, wykresie odchyleń i wyborze aktywów.
- Preferencje lokalne nadal migrują do wersji 3 z wagą BITCOIN=0.

## 1. Cel i granica akceptacji

Użytkownik może ewidencjonować inwestycję w Bitcoin analogicznie do złota i akcji:
zapisać stan początkowy, zakup, sprzedaż i wycenę, zobaczyć historię i wynik oraz
uwzględnić Bitcoin we własnym planie zakupów.

Ten dokument jest proponowanym kontraktem funkcji. Zgodnie z poleceniem użytkownika
po jego przygotowaniu prace zatrzymują się do jawnej akceptacji. Przed akceptacją
nie zmieniamy kodu aplikacji, schematu bazy ani testów zachowania. Po akceptacji
implementacja i testy mają realizować poniższe wymagania i kryteria odbioru.

## 2. Punkt wyjścia i proponowane decyzje

Obecnie złoto i rynki akcji są podkategoriami rachunków `GIELDA`, `IKE` i `IKZE`.
Formularz „Dodaj zmianę”, historia, obliczanie wyników oraz tabele i karty inwestycji
są wspólne. Plan „Co dokupić?” ma dwa poziomy: obligacje i część „Akcje i ETF-y”,
a wewnątrz tej części złoto, rynki rozwinięte i rynki wschodzące.

Propozycja do akceptacji:

- Bitcoin jest podkategorią `BITCOIN` z etykietą **Bitcoin (BTC)**, dostępną w tych
  samych rachunkach co złoto: `GIELDA`, `IKE`, `IKZE`. Typ rachunku wskazuje miejsce
  ewidencji; aplikacja nie wybiera ani nie weryfikuje dostępności instrumentów u brokera.
- Bitcoin ma osobną globalną klasę aktywów `BITCOIN`, aby dało się odróżnić jego
  wartość od złota, akcji i gotówki.
- W planie zakupów Bitcoin jest czwartym składnikiem obecnej części akcyjnej.
  Jej etykieta zmienia się na **Akcje, ETF-y i Bitcoin**; opis pól wyjaśnia, że
  wagi wewnętrzne odnoszą się do tej części planu.
- Domyślny cel Bitcoina wynosi **0%**. Użytkownik sam ustala dodatnią wagę,
  zmniejszając pozostałe udziały w tej części do łącznych 100%.
- Kwoty, koszt i wyceny są podawane ręcznie w PLN, tak jak dla pozostałych inwestycji.
  Funkcja nie obejmuje kursów na żywo, liczby BTC/satoshi, integracji z giełdą lub
  portfelem kryptowalutowym ani wykonywania rzeczywistych transakcji.

## 3. Wymagania funkcjonalne

### BTC-01 — Wybór i identyfikacja inwestycji

1. Po wybraniu `GIELDA`, `IKE` lub `IKZE` formularz pokazuje „Bitcoin (BTC)” obok
   złota i rynków akcji, z użyciem tych samych kontrolek i stylów.
2. Bitcoin nie jest dozwoloną podkategorią obligacji, kont bankowych,
   kont oszczędnościowych, PPK ani PPO. Frontend i backend sprawdzają tę samą regułę.
3. Tożsamość pozycji nadal stanowi właściciel, typ rachunku i podkategoria.
   Bitcoin różnych właścicieli lub na różnych rachunkach pozostaje odrębnymi pozycjami.
4. Słownik API `/api/investment-subcategories?type=...` zwraca Bitcoin dla
   obsługujących go rachunków.

### BTC-02 — Zmiany, wyceny i historia

1. Pierwszy wpis Bitcoina używa „Wpisuję stan początkowy”, z wartością co najmniej
   zero i opcjonalnie znanym kosztem. Nieznany koszt nie staje się kosztem zerowym.
2. Istniejąca pozycja, również z zerową wartością, korzysta z dotychczasowych akcji:
   wpłata, zakup, wypłata, sprzedaż i wpisanie obecnej wartości.
3. Zakup i sprzedaż zapisują obie strony transferu między Bitcoinem a wybranym
   kontem atomowo. Sam transfer nie zwiększa łącznego majątku ani zysku portfela.
4. Wycena aktualizuje wartość pozycji bez zmiany wniesionego kapitału.
5. Historia pokazuje nazwę Bitcoin (BTC). Poprawa i cofnięcie zdarzenia obejmują
   powiązane zapisy oraz przeliczenie późniejszych sald na obecnych zasadach.
6. Brak środków lub korekta prowadząca do ujemnego salda odrzuca całą zmianę.
   Powtórzenie żądania z tym samym identyfikatorem nie tworzy kolejnego zakupu.

### BTC-03 — Prezentacja i wyniki

1. Bitcoin pojawia się w tabeli na komputerze i na karcie na telefonie, z tymi samymi
   polami, akcjami i hierarchią wizualną co złoto i akcje.
2. Dostępne filtry rachunku i podkategorii obejmują Bitcoin w przeglądzie i historii.
3. Wartość, wkład, wynik i historia wartości obejmują Bitcoin w portfelu właściciela
   i w widoku „Razem”. Brak kosztu zachowuje dotychczasową prezentację nieznanego wyniku.
4. Globalne zestawienia alokacji pokazują osobną klasę Bitcoin (BTC), a zestawienia
   podkategorii rynkowych uwzględniają go w swoim łącznym saldzie.
5. Formularz zachowuje obsługę klawiatury, etykiety dostępności, fokus, stany
   zapisywania i błędów. Dodanie opcji nie powoduje poziomego przewijania strony.

### BTC-04 — Plan „Co dokupić?”

1. Zapisany plan, edytor, porównanie alokacji oraz propozycje zakupów obsługują Bitcoin.
2. Pierwszy poziom nadal spełnia `bonds + stocks = 100`. Pole `stocks` jest techniczną
   nazwą części „Akcje, ETF-y i Bitcoin”. Drugi poziom spełnia
   `gold + developed + emerging + bitcoin = 100`.
3. Domyślny plan ma `bonds=50`, `stocks=50`, `gold=50`, `developed=35`,
   `emerging=15`, `bitcoin=0`. Dodanie funkcji nie zmienia zapisanych proporcji.
4. Docelowy udział Bitcoina w całym planie to `stocks × bitcoin / 100`.
   Edytor i zapisany plan pokazują zarówno udział wewnętrzny, jak i całkowity.
5. Bitcoin z wagą 0% i dodatnią wartością nadal jest uwzględniany w wartości
   inwestycji oraz porównaniu alokacji; nie otrzymuje propozycji dokupienia.
6. Zakupy są nieujemne, zaokrąglone do groszy, a ich suma dla poprawnego budżetu
   odpowiada budżetowi. Algorytm uwzględnia obecne pozycje i nie wymaga sprzedaży.
7. Niepoprawny lub niezapisany plan nie generuje propozycji zakupów. Wszystkie wagi
   są skończonymi liczbami od 0 do 100, z dotychczasową tolerancją sumy 100%.
8. Gotówka i PPK/PPO o nieznanym składzie pozostają poza proporcjami planu.

Przykład odbiorowy dla pustego portfela i budżetu 1000 zł:

| Składnik | Waga w swojej części | Waga całego planu | Zakup |
| --- | ---: | ---: | ---: |
| Obligacje | 50% całego planu | 50% | 500 zł |
| Złoto | 40% części rynkowej | 20% | 200 zł |
| Rynki rozwinięte | 35% części rynkowej | 17,5% | 175 zł |
| Rynki wschodzące | 15% części rynkowej | 7,5% | 75 zł |
| Bitcoin | 10% części rynkowej | 5% | 50 zł |

Część „Akcje, ETF-y i Bitcoin” stanowi tu 50% całego planu.

### BTC-05 — Zapis, migracja i kopie danych

1. Wyceny i operacje używają istniejących endpointów oraz pól z nową wartością
   `subcategory: "BITCOIN"`. Dane przechodzą walidację przy zapisie i imporcie.
2. H2 zachowuje Bitcoin po ponownym otwarciu bazy. Nowy changeset Liquibase dodaje
   do `portfolio_plans` pole `bitcoin` z wartością domyślną 0. Istniejących changesetów
   nie zmieniamy; ponowne uruchomienie nie zmienia wag.
3. API planu przechodzi na `allocationVersion: 3`; GET zwraca pełny plan, a PUT
   wymaga wersji 3 i liczbowego pola `bitcoin`. Starszy zapis zostaje odrzucony,
   aby nie wyzerować niewidocznego dla starego klienta udziału Bitcoina.
4. Format całej kopii danych pozostaje `formatVersion: 2`; plan ma niezależną wersję
   alokacji. Import planu bez wersji lub z wersją 1 stosuje istniejącą migrację
   złota i dodaje `bitcoin=0`. Wersja 2 zachowuje wszystkie wagi i dodaje `bitcoin=0`.
   Wersja 3 wymaga pola `bitcoin` i zachowuje jego wartość. Nieznane wersje oraz
   niepoprawne plany są odrzucane przed zastąpieniem danych.
5. Eksport i ponowny import zachowują wyceny, operacje, grupy transferów i plany
   z Bitcoinem. Starsza aplikacja może odrzucić nową kopię; nie zakładamy możliwości
   bezstratnego odczytu nowych danych przez poprzednią wersję.
6. Preferencje lokalnej alokacji przechodzą na wersję 3. Migracja wersji 1, 2
   i dawnych osobnych kluczy dodaje wagę `BITCOIN=0` do globalnych i rynkowych
   alokacji, zachowując pozostałe wartości. Jawnie niepoprawne wartości nadal
   powodują błąd walidacji.

Przykładowy kontrakt GET/PUT planu:

```json
{
  "allocationVersion": 3,
  "bonds": 50,
  "stocks": 50,
  "gold": 40,
  "developed": 35,
  "emerging": 15,
  "bitcoin": 10
}
```

## 4. Kryteria akceptacji i plan testów

Każde kryterium musi zostać powiązane z testem w implementacji. Nazwy poniżej są
planowanymi scenariuszami, nie deklaracją już wykonanych testów.

| ID | Scenariusz i oczekiwany wynik | Poziom weryfikacji |
| --- | --- | --- |
| AC-01 | Wybór Giełda/IKE/IKZE udostępnia Bitcoin; niewłaściwa para typ–podkategoria zostaje odrzucona. | Domena frontend/backend, API słownika, komponent formularza |
| AC-02 | Nowy Bitcoin zaczyna od stanu początkowego; zapis 0 zł umożliwia późniejszy zakup. Wybór innego właściciela lub rachunku nie dziedziczy tego stanu. | Komponent i test przeglądarkowy |
| AC-03 | Konto ma 2000 zł, Bitcoin 0 zł. Zakup za 500 zł pozostawia 1500 zł na koncie i 500 zł w Bitcoinie, łącznie 2000 zł; ponowienie żądania nie dubluje transferu. | Use case/API z H2 |
| AC-04 | Przy stanie początkowym 0 zł ze znanym kosztem 0 zł i bez innych operacji zakup za 500 zł oraz wycena na 600 zł dają wynik Bitcoina +100 zł. Sprzedaż za 200 zł zwiększa konto o 200 zł i zmniejsza saldo Bitcoina o 200 zł, bez zwiększenia majątku przez transfer. | Domena wyników i API |
| AC-05 | Korekta i cofnięcie zakupu obejmują obie strony. Niedozwolone ujemne saldo odrzuca całość bez częściowego zapisu. | Use case/API z H2 |
| AC-06 | Bitcoin widać w przeglądzie, filtrach, historii, wynikach właściciela i „Razem”; nieznany koszt pozostaje nieznany. | Komponent i test przeglądarkowy |
| AC-07 | Pusty portfel i plan z przykładu dają zakupy 500/200/175/75/50 zł; suma wynosi 1000 zł. | Jednostkowy test planowania |
| AC-08 | Przy dodatnim saldzie Bitcoina i celu 0% jego wartość wchodzi do udziałów, a proponowany zakup wynosi 0 zł. | Jednostkowy test planowania i komponent |
| AC-09 | Edycja i zapis dodatniej wagi Bitcoina pokazują poprawne udziały; po ponownym odczycie plan jest identyczny. Niepoprawna suma, ujemne wagi i wartości niefinitywne są odrzucane. | Domena, adapter HTTP, komponent, API |
| AC-10 | Migracja bazy, planów wersji 2 i preferencji dodaje Bitcoin z wagą 0 bez zmiany wcześniejszych wag. Plan bez wersji lub w wersji 1 przechodzi dotychczasową migrację wag złota i otrzymuje bitcoin=0. Niepoprawny import nie zmienia danych. | JDBC/Liquibase, adapter JSON, adapter storage |
| AC-11 | Dane Bitcoina przetrwają ponowne otwarcie H2 oraz eksport/import; PUT starej wersji planu nie nadpisuje nowego planu. | Integracja persistence/API |
| AC-12 | Na telefonie i komputerze działają wybór, zapis i odczyt Bitcoina; kontrolki mają etykiety, fokus i obsługę klawiatury, bez poziomego przewijania strony. | Komponent/accessibility, test przeglądarkowy desktop/mobile |

## 5. Plan implementacji po akceptacji

1. Rozszerzyć klasyfikację domenową frontend/backend i testy zgodności kategorii
   (BTC-01). Zachować zależności Clean Architecture.
2. Rozszerzyć plan domenowy, zapis JDBC, migrację Liquibase, wersjonowanie API
   i kopii oraz adapter preferencji (BTC-04, BTC-05).
3. Dodać etykiety, opcję formularza, obsługę globalnej alokacji i prezentację planu;
   wykorzystać istniejące komponenty tabel, kart i historii (BTC-02–BTC-04).
4. Przeprowadzić scenariusze AC-01–AC-12, uaktualnić README, dokumentację domeny
   i przewodniki architektury w zakresie nowych kontraktów.
5. W specyfikacji zapisać odnośniki do testów i wynik weryfikacji. Uruchomić właściwe
   testy frontend/backend, typecheck, lint, format, build i `git diff --check`.
   Przed scaleniem wymagane jest zielone CI dla aktualnego commita.

## 6. Stan realizacji

- [x] Inspekcja obecnej obsługi złota, akcji, planów i trwałości danych.
- [x] Przygotowanie propozycji specyfikacji oraz kryteriów odbioru.
- [x] Akceptacja użytkownika — polecenie wdrożenia na podstawie specyfikacji.
- [x] Implementacja.
- [ ] Testy kryteriów odbioru i aktualizacja dokumentacji wdrożonej funkcji.

Implementacja rozszerza istniejące formularze, zestawienia i operacje. Testy Bitcoina: `frontend/test/unit/bitcoin.test.js`, `PortfolioPlanTest`, `PortfolioPlanMigrationTest`; regresje formularzy i planów: `frontend/test/component/SavingsRegressions.test.tsx`. Pełna weryfikacja integracyjna jest wymagana przed scaleniem.


### Wyniki weryfikacji lokalnej

- Backend: 88 testów, bez błędów; Maven test oraz package.
- Frontend: 60 testów jednostkowych (59 w pełnym przebiegu i dodatkowy test migracji preferencji), 79 testów komponentowych.
- TypeScript, ESLint, Prettier i build produkcyjny: poprawne.
- Scenariusz przeglądarkowy Bitcoina: desktop i mobile — 2 testy zakończone poprawnie; `frontend/test/browser/httpPersistence.spec.ts`, zapis stanu, wynik po odświeżeniu, plan wersji 3 i odrzucenie starego klienta.
- Kryteria operacji atomowych korzystają z istniejących testów ogólnych zdarzeń; nie przeprowadzono osobnej ręcznej macierzy wszystkich operacji Bitcoina.
- Walidacja CI i wdrożenie na serwer pozostają osobnymi krokami.
