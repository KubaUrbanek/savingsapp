# SDD: uporządkowanie ekranu „Plan portfela”

Status: **implementacja i scalenie autoryzowane przez użytkownika; w trakcie weryfikacji**. Data: 2026-11-16. Poprzednią wersję dokumentacji scalono w PR #108; bieżąca rewizja zmienia kolejność sekcji i prezentację celów częściowego rebalansu.

Dokument powstał po przeglądzie działającego interfejsu i na prośbę użytkownika o aktualizację SDD. Opisuje kolejną zmianę po scalonych PR [#105](https://github.com/KubaUrbanek/savingsapp/pull/105) i [#106](https://github.com/KubaUrbanek/savingsapp/pull/106). Poprzednie polecenie wgrania i scalenia dokumentacji wykonano w PR #108. Bieżące polecenie obejmuje aktualizację SDD; implementacja będzie osobnym zadaniem.

Ten dokument zastępuje wymagania dotyczące nazewnictwa, kolejności sekcji, rozwijania szczegółów i prezentacji z [SDD rebalansu](2026-11-16-rebalans-portfela.md) oraz [SDD wykresu i wyboru aktywów](2026-11-16-visual-selective-rebalance.md). Reguły obliczeń i zakres danych pozostają w mocy, z uwzględnieniem wspólnego płaskiego planu v4. Do czasu implementacji opis aktualnego produktu w README pozostaje bez zmian.

Aktualizacja do `main`: scalony [PR #107](https://github.com/KubaUrbanek/savingsapp/pull/107) oraz [SDD Bitcoina](bitcoin.md) wprowadzają piątą kategorię i plan v4. Układ, edytor, wybór i szczegóły obejmują również BTC, nawet przy celu 0%. Dawny pomiar audytu dotyczy czterech kategorii; nowe kryteria obejmują pięć. Reguły Bitcoina i migracji pozostają zachowane.

## 1. Problem i cel

Użytkownik musi przejść przez opis planu, listę wag, edytor i duży wykres, zanim dotrze do kwoty zakupów albo wyboru aktywów oraz odpowiedzi „co sprzedać / kupić”. Wartość portfela i cele powtarzają się w kilku miejscach. Podobnie wyglądające karty nie wyznaczają wyraźnej hierarchii działań.

Przegląd lokalnej wersji zgodnej z `main` obejmował dokupowanie, pełny i częściowy rebalans, pusty wybór, jedno aktywo, edycję proporcji i zmianę osoby na desktopie i telefonie. Przy widoku 390 × 844 px, standardowym tekście i danych z sekcji 7 pole budżetu zaczynało się około 2328 px od początku dokumentu, a pełny rebalans zajmował około 4622 px. Są to pomiary konkretnego scenariusza, a nie stałe wysokości aplikacji.

Cel po doprecyzowaniu przez użytkownika: najpierw obecne odchylenia od planu, następnie wybór działania, jego parametry i odpowiedź. Wynik rebalansu porównuje udziały z celami dla dokładnie tej części, którą wybrano; szczegółowe wyliczenia są dostępne na żądanie. Samo zmniejszenie odstępów lub dodanie kolejnych wykresów nie spełnia tego celu.

## 2. Układ docelowy

Zakładka „Co dokupić?” i nagłówek panelu otrzymują nazwę **„Plan portfela”**. Pozostaje jedna zakładka planowania obok Przeglądu i Historii, z dotychczasowym wyborem Jakub / Zosia / Razem. Zmiana etykiety nie resetuje zapamiętanego kontekstu ani nie zmienia identyfikatora istniejącej zakładki w stanie aplikacji.

| Kolejność | Sekcja | Domyślna zawartość |
| --- | --- | --- |
| 1 | Nagłówek i plan | „Plan portfela”, zakres obliczeń, jedna kwota „Inwestycje objęte planem”, zwięzła informacja o wspólnych proporcjach i „Zmień proporcje” |
| 2 | Obecne odchylenia od planu | Jeden zwarty wykres „Teraz / Cel”, widoczny bez rozwijania i bez podania budżetu |
| 3 | Sposób planowania | Przełącznik „Dokupowanie / Rebalans” bezpośrednio pod wykresem; domyślnie Dokupowanie |
| 4 | Ustawienia symulacji | Kwota w dokupowaniu albo pięć checkboxów kategorii w rebalansie |
| 5 | Wynik | Proponowane zakupy albo grupy „Sprzedaj” i „Kup”; podsumowanie, dopasowane cele i niezbędne komunikaty |
| 6 | Szczegóły i założenia | Domyślnie zwinięte „Szczegóły wyliczeń” oraz „Jak to liczymy” |

Sekcje 3–5 tworzą ciąg bez listy zapisanych wag ani rozbudowanych objaśnień między ustawieniami a wynikiem. Cały blok „Sposób planowania”, wraz z obiema opcjami, występuje raz, bezpośrednio pod wykresem. Nie przenosimy wyłącznie opcji „Dokupowanie”. Ta kolejność obowiązuje w obu trybach i na każdej szerokości ekranu. Dotyczy to zarówno układu wizualnego, jak i kolejności DOM oraz odczytu czytnikiem ekranu. Gdy wykres jest wstrzymany przez edycję lub brak poprawnych danych, jego miejsce zajmuje komunikat stanu; przełącznik pozostaje po nim.

W nagłówku nie powtarzamy pięcioelementowej listy celów: zapisane procenty są dostępne w wykresie oraz edytorze. Kwoty początkowej nie powtarzamy w nagłówku wykresu ani w osobnym akapicie. Kwoty wybranej części i części pozostawionej bez zmian mają własne znaczenie i pozostają przy rebalansie. Odrębna suma przewidywana po operacji może być pokazana w szczegółach.

## 3. Ustawienia i wynik

### Dokupowanie

- Jedno pole z etykietą „Kwota na zakupy — zł” i krótką wskazówką o nowej wpłacie lub posiadanej gotówce; bez drugiego nagłówka powtarzającego etykietę.
- Wynik bezpośrednio pod polem: suma zakupów i zwarte wiersze kategorii z dodatnią kwotą, oznaczone „Kup”. Nie tworzymy dużej pustej karty dla pojedynczej pozycji ani wierszy z zakupem 0 zł.
- Puste pole lub kwota zero: krótki komunikat zachęcający do wpisania kwoty w miejscu wyniku, bez pustych list. Obecne odchylenia pozostają widoczne.
- Błędna kwota: błąd przy polu oraz brak rekomendacji zakupów. Nie blokuje wykresu odchyleń ani przełączenia do działającego rebalansu.
- Informacja, że dopłata może nie wystarczyć do osiągnięcia celu, to jedno krótkie zdanie przy wyniku. Szczegółowe udziały po zakupie są w „Szczegółach wyliczeń”.

### Rebalans

- Pod przełącznikiem widoczne „Rebalans bez dopłaty” i wszystkie pięć checkboxów: Obligacje, Bitcoin (BTC), Złoto (ETF), Rynki rozwinięte, Rynki wschodzące. Te nazwy obowiązują w całym panelu; kwota dokupowania jest ukryta.
- Checkbox ma klikalną etykietę z dostatecznie dużym obszarem dotykowym. Pięć zwartych opcji zastępuje rozbudowane karty wyboru. Wykluczony składnik ma tekst „Bez zmian”; nie polegamy na samym kolorze lub wyszarzeniu.
- Pod wyborem pokazujemy wartość wybranych aktywów. Przy wykluczeniach także wartość i nazwy kategorii pozostawionych bez zmian; przy pełnym wyborze nie pokazujemy zbędnego „Bez zmian: 0,00 zł”.
- Wynik ma grupy **„1. Sprzedaj”** i **„2. Kup”**, obok siebie na szerokim ekranie i kolejno na telefonie. Każdy wiersz zawiera nazwę kategorii i dodatnią kwotę. Tekst, numeracja i odrębny akcent wizualny rozróżniają działania; nie oznaczamy sprzedaży jako błędu ani nie używamy koloru jako jedynej informacji.
- Jedno podsumowanie pod grupami pokazuje łączną sprzedaż i zakupy. Wartości muszą być równe co do grosza. Brak zleceń zerowych i brak pozornej zgodności całego portfela dla częściowego wyboru.
- Przy częściowym rebalansie, bez rozwijania szczegółów, widnieje komunikat: „Rebalans obejmuje wybrane aktywa. Pozostałe pozostają bez zmian, więc cały portfel może nadal odbiegać od planu”. Wzór normalizacji przenosimy do „Jak to liczymy”.
- Brak wybranych kategorii, jedno aktywo, zerowa suma wybranych wag, brak środków i zgodność z planem mają dotychczasowe odrębne komunikaty w miejscu wyniku. W tych stanach nie wyświetlamy pustych grup „Sprzedaj / Kup”.

## 4. Odchylenia, szczegóły i edycja celu

### Cel dopasowany do wybranej części

Niech `S` oznacza zbiór zaznaczonych kategorii, `V` ich obecną łączną wartość, a `W` sumę ich zapisanych wag. Dla każdej wybranej kategorii `i`, przy `W > 0`, pokazujemy **„Cel wybranej części” = `100 × waga_i / W`**. Przy `V > 0` jej „Udział teraz w wybranej części” = `100 × wartość_obecna_i / V`, a „Udział po rebalansie w wybranej części” = `100 × wartość_po_i / V`. Wszystkie porównywane udziały używają tego samego zakresu. Kwota po rebalansie pochodzi z dotychczasowego podziału groszy, a nie z zaokrąglonego procentu wyświetlanego na ekranie.

- Dopasowane cele są widoczne bez rozwijania: przy zaznaczonych kategoriach, w zwartym opisie wyboru (np. „Cel wybranej części: 30%”). Obok widnieje podstawa „Wybrane aktywa: … zł”. Cel aktualizuje się od razu po zaznaczeniu lub odznaczeniu kategorii, również BTC. Nie powstaje kolejny duży panel lub wykres.
- W „Szczegółach wyliczeń” porównanie „Po rebalansie — wybrane aktywa” pokazuje tylko zaznaczone kategorie z ich bieżącą i końcową wartością, zmianą PLN, udziałem obecnym, dopasowanym celem i udziałem po rebalansie. W głównym porównaniu nie zestawiamy udziału w całym portfelu z celem wybranej części ani odwrotnie.
- Odznaczone kategorie mają osobną grupę „Poza rebalansem — bez zmian”, z nazwą i zachowaną kwotą. Nie dostają celu 0% ani procentowego udziału w wybranej części. Jeżeli nie ma wykluczeń, grupa nie jest wyświetlana.
- Przy pełnym zaznaczeniu `W = 100%`, `V` jest sumą wszystkich inwestycji objętych planem, a dopasowane cele są identyczne z zapisanymi celami. Nie zmienia to żadnych transakcji.
- Przy pustym wyborze lub `W = 0` nie ma zdefiniowanych dopasowanych celów: pokazujemy „—” i odpowiedni komunikat. Przy `V = 0`, ale `W > 0`, można pokazać dopasowane cele, natomiast rzeczywiste udziały to „—”, bez rekomendacji. Jedna wybrana kategoria z dodatnią wagą ma cel 100%, ale nadal wyświetlamy komunikat o konieczności wyboru co najmniej dwóch kategorii zamiast pozornej operacji. Zaznaczona kategoria z wagą 0% ma dopasowany cel 0%, jeśli `W > 0`.
- Procenty formatowane są według wspólnych zasad aplikacji, do dwóch miejsc po przecinku, z możliwością pominięcia końcowych zer. Faktyczne udziały po podziale groszy mogą minimalnie różnić się od celu. Nie podstawiamy celu w miejsce rzeczywistego udziału; suma wyświetlonych zaokrąglonych procentów nie musi wynosić dokładnie 100%.
- Zapisane cele całego portfela pozostają punktem odniesienia w górnym wykresie oraz edytorze planu. Wykres ma jednoznaczny opis „Cały portfel objęty planem — zapisane cele”. Zaznaczenia nie zapisują nowych wag i nie zmieniają dokupowania.

Przykład referencyjny dla tej rewizji: zapisane cele obligacje / złoto / rozwinięte / wschodzące / BTC = 50 / 15 / 30 / 5 / 0%. Obligacje 150 222,85 zł i BTC 0 zł są wykluczone. Wybrano złoto 9 590,54 zł, rozwinięte 7 192,91 zł i wschodzące 7 192,91 zł; `V = 23 976,36 zł`, `W = 50%`.

| Wybrane aktywo | Cel wybranej części | Po rebalansie | Udział po rebalansie w wybranej części | Transakcja |
| --- | --- | --- | --- | --- |
| Złoto (ETF) | 30% | 7 192,91 zł | 30% | Sprzedaj 2 397,63 zł |
| Rynki rozwinięte | 60% | 14 385,82 zł | 60% | Kup 7 192,91 zł |
| Rynki wschodzące | 10% | 2 397,63 zł | 10% | Sprzedaj 4 795,28 zł |

Udziały w tabeli są zaokrąglone do prezentacji. Sprzedaż i zakupy wynoszą po 7 192,91 zł. Obligacje i BTC pozostają osobno, bez zmian. Procenty 4,13 / 8,26 / 1,38% dotyczą całego portfela i nie są udziałami używanymi w tym porównaniu. Górny wykres nadal pokazuje zapisane cele 50 / 15 / 30 / 5 / 0% i obecne globalne odchylenia.

### Jeden zwarty wykres

W obu trybach przed przełącznikiem „Sposób planowania” pozostaje widoczna sekcja „Obecne odchylenia od planu”. Dla każdej z pięciu kategorii zawiera bieżącą kwotę, udziały Teraz i Cel, dwa poziome słupki na wspólnej skali 0–100%, podpisaną różnicę w pp i PLN oraz informację o nadwyżce / niedoborze / zgodności. Żadna z tych wartości nie wymaga hovera ani rozwinięcia. Dla zerowej sumy udziały i różnice procentowe to „—”.

Usuwamy dodatkowy nadtytuł, powtórzenie łącznej kwoty i instrukcję „Porównaj długość słupków”. Legenda jest krótka, nazwy kategorii i wartości są wyrównane. Zachowujemy tekstowe odpowiedniki i wzór odróżniający słupki, ograniczając pionowe odstępy oraz zagnieżdżone ramki. Na telefonie zawartość zawija się bez ucinania danych. Wszystkie tory słupków mają taką samą szerokość w danym widoku.

Wykres zawsze przedstawia **obecne inwestycje objęte planem dla całego zakresu osoby / Razem względem zapisanych celów**. Gotówka i PPK/PPO pozostają poza jego mianownikiem. Budżet ani wyłączenie obligacji lub złota nie zmieniają tego porównania. W tej wersji nie dodajemy przełącznika wykresu na stan po operacji; stan przewidywany ma osobne szczegóły, aby nie mieszać go z obecnymi odchyleniami.

### Szczegóły na żądanie

- „Szczegóły wyliczeń” w dokupowaniu pokazują dla wszystkich pięciu kategorii wartości i udziały obecne, zapisany cel, proponowany zakup oraz wartości i udziały po zakupie w całym planie. W rebalansie stosują dopasowane cele i podział na wybrane oraz wykluczone aktywa opisany powyżej. Zastępują obecną rozwijaną tabelę zakupów i stale otwarte karty „Po rebalansie”.
- Szczegóły przewidywanego wyniku są dostępne tylko przy poprawnym wyliczeniu: w dokupowaniu dla dodatniej kwoty; w rebalansie dla gotowego wyniku, w tym prawidłowej zgodności bez transakcji. Nie pokazujemy ich dla pustego wyboru, jednej kategorii, zerowej sumy wag ani braku środków.
- „Jak to liczymy” zawiera wyjaśnienie celów, normalizacji wybranych wag, zaokrągleń oraz ograniczeń rachunków, jednostek i kosztów wykupu. Tekst odpowiada aktywnemu trybowi.
- Przy wyniku pozostaje krótka, widoczna informacja: „Symulacja według zapisanych wycen, przed opłatami i podatkami. Nie zapisuje transakcji”.
- Na końcu ekranu, przy „Jak to liczymy”, jedna neutralna notatka podaje gotówkę i PPK/PPO poza planem; pomija pozycje o zerowej wartości. Wyłączenie tych danych nie jest błędem i nie wymaga dużego żółtego ostrzeżenia. Wyjaśnienie, że gotówka nie finansuje automatycznie rebalansu, należy do opisu tego trybu.
- Sekcje szczegółów są domyślnie zwinięte. Zmiana budżetu lub checkboxa aktualizuje zawartość otwartych „Szczegółów wyliczeń” bez zamykania, jeśli wynik nadal spełnia warunki ich dostępności. Utrata tych warunków ukrywa szczegóły; po odzyskaniu poprawnego wyniku wracają zwinięte. Zmiana trybu albo zakresu również zwija „Szczegóły wyliczeń”. „Jak to liczymy” może pozostać otwarte, ale od razu pokazuje właściwy kontekst. Nic nie zapisuje się jako preferencja na serwerze.

### Edycja wspólnego planu

„Zmień proporcje” rozwija istniejący edytor pięciu procentów z dokładną sumą, zapisem i anulowaniem. Edytor jest domyślnie zwinięty; nie wprowadzamy nowego modala ani osobnego ekranu ustawień.

Brak zapisanego planu pokazuje wyraźnie oznaczoną propozycję i możliwość jej zapisania, bez udawania zapisanych celów. Niezapisana lub błędna zmiana proporcji wstrzymuje wynik i odchylenia. W ich miejscu jest zwięzły komunikat z odesłaniem do otwartego edytora; nie pozostawiamy starych liczb ani dużych pustych bloków. Zamknięcie edytora nie porzuca szkicu: komunikat nadal umożliwia jego ponowne otwarcie. Anulowanie przywraca zapisany plan, a błąd zapisu zachowuje edycję i pokazuje błąd przy niej. Zapis lub anulowanie zwija edytor i przywraca fokus do „Zmień proporcje”.

## 5. Reguły zachowane i stany danych

- Jeden wspólny plan `allocationVersion: 4`: pięć udziałów całego planu sumujących się dokładnie do 100%. Dane inwestycji zależą od wybranego właściciela lub Razem, nie od filtrów Przeglądu.
- Dokupowanie pozostaje bez sprzedaży; rebalans bez dopłaty. Wybór kategorii zmienia prezentowany cel wybranej części, ale nie zmienia zapisanych celów ani algorytmu dokupowania. Wykluczone aktywa zachowują wartość i nie finansują zleceń.
- Zachowujemy normalizację wag tylko wybranej części, dokładne grosze, deterministyczne zaokrąglenia, sumę sprzedaży równą zakupom i zachowanie kapitału. Przykłady liczbowe poprzednich SDD nadal obowiązują.
- Budżety pozostają osobne dla każdego zakresu i są przywracane przy powrocie do niego w sesji. Przełączenie Dokupowanie / Rebalans zachowuje budżet i wybór kategorii. Zmiana zakresu lub rewizji po imporcie przywraca Dokupowanie i wszystkie kategorie. Zapis poprawionych proporcji w edytorze przelicza aktywną symulację; nie resetuje bieżącego wyboru kategorii.
- Wczytywanie, błąd planu lub danych i zmiana zakresu nie pokazują nieaktualnych rekomendacji jako gotowych. Są rozróżnione od rzeczywistego braku planu lub inwestycji. Retry pozostaje dostępne przy błędzie; dane domyślne nie zastępują niezauważalnie zapisanych celów.
- Brak inwestycji umożliwia planowanie pierwszych zakupów po zapisaniu celów; rebalans pokazuje brak środków. Tylko gotówka / PPK / PPO nie tworzą kapitału rebalansu. Niepoprawne lub zbyt duże wartości nie generują `NaN`, nieskończoności ani pozornych wyników.
- Zmiana trybu, checkboxów, kwoty i rozwijanie szczegółów są wyłącznie podglądem. Jedynym zapisem na tym ekranie jest jawny zapis wspólnego planu; brak automatycznych operacji, wycen i zmian sald.

## 6. Responsywność i dostępność

Zachowujemy semantyczne tokeny, typografię oraz istniejące breakpointy projektu. Pola i akcje nie tracą czytelności na rzecz ograniczenia wysokości. Minimalny obszar dotykowy przełącznika, etykiet checkboxów i przycisków wynosi 44 × 44 px. Tekst informacyjny nie jest zmniejszany poniżej 14 px, a podstawowe etykiety i wartości pozostają co najmniej 16 px przy standardowych ustawieniach.

Przełącznik ma semantykę grupy radiowej i działa klawiaturą. Checkboxy oraz rozwijane sekcje mają dostępne nazwy i stan. Zmiana trybu lub zaznaczenia nie przenosi fokusu do wyniku ani nie przewija strony automatycznie. Aktualizację wyniku ogłasza krótki komunikat statusu zamiast odczytywania całego wykresu i wszystkich wierszy. Kolejność Tab odpowiada kolejności wizualnej. Fokus jest widoczny; respektujemy reduced motion.

Na szerokościach 320, 390, 768 i 1440 px oraz przy dwukrotnym powiększeniu tekstu nie ma poziomego przepełnienia strony, ucinania kwot ani nakładania kontrolek. Dotyczy to także rozwiniętych szczegółów, długich kwot i błędów. Nie naprawiamy przepełnienia ukrywaniem zawartości przez `overflow: hidden`. Szczegóły na telefonie mają układ wierszy / kart mieszczący się w widoku.

## 7. Kryteria akceptacji

Scenariusz do pomiaru układu: Jakub, obligacje 119 199,21 zł, złoto 10 000 zł, rynki rozwinięte 35 000 zł, wschodzące 10 000 zł; poza planem gotówka 20 000 zł i PPK 12 000 zł. Bitcoin: 0 zł. Cele (obligacje / złoto / rozwinięte / wschodzące / Bitcoin): 50 / 25 / 17,5 / 7,5 / 0%. To dane testowe, nie import danych użytkownika. Dla zakupów budżet 5 000 zł, dla częściowego rebalansu wyłączone obligacje i złoto. Edytor i szczegóły są zwinięte, dokument przewinięty do początku, fonty wczytane.

Limity wysokości dotyczą tego scenariusza, standardowego tekstu, pełnego okna aplikacji z nagłówkiem i nawigacją oraz ustabilizowanego wyniku. W UX-02 odległości mierzymy od dolnej krawędzi wykresu; wysokość całego dokumentu w UX-03 od jego początku. Wcześniejsze wymaganie zmieszczenia kontrolek w pierwszym ekranie zastępujemy tymi odległościami, zgodnie z poleceniem przeniesienia ich pod wykres. Nie dotyczą powiększenia tekstu, błędów, edycji ani rozwiniętych szczegółów; w tych stanach obowiązuje pełna czytelność i brak przepełnienia. Nie wymuszamy limitów stałą wysokością kontenerów ani ucinaniem treści.

| ID | Scenariusz | Oczekiwany wynik | Weryfikacja |
| --- | --- | --- | --- |
| UX-01 | Wejście do planowania | Zakładka i panel „Plan portfela”; jedna kwota bazowa, brak osobnej listy powtórzonych celów; wykres → tryb → ustawienia → wynik → szczegóły | Komponent + przeglądarka |
| UX-02 | Widok 390 × 844 oraz 1440 × 900 px | Przełącznik zaczyna się bezpośrednio pod wykresem, z odstępem najwyżej 32 px. Pole budżetu kończy się najwyżej 350 px poniżej końca wykresu; w rebalansie komplet checkboxów z dopasowanymi celami kończy się najwyżej 650 px, a pierwszy wiersz transakcji zaczyna najwyżej 900 px poniżej końca wykresu. Żaden opis ani inny panel nie rozdziela wykresu i przełącznika | Pomiar przeglądarkowy + ocena zrzutów |
| UX-03 | Pełny rebalans, standardowy tekst | Cały dokument ma najwyżej 3000 px wysokości przy 390 × 844 i 2200 px przy 1440 × 900. Wykres zajmuje odpowiednio najwyżej 850 i 550 px, zachowując wszystkie pięć wierszy i dane | Pomiar przeglądarkowy + ocena zrzutów |
| UX-04 | Budżet 5 000 zł; później pusty, zero i błędny | Zakup złota za 5 000 zł tuż pod polem; dla pustego/zera wskazówka, dla błędu walidacja. Wykres nie zmienia się; rebalans nadal działa | Komponent + przeglądarka |
| UX-05 | Pełny rebalans | Grupy Sprzedaj i Kup rozróżnione bez koloru; na desktopie obok siebie, na telefonie sprzedaż przed zakupami; kwoty zgodne z istniejącym serwisem; brak pozycji zerowych | Regresja domeny + komponent + przeglądarka |
| UX-06 | Wyłączenie obligacji i złota | Obie kategorie opisane jako pozostawione bez zmian; wybrane 45 000 zł, zamrożone 129 199,21 zł. Sprzedaj rozwinięte 3 500 zł, kup wschodzące 3 500 zł. Widoczna informacja o częściowym rebalansie; globalny wykres nie zmienia się | Komponent + przeglądarka |
| UX-07 | Brak wyboru, jedna kategoria, zerowe cele, brak środków, zgodność | Właściwy komunikat w miejscu wyniku, bez pustych list i bez nieuprawnionej deklaracji zgodności. Szczegóły niedostępne dla stanów blokujących; przy prawidłowej zgodności bez transakcji pozostają dostępne | Komponent |
| UX-08 | Odchylenia w obu trybach | Wykres dostępny bez rozwijania; kwoty, oba udziały, pp i PLN widoczne; wszystkie słupki mają wspólną skalę. Zmiana budżetu / checkboxów nie zmienia obecnych odchyleń | Komponent + przeglądarka |
| UX-09 | Rozwinięcie szczegółów | Dla wybranych kategorii rzeczywiste udziały po rebalansie i dopasowane cele dotyczą tej samej wybranej części; wykluczone osobno z niezmienionymi kwotami. Dokupowanie porównuje udziały całego planu. Poprawny wynik → poprawny wynik zachowuje otwartą sekcję; utrata dostępności ją ukrywa, a odzyskanie przywraca zwiniętą. Zmiana trybu / zakresu zwija szczegóły wyniku | Komponent + klawiatura |
| UX-10 | Brak planu, edycja, anulowanie i błąd zapisu | Jawny zapis propozycji; szkic nie udaje zapisanego planu. Wynik i wykres wstrzymane przy niezapisanych zmianach. Anulowanie odtwarza wyniki; błąd zachowuje szkic; prawidłowy powrót fokusu | Komponent + przeglądarka |
| UX-11 | Zmiana trybu, osoby, powrót z Historii, import i opóźnione dane | Reguły pamiętania budżetu / zaznaczeń z sekcji 5; wspólne cele, poprawny zakres, brak chwilowych wyników poprzedniej osoby; brak resetu przy samym powrocie z Historii | Komponent + przeglądarka |
| UX-12 | Pusty portfel, tylko gotówka / PPK, loading, błąd, zbyt duże kwoty | Właściwe odrębne komunikaty, możliwość retry tam, gdzie dotyczy; brak fikcyjnych celów, udziałów i transakcji | Komponent |
| UX-13 | Klawiatura, powiększenie, cztery szerokości, długie kwoty | Dostępne sterowanie i dane; fokus nie ginie po przeliczeniu; brak poziomego przepełnienia również po rozwinięciu szczegółów | Axe + przeglądarka + ręczny przegląd |
| UX-14 | Samo korzystanie z symulacji | Brak zapisów operacji, wycen i planu przy zmianie budżetu, trybu, checkboxów i sekcji; jawne zapisanie proporcji nadal działa | Komponent / przeglądarka z kontrolą żądań |
| UX-15 | Przykład z sekcji „Cel dopasowany do wybranej części” | Cele widoczne przy wyborze: 30 / 60 / 10%; w szczegółach udziały po rebalansie również 30 / 60 / 10% po formatowaniu. Dokładne kwoty i transakcje z tabeli; podstawa 23 976,36 zł. Obligacje i BTC osobno bez celu wybranej części | Czyste wyliczenie udziałów + komponent + przeglądarka |
| UX-16 | Zmiana wyboru i ponowne zaznaczenie wszystkich | Dopasowane cele i udziały aktualizują się razem; przy wszystkich zaznaczonych cele są równe zapisanym. Globalny wykres i zapisany plan pozostają niezmienione; brak żądania zapisu | Komponent + przeglądarka |
| UX-17 | W = 0, V = 0, jedna kategoria, cel 0%, ułamkowe wagi i grosze | Zasady nieokreślonych udziałów i celów z sekcji 4, bez dzielenia przez zero. Faktyczny udział pochodzi z zaokrąglonej kwoty, nie z celu; zachowane bilansowanie transakcji i precyzja wag | Test czystych wyliczeń + regresja domeny + komponent |
| UX-18 | Oba tryby, telefon, desktop i klawiatura | Jeden przełącznik bezpośrednio po globalnym wykresie w DOM i wizualnie; ustawienia i wynik pod przełącznikiem. Czytnik rozróżnia „Cel wybranej części” i globalny zapisany cel; brak ukrycia wykresu po zaznaczeniach | Komponent + dostępność + przeglądarka |

Dodatkowa regresja BTC: dla portfela 10 000 zł (obligacje 5 000, złoto 2 500, rozwinięte 1 750, wschodzące 750, BTC 0) i celów 50 / 20 / 17,5 / 7,5 / 5% pełny rebalans sprzedaje złoto za 500 zł i kupuje BTC za 500 zł. Po wyłączeniu BTC jego wartość pozostaje 0 zł i nie powstaje zakup BTC; widoczny jest komunikat o częściowym rebalansie. Przy celu BTC 0% i dodatnim stanie pełny rebalans proponuje sprzedaż całej wartości BTC, zgodnie z istniejącą domeną. Testy komponentowe i przeglądarkowe uwzględniają tę kategorię.

## 8. Architektura, realizacja i zakres

Zmiana dotyczy warstwy prezentacji: `PurchasePlanPanel`, `RebalancePlan`, `AllocationDeviationChart`, etykiety zakładki w `Home`, tekstów pomocy i `styles.css`. Panel nadal posiada stan formularza, trybu i wyboru; globalny wykres jest wspólną sekcją przed wyborem trybu, niezależną od komponentu wyniku rebalansu. Czyste wyliczenia dopasowanego celu oraz udziałów wybranej części powinny być testowalne i korzystać z dokładnych zapisanych wag oraz istniejących kwot wyniku; nie nadpisują globalnych pól udziałów/odchyleń ani nie powielają algorytmu rozdziału groszy. Wydzielone komponenty ustawień, wyniku i szczegółów otrzymują dane i zdarzenia. Nie kopiujemy wyliczeń finansowych do JSX.

Bez zmiany polityki wyznaczania transakcji, API, schematu bazy, formatu planu, zależności i zapisu preferencji. Nie dodajemy nowego typu strategii, łączenia dopłaty ze sprzedażą, automatycznego wykonania transakcji ani przebudowy Przeglądu / Historii. Istniejące testy liczbowe pozostają regresją; nowe testy sprawdzają zachowanie, kolejność, dostępność i czytelność układu.

Przy osobnej realizacji implementacji:

1. Zmienić kompozycję ekranu, etykiety i prezentację wyniku z zachowaniem istniejącej polityki obliczeń.
2. Wprowadzić zwarty wykres i rozwijane szczegóły oraz stany edycji, oczekiwania i błędów.
3. Zaktualizować testy komponentowe i przeglądarkowe według UX-01–UX-18 oraz nazwy zakładki w pomocy i dokumentacji użytkowej.
4. Przeklikać oba tryby na desktopie i telefonie; porównać zrzuty całej strony z audytem, uwzględniając częściowy rebalans, edytor i powiększenie. Same zielone testy funkcjonalne nie zastępują tej oceny.
5. Wykonać wymagane kontrole według `AGENTS.md`; ewentualne scalenie wymaga autoryzacji użytkownika dla tej zmiany i udanego pełnego CI dla aktualnego commita.

Implementacja autoryzowana poleceniem użytkownika „zaimplementuj i zmerguj zmiany do main”; weryfikacja i scalenie są śledzone w PR #109.
