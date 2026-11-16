# SDD: rebalans obecnego portfela w „Co dokupić?”

Status: **zaakceptowana 2026-11-16; zaimplementowana; oczekuje na pełne CI i scalenie**.

Data: 2026-11-16. SDD oznacza tutaj pracę od specyfikacji zachowania i kryteriów akceptacji do implementacji oraz weryfikacji. Zgodnie z prośbą użytkownika implementacja rozpocznie się dopiero po akceptacji tej specyfikacji.

## Dostosowanie do aktualnej gałęzi głównej

W trakcie realizacji połączono zmiany z `main` zawierające PR #102 i #104. Aktualny produkt używa jednego wspólnego planu `allocationVersion: 3`, z czterema udziałami całego planu (obligacje, złoto, rozwinięte, wschodzące). Rebalans korzysta z tego zapisanego planu, ale stan inwestycji bierze z aktualnie wybranego zakresu osoby lub gospodarstwa. Zachowuje istniejącą edycję wspólnego planu i osobne budżety dokupowania dla zakresów. Opis v2 poniżej dokumentuje pierwotny stan; w implementacji i testach celów obowiązuje v3. Własności liczbowe, odchylenia oraz rebalans bez dopłaty pozostają zgodne z kryteriami.

## 1. Cel

W zakładce „Co dokupić?” użytkownik ma widzieć obecne odchylenia od swojego zapisanego planu oraz kwoty sprzedaży i zakupu, które doprowadzą obecny portfel do docelowych proporcji. Rebalans ma działać bez dopłacania nowych pieniędzy. Dotychczasowe dokupowanie za podany budżet pozostaje dostępne.

„Wymagania portfela” oznaczają zapisane przez użytkownika docelowe udziały, a nie nową strategię inwestycyjną ustalaną przez aplikację.

## 2. Zakres i źródło danych

1. Plan obowiązuje dla aktualnie wybranej osoby albo dla „Wspólnych oszczędności”. Wspólny portfel korzysta ze wspólnego planu; plan osoby dotyczy tylko jej inwestycji.
2. Obliczenia obejmują pełny portfel wybranego zakresu. Filtry w zakładce „Przegląd” nie zawężają planowania.
3. Stan portfela pochodzi z ostatniej zapisanej wyceny każdej kombinacji właściciel / rodzaj inwestycji / podkategoria. Obowiązuje dotychczasowe rozstrzyganie wycen z tej samej daty według czasu utworzenia. Wyceny z przyszłości nie wchodzą do obecnego stanu.
4. Źródłem celów jest istniejący zapisany plan `allocationVersion: 2`:
   - obligacje oraz część „Akcje i ETF-y” sumują się do 100%;
   - wewnątrz części „Akcje i ETF-y” złoto, rynki rozwinięte i rynki wschodzące sumują się do 100% tej części.
5. Obliczenia i rekomendacje obejmują cztery składniki: obligacje, złoto (ETF), rynki rozwinięte, rynki wschodzące. Klasyfikacja obejmuje także inwestycje na IKE i IKZE zgodnie z ich podkategoriami.
6. Gotówka pozostaje poza proporcjami inwestycji i nie finansuje automatycznie rebalansu. PPK/PPO o nieznanym składzie również pozostają poza planem. Ich wartości oraz wyłączenie są widoczne.
7. „Obecnie” oznacza stan według zapisanych wycen, bez pobierania bieżących notowań z rynku.

## 3. Zachowanie interfejsu

W istniejącej zakładce „Co dokupić?” pojawi się przełącznik dwóch trybów:

| Tryb | Działanie |
| --- | --- |
| Dokupowanie | Domyślny tryb. Użytkownik podaje budżet; aplikacja proponuje zakupy bez sprzedaży, zachowując dotychczasowe działanie. |
| Rebalans obecnego portfela | Aplikacja od razu pokazuje sprzedaż i zakupy finansowane wpływami ze sprzedaży. Pole nowego budżetu jest ukryte; wpisana w drugim trybie kwota nie wpływa na rebalans. |

Przełączenie trybu nie zapisuje operacji ani nie zmienia celów. Oba tryby używają tego samego edytora „Zmień mój plan”. Po zmianie osoby / zakresu budżet jest czyszczony, a tryb wraca do domyślnego dokupowania; dane i cele poprzedniego zakresu nie mogą pojawić się jako aktualna rekomendacja.

### Obecne odchylenia

Po wczytaniu poprawnego planu w obu trybach widoczna jest sekcja „Obecne odchylenia od planu”, bez konieczności wpisywania budżetu ani rozwijania szczegółów. Dla każdego z czterech składników pokazuje:

