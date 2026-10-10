# Audyt aplikacji Oszczędności — 10 października 2026

## Ocena

Aplikacja ma użyteczne podstawy: rejestr wpłat i wycen, historię, podział portfela i kopie danych. Obecnie nie daje jednak dostatecznie wiarygodnej odpowiedzi na podstawowe pytania oszczędzającego: ile wpłaciłem, ile mam, ile zarobiłem i co kupić za dostępny budżet. Najpierw należy poprawić znaczenie i spójność liczb, potem uprościć ekran i planowanie zakupów.

Ten dokument opisuje stan przed poprawkami. Potwierdzone zachowania oddzielono od rekomendacji produktowych. Wdrożenie i końcową weryfikację opisuje [raport poprawek](2026-10-10-wdrozone-poprawki.md).

## Uruchomienie i zakres

- Serwer dla użytkownika: http://localhost:8080 — istniejący zbudowany JAR, zdrowie `UP`. Lokalna baza na początku audytu była pusta.
- Osobny serwer testowy: http://localhost:8081, baza `/tmp/savingsapp-audit/portfolio.json`. Dane testowe nie trafiały do bazy serwera 8080.
- Przegląd działającej aplikacji w Chromium, widoki 1280 × 800 / 720 i 390 × 844; formularz, podsumowanie, filtry, alokacja, obsługa błędu zapisu. Dodatkowo przegląd kodu historii, gospodarstwa, klasyfikacji i obliczeń.
- Testy frontendowe: 36 jednostkowych i 63 komponentowe przeszły.
- Backend: `mvn test`, 39 testów w 8 zestawach, bez błędów. Maven uruchomiony z lokalnym repozytorium `/workspace/.m2/repository`, ustawieniami proxy i systemowym magazynem CA. Pierwsza próba bez systemowego magazynu CA zakończyła się błędem certyfikatu; ponowna próba z poprawnym magazynem przeszła.
- `npm run typecheck`, `npm run lint`, `npm run format:check` przeszły; lint ma istniejące ostrzeżenie o zależnościach efektu w `Home.tsx:113`.
- Zielone testy nie wykrywają opisanych poniżej scenariuszy użytkownika.

## Potwierdzone błędy i problemy

### 1. P1 — zakup jest przedstawiany jako zysk

**Odtworzenie:** wpłata i wycena rynków rozwiniętych 1000 zł; następnie w formularzu „Dodaj środki → Zakup aktywa” za 100 zł. Brak wzrostu ceny aktywa.

**Wynik:** API zwraca wartość 1100 zł, kapitał 1000 zł, wynik +100 zł i stopę 10%. Wynik miesięczny również wynosi +100 zł. XIRR wynosi około 450,88%.

**Przyczyna:** formularz zwiększa wycenę o zakup, ale kalkulator kapitału uwzględnia tylko DEPOSIT/WITHDRAWAL. Ponadto BUY trafia do przepływów XIRR z dodatnim znakiem. Zakup nie jest połączony z pomniejszeniem gotówki finansującej transakcję.

**Poprawka:** rozdzielić pieniądze wniesione z zewnątrz od przesunięć wewnątrz portfela. Zakup powinien przenosić gotówkę do aktywa albo jawnie pytać, czy jest finansowany nową wpłatą. Sam zakup nie może tworzyć zysku ani dodatkowego majątku. Na poziomie pojedynczego aktywa poprawnie przypisywać koszt zakupu i wpływy ze sprzedaży.

**Kod:** `backend/src/main/java/pl/oszczednosci/app/domain/service/PortfolioPerformanceCalculator.java:14`, `:17`; `frontend/src/application/portfolio/RecordPortfolioChange.ts`; `frontend/src/infrastructure/http/FetchPortfolioCommandGateway.ts`.

### 2. P1 — nieznany koszt początkowy jest traktowany jak zerowy

**Odtworzenie:** nowy portfel Zosi, „Ustaw aktualną wartość”, konto bankowe 500 zł, bez zapisanej historii wpłat.

