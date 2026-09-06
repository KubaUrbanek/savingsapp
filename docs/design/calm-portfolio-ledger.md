# Spokojna księga portfela

Kolejność wdrożenia, wspólną macierz odbioru i bramę akceptacji pilota opisuje
[`calm-portfolio-ledger-delivery-plan.md`](calm-portfolio-ledger-delivery-plan.md).

Makieta porównawcza przed wdrożeniem znajduje się w pliku
[`calm-portfolio-ledger-mockups.html`](calm-portfolio-ledger-mockups.html). Obejmuje widoki
desktop (1440 px), tablet (768 px) i mobile (375 px) oraz stany `success`, `empty`,
`loading` i `waiting-for-projection`.

## Kierunek

- **Paleta:** neutralne płótno `#f4f6f3`, biel księgi `#ffffff`, atrament `#1c2720`,
  tekst pomocniczy `#59655d`, linia `#d9dfda` i jeden akcent zielony `#24623f`.
- **Typografia:** systemowy bezszeryfowy krój dla spokojnej czytelności; wszystkie kwoty,
  daty i procenty korzystają z cyfr tabelarycznych.
- **Układ:** aktualny stan portfela jest jedyną dużą, pełną powierzchnią akcentową.
  Zwykłe sekcje są otwarte i oddzielone odstępem, nagłówkiem oraz linią.
- **Hierarchia:** kolor, obrys i powierzchnia komunikują stan. Cienie i dekoracyjne
  gradienty nie są częścią języka wizualnego.
- **Responsywność:** desktop pokazuje szeroki rytm księgi, tablet redukuje siatki do dwóch
  kolumn, a mobile do jednej kolumny bez poziomego przewijania głównej zawartości.

## Autokrytyka przed implementacją

Pierwsza koncepcja używała wielu jasnych kart dla metryk. Została odrzucona, ponieważ
powtarzałaby typowy zestaw kart dashboardu i konkurowała z bieżącą wartością. W wersji
wdrażanej metryki są wierszami księgi z cienkimi podziałami, a zielona powierzchnia jest
zarezerwowana wyłącznie dla aktualnego stanu portfela.