- obecną wartość w PLN;
- obecny udział i docelowy udział w całym planie;
- odchylenie udziału w punktach procentowych;
- nadwyżkę albo niedobór w PLN względem celu przy obecnej wartości portfela.

Znaki są jednoznaczne: dodatnie odchylenie oznacza nadwyżkę, ujemne niedobór. Tekst „Nadwyżka”, „Niedobór” lub „Zgodnie z planem” uzupełnia liczby; kolor nie jest jedynym nośnikiem informacji. Cel dla złota i rynków pokazujemy jako udział całego planu, aby dało się go porównać z obecnym udziałem.

Niepoprawny budżet dokupowania blokuje rekomendacje zakupów, lecz nie blokuje poprawnych odchyleń ani niezależnego rebalansu.

### Wynik rebalansu

W trybie rebalansu użytkownik widzi:

1. Wartość inwestycji objętych planem oraz komunikat „Rebalans bez dopłaty”.
2. Listę „Co sprzedać” z nazwami składników i dodatnimi kwotami sprzedaży.
3. Listę „Co kupić” z nazwami składników i dodatnimi kwotami zakupów.
4. Podsumowanie łącznej sprzedaży i zakupów — obie kwoty są równe.
5. Porównanie „Po rebalansie”: przewidywana wartość i udział każdego składnika oraz jego cel.

Kolejność sugerowanych działań: najpierw sprzedaż nadwyżek, następnie zakupy za uzyskane środki. Pozycje bez wymaganej zmiany nie generują zleceń o wartości zero; pozostają w porównaniu alokacji.

Jeżeli nie potrzeba żadnej transakcji w dokładności do grosza, pokazujemy „Portfel jest zgodny z planem w dokładności do grosza” zamiast pustych list zakupów i sprzedaży. Rzeczywiste udziały po zaokrągleniu pozostają widoczne.

### Granice wyliczenia

Obok planu widoczna jest krótka informacja: „Kwoty według zapisanych wycen, przed opłatami i podatkami. Plan nie zapisuje transakcji”.

Rekomendacje dotyczą składników portfela, nie wyboru konkretnego rachunku, serii obligacji, tickera lub liczby jednostek. Przy wspólnym portfelu oznaczają zmianę łącznych proporcji, bez przypisywania transakcji osobom. Aplikacja nie zna ograniczeń sprzedaży, kosztów wcześniejszego wykupu ani zasad przenoszenia środków między rachunkami. Wynik pokazuje docelową alokację kwotową przed kosztami; nie obiecuje wykonania takiego planu na konkretnych rachunkach.

## 4. Reguły obliczeń

### Cele efektywne

Dla zapisanych udziałów `bonds`, `stocks`, `gold`, `developed`, `emerging` efektywne cele w całym planie wynoszą:

| Składnik | Cel w całym planie |
| --- | --- |
| Obligacje | `bonds` |
| Złoto (ETF) | `stocks × gold / 100` |
| Rynki rozwinięte | `stocks × developed / 100` |
| Rynki wschodzące | `stocks × emerging / 100` |

Każda waga musi być skończona i mieścić się w przedziale 0–100; oba poziomy muszą sumować się do 100% zgodnie z istniejącą walidacją. Wszystkie dalsze wyliczenia używają tych czterech efektywnych celów.

### Kwoty i zaokrąglenia

1. Wartości pieniężne przeliczamy na całkowite grosze. Suma `T` obejmuje tylko cztery składniki planu.
2. Surowa docelowa wartość składnika to `T × udział docelowy / 100`.
3. Docelowe wartości zaokrąglamy w dół do grosza, a pozostałe grosze rozdzielamy według największych części ułamkowych. Przy remisie stosujemy stałą kolejność: obligacje, złoto, rynki rozwinięte, rynki wschodzące. Cel 0% nie otrzymuje groszy.
4. Suma zaokrąglonych wartości docelowych musi być dokładnie równa `T`.
5. Zmiana składnika = zaokrąglona wartość docelowa − obecna wartość. Dodatnia zmiana oznacza zakup, ujemna sprzedaż, zero brak transakcji.
6. Odchylenie kwotowe prezentowane jako nadwyżka / niedobór = obecna wartość − zaokrąglona wartość docelowa. Jego wartość bezwzględna odpowiada kwocie transakcji.
7. Odchylenie udziału = obecny udział procentowy − efektywny cel procentowy; jednostką są punkty procentowe.
8. Suma zakupów = suma sprzedaży. Łączna wartość po rebalansie = wartość przed rebalansem. Żadna sprzedaż nie przekracza wartości danego składnika.
9. Cel 0% dla posiadanego składnika oznacza sprzedaż całej jego wartości w planie kwotowym. Brakujący składnik z dodatnim celem może otrzymać zakup.
10. Wagi „Po rebalansie” wynikają z rzeczywistych zaokrąglonych kwot. Nie zastępujemy ich samymi wagami docelowymi. Różnica względem idealnej kwoty celu wynosi mniej niż jeden grosz na składnik; dla bardzo małych portfeli może to oznaczać widoczną różnicę procentową.
11. Wartości niepoprawne albo sumy, których nie można bezpiecznie przedstawić w całkowitych groszach, blokują wyliczenie i powodują komunikat błędu. Nie pokazujemy `NaN`, nieskończoności ani pozornie poprawnych rekomendacji.