**Wynik:** „Łączny wynik inwestycji +500 zł” i „Zmiana w tym miesiącu +500 zł”.

**Oczekiwane:** „Masz 500 zł”; wynik nieznany, dopóki użytkownik nie poda wkładu początkowego lub kompletnej historii. Wpisanie posiadanych oszczędności nie oznacza zarobienia ich przez aplikację.

**Poprawka:** onboarding „Ile masz dziś?” i „Ile łącznie wpłaciłeś?”. Modelować brak danych o kapitale i nie pokazywać pozornego zysku ani wyniku miesięcznego przy braku punktu odniesienia.

**Kod:** `PortfolioPerformanceCalculator.java:15`, `:20`; `Home.tsx:583`.

### 3. P1 — częściowy zapis i niebezpieczna ponowna próba

**Odtworzenie:** wpłata 25 zł; w przeglądarce przerwano wyłącznie POST `/api/investments`, po udanym POST operacji.

**Wynik:** operacja wpłaty pozostaje w bazie, wycena nie jest zmieniona. UI: „Nie udało się zapisać zmiany. Sprawdź dane i spróbuj ponownie”. Kapitał wzrasta o 25 zł, stan nie wzrasta, a wynik spada o 25 zł. Ponowna próba grozi drugą wpłatą.

**Poprawka:** jeden atomowy endpoint dla operacji i powiązanej wyceny, z ochroną przed powtórnym zapisem. Doraźnie ujawnić częściowy sukces, odświeżyć stan i umożliwić dokończenie wyceny bez ponownego tworzenia wpłaty.

**Kod:** `FetchPortfolioCommandGateway.ts`; `Home.tsx:349` ukrywa szczegółowy komunikat adaptera.

### 4. P1 — wybrana podkategoria pokazuje wartość całego rachunku

**Odtworzenie:** Giełda: złoto 200 zł, rynki rozwinięte 1000 zł, rozwijające się 500 zł. Wybierz Giełda → Złoto.

**Wynik:** nagłówek „Złoto”, ale główna wartość 1700 zł zamiast 200 zł. Wynik inwestycji jest liczony dla złota, karty rodzajów dla całego portfela, a wykres pokazuje 3700 zł wszystkich inwestycji.

**Poprawka:** jednoznacznie oddzielić globalne podsumowanie od szczegółów. Wszystkie liczby w szczegółach muszą mieć ten sam zakres. Jeśli wykres ma niezależny filtr, pokazać to wyraźnie i zsynchronizować jego domyślny zakres.

**Kod:** `Home.tsx:127` filtruje stan tylko po typie, pomijając podkategorię; `:134`; `SummaryChart.tsx` ma niezależny wybór zakresu.

### 5. P1 — podsumowanie nie znika przy zmianie zakładki

**Odtworzenie:** przejdź do Aktualizacji lub Alokacji.

**Wynik:** `portfolio-panel-summary` ma `hidden=true`, ale obliczony styl `display:grid` i nadal zajmuje miejsce. Użytkownik widzi stare podsumowanie; właściwy formularz znajduje się niżej. Na telefonie problem jest szczególnie dotkliwy.

**Poprawka:** przywrócić działanie `hidden` w stylach lub warunkowo renderować aktywny panel. Sprawdzić widoczność i dostępność paneli po każdej zmianie zakładki.

**Kod:** `frontend/src/styles.css:2074`, `.summaryPanel { display: grid; ... }`.

### 6. P1 — plan zakupów przekracza podany budżet

**Odtworzenie:** ETF: złoto 200 zł, rozwinięte 1100 zł, rozwijające się 500 zł; cele 40/30/30; dopłata 100 zł.

**Wynik:** zakup złota 560 zł, rozwijających się 70 zł, ograniczenie rozwiniętych o 530 zł. Dodatnie zakupy sumują się do 630 zł, choć użytkownik ma 100 zł. Ostrzeżenie opisuje problem, ale aplikacja nie podaje wykonalnego planu zakupów za 100 zł. „Stan po dopłacie” nie odejmuje ujemnej pozycji, więc również nie reprezentuje docelowego portfela po transakcjach.

