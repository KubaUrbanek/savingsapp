# SDD: wspólne inwestycje w „Razem / Przegląd”

## Cel i ustalenia

Widok „Razem” pokazuje sumę inwestycji wszystkich właścicieli bez rozbicia na osoby.
Użytkownik potwierdził łączenie IKE i IKZE według inwestycji.

## Wymagania i kryteria akceptacji

1. Najpierw wybieramy najnowszą wycenę każdej pozycji właściciel + typ + podkategoria,
   następnie sumujemy po podkategorii (także między IKE, IKZE i Giełdą), a dla pozycji
   bez podkategorii po typie. PPK i PPO oraz różne terminy obligacji pozostają osobno.
2. Jeden wiersz/karta reprezentuje jedną inwestycję. Nie zawiera imienia ani rozbicia
   na rodzaje rachunków. Dotyczy to także pozycji należącej tylko do jednej osoby.
3. Wartość, znany wkład i znany wynik są sumowane. Brak wkładu lub wyniku choćby jednego
   składnika oznacza nieznany odpowiedni agregat, nigdy zero ani częściowy wynik.
4. Szczegóły pokazują zakres dat wycen składników; nie sugerują wspólnej daty, jeśli daty się różnią.
5. Nagłówkowe sumy nadal obejmują cały portfel. Dla dostarczonego przykładu:
   PPK = 75 806,85 zł; obligacje 3-letnie = 174 206,47 zł;
   złoto = 14 426,54 zł, wynik = -341,30 zł. Suma wartości = 313 728,07 zł.
6. Wspólne wiersze służą do odczytu. Informacja wskazuje, że edycja wartości i uzupełnianie
   wpłat odbywają się po wybraniu osoby. Nie zapisujemy agregatu jako wyceny jednej osoby.
7. Widoki indywidualne zachowują dotychczasowe pozycje, szczegóły i działania.
8. Te same reguły obowiązują w tabeli desktopowej i kartach mobilnych.

## Plan techniczny

Czysta usługa domenowa grupuje bieżące pozycje i wykorzystuje istniejącą agregację
wyników z propagacją brakujących danych. `Home` przekazuje jawny zakres do
`PortfolioOverview`. Komponent renderuje wspólne etykiety i szczegóły bez działań
zapisu dla grup. API, zapis danych i historia pozostają zgodne z dotychczasowym modelem.

## Weryfikacja

Testy jednostkowe: sumy przykładu, grupowanie IKE/IKZE, rozdzielenie terminów i typów,
brakujące wyniki, zero, pusta lista i zakres dat. Testy komponentowe: oba układy,
brak imion i działań zapisu w grupach, zachowanie działań indywidualnych.
Dodatkowo: kontrola typów, lint, formatowanie i testy architektury.