### Przykład referencyjny

Portfel objęty planem: **10 000 zł**. Cele: obligacje 50%, „Akcje i ETF-y” 50%, a wewnątrz tej części złoto 50%, rynki rozwinięte 35%, wschodzące 15%.

| Składnik | Obecnie | Udział obecny | Cel całego planu | Odchylenie | Nadwyżka / niedobór | Transakcja | Po rebalansie |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Obligacje | 7 000 zł | 70% | 50% | +20 pp | +2 000 zł | Sprzedaj 2 000 zł | 5 000 zł |
| Złoto (ETF) | 1 000 zł | 10% | 25% | −15 pp | −1 500 zł | Kup 1 500 zł | 2 500 zł |
| Rynki rozwinięte | 1 500 zł | 15% | 17,5% | −2,5 pp | −250 zł | Kup 250 zł | 1 750 zł |
| Rynki wschodzące | 500 zł | 5% | 7,5% | −2,5 pp | −250 zł | Kup 250 zł | 750 zł |

Łączna sprzedaż i zakupy: **2 000 zł** każda. Dopłata: **0 zł**. Portfel po rebalansie: **10 000 zł**.

## 5. Stany szczególne

- **Brak inwestycji objętych planem:** komunikat „Brak inwestycji do rebalansu”, bez zleceń i bez deklaracji zgodności z celami. Dla sumy zero udziały i odchylenia procentowe są nieokreślone i pokazane jako „—”. Jeśli istnieje wyłącznie gotówka lub PPK/PPO, informacja o wyłączeniach pozostaje widoczna. Całkowicie pusty portfel zachowuje istniejące wezwanie do dodania stanu początkowego.
- **Brak jednej kategorii:** jej bieżąca wartość wynosi zero, a dodatni cel może generować zakup.
- **Plan wczytywany lub zapisujący się:** nie pokazujemy rekomendacji jako gotowych; dostępny jest odpowiedni stan oczekiwania.
- **Błąd wczytania danych lub planu:** komunikat błędu, bez używania celów domyślnych jako rzekomo zapisanych celów użytkownika.
- **Niezapisana lub niepoprawna edycja celów:** obie rekomendacje i porównanie odchyleń są wstrzymane z komunikatem o zapisaniu lub poprawieniu planu. Anulowanie przywraca wyliczenia dla zapisanych celów.
- **Błąd zapisu celów:** edycja pozostaje niezapisana; nie przedstawiamy jej jako obowiązującego planu.
- **Zmiana zakresu i opóźnione odpowiedzi:** wyniki wcześniejszego wczytania lub zapisu nie mogą nadpisać celów aktualnie wybranej osoby / gospodarstwa.
- **Aktualizacja wycen lub zapis celów:** wynik jest przeliczany na podstawie aktualnych danych; nie przechowujemy niezależnej, potencjalnie nieaktualnej kopii rebalansu.
- **Dostępność i telefon:** przełącznik działa z klawiatury, wybór trybu jest ogłaszany czytnikom, a dane mieszczą się w widoku mobilnym. Zakup i sprzedaż są rozróżnione tekstem.

## 6. Projekt techniczny

- Czysta logika rebalansu w warstwie domenowej `frontend/src/domain/portfolio/services/`, niezależna od Reacta, HTTP i zapisu danych.
- Wspólne wyznaczanie obecnych wartości i efektywnych celów dla dokupowania oraz rebalansu, aby oba tryby używały tej samej klasyfikacji i tych samych wag. Dotychczasowy algorytm dokupowania zachowuje swoje zachowanie.
- Istniejący `RebalancingService.global` obsługuje starszy, odmienny model globalnych wag; nie może zostać bezpośrednio użyty do nowego planu dwupoziomowego bez adaptacji.
- Prezentacja w `PurchasePlanPanel`, z wydzielonymi komponentami wyników, jeśli potrzebne dla czytelności. Formatowanie pozostaje w warstwie prezentacji, a walidacja i wyliczenia w domenie / aplikacji.
- Cele nadal są odczytywane i zapisywane przez istniejące use case'y planu. Podgląd rebalansu jest obliczeniem bez zapisu; nie wymaga nowego endpointu, zmiany schematu bazy ani migracji planów.
- Style w istniejącym `frontend/src/styles.css`, z użyciem obecnych tokenów i reguł responsywności.