**Poprawka:** domyślnie plan zakupów bez sprzedaży, z sumą zakupów nie większą od budżetu i jawną niewykorzystaną resztą. Osobno, opcjonalnie: pełne równoważenie obejmujące sprzedaż. Przy tak małej dopłacie nie obiecywać idealnych wag.

**Kod:** `RebalancingService.ts:41`; `StockAllocationPanel.tsx:279`.

### 7. P1 — nieprawidłowe wagi są zapisywane i używane do rekomendacji

**Odtworzenie:** zmień globalne wagi z 50/30/20 na 80/30/20, suma 130%.

**Wynik:** ostrzeżenie, lecz rekomendacje nadal są wyświetlane, a 130% zostaje zapisane w localStorage. Wariant bez sprzedaży mówi „dopłać 1533,33 zł”, mimo że zakupy w jego ostatniej kolumnie sumują się do 3133,34 zł.

**Poprawka:** oddzielić edycję od zatwierdzonego planu. Nie zapisywać ani nie używać niepoprawnego zestawu wag. Walidować także wartości ujemne, powyżej 100 i nie skończone. Obliczenia wstrzymać do poprawienia planu.

**Kod:** `GlobalAllocationPanel.tsx:27`, `:31`, `:94`; analogiczny wzorzec w `StockAllocationPanel.tsx`.

### 8. P2 — operacja historyczna używa dzisiejszego salda

**Odtworzenie:** obecny stan rynków rozwiniętych 1100 zł z 10 października. Dodaj wpłatę 50 zł z datą 15 września, gdy poprzednie wrześniowe saldo wynosiło 1000 zł.

**Wynik:** powstaje wrześniowa wycena 1150 zł zamiast 1050 zł, ponieważ formularz bierze najnowszy stan bez ograniczenia daty. Październikowe saldo pozostaje 1100 zł. UI następnie pokazuje ostrzeżenie, że aktualność podsumowania nie została potwierdzona. Miesięczny wynik zostaje zaburzony.

**Poprawka:** wyliczać stan względem daty operacji i jasno określić regułę przeliczenia późniejszych zapisów. Nie nadpisywać historii na podstawie bieżącego salda. Dla samodzielnych wycen zachować ich rzeczywiste znaczenie; potrzebne są reguły rekonstrukcji historii, a nie samo dodawanie do ostatniej kwoty.

**Kod:** `portfolioChangeFormMapper.ts:14`; `usePortfolioController.ts`, potwierdzanie widoczności wyceny również w najnowszym snapshotcie.

### 9. P2 — zmiana majątku jest nazywana zyskiem w widoku Razem

**Potwierdzone w kodzie:** `HouseholdDashboard.tsx` wyświetla „Zysk/Strata” na podstawie `latestMonth.changeAmount`, a `TimeSeriesService.ts` liczy wyłącznie różnicę wycen, bez operacji. Nowa wpłata zwiększająca stan będzie więc traktowana jako zysk. Wykres „Analiza wzrostu” również pokazuje zmianę salda, nie wynik inwestycyjny.

**Poprawka:** osobno „wartość oszczędności” i „zarobione na inwestycjach”. Wykres wartości powinien mieć serię wkładu własnego lub objaśnienie wpływu wpłat. Widok Razem powinien agregować ten sam poprawny wynik co portfele indywidualne.

### 10. P2 — data najnowszej wyceny ukrywa stare dane innych aktywów

**Potwierdzone w kodzie:** `latestDataDate` to maksimum dat składników, choć stan sumuje ostatnie wyceny różnych dat. Aktualizacja jednego aktywa może nadać całemu podsumowaniu dzisiejszą „Datę danych”.

**Poprawka:** przy każdej inwestycji pokazać datę wyceny; dla całości oznaczyć nieaktualne składniki i brakujące dane. Nie sugerować, że całość została wyceniona dziś.

### 11. P2 — pomieszane klasy aktywów i rodzaje rachunków

