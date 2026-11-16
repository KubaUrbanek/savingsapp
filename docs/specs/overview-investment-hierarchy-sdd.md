# SDD — jeden hierarchiczny Przegląd inwestycji

**Wersja:** 1.0 · 16 listopada 2026

**Status:** zaakceptowana przez użytkownika 16 listopada 2026, włącznie z zastępowaniem zbiorczego paska IKE/IKZE paskami jego składników po rozwinięciu. Ten etap obejmuje scalenie specyfikacji; implementacja aplikacji jest osobnym zadaniem.

**Punkt odniesienia:** `main`, commit `7357efe42f5eacd5dab0904315c671c2f82f5161` (PR #102). Porównano specyfikacje i kod; nie odczytywano portfela produkcyjnego.

## 1. Cel i relacja do poprzednich specyfikacji

Przegląd ma mieć jeden wybór inwestycji, w którym widać osobno oba rynki akcji, PPK, PPO i konta, a IKE/IKZE można rozwinąć do konkretnych posiadanych inwestycji. Ten sam podział obowiązuje w rozkładzie oszczędności. Nie trzeba przełączać sposobu grupowania, żeby zobaczyć zawartość rachunku.

Ten dokument zastępuje zasady dwóch sposobów grupowania z §5.2 [beginner-ux-sdd.md](beginner-ux-sdd.md) i odpowiednie reguły [overview-visualization-sdd.md](overview-visualization-sdd.md). Doprecyzowuje też rozkład oraz rozbicie historii wartości. Pozostałe wymagania nowszego SDD, w szczególności pamiętanie kontekstu, obsługa braków i błędów oraz niezależność kalkulatora, nadal obowiązują. Starsze zapisy o resetowaniu filtrów przy zmianie zakładki nie wracają.

Zakres obejmuje prezentację i wybór istniejących danych. Nie dodaje nowych rachunków, instrumentów ani składu PPK/PPO. Nie zmienia zapisanych wycen, wpłat, historii operacji, planu ani formatu kopii.

## 2. Potwierdzone decyzje użytkownika

1. Usuwamy przełącznik „Według kont i produktów / Według rodzaju inwestycji”. Pozostaje jeden panel „Wybierz inwestycje”, dostępny pod „Filtruj inwestycje”.
2. Akcje są rozdzielone na **Akcje — rynki rozwinięte** oraz **Akcje — rynki wschodzące**. Używamy dotychczasowej wspólnej nazwy „rynki wschodzące”.
3. Nie ma zbiorczej pozycji „Nieznany skład”. PPK i PPO są osobnymi pozycjami; konta bankowe i oszczędnościowe również pozostają rozróżnione.
4. IKE i IKZE są osobnymi, rozwijanymi gałęziami. Ich składniki występują tylko wewnątrz odpowiedniego rachunku. Główne pozycje obligacji, złota i obu rynków obejmują wyłącznie inwestycje poza IKE/IKZE.
5. Można zaznaczyć całe IKE/IKZE albo pojedynczy składnik, np. „IKE → Złoto”. Wybór filtruje podsumowanie, wyniki/wpłaty, listę inwestycji i oba wykresy Przeglądu.
6. „Rozkład oszczędności” ma również pozwalać zobaczyć złoto, oba rynki akcji i pozostałe składniki rachunku, zamiast pokazywać wyłącznie łączną kwotę IKE/IKZE.

## 3. Jedna lista, każda inwestycja liczona raz

Docelowa kolejność i pełny katalog poniżej. Pokazujemy tylko gałęzie mające wpisy w historii wybranego zakresu osób do bieżącej daty, również z aktualną wartością 0 zł. Zawartość IKE/IKZE wynika z rzeczywistych wpisów.

```text
Obligacje
  Obligacje 3-letnie
  Obligacje 10-letnie
  Obligacje 12-letnie
Złoto
Akcje — rynki rozwinięte
Akcje — rynki wschodzące
IKE
  Obligacje
    Obligacje 3-letnie
    Obligacje 10-letnie
    Obligacje 12-letnie
  Złoto
  Akcje — rynki rozwinięte
  Akcje — rynki wschodzące
IKZE
  [taki sam katalog jak IKE, tylko posiadane pozycje]
Konto oszczędnościowe
Konto bankowe
PPK
PPO
```

Przy głównych rodzajach inwestycji umieszczamy krótki wspólny opis: „Poza IKE i IKZE. Inwestycje na tych rachunkach znajdziesz po ich rozwinięciu”. Nie tworzymy drugiego przełącznika ani osobnego trybu.

„Giełda” nie jest dodatkową gałęzią: jej zapisane składniki trafiają do głównych pozycji złota i odpowiedniego rynku akcji. PPK/PPO oraz konta nie mają przycisku rozwijania składu, ponieważ aktualny model nie przechowuje ich podinwestycji. Nie zgadujemy udziału akcji, obligacji ani gotówki w tych produktach. Nie zastępujemy tego komunikatem „Nieznany skład”.

Wartość rodzica jest sumą jego dzieci. Rodzic służy agregacji i sterowaniu, nie jest dodatkową inwestycją. Przykładowe 1000 zł złota na IKE występuje wyłącznie w `IKE → Złoto`; nie zwiększa głównej pozycji „Złoto”.

W Razem odpowiadające sobie liście sumują Jakuba i Zosię, np. `IKE → Złoto` obejmuje złoto obu osób na IKE. Własność i rachunek pozostają zachowane w danych i szczegółach inwestycji. Sam widok zbiorczy nie tworzy nowych pozycji ani wspólnego rachunku.

## 4. Zaznaczanie i rozwijanie filtra

- Domyślnie wszystkie dostępne inwestycje są zaznaczone, gałęzie zwinięte.
- Checkbox rodzica zaznacza/odznacza wszystkie jego liście. Gdy zaznaczono tylko część, rodzic ma stan częściowego zaznaczenia. Kliknięcie takiego checkboxa zaznacza całą gałąź.
- Każdy liść można wybrać niezależnie, także poszczególne terminy obligacji. Zaznaczenie nie wpływa na składniki w innym rachunku.
- Rozwinięcie ma osobny przycisk z nazwą, np. „Rozwiń skład IKE”. Nie zmienia wyboru, kwot, wykresów ani zapytań sieciowych. Zwinięcie nie usuwa wyboru dzieci.
- Kwoty obok checkboxów pokazują pełną bieżącą wartość danej pozycji w wybranym zakresie osób, również gdy jest odznaczona. Podpis: „Kwoty przy opcjach pokazują pełne wartości przed filtrowaniem”. Przy częściowo zaznaczonym rodzicu dodajemy „Wybrano X z Y zł”. Dzięki temu ponowne zaznaczenie jest świadome.
- „Pokaż wszystkie” przywraca pełny wybór; „Odznacz wszystkie” pozostaje drugorzędną akcją w rozwiniętym panelu. Nie zmieniają rozwinięcia gałęzi.
- Nad podsumowaniem pozostaje opis aktywnego wyboru. Pełną gałąź można skrócić do „IKE”; częściową opisujemy konkretnie, np. „IKE — Złoto”. Sam napis „IKE” nie może sugerować wyboru całego rachunku.
- Pusty wybór pokazuje dotychczasowe „Nie wybrano inwestycji” i możliwość przywrócenia całości, bez pozornego salda 0 zł. Rzeczywiste zapisane zero jest osobnym stanem.
- Wybrane liście i rozwinięcia pamiętamy w sesji osobno dla Jakuba, Zosi i Razem. Powrót z zakładki, pomocy lub ustawień zachowuje kontekst. Odświeżenie strony przywraca stan domyślny.
- Po odświeżeniu danych istniejący wybór pozostaje zachowany. Nowa inwestycja dziedziczy ostatni jawny wybór swojej gałęzi: odznaczenie całego IKE wyklucza również jego nowy składnik, a „Odznacz wszystkie” zachowuje pusty wybór. Przy braku takiego wykluczenia nowy liść jest domyślnie zaznaczony. „Pokaż wszystkie” usuwa wykluczenia. Stan rodzica i opis aktywnego zakresu są przeliczane. Pozycje bez żadnej pozostałej historii znikają z wyboru.

## 5. Rozkład oszczędności

Rozwijanie gałęzi rozkładu zastępuje jej agregat składowymi także na graficznych paskach.

Zachowujemy obecny czytelny wykres paskowy, kwoty w PLN i udziały. Początkowo pokazuje główne zaznaczone gałęzie. Główne akcje są zawsze rozdzielone na oba rynki, a PPK i PPO są osobne.

Po rozwinięciu IKE jego zbiorczy pasek jest zastąpiony paskami zaznaczonych składników: „IKE — Złoto”, „IKE — Akcje — rynki rozwinięte” itd. Nagłówek IKE zachowuje sumę oraz przycisk zwijania; nie dodaje kolejnego udziału do sumy wykresu. Analogicznie działają IKZE i rozwijane obligacje. Nie pokazujemy jednocześnie agregatu i jego dzieci jako niezależnych składników rozkładu.

Rozwijanie jest wyłącznie zmianą szczegółowości prezentacji: nie zaznacza ani nie odznacza inwestycji i nie zmienia łącznej wartości. Rozwinięcia w filtrze oraz rozkładzie są niezależne. Filtr służy wyborowi, a rozkład podglądowi wybranego zakresu. Stan rozwinięcia rozkładu pamiętamy w sesji dla danej osoby/Razem.

Kwoty w rozkładzie obejmują wyłącznie zaznaczone liście. Jeśli wybrane jest tylko złoto na IKE, zwinięty rodzic jest podpisany „IKE — wybrana część” i ma wartość tego złota. Po rozwinięciu widać tylko wybrane składniki. Nie pokazujemy podsumowania całego IKE obok wykresu częściowego wyboru.

Każdy procent ma ten sam mianownik: **łączną obecną wartość wszystkich zaznaczonych inwestycji**, również dla dzieci IKE/IKZE. Dzieci nie dostają osobnego mianownika 100% rachunku. Suma kwot widocznych składników wykresu jest zawsze równa nagłówkowi rozkładu i wartości w podsumowaniu. Suma wyświetlonych procentów może nieznacznie odbiegać od 100% przez zaokrąglenia; kwot nie korygujemy.

Przy łącznym rzeczywistym zerze pokazujemy kwoty 0 zł i udział „—”, bez dzielenia przez zero. Odznaczone inwestycje pozostają dostępne w filtrze. Kolory i nazwy składników są stabilne przy filtrowaniu i rozwijaniu, a informacja nigdy nie opiera się tylko na kolorze.

## 6. Historia wartości i pozostałe elementy Przeglądu

Historia wartości jest obliczana z tych samych zaznaczonych liści. Domyślna linia łącznej wartości pozostaje jedna. „Pokaż rozbicie” pokazuje główne grupy nowej hierarchii, z osobnymi rynkami akcji, PPK/PPO i rachunkami. IKE/IKZE sumują tylko zaznaczone dzieci; przy częściowym wyborze seria ma odpowiedni podpis. Rozwinięcie gałęzi w filtrze lub rozkładzie nie zmienia serii historii. Szczegółowy wybór, np. tylko „IKE → Złoto”, pozwala zobaczyć historię właśnie tej podinwestycji.

Daty i tabela danych zachowują dotychczasowe reguły: zakres zmienia tylko historię, brak pierwszej wyceny nie jest zerem, rzeczywiste zero pozostaje zerem, znane wartości są przenoszone w przód, niepełna historia jest nazwana. Wybór dziecka nie może wytworzyć jego historii przed pierwszą wyceną; nie rozdzielamy dawnych kwot według dzisiejszych proporcji. Rozwijanie rozkładu nie zmienia linii sumy ani wybranego okresu.

Wartość, wpłaty, wynik i lista inwestycji korzystają z jednego wyboru liści. Nie sumujemy wyników rodzica dodatkowo do wyników jego dzieci. Nieznane dane o wpłatach zachowują istniejące znaczenie. Lista nadal umożliwia dotychczasowe działania i rozpoznanie rachunku/właściciela; nie znika dostęp do szczegółów lub historii wybranej podinwestycji.

Kalkulator „Co dokupić?” nadal sumuje kwalifikujące się aktywa ze wszystkich rachunków, w tym IKE/IKZE, do czterech wspólnych kategorii planu. Nowa hierarchia Przeglądu oraz jego filtry nie zmieniają proporcji, podstawy ani metody wyznaczania zakupów. Historia operacji pozostaje niezależna od tych filtrów.

## 7. Architektura i bezpieczeństwo danych

Zweryfikowano w obecnym kodzie:

- `classification.ts` rozróżnia oba rynki, złoto i trzy terminy obligacji; IKE/IKZE obsługują wszystkie te podkategorie. PPK/PPO i konta nie mają podkategorii.
- Dzisiejsze `overviewVisualization.ts` wybiera jeden z dwóch sposobów grupowania, łączy akcje jako `STOCKS`, a PPK/PPO jako `UNCLASSIFIED`. To polityka do zastąpienia dla Przeglądu.
- Najnowsze wyceny rozpoznajemy po istniejącym kluczu właściciel + typ + podkategoria; nie zmieniamy tożsamości inwestycji.

Docelowo czysta polityka domenowa określa rozłączne liście, ich rodziców, wybór, sumy i widoczne grupy wykresów. Nie modyfikujemy wspólnej klasyfikacji kalkulatora tylko w celu uzyskania tego widoku. Prezentacja odpowiada za etykiety, rozwinięcia, częściowo zaznaczone checkboxy i fokus. `Home` utrzymuje kontekst osoby/Razem. Filtracja i rozwijanie są lokalne, bez zapisu i dodatkowych żądań.

Nie przewiduje się migracji danych, zmiany API ani formatu kopii: potrzebne rozróżnienia już istnieją. Implementacja ma to ponownie potwierdzić przed zmianami. Jeżeli okaże się potrzebna zmiana granicy danych, należy ją opisać przed rozszerzeniem zakresu.

## 8. Dostępność i małe ekrany

Checkbox i przycisk rozwijania mają oddzielne cele kliknięcia, widoczny fokus i dostępne nazwy zawierające pełny kontekst, np. „Zaznacz złoto na IKE”. Rodzic poprawnie udostępnia stan częściowego wyboru; przycisk rozwijania podaje `aria-expanded` i wskazuje sterowaną zawartość. Natywne kontrolki obsługują Tab, Spację i Enter zgodnie ze swoją rolą. Zwinięte dzieci nie pozostają w kolejności fokusu.

Zagnieżdżenia mają niewielkie wcięcia. Długie nazwy, duże kwoty i rozwinięte gałęzie nie powodują poziomego przewijania całego dokumentu przy 320/390/768/1440 px ani po zwiększeniu tekstu do 200%. Tylko tabela historii może mieć opisany kontener przewijania. Rozwinięcie nie przenosi samoczynnie fokusu.

## 9. Scenariusze odbioru i plan testów

Wszystkie kwoty poniżej są syntetycznymi danymi testowymi. Żaden scenariusz nie wymaga dostępu do portfela produkcyjnego. Testy związane z zapisem, usuwaniem i importem wykonujemy wyłącznie na izolowanych danych.

Przykład kontrolny: poza IKE/IKZE obligacje 3000 zł, złoto 500 zł, rynki rozwinięte 1000 zł, wschodzące 500 zł; IKE: złoto 1000 zł i rynki rozwinięte 2000 zł; IKZE: rynki wschodzące 1000 zł; PPK 4000 zł, PPO 2000 zł, konto oszczędnościowe 1000 zł. Całość: **16 000 zł**. Główne złoto: **500 zł**, IKE: **3000 zł**, `IKE → Złoto`: **1000 zł**. Udział ostatniej pozycji przy pełnym wyborze: **6,25%**, a po wybraniu wyłącznie tej pozycji: **100%**.

| ID | Wymagany rezultat | Planowana weryfikacja | Powiązanie z wcześniejszym SDD |
|---|---|---|---|
| H01 | Jeden panel bez przełącznika dwóch grupowań; oba rynki, PPK/PPO i konta oddzielnie; brak „Nieznanego składu”. | Test polityki grupowania i komponentu. | E02–E03 |
| H02 | Rozłączność: złoto z IKE nie wchodzi do głównego złota; suma liści i głównych agregatów równa 16 000 zł. | Test domenowy kontrolnego portfela. | E02–E03 |
| H03 | Zaznaczenie rodzica wybiera wszystkie dzieci; odznaczenie jednego daje stan częściowy; kliknięcie częściowego rodzica wybiera całość. | Komponent i Playwright. | E03, E31 |
| H04 | Tylko `IKE → Złoto`: 1000 zł we wszystkich częściach Przeglądu; bez innych inwestycji i bez zmiany planu/operacji. | Integracja Przeglądu i Playwright. | E03, E17, E25 |
| H05 | Rozwinięcie/zwinięcie filtra zachowuje wybór, kwoty, wykresy i brak nowych żądań. | Test komponentu i przechwycenie żądań w Playwright. | E03, E05 |
| H06 | Rozwinięcie IKE w rozkładzie zastępuje 3000 zł składowymi 1000/2000 zł; suma nadal 16 000 zł; udziały 6,25%/12,5%. | Domena, wykres i Playwright. | E02, E10 |
| H07 | Częściowo wybrane IKE jest jednoznacznie opisane; kwota w rozkładzie dotyczy wyboru, kwota w filtrze całego rachunku. | Test komponentu, ręczne obejrzenie. | E03 |
| H08 | Obligacje na IKE/IKZE mają prawidłowe terminy, niezależny wybór i nie trafiają do obligacji poza tymi rachunkami. | Domena i integracja. | E02–E03 |
| H09 | Razem sumuje oba portfele bez mieszania rachunków; powrót do osoby odtwarza jej wybór i rozwinięcia. | Integracja i Playwright. | E02, E05 |
| H10 | Pusty wybór, pusty portfel, faktyczne 0 zł, zniknięcie ostatniego wpisu i nowa inwestycja mają odrębne, spójne stany. | Domena, komponent i izolowane dane przeglądarkowe. | E01, E04, E28 |
| H11 | Historia i tabela stosują te same zaznaczone liście, agregowane do głównych grup; rozwijanie rozkładu nie zmienia serii historii; brak danych przed pierwszą wyceną. | Test historii i wykresów. | E08–E10 |
| H12 | Błąd wyników, ponowienie i szybka zmiana osoby nie mieszają kwot ani wyboru; znane wartości pozostają widoczne. | Test integracji z kontrolowanymi błędami sieci. | E07, E28 |
| H13 | Pełna obsługa klawiaturą, stan częściowego checkboxa, fokus i nazwy; brak przepełnienia na czterech szerokościach, z rozwiniętymi gałęziami/tabelą i długimi kwotami. | Komponent/axe, Playwright i oględziny. Realny czytnik/telefon tylko jeśli rzeczywiście użyte. | E10, E31–E32 |
| H14 | Cztery kategorie i obliczenia planu pozostają identyczne; stare kopie nadal działają. | Regresja kalkulatora i istniejące testy kopii w CI. | E11–E18, E29 |

Punkty startowe testów: `frontend/test/unit/overviewVisualization.test.js`, `frontend/test/component/OverviewIntegration.test.tsx`, `frontend/test/component/OverviewCharts.test.tsx`, `frontend/test/browser/beginnerUx.spec.ts`. Po wdrożeniu raport wymaga powiązania H01–H14 z faktycznymi testami i wynikami, bez oznaczania planowanych testów jako wykonanych.

Kontrole implementacji: testy odpowiednie do zmian, lint, typecheck, format, build i `git diff --check`, następnie pełne CI dla aktualnego commita. Aktualizacji wymagają opisy Przeglądu w dotychczasowych specyfikacjach, architekturze frontendowej oraz raport pokrycia. Na etapie scalenia specyfikacji wykonujemy przegląd spójności i `git diff --check` oraz wymagamy zielonego CI aktualnego commita; aplikacja pozostaje bez zmian.
