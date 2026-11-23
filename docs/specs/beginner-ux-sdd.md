# SDD — prosta i intuicyjna aplikacja „Oszczędności”

**Wersja:** 1.1 · 16 listopada 2026
**Status:** zaakceptowana przez użytkownika z poprawkami z 16 listopada 2026; implementację wykona osobny agent.
**Punkt odniesienia:** aplikacja Oszczędności po wdrożeniu wskazanym podczas rozmowy, sprawdzona w Brave.
**Podstawa:** audyt interfejsu z 15 listopada 2026. Pełne wymagania i kryteria odbioru zawarto w tym dokumencie; prywatny audyt i dowody nie są wymagane do implementacji.

**Zaakceptowane uzupełnienie z 16 listopada 2026:** [jeden hierarchiczny Przegląd inwestycji](overview-investment-hierarchy-sdd.md) zastępuje zasady dwóch grupowań z §5.2 i doprecyzowuje wykresy po PR #102. W razie rozbieżności obowiązuje uzupełnienie. Jego implementacja jest osobnym zadaniem.

**Uzupełnienie zatwierdzone 23 listopada 2026** · Zakup i sprzedaż są przepływami zewnętrznymi bez automatycznej zmiany kont gotówkowych. Reguły i kryteria akceptacji opisuje [specyfikacja domeny](../domain/README.md#zakup-i-sprzedaż-aktywów). Wcześniejsze transfery zachowują obie strony.

## 1. Cel i granice

Aplikacja ma pozwalać początkującej osobie szybko odpowiedzieć na trzy pytania: **ile mam, co się zmieniło i jak rozdzielić kolejne pieniądze, żeby zbliżyć inwestycje do mojego planu**. Typowa czynność nie powinna wymagać znajomości wewnętrznego modelu danych ani czytania długiej instrukcji.

Dopracowujemy obecną jasną identyfikację z zielonym akcentem. Uporządkowanie obejmuje całą aplikację: nawigację, Przegląd, wykresy, plan, wprowadzanie danych, historię, kopie, pomoc, błędy i telefon. Nie dodajemy rekomendacji instrumentów, automatycznych notowań, połączeń z bankami, nowych osób ani wieloetapowego obowiązkowego onboardingu.

To specyfikacja zachowania i wyglądu, nie gotowa zmiana aplikacji. Dokument został zaakceptowany; ten etap obejmuje wyłącznie dokumentację. Audyt nie wykonywał rzeczywistych zapisów, usunięć ani importu. Część stanów sprawdzono w osobnej sesji Brave z blokadą żądań zmieniających dane i z symulacją odpowiedzi GET. Końcowe skutki operacji finansowych wymagają późniejszych testów na izolowanej kopii.

## 2. Ustalenia zatwierdzone w rozmowie

1. Cztery równorzędne kategorie planu: **Obligacje, Złoto, Akcje — rynki rozwinięte, Akcje — rynki wschodzące**. Jedna suma 100%; żadnych procentów „części akcyjnej”.
2. Jeden wspólny zapisany plan i jeden wspólny szkic dla wszystkich widoków: Jakub, Zosia i Razem. Zmiana proporcji w dowolnym widoku zmienia ten sam plan. Przełącznik osoby wybiera posiadane inwestycje do obliczeń, a nie inny zestaw docelowych wag.
3. Punktem wyjścia jest dotychczasowy plan Razem. Osobistych proporcji nie uśredniamy i nie używamy dalej jako oddzielnych aktywnych planów:

| Plan | Obligacje | Złoto | Rynki rozwinięte | Rynki wschodzące | Suma |
|---|---:|---:|---:|---:|---:|
| Wspólny dla wszystkich | 50% | 25% | 17,5% | 7,5% | 100% |

4. **Zachowujemy obecne wyrównywanie udziałów portfela przez zakupy, bez sprzedaży.** Nie dzielimy każdej dopłaty mechanicznie według czterech procentów. Wcześniejszy wybór takiego prostego dzielenia został wycofany.
5. Kwota do zaplanowania to dowolny budżet — nowe pieniądze albo posiadana gotówka. Nie dodajemy gotówki automatycznie, nie ograniczamy symulacji do salda konta i nie zapisujemy transakcji na podstawie wpisania budżetu.
6. Planowanie bierze pod uwagę wyłącznie obligacje, złoto i akcje (dwie grupy rynków). Wszystkie inne aktywa są całkowicie pomijane w wartościach, wagach i wyliczeniach kalkulatora. Nie wyświetlamy ostrzeżeń, komunikatów, list ani sekcji o pominiętych aktywach. Zasada dotyczy planowania zakupów; Przegląd nadal pokazuje wszystkie oszczędności.

Pozostałe rozwiązania zostały zaakceptowane przez użytkownika. Zmiany z 16 listopada mają pierwszeństwo przed historycznymi ustaleniami audytu.

## 3. Zasady wspólne dla wszystkich ekranów

- **Najpierw odpowiedź, potem narzędzia.** Wartość oszczędności i wynik przed filtrami. W formularzu najpierw zamiar i właściwe pola, potem szczegóły.
- **Jedna rzecz ma jedną nazwę.** W całej aplikacji „Rynki wschodzące”; IKE/IKZE to rachunki, a złoto/akcje/obligacje to rodzaje inwestycji. Złoto nie jest podpisywane jako akcje.
- **Brak danych nie oznacza zera.** Osobne stany: wczytywanie, błąd, brak pierwszego wpisu, brak wpłat, pusty filtr i potwierdzone saldo 0 zł.
- **Stan osoby jest zawsze czytelny.** Przełącznik „Jakub / Zosia / Razem” pozostaje widoczny w nagłówku. Formularz podaje właściciela; działanie nie zapisuje się „dla Razem”.
- **Pomoc przy decyzji.** Krótkie zdanie przy polu; dłuższe objaśnienie pod „Co to znaczy?”. Bez powtarzania tego samego akapitu w trzech miejscach.
- **Bez niejawnej zmiany danych.** Filtry, wykresy, budżet, przełączenie osoby i podgląd kopii niczego nie zapisują. Edycja ma wyraźne Zapisz/Anuluj i stan niezapisanych zmian.
- **Jedna spójna akcja naprawy.** Komunikat mówi, czego nie udało się zrobić i jak spróbować ponownie. Błąd sieci nie sugeruje dopisywania brakujących wpłat.

## 4. Nawigacja i ogólny układ

Pozostają trzy główne zakładki: **Przegląd · Co dokupić? · Historia**. Ustawienia pozostają drugorzędne. Logo prowadzi do Przeglądu; pomoc ma jawny przycisk powrotu.

W Ustawieniach żadna inna zakładka nie może udawać aktywnej. Nagłówek „Ustawienia i kopie danych” zawiera „Wróć do [poprzedni widok]”. Po powrocie zachowujemy osobę i kontekst. Zmiana właściciela lub ekranów musi zachować spójność widocznego nagłówka, liczb, planu i dostępnych działań.

Przełączenia zakładek zachowują ich bieżący stan w sesji: filtry Przeglądu, okres wykresu, filtr Historii i szkic planu. Stan filtrów i widoków jest odrębny dla każdej osoby i Razem; zapisane proporcje i szkic planu są wspólne. Powrót do wcześniej odwiedzonej osoby odtwarza jej wybór. Nowo odwiedzony zakres startuje z pełnym portfelem. Nie wprowadzamy automatycznego zapisu szkiców na serwerze.

## 5. Przegląd — najważniejsze informacje bez konfiguracji

### 5.1 Hierarchia

Kolejność: nagłówek i osoba → podsumowanie → krótki zakres i filtr → wykresy → lista inwestycji. Na telefonie wykresy są domyślnie zwinięte pod „Rozkład i historia wartości”, dzięki czemu lista inwestycji jest łatwo dostępna. Stan rozwinięcia pamiętamy w sesji.

Podsumowanie:

- **Wartość oszczędności** — główna liczba. Podpis: „Według ostatnich zapisanych wartości”; daty aktualizacji są czytelne.
- **Wpłaty łącznie** — zapisane wpłaty i znany wkład początkowy przed odjęciem wypłat (`depositsTotalPln`). W szczegółach osobno „Wypłaty łącznie” i „Kapitał po wypłatach” (`contributedCapitalPln`).
- **Wynik** — neutralna etykieta dla każdej osoby i Razem; dodatnia/ujemna kwota z odpowiednim znakiem, nie sam kolor.

Konto bankowe wlicza się do wartości oszczędności, a jego saldo i zmiany są widoczne w historii wartości. Jego udział w wyniku łącznym i miesięcznym wynosi 0 zł, również po ręcznej korekcie salda. Przykład odbioru: saldo konta Zosi spada z 1000 do 800 zł. Historia wartości pokazuje spadek o 200 zł, a wynik w zakresie tego konta wynosi 0 zł. Odsetki na koncie oszczędnościowym wchodzą do wyniku zgodnie z regułami domeny.

Gdy wpłaty są niekompletne, przy kwocie pokazujemy „Niepełne dane o wpłatach”. Brak danych o wpłatach na konto bankowe pozwala nadal pokazać wynik pozostałych inwestycji. „Uzupełnij wpłaty” przy wyniku pojawia się, gdy brakuje wkładu potrzebnego do obliczenia wyniku. Wyświetlamy konkretne brakujące pozycje z właścicielem, np. „Zosia — konto oszczędnościowe”. Kliknięcie otwiera uzupełnienie danych lub prowadzi do tej pozycji w portfelu osoby.

Błąd odczytu wyników daje „Nie udało się wczytać wyniku” i ponowienie, a nie informację o nieznanych wpłatach. Obecne wartości można nadal pokazać, jeśli ich odczyt się udał.

### 5.2 Filtrowanie

Domyślny stan to **Cały portfel**. Pod podsumowaniem znajduje się niewielkie „Filtruj inwestycje”. Dopiero rozwinięcie pokazuje istniejące możliwości.

W panelu:

- „Według kont i produktów” z objaśnieniem „Gdzie trzymasz pieniądze”.
- „Według rodzaju inwestycji” z objaśnieniem „W co są zainwestowane”.
- Checkboxy grup z wartościami i zrozumiałymi nazwami.
- „Pokaż wszystkie” jako proste przywrócenie pełnego zakresu. Akcja odznaczenia wszystkich jest drugorzędna i dostępna tylko w otwartym panelu.

Po ograniczeniu wyboru **nad metrykami** stale widoczny jest podpis, np. „Wybrane inwestycje: obligacje i złoto” oraz „Pokaż cały portfel”. Główna etykieta zmienia się na „Wartość wybranych inwestycji”. Przewinięcie albo zamknięcie panelu nie ukrywa faktu filtrowania.

Wybór dotyczy sum, wyniku, rozkładu, historii wartości i listy w Przeglądzie. Nie zmienia planu zakupów ani Historii operacji. Zmiana sposobu grupowania przywraca zapamiętany wybór w tym sposobie, a nie przenosi mechanicznie checkboxów między różnymi kategoriami.

Pusty wybór: jeden spójny komunikat „Nie wybrano inwestycji” i „Pokaż cały portfel”. Nie pokazujemy „Mam 0 zł”, „Brak wycen” ani sugestii uzupełnienia wpłat. Prawdziwie pusty portfel zachowuje istniejący prosty pierwszy krok.

### 5.3 Lista inwestycji

Na komputerze zwarta tabela, na telefonie karty. Widoczne: nazwa, konto/właściciel tam, gdzie potrzebny, obecna wartość, wynik lub nazwany brak danych, data ostatniej wartości. Jedna główna czynność: **Aktualizuj wartość**. „Szczegóły” ujawniają wpłaty i „Historia tej inwestycji”.

Wiersz i karta konta bankowego pokazują saldo i datę wyceny. Zapisane wpłaty są dostępne w szczegółach.

Nie używamy dwuznacznego „Edytuj / usuń” jako nazwy przejścia do historii. W Razem nadal agregujemy odpowiadające sobie inwestycje; nie zapisujemy zbiorczej wyceny bez wskazania osoby. Szczegóły mogą prowadzić do składowych osób. Nie powielamy wpisów obu osób w głównej liście wspólnej.

## 6. Wykresy — czytelna wartość, prawidłowe braki

Rozkład i historia korzystają z aktywnego wyboru Przeglądu. Podpis przy wyborze czasu: „Okres zmienia tylko wykres historii”. Sumy i rozkład nadal pokazują ostatnio zapisane wartości.

Historia zachowuje istniejące zakresy, rozbicie i tabelę. „Własny zakres” startuje z datami aktualnie pokazywanego zakresu; nie zgłasza błędu przed rozpoczęciem edycji. Po wyczyszczeniu pola jest neutralna wskazówka, a błędna kolejność dat ma komunikat przy polach. Zakres bez danych oferuje „Pokaż całą historię”.

Opis pod wykresem skracamy do „Zmiana wartości obejmuje wpłaty i wypłaty — nie jest wynikiem inwestycji”. Metoda uwzględniania wycen jest w rozwijanym objaśnieniu.

**Znaczenie danych:** przed pierwszą wyceną danej pozycji pokazujemy „Brak danych”, nie 0 zł. Jej linia zaczyna się od pierwszej znanej wartości; nie tworzymy fikcyjnego przebiegu od zera. Suma historyczna obejmująca tylko część później ewidencjonowanych inwestycji musi być opisana jako suma znanych wartości, z informacją o niepełnej historii. Zapisane rzeczywiste zero pozostaje zerem. Wykres i tabela stosują tę samą regułę.

Po rozwinięciu tabeli i rozbicia szerokość strony pozostaje szerokością ekranu. Przewija się wyłącznie tabela w opisanym, dostępnym klawiaturą kontenerze; karta, wykres i nagłówki nie rozszerzają się przez jej minimalną szerokość. Kolory serii są stałe w legendzie i grupach, uzupełnione nazwami oraz wzorami linii.

## 7. Co dokupić? — jeden zrozumiały plan

### 7.1 Układ i znaczenie

Ekran ma trzy krótkie części:

1. **Wspólny plan inwestycji** — cztery docelowe udziały i „Zmień proporcje”. Osobny podpis „Obliczenia dla: Jakub / Zosia / Razem” wskazuje analizowany portfel. Podpis „Proporcje docelowe inwestycji objętych planem”.
2. **Kwota na zakupy** — jedno pole PLN, pomoc „Może to być nowa wpłata albo część posiadanej gotówki. Niczego tu nie zapisujesz”.
3. **Proponowany podział zakupów** — wynik obliczeń oraz krótka przyczyna, dlaczego wybrane kategorie przybliżają portfel do celu.

W pobliżu proporcji widoczna jest podstawa obliczeń: „Plan obejmuje [kwota] zł inwestycji”, obejmująca wyłącznie obligacje, złoto i akcje. Innych aktywów nie pokazujemy ani nie objaśniamy na tym ekranie. IKE/IKZE nie tworzą osobnych udziałów — przypisane do nich kwalifikujące się aktywa trafiają do właściwej kategorii.

Tabela szczegółowa „Porównaj z celem” ma cztery wiersze: kategoria, obecna wartość, obecny udział, cel, proponowany zakup, udział po zakupie. Jedna podstawa procentów i etykiety „Poniżej celu / Powyżej celu” zamiast obowiązkowego rozumienia punktów procentowych. Kwoty brakujące do celu można zachować w szczegółach, ale muszą być odróżnione od proponowanych zakupów.

### 7.2 Reguły obliczeń

Zachowujemy bieżącą regułę dopasowania zakupów do portfela. Zmiana UI i formatu planu nie może przypadkowo zastąpić jej prostym mnożeniem budżetu przez udziały.

- Kwoty zakupów nieujemne, bez sprzedaży. Suma zakupów równa budżetowi co do grosza.
- Udział docelowy 0% jest legalny; nie powoduje automatycznej sprzedaży istniejącej pozycji.
- Budżet jest dodany dokładnie raz do inwestowanej części przy liczeniu udziałów po zakupie. Nie doliczamy osobno posiadanej gotówki.
- Nie wyliczamy całkowitego majątku „po operacji”, bo symulacja nie wie, czy budżet pochodzi z nowych środków, czy z gotówki już ujętej w oszczędnościach.
- Puste pole i 0 zł to spokojny stan bez zakupów; liczba ujemna i ponad dwa miejsca po przecinku otrzymują komunikat przy budżecie. Nie zaokrąglamy wpisu po cichu. Obsługujemy polski przecinek.
- „Pozostałych kategorii teraz nie dokupujesz” pojawia się tylko, gdy rzeczywiście pomijamy co najmniej jedną kategorię.
- Ograniczona dopłata może nie wystarczyć do osiągnięcia celu. Nie obiecujemy dokładnego uzyskania proporcji.

Przykład regresyjny z audytu: w obecnym planie Razem i przy stanie danych z audytu budżet 1000 zł prowadzi do zakupu złota za 1000 zł. Nie może zostać zamieniony na 500/250/175/75 zł. Ten przykład nie jest nową rekomendacją ani stałą regułą — wynik zależy od stanu portfela.

### 7.3 Edycja i zapis

Cztery pola procentowe w jednej grupie. Bez suwaków wymuszających trudne precyzyjne ustawienie. Obok pól stale: **„Razem: 100%”**, a przy błędzie np. „Razem: 99%. Dodaj jeszcze 1%, aby zapisać”. Zakres każdego pola 0–100%, suma dokładnie 100%; żadnej automatycznej korekty innych pól bez decyzji użytkownika.

Normalne wartości pokazujemy bez zbędnych zer: 50%, 17,5%. Model dziesiętny musi umożliwić dokładne zachowanie efektywnych udziałów ze starego planu. Migracja nie może cicho tracić precyzji; jeżeli starszy plan wymaga większej dokładności, pola potrafią ją pokazać i zachować. W obliczeniach nie opieramy warunku 100% na przypadkowej równości liczb zmiennoprzecinkowych.

Szkic ma napis „Niezapisane zmiany” i własne Zapisz/Anuluj. Błąd procentów jest przy procentach, nigdy pod budżetem. Kalkulator nie przedstawia szkicu jako zapisanego planu. Podczas edycji komunikat jasno mówi, czy trzeba najpierw zapisać/odrzucić zmiany; nie pokazujemy pozornie aktualnych wyników starego planu bez wskazania tej różnicy.

Jeden wspólny szkic pamiętamy w bieżącej sesji, również po zmianie osoby. Zapis aktualizuje wspólny plan we wszystkich widokach; budżet symulacji i posiadane aktywa zachowują kontekst wybranej osoby. Anulowanie odtwarza ostatni potwierdzony zapis. Przy opuszczaniu aplikacji/odświeżeniu z niezapisanym szkicem ostrzegamy, o ile pozwala na to przeglądarka.

Ładowanie planu, błąd, brak planu i zapisany plan są osobnymi stanami. Po błędzie pokazujemy „Nie udało się wczytać planu” i lokalne „Spróbuj ponownie”. Domyślnych proporcji nigdy nie nazywamy zapisanym planem. Po zmianie osoby stosujemy ten sam wspólny plan do właściwych aktywów; nie wolno mieszać posiadanych inwestycji między zakresami.

### 7.4 Osoba bez inwestycji

Proponujemy udostępnić utworzenie planu i symulację także przed pierwszym wpisem. Wartość inwestowanej części wynosi wtedy rzeczywiste 0, a kalkulator rozdziela budżet według docelowych udziałów, jako szczególny przypadek obecnej reguły. Nie tworzy fikcyjnej wpłaty ani wyceny. Wyraźny opis: „To plan pierwszych zakupów. Nie zapisano jeszcze inwestycji”. Nowy szablon wymaga jawnego zapisania i jest nazwany propozycją, a nie gotowym planem użytkownika.

## 8. Formularze — zadanie zamiast technicznego rodzaju wpisu

### 8.1 Wejścia

Globalny przycisk zmieniamy na **Dodaj wpis**. Po otwarciu użytkownik wybiera zamiar, bez automatycznego przypisania do konta bankowego:

| Zamiar | Krótki opis | Główne pola |
|---|---|---|
| Dodaj posiadane oszczędności | „Zaczynasz śledzić konto lub inwestycję, które już masz” | Konto/produkt, rodzaj inwestycji, wartość, data, opcjonalnie wpłaty |
| Zapisz wpłatę | „Nowe pieniądze trafiają do oszczędności” | Miejsce wpłaty, kwota, data |
| Zapisz zakup | „Zapisujesz kwotę przeznaczoną na inwestycję” | Inwestycja, kwota, data |
| Aktualizuj wartość | „Przepisujesz aktualne saldo lub wartość; nie dopisujesz wpłaty” | Inwestycja, nowa wartość, data |
| Wypłata / sprzedaż | Mniej częste działania, dostępne pod „Więcej działań” | Wypłata poza oszczędności albo sprzedaż z wpływami opuszczającymi śledzony portfel |

To jeden krótki formularz ze zmieniającymi się polami, a nie obowiązkowy kreator kilku ekranów. Wejście z „Aktualizuj wartość”, „Uzupełnij wpłaty” lub pustego portfela pomija wybór zamiaru i otwiera właściwy wariant. Tytuł i przycisk zapisu są konkretne: „Aktualizuj wartość PPK” / „Zapisz wartość”, nie zawsze „Dodaj zmianę”.

W Razem przed zapisem trzeba jawnie wskazać osobę; żaden domyślny właściciel nie może być ukryty. W portfelu osoby właściciel jest widoczną stałą informacją. Rozdzielamy „Konto lub produkt” od warunkowego „Rodzaj inwestycji”. Nie rozwijamy samodzielnie nieustalonego znaczenia PPO.

### 8.2 Pierwszy wpis i brakujące wpłaty

Przy dodawaniu posiadanych aktywów podstawą jest obecna wartość i data. Pytanie o wpłaty ma wybór **„Znam sumę wpłat / Nie znam”**; pole kwotowe pokazuje się dopiero po wybraniu pierwszej możliwości. Pomoc: „Wpłaty to własne pieniądze, bez zysku lub straty”. Nieznanej sumy nie zapisujemy jako zero. Nie wymagamy jej do rozpoczęcia ewidencji.

„Uzupełnij wpłaty” pokazuje nazwę inwestycji, właściciela, zachowywaną wartość i właściwą datę oraz jedno potrzebne pole. Nie udaje dodawania nowej inwestycji ani nie daje niepotrzebnych edytowalnych selektorów. Przed zapisem wyjaśnia, jaki okres obejmuje podawana suma; nie zmienia samowolnie historycznej wyceny ani nie podwaja kapitału.

Pierwszy zakup jest możliwy bez stanu początkowego i bez konta źródłowego. Zakup zwiększa wartość aktywa i kapitał netto o wpisaną kwotę.

### 8.3 Walidacja, kontekst i zamknięcie

- Błędy po polsku przy polu, po próbie zapisu lub edycji danego pola. Nie czerwony komunikat na nietkniętym formularzu.
- Kwoty z maksymalnie dwoma miejscami po przecinku. Przecinek/kropka i wklejona kwota z odstępami są interpretowane jednoznacznie; użytkownik widzi znormalizowaną wartość. Nie przyjmujemy NaN, nieskończoności ani wartości poza bezpiecznym zakresem modelu.
- Zasady zera zależą od działania: potwierdzona wycena 0 jest możliwa; wpłata, zakup, sprzedaż i wypłata wymagają kwoty dodatniej.
- Datę dzisiejszą i maksymalną liczymy w strefie Europe/Warsaw, także po północy i przy zmianie czasu. Obie warstwy uzgadniają tę samą datę biznesową.
- Zakup można zapisać niezależnie od salda i istnienia konta gotówkowego. Podgląd pokazuje wzrost wartości inwestycji o kwotę zakupu.
- Sprzedaż zmniejsza wartość aktywa, a wpływy opuszczają śledzony portfel. Kwota sprzedaży jest ograniczona wartością aktywa w dniu operacji.
- Błąd zapisu pozostawia wpisane dane. Podwójne kliknięcie nie tworzy dwóch operacji. Stan „Zapisywanie…” jest widoczny i blokuje drugi zapis.
- Pusty formularz zamyka się bez pytania. Zmieniony formularz przy zamknięciu proponuje „Wróć do edycji / Odrzuć zmiany”. Nigdy nie zapisuje automatycznie. Na telefonie stopka działań pozostaje osiągalna przy otwartej klawiaturze, a fokusowane pole nie jest zasłonięte.

## 9. Historia — znajdź, zrozum, popraw

Domyślnie najnowsze wpisy, pogrupowane czytelnie według daty. Wiersz/karta podaje: działanie, inwestycję/konto, osobę w Razem, datę i **jednoznacznie opisaną kwotę**.

Stan początkowy: „Wartość: … · Wpłaty: … / nieznane”, bez powtarzania tej samej wartości w dwóch miejscach. Transfer: „Z konta X → inwestycja Y” lub odwrotnie. Aktualizacja: „Nowa wartość: …”. Nie każda liczba to wpłata.

„Edytuj” ma neutralny lub zielony styl. Usunięcie jest drugorzędne, oddalone od edycji; dopiero ono jest czerwone. Przycisk „Więcej” musi mieć jasną dostępną nazwę, nie sam wielokropek.

Przy liście jest proste „Znajdź wpis” oraz rozwijany filtr okresu/rodzaju działania. Nie powielamy rozbudowanych filtrów z Przeglądu. Wejście z inwestycji zachowuje kontekst z czytelnym „Historia: Jakub — PPK” i „Pokaż całą historię”. Powrót nie kasuje wcześniejszego wyboru Przeglądu.

Edycja pokazuje, które dane można zmienić. Dla pól powiązanych z tożsamością operacji: „Tutaj poprawisz kwotę i datę. Zły rachunek lub rodzaj wpisu wymaga usunięcia błędnego wpisu i dodania poprawnego”. Dostępna jest jasno opisana ścieżka, bez odblokowania pól z pominięciem reguł przeliczania. Przed usunięciem podajemy wpływ na powiązane salda; nie obiecujemy cofania, jeśli nie istnieje.

Potwierdzenie usunięcia zawiera osobę, inwestycję, działanie, datę i **te same opisane wartości co w historii**. Dla stanu początkowego pokazujemy zarówno wartość, jak i znane wpłaty. „Anuluj” nie wysyła żadnego żądania. Usunięcie transferu obejmuje spójnie obie strony zgodnie z istniejącą domeną.

Po zapisie/poprawieniu/usunięciu widok odświeża właściwą historię, podsumowanie, wykres i dane używane przez kalkulator. Komunikat potwierdza faktyczny rezultat. Utrata odpowiedzi nie może być przedstawiona jako pewne niepowodzenie z zachętą do ponownego tworzenia tego samego wpisu bez weryfikacji.

## 10. Ustawienia, kopie i pomoc

Ustawienia mają dwie wyraźne sekcje: **Pobierz kopię** oraz **Przywróć kopię**. Informacja obejmuje obie osoby i jeden wspólny plan, niezależnie od obecnie wybranej osoby.

Eksport pozostaje prostym pobraniem pliku z datą. Błąd ma możliwość ponowienia. Data nazwy pliku jest lokalną datą użytkownika.

Import: wybór pliku → sprawdzenie i podgląd → potwierdzenie → wykonanie → odświeżenie. Sam wybór pliku nie zastępuje danych. Podgląd pokazuje rozpoznany format, osoby, liczbę wpisów i obecność planów. Przed wykonaniem: „Ta kopia zastąpi wszystkie obecne dane Jakuba, Zosi i wspólne plany”. Można pobrać obecną kopię bez opuszczania ścieżki.

Nieprawidłowy JSON, nieobsługiwany format, naruszenie danych i błąd połączenia mają różne, zrozumiałe komunikaty. Import jest atomowy; błędny plik nie zastępuje części danych. Po sukcesie odświeżają się także plany i symulacje. Hipotezę o nieodświeżaniu planu z audytu należy najpierw odtworzyć na kopii, bez importu do danych użytkownika.

„Informacje” stają się krótką pomocą „Jak korzystać”. Kolejność: dodaj posiadane oszczędności → zapisuj rzeczywiste wpłaty/zakupy → aktualizuj wartości → korzystaj z planu → pobierz kopię. Kilka krótkich przykładów rozróżnia wpłatę od zakupu i wycenę od zysku. Skróty wyjaśniamy w kontekście aplikacji; nie dodajemy porad podatkowych ani nie zgadujemy rozwinięcia PPO. Pomoc ma jawny powrót.

## 11. Wygląd, telefon i dostępność

| Element | Wymaganie projektowe |
|---|---|
| Paleta | Jasne tło z obecnym delikatnym zielonym odcieniem, białe powierzchnie, ciemna zieleń dla głównych działań. Zachować obecną rodzinę kolorów; dopracować kontrast. |
| Hierarchia | Jedna dominująca kwota na Przeglądzie, jeden główny przycisk w formularzu. Mniej obramowanych paneli w panelach i mniej powtórzeń. |
| Tekst | Bazowo 16 px, wygodna interlinia; tekst pomocniczy czytelny, bez nadmiaru kapitalików. Długie objaśnienia maksymalnie ok. 65 znaków szerokości w wierszu. |
| Odstępy | Wspólna skala 4/8/12/16/24/32 px; kompaktowe wiersze, czytelne oddzielenie sekcji. |
| Kontrolki | Spójne obramowania, wysokość min. 44 px dla głównych dotykowych działań; checkbox z etykietą w jednym klikalnym wierszu i wspólnym zielonym akcentem. |
| Formularz | Na komputerze ok. 560–640 px szerokości, bez pól kwotowych rozciągniętych na cały szeroki ekran. Na telefonie dopasowany do viewportu z przewijaną zawartością. |
| Statusy | Czerwień: błąd/usunięcie; zieleń: główna akcja/stan dodatni; brak komunikatów o aktywach pomijanych w planowaniu. Znaczenie przekazane także tekstem/ikoną. |
| Liczby | Polski format, spacje tysięcy, przecinek, PLN przy kwotach, tabularne cyfry. Daty czytelne po polsku, konsekwentne w tabelach i opisach. |

Przy 320 px wartość portfela i zakres muszą być widoczne na pierwszym ekranie bez przechodzenia przez rozbudowane filtry. Nie dopuszczamy przewijania całej strony w poziomie. Przyciski, długie nazwy, duże kwoty i rozwinięte szczegóły są sprawdzane także na 390/768/1440 px oraz przy powiększeniu tekstu.

Zachowujemy skip link, semantyczne zakładki, strzałki/Home/End, widoczny fokus, Escape, powrót fokusu i tabelę danych wykresu. Powtarzające się działania mają kontekstowe dostępne nazwy, np. „Edytuj wpłatę na IKZE Jakuba z 25 grudnia 2025”. Błędy powiązane z polami; status zapisu ogłaszany bez przejmowania fokusu. Kontrast tekstu minimum 4,5:1, dużego tekstu i istotnych kontrolek 3:1; znaczenie nie zależy od koloru. Wdrożenie wymaga testu rzeczywistej klawiatury ekranowej i czytnika, nie tylko zmiany szerokości okna.

## 12. Dane, migracja i ograniczenia techniczne

Import starych kopii również wybiera ich plan Razem; nigdy nie uśrednia planów osobistych. Gdy stara kopia nie zawiera planu Razem, wymaga jawnego wskazania jednego planu lub nowych proporcji w podglądzie importu przed atomowym zatwierdzeniem. Nie wybieramy dowolnej osoby po cichu.

Źródłem planu w UI i domenie jest jeden globalny czteroelementowy zestaw wag wspólny dla wszystkich zakresów. Adapter zgodności może czytać stary format; użytkownik nigdy nie widzi dwóch równoległych podziałów.

Migracja wybiera dotychczasowy plan Razem jako źródło wspólnego planu. Stare plany osobiste nie pozostają aktywne; ich archiwalny zapis może zostać zachowany w kopii, bez pokazywania osobnych planów w UI. Konwersja wybranego planu: udział obligacji pozostaje; każdy dotychczasowy podudział złota/rynku mnożymy przez dawny udział części „akcyjnej” i dzielimy przez 100. Nie zmieniamy wartości inwestycji, wpłat, historii, dat ani właścicieli. Zachowujemy dokładne efektywne wagi i sumę 100%. Migracja jest wersjonowana, idempotentna i przetestowana na kopii; nie może nadpisać planu użytkownika domyślnym szablonem.

Przed implementacją trzeba ustalić dokładny commit i format danych aktualnego wdrożenia — lokalne repozytorium znalezione podczas audytu jest starsze. Nie wolno odtwarzać migracji wyłącznie z jego domyślnych ustawień. Poprawne kopie w dotychczas obsługiwanych formatach muszą nadal dać się odczytać i skonwertować. Odrzucamy przed mutacją pliki uszkodzone oraz nieznane, nieobsługiwane wersje, podając przyczynę. Nie odrzucamy dotychczas poprawnej kopii tylko dlatego, że zmienił się format planu; nie wykonujemy częściowego importu.

Oddzielić wspólny zapisany plan i szkic od budżetu oraz wyniku symulacji dla osoby. Odpowiedzi o aktywach i wynikach przypisujemy do zakresu i wersji żądania; spóźniona odpowiedź nie może nadpisać nowej osoby. Odczyty zależne po operacji lub imporcie odświeżają się spójnie. Zachowujemy granice istniejącej architektury; stylistyka i teksty nie powinny wymagać wymiany stosu technologicznego.

## 13. Kryteria odbioru — ścieżki od początku do końca

Każdy scenariusz zapisu, usunięcia i importu wykonuje się na izolowanych danych, dopiero po akceptacji specyfikacji. Testy obliczeń korzystają z kontrolowanych danych, nie ze zmieniającego się portfela produkcyjnego.

| ID | Scenariusz i wymagany rezultat |
|---|---|
| E01 | Pierwsze otwarcie pustego portfela: jasny pierwszy krok; posiadane aktywa można dodać bez znanej sumy wpłat i bez fikcyjnego zysku. |
| E02 | Przegląd każdej osoby i Razem: prawidłowe wartości i zakres, ten sam wspólny plan i prawidłowe aktywa danego zakresu; edycja proporcji widoczna w każdym zakresie. |
| E03 | Filtr częściowy: wszystkie elementy Przeglądu zgodne z wyborem; aktywny zakres widoczny przy sumie. Plan i historia operacji pozostają niezależne. |
| E04 | Odznaczenie wszystkiego: komunikat pustego wyboru, bez pozornego 0 zł; przywrócenie całego portfela jednym działaniem. |
| E05 | Przejście przez Historię/Ustawienia/inną osobę i powrót: zachowany właściwy kontekst; aktywna nawigacja zgodna z treścią. |
| E06 | Brakujące wpłaty w Razem: wskazana konkretna pozycja i właściciel; uzupełnienie nie podwaja kapitału ani nie zmienia wyceny. |
| E07 | Awaria wyniku przy dostępnych wycenach: brak fałszywej sugestii dopisania wpłat; jedno ponowienie odświeża zależne dane. |
| E08 | Daty wykresu: własny zakres bez przedwczesnego błędu; błędna kolejność, brak danych i powrót do całej historii działają. |
| E09 | Przed pierwszą wyceną: tabela i linie pokazują brak danych, rzeczywiste zero pozostaje zerem, suma częściowa jest nazwana. |
| E10 | Wykres z rozbiciem i tabelą przy 320/390/768/1440 px: brak poziomego przepełnienia dokumentu; tylko tabela może się przewijać. |
| E11 | Migracja wybiera stary plan Razem i tworzy jeden wspólny plan z udziałami z tabeli w §2, bez zmian w aktywach i historii; ponowne uruchomienie nie zmienia danych. |
| E12 | Edycja udziałów: pojedyncza suma 100%, poprawna obsługa 0%, liczb ułamkowych, pustego pola, wartości ujemnej i >100%; błąd przy procentach. |
| E13 | Szkic planu: zachowany przy zmianie zakładki/osoby; zapis i anulowanie jednoznaczne; awaria zapisu nie usuwa wpisanych danych. |
| E14 | Awaria odczytu planu: żaden szablon nie jest podpisany jako zapisany; retry działa bez reloadu i pobiera właściwy zakres. |
| E15 | Kalkulator: regresja obecnej metody na kontrolowanych portfelach, w tym przykładowe 1000 zł z audytu; brak mechanicznego dzielenia dopłaty. |
| E16 | Budżety puste/0/0,01/ujemne/3 miejsca po przecinku/duże: jasne stany, brak cichego zaokrąglenia, suma zakupów co do grosza, brak sprzedaży. |
| E17 | Dowolne źródło budżetu: gotówka nie doliczana drugi raz; pozostałe aktywa nie wpływają na wynik ani mianownik; brak jakichkolwiek ostrzeżeń i sekcji o wyłączeniach. |
| E18 | Pusty portfel: utworzenie planu i symulacja bez sztucznych wpisów; nie mylić szablonu z zapisanym planem. |
| E19 | Dodanie stanu początkowego, wpłaty, zakupu, wypłaty, sprzedaży i wyceny: właściwe pola, właściciel i konkretne tytuły; brak niejawnego domyślnego rachunku. Po wypłacie suma wpłat brutto nie maleje, wypłaty rosną, a kapitał netto i wynik zachowują poprawne znaczenie. |
| E20 | Pierwszy zakup nowej kategorii jest możliwy bez konta źródłowego i bez fikcyjnego wkładu początkowego. |
| E21 | Saldo niewystarczające, nieznane lub historyczne: rozróżnione komunikaty; poprawna walidacja domenowa, brak częściowego transferu. |
| E22 | Puste/niepoprawne kwoty i daty: polskie komunikaty przy polach, zachowany fokus i dane; podwójny zapis nie duplikuje operacji. |
| E23 | 16.11.2026 00:30 Europe/Warsaw: formularz i maksymalna data pokazują 16 listopada; analogiczne testy granicy czasu letniego. |
| E24 | Zamknięcie pustego formularza bez pytania; zmienionego — możliwość powrotu do danych lub świadomego porzucenia. |
| E25 | Historia: odnalezienie wpisu po inwestycji, okresie lub rodzaju; opisane kwoty, konto transferowe, spokojna edycja. |
| E26 | Edycja stanu początkowego, wyceny i wcześniejszej operacji: poprawne przeliczenia, zachowane niezależne wyceny, jasne ograniczenia pól. |
| E27 | Usunięcie: poprawny rekord i obie opisane kwoty stanu początkowego; Anuluj bez żądania; transfer usuwany spójnie. |
| E28 | Po mutacji: historia, sumy, wykres i kalkulator odświeżone; niejednoznaczny wynik po utracie odpowiedzi nie prowokuje duplikatu. |
| E29 | Eksport/import: zgodna kopia wszystkich osób i planów, podgląd bez zapisu, odrzucenie błędów przed zastąpieniem, atomowość i odświeżenie planów. |
| E30 | Pomoc i brak strony: jednoznaczny powrót, przykłady podstawowych działań, brak martwych przycisków. |
| E31 | Klawiatura/czytnik/kontrast: zachowane działające udogodnienia, kontekst przycisków, dostępne błędy i tabele. |
| E32 | Prawdziwy telefon i powiększony tekst: saldo widoczne wcześnie, formularz i działania dostępne przy klawiaturze, brak obciętych kwot/nazw. |

Dodatkowy odbiór z początkującą osobą: bez instruktażu wykonuje sprawdzenie salda, aktualizację wartości, znalezienie brakujących wpłat, zaplanowanie zakupów i odnalezienie wpisu do poprawy. Potrafi własnymi słowami odróżnić wpłatę od wyceny oraz plan od faktycznie zapisanego zakupu. Niezrozumiałe miejsca wracają do poprawy przed wdrożeniem.

## 14. Kolejność wdrożenia i powiązanie z audytem

1. **Wiarygodność stanów i liczb:** błąd daty, domyślny plan udający zapisany, brak danych vs zero/błąd, historia nieznanych wartości, potwierdzenie usuwania i mobilne przepełnienie. Audyt UX-04, 08, 13, 22, 31–34.
2. **Prosta codzienna obsługa:** hierarchia Przeglądu i filtry, nawigacja, formularze z kontekstem, historia i wspólne komunikaty. UX-01–11, 17–18, 20–30, 36–39.
3. **Płaski plan i jego zgodność:** cztery wagi, migracja, zachowany algorytm, granice budżetu i zakres proporcji. UX-12–19, 35.
4. **Kopie, pomoc i odbiór całości:** podgląd importu, odświeżenie zależności, testy przekrojowe i początkujący użytkownik. KOD-01–03 oraz E01–E32.

Etapy służą organizacji pracy. Akceptacja obejmuje całość SDD; etap ten nie wdraża kodu aplikacji. Warunek ukończenia: każda pozycja audytu ma powiązane rozwiązanie albo jawnie udokumentowaną decyzję o pozostawieniu, scenariusze odbioru przechodzą, a dane użytkownika są zachowane. Hipotezy techniczne należy potwierdzić przed ich przedstawianiem jako naprawionych błędów.

## 15. Pokrycie ustaleń audytu

| Ustalenia | Rozwiązanie w SDD | Odbiór |
|---|---|---|
| UX-01–06 | Nawigacja i uproszczenie Przeglądu, §4–5 | E02–E05, E32 |
| UX-07–11 | Znaczenie wartości, kompletność i wspólny słownik, §3, §5 | E02, E06–E07 |
| UX-12–19 | Plan, jego zapis, szkic, podstawy procentów i błędy, §7 | E11–E17 |
| UX-20–26 | Zamiary, pierwszy zakup, walidacja i bezpieczne zamknięcie, §8 | E19–E24 |
| UX-27–28 | Odnalezienie wpisu i wyjaśniona edycja, §9 | E25–E26 |
| UX-29 | Obsługa awarii i ponowienia, §3, §5, §7, §8 | E07, E14, E28 |
| UX-30 | Krótka pomoc i powrót, §10 | E30 |
| UX-31–32 | Szerokość tabeli i prawidłowe nieznane wartości, §6, §11 | E09–E10, E32 |
| UX-33 | Odróżnienie awarii od braków wpłat, §5 | E07 |
| UX-34 | Jednoznaczne potwierdzenie usuwania, §9 | E27 |
| UX-35 | Plan przed pierwszym wpisem, §7.4 | E18 |
| UX-36 | Spokojna, zwarta historia, §9, §11 | E25–E27 |
| UX-37 | Opcjonalna wiedza o wpłatach, §8.2 | E01, E06, E19 |
| UX-38 | Neutralny początek edycji zakresu, §6 | E08 |
| UX-39 | Kontekst dostępnych nazw, §11 | E31 |
| KOD-01 | Podgląd i diagnostyka kopii, §10 | E29 |
| KOD-02 — hipoteza | Sprawdzenie i spójne odświeżenie po imporcie, §10, §12 | E29 |
| KOD-03 | Obie strony transferu w historii, §9 | E25–E26 |

Zakres i ograniczenia testów opisano w §1; szczegółowe materiały dowodowe pozostają prywatne. Ostatnie ponowne sprawdzenie wersji QNAP było niedostępne z powodu limitu automatycznej kontroli uprawnień. Przed implementacją należy porównać SDD z faktycznie bieżącym wdrożeniem; dotychczasowe obserwacje pozostają przypisane do zweryfikowanej wersji z audytu.
