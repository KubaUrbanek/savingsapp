# SDD: czytelne odchylenia i rebalans wybranych aktywów

Status: realizacja autoryzowana przez użytkownika 2026-11-16, łącznie ze scaleniem po CI. Rozszerzenie [specyfikacji rebalansu](2026-11-16-rebalans-portfela.md).

Wdrożenie tego rozszerzenia scalono w [PR #106](https://github.com/KubaUrbanek/savingsapp/pull/106). Kolejna propozycja, [SDD uporządkowania ekranu „Plan portfela”](2026-11-16-planning-screen-order.md), została zatwierdzona do scalenia jako dokumentacja. Zastępuje układ i sposób prezentacji opisane tutaj (w tym położenie łącznej wartości i szczegółów po rebalansie), zachowując dane wykresu oraz reguły wyboru i wyliczeń.

## Widok odchyleń

Obecny zestaw kart zastępujemy jednym panelem porównawczym. Wartość inwestycji stanowi wyraźne podsumowanie. Każda z czterech kategorii ma parę poziomych słupków „Teraz” i „Cel”, na wspólnej skali 0–100%, czytelne wartości procentowe, bieżącą kwotę i tekstową informację o nadwyżce/niedoborze w PLN i pp. Wykres pokazuje pełny zakres wybranej osoby lub gospodarstwa względem zapisanego wspólnego planu v3.

Kolor nie zastępuje etykiet. Wszystkie liczby są dostępne jako tekst, dekoracyjne słupki mają `aria-hidden`. Kategorie zachowują spójne położenie i wspólną skalę. Na telefonie dane układają się pionowo bez przewijania poziomego; respektujemy powiększenie, klawiaturę, widoczny fokus i reduced motion. Dla zerowej sumy pokazujemy „—” zamiast pozornych udziałów.

## Wybór aktywów

W trybie „Rebalans obecnego portfela” pojawia się pole wyboru dla obligacji, złota oraz obu rynków. Domyślnie wszystkie są zaznaczone. Odznaczona kategoria jest zamrożona: brak zakupu/sprzedaży, wartość po rebalansie identyczna jak obecna. Jest oznaczona „Bez zmian — poza rebalansem”. Wybór działa tylko na symulację; nie zmienia zapisanego planu ani algorytmu dokupowania. Jest zachowany przy przełączaniu trybów w tym samym zakresie; zmiana osoby/zakresu lub rewizji planu przywraca zaznaczenie wszystkich kategorii.

Niech S oznacza zaznaczone kategorie, V ich łączną obecną wartość, a W sumę ich zapisanych wag. Dla W > 0 docelowa wartość zaznaczonego składnika to `V × jego waga / W`. Pozostałe składniki zachowują wartość. Proporcje dotyczą więc zaznaczonej części; nie obiecujemy spełnienia globalnych celów przy zamrożonych nadwyżkach/niedoborach. Podsumowanie pokazuje wartość zaznaczoną i zamrożoną, a wynik oznacza rebalans częściowy. Porównanie po zmianach pokazuje rzeczywisty udział w całym portfelu i zapisany cel całego portfela. Wykres obecnych odchyleń zawsze dotyczy tego samego pełnego portfela, niezależnie od zaznaczenia.

Kwoty liczymy w groszach z dokładnymi dziesiętnymi wagami i podziałem największych reszt; remis rozstrzyga dotychczasowa kolejność kategorii. Zakupy = sprzedaż, wartość całego portfela i wybranej części są zachowane. Wykluczone aktywa nie finansują zakupów. Waga 0% pozwala sprzedać cały zaznaczony składnik, gdy inny zaznaczony składnik ma dodatni cel.

Brak zaznaczenia blokuje rekomendacje z komunikatem „Wybierz aktywa do rebalansu”. Jeżeli wszystkie zaznaczone wagi są zerowe, nie generujemy transakcji i prosimy o wybór kategorii z dodatnim celem. Pojedyncza zaznaczona kategoria nie pozwala przesunąć środków: pokazujemy wyjaśnienie zamiast deklaracji zgodności całego portfela. Przy braku środków w wybranej części nie proponujemy transakcji. Poprawnie zbilansowana część otrzymuje komunikat o zgodności tej części w dokładności do grosza.

## Przykład

Portfel: obligacje 7 000, złoto 1 000, rozwinięte 1 500, wschodzące 500 zł. Cele: 50 / 25 / 17,5 / 7,5%. Po wyłączeniu obligacji kwota rebalansu wynosi 3 000 zł; pozostałe wagi normalizują się do 50 / 35 / 15%. Wynik: obligacje 7 000 bez zmian; złoto 1 500 (kup 500), rozwinięte 1 050 (sprzedaj 450), wschodzące 450 (sprzedaj 50). Sprzedaż = zakupy = 500 zł. Cały portfel nadal ma 10 000 zł, a udział obligacji nadal wynosi 70% wobec zapisanego celu 50%.

## Kryteria i testy

- Pełne zaznaczenie zachowuje wcześniejsze wyniki; wyłączenie obligacji oraz złota działa zgodnie z powyższą regułą.
- Wykluczone wartości pozostają identyczne, nie pojawiają się na listach zleceń; zakupy i sprzedaż bilansują się co do grosza, również przy małych kwotach i precyzyjnych wagach.
- Brak zaznaczenia, jedno aktywo, zerowe cele i brak środków mają osobne komunikaty bez mylących rekomendacji.
- Odchylenia całego portfela nie zmieniają się po przełączeniu zaznaczeń; propozycje i wartości po rebalansie aktualizują się od razu.
- Checkboxy obsługują klawiaturę i czytnik ekranu; wykres ma tekstowe dane, stałą skalę i widoczny podpis „Teraz / Cel”.
- Zmiana zakresu resetuje wybór; zmiana trybu zachowuje wybór, a dokupowanie nadal używa wszystkich zapisanych celów i własnego budżetu.
- Testy domenowe i komponentowe, axe, TypeScript, lint, formatowanie i build. CI obejmuje backend i testy przeglądarkowe desktop/mobile z asercją braku przepełnienia i zapisów podczas podglądu. Scalenie dopiero po sukcesie CI aktualnego commita.

## Architektura i zakres

Czysta polityka wyboru i normalizacji należy do `CurrentPortfolioRebalancing`, stan zaznaczenia do panelu planowania, prezentacja wykresu do osobnego komponentu. Nie zmieniamy API, bazy, formatu planu ani sposobu zapisu transakcji. Nadal jest to symulacja kategorii według zapisanych wycen, przed kosztami i podatkami.