**Potwierdzone w modelu i UI:** jedna nawigacja łączy Obligacje, Giełdę, IKE, IKZE, konta, PPK i PPO. Globalny plan klasyfikuje PPK i PPO jako gotówkę. Wszystkie IKE/IKZE mają tylko podkategorie ETF. Plan ETF zawiera złoto, natomiast globalny plan wyłącza złoto z akcji.

**Skutek:** użytkownik nie może spójnie odwzorować „obligacje/akcje, a w akcjach podział na rynki”. Domyślne plany 50/30/20 i 40/30/30 nie opisują jednej wspólnej struktury i mogą dawać sprzeczne cele dla złota. PPK nie jest automatycznie gotówką.

**Poprawka:** osobno rachunek (np. IKE), instrument (np. ETF świata lub obligacje) i klasa aktywów. Nie zgadywać składu PPK/PPO; oznaczyć go lub pozwolić użytkownikowi ustawić klasyfikację. Złoto powinno mieć jedną, spójną rolę w całym planie.

### 12. P3 — brak ikony strony

Przeglądarka zgłasza 404 dla `/favicon.ico`. Drobna poprawka estetyczna, bez wpływu na obliczenia.

## Co przebudować dla osoby oszczędzającej

### Ekran główny

Na wejściu cały portfel, bez automatycznego ograniczenia do Obligacji. Obecnie nie ma przycisku „Wszystkie inwestycje” na poziomie rodzajów, a pierwszy typ jest wybierany po pobraniu danych.

Na początku trzy czytelne kwoty:

1. **Wpłaciłem** — wkład własny; obok informacja o wypłatach, jeśli były. Rozróżnić wpłaty łącznie od kapitału po wypłatach.
2. **Mam teraz** — aktualna wartość oszczędności, z informacją o aktualności wycen.
3. **Zarobiłem / straciłem** — poprawny wynik w złotych, opcjonalnie prosty procent i jasno opisany zakres czasu. Przy niepełnej historii pokazać brak danych.

Niżej jedna tabela: inwestycja, wpłacone, wartość dziś, zysk/strata, data wyceny. Kliknięcie otwiera szczegóły. XIRR i techniczne odchylenia nie są potrzebne na głównym ekranie.

Przy rozliczaniu wyniku po opłatach uważać, by nie odejmować drugi raz kosztów już zawartych w rzeczywistym saldzie. Trzeba najpierw ustalić spójny kontrakt wartości, kosztów i wypłat.

### Jeden ekran „Co dokupić?”

Plan dwupoziomowy zgodny z opisem użytkownika:

- poziom 1: wybrany udział obligacji i akcji; ewentualne złoto jako jawna dodatkowa klasa;
- poziom 2: podział części akcyjnej, np. rynki rozwinięte i rozwijające się;
- gotówka na wydatki/poduszkę pokazana osobno, z jasną decyzją, czy bierze udział w planie;
- pole **„Mam do zainwestowania … zł”**;
- wynik: **„Dokup … za … zł”**, aktualny udział, docelowy udział, brak do celu i udział po zakupie;
- zakupy nie przekraczają kwoty; brak rekomendacji sprzedaży w podstawowym trybie;
- brak do celu przy obecnej wartości i plan wydania nowej wpłaty to dwie różne liczby — należy je nazwać i wyjaśnić;
- docelowe wagi wewnątrz akcji odnoszą się do części akcyjnej, a nie do całego portfela;
- jeśli nie znamy ceny jednostki instrumentu, pokazać kwotę zakupu; liczbę sztuk dopiero po dodaniu ceny i reguł zaokrąglania.

### Proste zapisywanie zmian

Trzy główne działania: **Wpłaciłem pieniądze**, **Wypłaciłem pieniądze**, **Aktualizuję wartość**. Osobno **Kupiłem / sprzedałem / przeniosłem środki** z jednoznacznym źródłem i celem. Formularz objaśnia, czy zmiana wpływa na wkład własny, saldo i wynik.

