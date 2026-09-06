# Plan wdrożenia spokojnej księgi portfela

Plan dzieli zmianę przekrojową na osiem małych, kolejnych etapów. Każdy etap ma własny
zakres, testy i kryterium wycofania. Etapy 1–4 przygotowują oraz weryfikują pilot widoku
właściciela. **Etapy 5–8 nie rozpoczynają się przed zaakceptowaniem pilota po etapie 4.**

## Niezmienne warunki każdego etapu

- Kontrakty `/api`, metody HTTP, kształty DTO oraz istniejące komendy aplikacyjne pozostają
  bez zmian.
- Uprawnienia, lista właścicieli, zapis preferencji i reguła wyboru właściciela pozostają
  bez zmian. Widok gospodarstwa nadal jest zakresem portfela, a nie właścicielem.
- Zmiana dotyczy prezentacji. Nie przenosi polityki domenowej do komponentów ani mechaniki
  HTTP lub storage poza infrastrukturę.
- Nowa reguła CSS zastępuje starą w tym samym etapie. Nie pozostawiamy równoległych klas,
  aliasów ani definicji komponentu „na później”.
- Test powstaje na najniższym użytecznym poziomie: test arkusza dla tokenów, test
  komponentowy dla renderowania i interakcji, a test trasy tylko dla zachowania routingu.
- Jeden etap odpowiada jednemu skupionemu commitowi i pull requestowi. Wycofanie etapu nie
  wymaga wycofania późniejszej, niepowiązanej funkcji.

## Wspólna macierz odbioru

Po **każdym** etapie porównujemy z baseline’em szerokości `375`, `768`, `1024` i `1440` px.
W każdej szerokości sprawdzamy stany `loading`, `empty`, `success`, `error` oraz `busy`.
`busy` oznacza zarówno oczekiwanie przy komendzie, jak i odświeżanie projekcji po
zaakceptowaniu komendy; istniejące dane nie mogą wtedy zostać omyłkowo przedstawione jako
dane innego właściciela.

Dla każdego punktu macierzy sprawdzamy:

1. brak poziomego przewijania głównej zawartości i utraty informacji,
2. logiczną kolejność fokusu, widoczny fokus i poprawne nazwy dostępności,
3. stabilność układu podczas przejścia między stanami,
4. czy komunikat stanu oraz dostępna akcja ponowienia są widoczne,
5. czy wybór właściciela, filtry i dostępność komend są identyczne z baseline’em.

Wynik porównania (zrzut albo notatka „bez różnic zamierzonych”) dołączamy do opisu PR.
Automatyczne testy komponentowe nie zastępują tej macierzy wizualnej.

## 1. Baseline

**Zakres:** utrwalić aktualne trasy, sekcje, kolejność fokusu, punkty responsywne i pięć
stanów. Przygotować powtarzalne dane reprezentatywne dla właściciela i gospodarstwa, bez
zmiany kodu produkcyjnego.

**Test najniższego poziomu:** test komponentowy `AppRouter`, który opisuje widoczne
punkty orientacyjne, wybór właściciela i istniejące komendy; istniejące testy dostępności
pozostają strażnikiem nazw i ról.

**Odbiór i wycofanie:** komplet referencji dla całej wspólnej macierzy. Etap można
wycofać przez usunięcie wyłącznie fixture’ów, snapshotów i testów baseline’u.

## 2. Tokeny

**Zakres:** uporządkować semantyczne tokeny koloru, typografii, odstępów, promieni,
obramowań, fokusu, elewacji i ruchu w `styles.css`. Zastąpić wartości odpowiadające tej
samej roli tokenem i od razu usunąć wyparte deklaracje.

**Test najniższego poziomu:** test jednostkowy arkusza stylów sprawdzający wymagane tokeny,
kontrast par tekst–tło i brak wycofanych deklaracji/aliasów.

**Odbiór i wycofanie:** macierz może różnić się wyłącznie udokumentowanym językiem
wizualnym; DOM i zachowanie pozostają identyczne. Revert dotyczy jednego pliku stylów i
jego testu.

## 3. Prymitywy prezentacji

**Zakres:** ujednolicić małe prymitywy (`Button`, `Field`, `InlineMessage`, `Metric`,
`SectionHeader`, `DataTable`, `QueryBoundary`) bez uzależniania ich od portfela. Każda
migracja usuwa zastąpiony markup i selektory w tym samym etapie.

**Test najniższego poziomu:** izolowane testy komponentowe wariantów, semantyki,
interakcji klawiaturą oraz stanów disabled/`aria-busy`; `QueryBoundary` dodatkowo pokrywa
pięć stanów wspólnej macierzy.

