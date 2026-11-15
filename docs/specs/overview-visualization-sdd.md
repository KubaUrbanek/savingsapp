# SDD: graficzny Przegląd oszczędności

Status: specyfikacja zapisana przed implementacją, 2026-11-15.

## Cel i uzgodnienia

Przegląd ma pokazywać czytelny rozkład obecnych oszczędności oraz zmianę ich wartości w czasie. Nowy wykres historii **zastępuje** dotychczasową rozwijaną Historię wartości. Osobna zakładka Historia operacji pozostaje niezależna. Specyfikacja jest wersjonowanym artefaktem repozytorium i częścią tego samego MR/PR co implementacja.

Uzgodnione z użytkownikiem:

- Przełącznik między podziałem według kont/produktów a rodzajami aktywów.
- Domyślnie zaznaczone wszystkie dostępne grupy; możliwość odznaczania i zaznaczania wielu grup, np. PPK i PPO.
- Zaznaczenia filtrują cały Przegląd: rozkład, historię wartości, kwoty podsumowania i listę inwestycji.
- Historia jest od razu widoczna: domyślnie linia sumy, opcjonalnie rozbicie zgodne z podziałem.
- Zakres domyślny: ostatnie 12 miesięcy. Dostępne: 1 miesiąc, 3 miesiące, 6 miesięcy, 1 rok, cała historia, własny zakres dat.
- Reset zaznaczeń do wszystkich zarówno przy zmianie podziału, jak i po opuszczeniu Przeglądu do innej zakładki.

## Zakres i świadome decyzje projektowe

Zmiana frontendowa, bez nowych API, migracji, zewnętrznych bibliotek wykresów ani zapisu preferencji. Dane istnieją już w historiach wycen i wynikach poszczególnych inwestycji. Wizualizacja działa dla pojedynczej osoby i zakresu Razem. Filtry Przeglądu nie wpływają na plan zakupów ani historię operacji.

Nowy wspólny wybór grup zastępuje dotychczasowe pojedyncze filtry rodzaju/podinwestycji w Przeglądzie i lokalne filtry starego wykresu. Konta/produkty oznaczają istniejące typy inwestycji (np. IKE, IKZE, Giełda, Obligacje, PPK, PPO i konta bankowe), a nie nowe identyfikatory rachunków bankowych. W zakresie Razem dana grupa sumuje wszystkie osoby.

## Układ i interakcje

1. Przełącznik „Konta / produkty” oraz „Rodzaje aktywów” i widoczne checkboxy dostępnych grup, z przyciskami „Zaznacz wszystkie” i „Odznacz wszystkie”.
2. Obecne podsumowanie wpłat, wartości i wyniku dla zaznaczonego zakresu.
3. Dwa panele wykresów obok siebie na szerokim ekranie, jeden pod drugim na telefonie: rozkład obecnej wartości oraz historia wartości.
4. Istniejąca tabela/karty inwestycji i ich działania pozostają dostępne poniżej wykresów.

Rozkład: poziome paski udziałów, etykiety, kwoty w PLN i procent zaznaczonej sumy. Taka forma pozostaje czytelna przy wielu grupach i na telefonie. Niezaznaczone grupy pozostają dostępne w filtrze, ale znikają z wykresów i listy. Kolory grup są stałe w ramach podziału i wspólne dla obu wykresów. Zaokrąglenie procentów nie zmienia kwot.

Historia: linia łącznej wartości oraz opcja „Pokaż rozbicie”. Po jej włączeniu linia sumy pozostaje, a dodawane są serie zaznaczonych grup. Legenda opisuje wszystkie serie; oprócz koloru stosowane są różne wzory linii. Dokładne daty i wartości dostępne w rozwijanej tabeli danych, obsługiwanej również klawiaturą. Nie jest wymagany hover, żeby odczytać dane.

Domyślny stan po wejściu do Przeglądu: konta/produkty, wszystkie grupy, 1 rok, rozbicie wyłączone. Zmiana podziału resetuje zaznaczenia, zachowując zakres czasu i opcję rozbicia. Opuszczenie Przeglądu, otwarcie ustawień lub zmiana osoby/zakresu Razem resetuje stan Przeglądu do domyślnego. Kliknięcie już aktywnego podziału/zakładki nie resetuje wyboru. Ustawienia nie są zapamiętywane po odświeżeniu strony.

## Reguły danych

### Klasyfikacja i wybór

Wspólny czysty selektor decyduje o przynależności do grupy. Podział aktywów używa istniejącej `InvestmentClassificationPolicy.globalAssetClass`: Akcje, Obligacje, Złoto, Gotówka, Nieznany skład (PPK/PPO). Złoto na IKE/IKZE pozostaje złotem; obligacje na IKE/IKZE pozostają obligacjami. Nie przypisujemy PPK/PPO do gotówki i nie zgadujemy ich składu.

Dostępne grupy wynikają z całej historii wycen do dzisiaj w wybranym zakresie osób, również gdy obecna wartość grupy wynosi zero. Wartość obecna to najnowsza wycena dla klucza właściciel + typ + podkategoria; przy tej samej dacie rozstrzyga `createdAt`, zgodnie z istniejącą polityką. Wyceny przyszłe nie wchodzą do podsumowań ani wykresów.

Wyniki i wpłaty są agregowane z wyników wybranych inwestycji za pomocą istniejącej polityki agregacji. Nieznany koszt/wynik pozostaje nieznany, a nie zerowy. Nie uśredniamy procentowych stóp zwrotu. Zmiana checkboxa nie wykonuje nowych zapytań sieciowych. Gdy nie ma żadnej wybranej grupy: wartość obecna 0 PLN, brak wierszy inwestycji, jawny komunikat o pustym wyborze i możliwość zaznaczenia wszystkich; nie pokazujemy pozornego zysku.