Pierwsze uruchomienie powinno pomóc wpisać posiadane inwestycje oraz ich koszt, a nie wymagać odtworzenia każdej historycznej wpłaty. Nie zakładać kosztu zero przy braku historii.

Zmiany mają być atomowe, z możliwością poprawienia lub cofnięcia całego zdarzenia. Obecna historia pozwala osobno usuwać wpłatę i wycenę; taka korekta może rozjechać saldo i kapitał. Potrzebny jest model zdarzenia powiązanego ze skutkami, a nie dwie niezależne listy rekordów.

Eksport/import przenieść do ustawień. Zamiast „Eksportuj bazę”: „Pobierz kopię danych”. Zachować potwierdzenie zastąpienia danych przy imporcie.

### Hierarchia i język

- Najważniejsze liczby powinny mieścić się na pierwszym ekranie. Obecnie duży nagłówek i wielopoziomowa nawigacja zajmują prawie cały widok 1280 × 720; na telefonie potrzeba jeszcze więcej przewijania.
- Zamiast „Alokacja”: „Mój plan” lub „Co dokupić?”. Zamiast „Wirtualna dopłata”: „Kwota do zainwestowania”.
- Pokazać inwestycje z wartością, a puste rachunki ukryć za „Dodaj inwestycję”.
- Nie używać „Kup 0 zł” ani procentu odchylenia od docelowej kwoty, który może wyglądać jak strata ponad 100%. Wystarczy „brakuje … zł” i aktualny/docelowy udział.
- Wagi powinny być zapisanym planem użytkownika, z jasnym zakresem: konkretna osoba czy wspólny portfel. Obecnie są preferencjami przeglądarki, bez rozdzielenia właścicieli i bez przenoszenia z kopią bazy.

## Zalecana kolejność pracy

1. Ustalić model kapitału, transferów, kosztu początkowego i wycen; naprawić wynik dla zakupów, sprzedaży oraz braków historii.
2. Zapisywać i korygować całe zdarzenie atomowo; poprawić operacje historyczne i komunikaty błędów.
3. Naprawić ukrywanie zakładek i zakresy filtrów.
4. Zbudować jeden plan zakupów według dwupoziomowych wag i dostępnego budżetu; nie liczyć przy niepoprawnych wagach.
5. Uprościć pulpit i formularze, pokazać daty oraz brakujące dane.

## Scenariusze akceptacyjne po poprawkach

- Wpłata 1000 zł, późniejsza wartość 1100 zł: wkład 1000, stan 1100, wynik +100 zł.
- Dodatkowa wpłata 200 zł bez wzrostu ceny: wkład 1200, stan 1300, wynik nadal +100 zł.
- Zakup finansowany gotówką już w portfelu: suma majątku i wynik nie rosną przez sam transfer.
- Początkowe saldo bez kosztu: wartość znana, wynik oznaczony jako nieznany.
- Nieudany zapis: albo całe zdarzenie istnieje, albo nic nie zapisano; powtórzenie nie tworzy duplikatu.
- Każdy filtr: wartość, wynik i wykres opisują ten sam zakres albo jawnie nazwane, odrębne zakresy.
- Tylko aktywna zakładka jest widoczna i dostępna z klawiatury.
- Plan dopłaty 100 zł: wszystkie zakupy są nieujemne, suma nie przekracza 100 zł, a reszta jest wyjaśniona.
- Wagi różne od 100%: brak zapisu planu i brak zaleceń zakupowych.
- Zmiana historyczna nie używa dzisiejszego salda jako historycznego punktu odniesienia.

## Ograniczenia audytu

Nie wykonywano pełnego audytu bezpieczeństwa, testów produkcyjnego wdrożenia ani wszystkich kombinacji importu, podatków i opłat. Import i kasowanie sprawdzono głównie w kodzie; awarię zapisu, formularze i opisane problemy liczbowe odtworzono na osobnej działającej instancji. Polecenie otwarcia serwera 8080 w panelu Codex zostało przyjęte jako `queued`; nie potwierdza to dostępu z przeglądarki na komputerze użytkownika do localhost środowiska chmurowego.