## 7. Kryteria akceptacji i weryfikacja

| ID | Scenariusz | Oczekiwany wynik | Poziom testu |
| --- | --- | --- | --- |
| AC-01 | Portfel z przykładu referencyjnego | Dokładne odchylenia, sprzedaż obligacji 2 000 zł, zakupy 1 500 / 250 / 250 zł i poprawny stan po zmianie | Domena + komponent |
| AC-02 | Portfel już zgodny z celem | Brak transakcji; komunikat zgodności w dokładności do grosza | Domena + komponent |
| AC-03 | Cel 0% przy dodatniej wartości | Sprzedaż całej wartości składnika; środki trafiają do składników z dodatnim celem | Domena |
| AC-04 | Brak kategorii z dodatnim celem | Zakup brakującej kategorii finansowany sprzedażą nadwyżek | Domena |
| AC-05 | Kwoty wymagające rozdzielenia groszy, w tym portfel 0,01 zł | Deterministyczne kwoty; sprzedaż = zakupy; suma wartości zachowana; uczciwe udziały po zaokrągleniu | Domena |
| AC-06 | Pusty portfel albo tylko gotówka / PPK / PPO | Brak fikcyjnych transakcji i deklaracji zgodności; jasny komunikat | Domena + komponent |
| AC-07 | Kilka wycen i różni właściciele, typy oraz podkategorie | Ostatnia wycena każdej pozycji; prawidłowe agregowanie; brak wycen przyszłych w stanie bieżącym | Domena + integracja widoku |
| AC-08 | Wybór osoby, wspólnego portfela oraz filtrów przeglądu | Właściwe dane i zapisany plan zakresu; filtry nie ograniczają rebalansu | Komponent + przeglądarka |
| AC-09 | Zmiana budżetu i przełączenie trybów | Dokupowanie używa budżetu; rebalans i obecne odchylenia są od niego niezależne, również przy błędnym budżecie | Komponent |
| AC-10 | Niepoprawne / niezapisane cele, błąd wczytania lub zapisu, opóźniona odpowiedź poprzedniego zakresu | Brak mylących rekomendacji; właściwy stan i komunikat; brak nadpisania aktualnego zakresu | Komponent |
| AC-11 | Oba tryby i edycja celów | Dotychczasowe dokupowanie zachowuje budżet i nie sprzedaje; zapis celów aktualizuje oba tryby | Regresja domeny + komponent |
| AC-12 | Klawiatura, czytnik ekranu, desktop i mobile | Dostępny przełącznik, czytelne dane i brak poziomego przepełnienia | Dostępność + przeglądarka |
| AC-13 | Sam podgląd rebalansu | Brak zapisów operacji, wycen oraz zmian sald | Komponent / integracja |
| AC-14 | Niepoprawne kwoty lub przekroczenie bezpiecznej reprezentacji groszy | Wyliczenie odrzucone, bez nieprawidłowych liczb w interfejsie | Domena + komponent |

Po implementacji: testy domenowe i komponentowe, lint, TypeScript, formatowanie i build frontendu; scenariusze przeglądarkowe na desktopie i telefonie. Pełne CI zgodnie z `AGENTS.md` przed scaleniem. Dokumentacja użytkowa i domenowa zostanie zaktualizowana razem z zachowaniem.

## 8. Kolejność realizacji po akceptacji

- [x] Akceptacja tej specyfikacji przez użytkownika (polecenie implementacji i scalenia).
- [x] Wyliczenia domenowe oraz testy kryteriów liczbowych i zaokrągleń.
- [x] Przełącznik trybów, widok odchyleń, listy sprzedaży / zakupów i porównanie po rebalansie.
- [x] Obsługa stanów edycji, błędów i zmian zakresu oraz testy komponentowe.
- [ ] Weryfikacja regresji dokupowania, dostępności i widoków przeglądarkowych.
- [x] Aktualizacja README i dokumentacji domenowej; przegląd zmian względem kryteriów akceptacji.

## 9. Poza zakresem tej wersji

- Rebalans łączony z dodatkową wpłatą — nowy budżet pozostaje funkcją trybu dokupowania.
- Automatyczne wykonywanie lub zbiorcze zapisywanie proponowanych transakcji.
- Dobór rachunków, podział sprzedaży między serie obligacji lub właścicieli oraz przelewy między nimi.
- Dobór konkretnych instrumentów, notowania na żywo i liczba jednostek.
- Optymalizacja podatków, prowizji, kosztów wykupu, płynności oraz minimalnych wartości transakcji.
- Nowe cele dla gotówki i PPK/PPO oraz osobne progi tolerancji odchyleń.
