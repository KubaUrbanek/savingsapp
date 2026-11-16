# Prompt implementacji

Zaimplementuj w repozytorium KubaUrbanek/savingsapp zatwierdzone SDD docs/specs/beginner-ux-sdd.md. Przeczytaj też docs/specs/beginner-ux-audit.md, AGENTS.md i właściwe przewodniki architektury. Zacznij od aktualnego main i porównania specyfikacji z obecnym kodem; audyt opisuje wcześniejsze wdrożenie, więc nie odtwarzaj już naprawionych problemów.

Wiążące decyzje:
- Jeden wspólny plan dla Jakuba, Zosi i Razem. Migracja z dotychczasowego planu Razem: obligacje 50%, złoto 25%, akcje rynków rozwiniętych 17,5%, wschodzących 7,5%. Nie zachowuj osobnych aktywnych planów osób. Zmiana osoby wybiera aktywa do obliczeń, nie inne proporcje.
- Jeden płaski podział 100%. Zachowaj obecne wyrównywanie udziałów przez zakupy bez sprzedaży; nie zastępuj go mechanicznym podziałem każdej wpłaty.
- Kalkulator uwzględnia wyłącznie obligacje, złoto i akcje. Inne aktywa całkowicie pomija, bez ostrzeżeń, sekcji i komunikatów. Przegląd nadal pokazuje wszystkie oszczędności.
- Budżet jest dowolną kwotą; nie doliczaj gotówki ani nie zapisuj symulacji jako transakcji.
- Zachowaj jasny wygląd z zielonym akcentem. Celem jest prosta, wygodna obsługa całej aplikacji.

Wykonaj całość, nie tylko ekran planu: nawigację, filtry, wykresy, formularze, historię, kopie, pomoc, błędy, telefon i dostępność. Prowadź mapowanie UX-01–UX-39/KOD-01–KOD-03 do zmian i testów E01–E32. Hipotezy najpierw potwierdź. Zachowaj istniejące poprawne zachowania, dane i zgodność kopii. Testy zapisów, usuwania, importu i migracji wykonuj wyłącznie na izolowanych danych; nie eksperymentuj na portfelu produkcyjnym.

Pracuj na gałęzi implementacyjnej, etapami zgodnymi z SDD. Nie zmieniaj zaakceptowanych decyzji i nie ograniczaj zakresu bez wskazania realnej przeszkody. Uruchom wymagane kontrole oraz testy UI na 320/390/768/1440px, z rozwiniętymi tabelami, klawiaturą i błędami sieci. Nie deklaruj testów realnego telefonu lub czytnika, jeśli ich nie wykonałeś. Zaktualizuj dokumentację, przygotuj PR z podsumowaniem pokrycia i doprowadź CI dla aktualnego commita do sukcesu. Nie merguj implementacji ani nie uruchamiaj wdrożenia w ramach tego polecenia; przedstaw gotowy PR do odbioru. Sam merge dokumentacji nie oznacza, że aplikacja już spełnia SDD.