### Oś czasu

Zakres czasu ogranicza tylko historię wartości, a nie obecne saldo, listę inwestycji ani całożyciowe wpłaty/wynik. Opis przy kontrolkach wyjaśnia tę różnicę. Granice są włączne, według kalendarzowej daty aplikacji. Odjęcie miesięcy przycina dzień do końca miesiąca docelowego (np. 31 marca minus miesiąc = 28/29 lutego).

Seria używa dat faktycznych wycen oraz granic zakresu; skala X jest proporcjonalna do czasu. Dla każdej daty uwzględniamy najnowsze znane wyceny do tej daty, przenosząc je w przód. Na początek zakresu przenosimy także wyceny sprzed zakresu. Nigdy nie podstawiamy dzisiejszej wartości w przeszłości ani nie interpolujemy brakujących wycen. Linia schodkowa pokazuje zmianę tylko w dniu wyceny. Przed pierwszą znaną wyceną inwestycja nie wnosi wartości; wykres nie dowodzi, że wcześniej miała rzeczywiście wartość zero. Wyjaśnienie tej zasady jest widoczne przy wykresie.

Brak nowych wycen w zakresie, ale istnieje wcześniejsza wycena: pokazujemy stałą ostatnią znaną wartość. Brak jakiejkolwiek wyceny do końca zakresu: komunikat o braku danych. Dla jednego dnia/jednego punktu widoczny punkt. Zero nie powoduje dzielenia przez zero. Dla całości historia zaczyna się od pierwszej wybranej wyceny i kończy dziś. Własny zakres wymaga obu poprawnych dat, początku <= końca oraz końca <= dziś; błędny zakres pokazuje zrozumiały komunikat i nie rysuje mylących danych.

Zmiana wartości nie oznacza zysku: obejmuje wpłaty, wypłaty i zmiany wyceny. Komunikat przy wykresie wyraźnie to zaznacza. Dane nie są rynkowymi notowaniami pomiędzy zapisanymi wycenami.

## Architektura

- Domena: typowany, czysty moduł polityki grupowania, filtracji, rozkładu, zakresów i historii; korzysta z istniejących kluczy snapshotu i klasyfikacji. Bez React, HTTP i pamięci przeglądarki.
- Prezentacja: komponent wspólnego filtra i komponent wykresów SVG/HTML, stan wyboru na poziomie Przeglądu. Widok otrzymuje wpisy i wyniki, bez wywołań adapterów.
- Home/controller: pobranie pełnego zakresu osoby/gospodarstwa; selekcja lokalna spójna dla wartości, wyników, listy i obu wykresów. Dotychczasowe ścieżki odświeżania i błędów zostają zachowane.
- Style wyłącznie w `frontend/src/styles.css`, z istniejącymi tokenami i breakpointami 860/640 px. Bez nowych zależności.
- Dotychczasowy SummaryChart może pozostać dla niezależnych istniejących konsumentów; Home nie renderuje go ani dodatkowej, starej Historii wartości.

## Dostępność i stany brzegowe

Natywne checkboxy i opisane kontrolki, widoczny focus, sterowanie klawiaturą, semantyczne grupy. Wykresy mają nazwy i tekstowy opis; dane tabelaryczne są alternatywą dla grafiki. Kolor nie jest jedynym nośnikiem informacji. Układ nie powoduje poziomego przewijania całej strony na telefonie; tabela może mieć własne przewijanie. Nie wymagamy animacji.

Zachowujemy istniejące granice stanów ładowania, błędów i retry. Nie pokazujemy danych innej osoby podczas zmiany zakresu. Awaria wyników nie usuwa znanej wartości, ale nie może przedstawiać nieaktualnego wyniku jako potwierdzonego. Puste portfolio nadal prowadzi do dodania pierwszego stanu.

## Kryteria akceptacji i weryfikacja

1. Domyślnie wszystkie grupy, aktualna suma i suma rozkładu są identyczne.
2. Odznaczenie PPK/PPO usuwa je z wartości, wpłat/wyników, listy i historii; ponowne zaznaczenie przywraca.
3. Podział według aktywów poprawnie łączy aktywa z różnych kont; PPK/PPO są nieznanym składem.
4. Zmiana podziału i opuszczenie zakładki przywracają wymagane ustawienia; filtry nie przeciekają do planu i historii operacji.
5. Każdy zakres czasu działa; własny zakres waliduje się; uwzględniana jest wartość otwarcia sprzed zakresu i ostatnia znana wartość.
6. Historia uwzględnia obie osoby, kolejność wycen tego samego dnia, zerowe saldo i brak danych; pomija przyszłe wyceny.
7. Rozbicie sumuje się do serii łącznej; kolory są stabilne po filtrowaniu; brak wyboru jest jawny.
8. Jedna widoczna historia wartości zastępuje poprzedni panel, na desktopie i telefonie.
9. Testy domenowe pokrywają obliczenia i daty; komponentowe filtrację, reset, rozbicie, puste stany i dostępność; przeglądarkowe przepływ w widokach desktop/mobile.
10. Uruchomić odpowiednie testy frontendowe, typecheck, lint, format i build; sprawdzić diff. Pełna walidacja CI aktualnego commita przed scaleniem. MR/PR zawiera link do SDD i wyniki weryfikacji. Bez automatycznego scalania.