**Odbiór i wycofanie:** strony nadal składają te same intencje i komendy. Prymitywy można
cofnąć wraz z migracją ich pierwszych konsumentów, bez zmian warstw application/domain.

## 4. Pilot właściciela

**Zakres:** zastosować tokeny i prymitywy tylko do podstawowego obszaru jednego
właściciela: przełącznika, podsumowania, jednej sekcji danych i formularza komendy. Nie
migrować jeszcze gospodarstwa ani tras pomocniczych.

**Test najniższego poziomu:** test komponentowy strony z wstrzykniętymi fake use case’ami,
obejmujący wybór obu właścicieli, pięć stanów, walidację formularza i zablokowanie
powtórnego wysłania podczas `busy`.

**Odbiór i wycofanie:** pełna macierz jest przeglądem pilota z interesariuszem. Weryfikujemy
również, że zmiana właściciela nie pokazuje poprzednich danych. Pilot ma osobny PR i można
go cofnąć bez cofania tokenów lub prymitywów.

> **Brama akceptacji:** dalsze etapy pozostają wstrzymane do jawnego zatwierdzenia pilota.
> Uwagi do języka wizualnego poprawiamy w pilocie, a nie równoległymi wyjątkami w kolejnych
> widokach.

## 5. Stany query/CQRS

**Zakres:** po akceptacji pilota zastosować jeden model prezentacji `idle/loading/success/
failure` oraz rozróżnienie przyjętej komendy od synchronizacji projekcji. Zachować
anulowanie zapytań i niezależność sekcji; nie zmieniać use case’ów ani endpointów.

**Test najniższego poziomu:** testy hooka kontrolera dla zapytań nieaktualnych,
anulowania i projekcji oraz test komponentowy `QueryBoundary` dla `loading`, `empty`,
`success`, `error` i odświeżania `busy` z zachowaniem danych.

**Odbiór i wycofanie:** macierz uwzględnia przejścia, nie tylko statyczne kadry. Etap można
cofnąć bez cofania wyglądu zaakceptowanego pilota.

## 6. Zestawienia danych

**Zakres:** przenieść wykresy, metryki, alokacje i tabele właściciela na zaakceptowane
prymitywy. Zachować etykiety, wartości, sortowanie, filtry i akcje. Usunąć poprzednie
kontenery i style po migracji każdego zestawienia.

**Test najniższego poziomu:** osobne testy komponentowe wykresu, paneli alokacji i tabeli
dla danych pustych i pełnych, etykiet dostępności, przewijania/układu oraz istniejących
akcji.

**Odbiór i wycofanie:** porównanie całej macierzy właściciela, w tym długich kwot i nazw.
Etap nie dotyka gospodarstwa, więc jego revert nie wpływa na agregację.

## 7. Widok gospodarstwa

**Zakres:** zastosować zatwierdzony język do agregatu gospodarstwa. Zachować
`HouseholdPortfolio`, skład właścicieli i obliczenia; nie tworzyć syntetycznego właściciela
ani nowych możliwości zapisu.

**Test najniższego poziomu:** test komponentowy `HouseholdDashboard` dla udziałów,
wartości, pustego gospodarstwa, częściowych błędów i braku komend wymagających pojedynczego
właściciela.

**Odbiór i wycofanie:** pełna macierz gospodarstwa oraz kontrola przejść właściciel ↔
gospodarstwo. Revert ogranicza się do kompozycji i stylów gospodarstwa.

## 8. Regresja tras pomocniczych

**Zakres:** usunąć ostatnie osierocone style, a następnie sprawdzić `About`, `NotFound`,
nagłówek, skip-link i zachowanie routingu SPA. Neutralne elementy tras pomocniczych nie
mogą przejąć reguł formularzy portfela.

**Test najniższego poziomu:** test komponentowy `AppRouter` dla wejścia bezpośredniego,
nawigacji, cofania, nieznanej trasy, przeniesienia fokusu i skip-linku; test arkusza
potwierdza brak zastąpionych selektorów.

**Odbiór i wycofanie:** ostatnie porównanie wspólnej macierzy na trasie głównej oraz
kontrola wszystkich tras pomocniczych w czterech szerokościach. Etap można wycofać bez
zmiany portfela, API lub komend.

## Kontrole przed scaleniem każdego etapu

Z katalogu `frontend/` uruchamiamy:

```bash
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Ponadto uruchamiamy `git diff --check`, przeglądamy `git diff` i potwierdzamy, że PR nie
zawiera wygenerowanego buildu, zależności ani plików lokalnych. Pełny `mvn clean package`
jest wymagany dopiero wtedy, gdy etap dotknie integracji lub pakowania.
