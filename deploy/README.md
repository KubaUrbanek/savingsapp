# Automatyczne wdrożenia na QNAP

GitHub Actions sprawdza kod, testuje produkcyjny kontener, a po zielonym CI na `main` publikuje obraz `linux/amd64` i `linux/arm64` w GHCR. Przez Tailscale i zwykłe SSH aktualizuje **jedną istniejącą usługę Compose**. Obraz pochodzi z JAR-a przetestowanego w tym samym uruchomieniu; wdrażany jest niezmienny digest, nie tag `latest`.

Automat jest początkowo wyłączony. Nie wystarczy adres LAN `192.168.0.148`: runner potrzebuje nazwy MagicDNS lub adresu Tailscale NAS-a. Model NAS-a musi obsługiwać x86-64 albo ARM64; 32-bitowy ARM nie jest obsługiwany przez ten obraz.

## 1. Sprawdzenie obecnej aplikacji

Na NAS-ie przez SSH wykonaj poniższe polecenia. Zastąp `NAZWA_KONTENERA` nazwą kontenera SavingsApp. Nie wysyłaj całego `docker inspect`: może ujawnić sekrety.

```sh
docker version
docker compose version
docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' NAZWA_KONTENERA
docker inspect --format '{{index .Config.Labels "com.docker.compose.service"}}' NAZWA_KONTENERA
docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' NAZWA_KONTENERA
docker inspect --format '{{range .Mounts}}{{println .Source "->" .Destination "writable=" .RW}}{{end}}' NAZWA_KONTENERA
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' NAZWA_KONTENERA | sed -n '/^APP_DATABASE_PATH=/p'
uname -m
```

Wymagamy Compose v2 (`docker compose` lub `docker-compose` v2), jednej działającej repliki i istniejącego pliku Compose dostępnego w SSH. Container Station może dodawać plik `docker-compose.resource.yml`; wskaż go przez opcjonalne `QNAP_COMPOSE_RESOURCE_FILE`. Automat używa pliku głównego, następnie pliku zasobów, a na końcu override obrazu. Przy większej liczbie plików połącz pozostałe ustawienia w jeden plik zasobów. Konto SSH musi mieć dostęp do Docker Engine i zapisu w katalogu projektu. Opcjonalna zmienna `QNAP_DOCKER_BIN` wskazuje pełną ścieżkę do Docker CLI, jeśli nie ma go w PATH sesji SSH.

`APP_DATABASE_PATH` musi wskazywać bezwzględną ścieżkę wewnątrz zapisywalnego, trwałego **wolumenu katalogowego**, np. `/app/data/portfolio` przy wolumenie `/app/data`. Podaj ścieżkę bez rozszerzenia. H2 utworzy `<APP_DATABASE_PATH>.mv.db`; podpinaj cały katalog, nie pojedynczy plik. Przy przejściu ze starej wersji zastąp `APP_DATABASE_FILE` przez `APP_DATABASE_PATH` w Compose i odtwórz usługę. Stare dane JSON nie są automatycznie importowane. Zachowaj ten sam wolumen przy odtwarzaniu kontenera. Katalog musi być zapisywalny dla użytkownika kontenera `app` lub użytkownika ustawionego w istniejącym Compose. Użyj aktualnego katalogu danych, portów i ustawień — nie uruchamiaj drugiej aplikacji na tej samej bazie. Port panelu QNAP może zajmować 8080; automat zachowuje obecne mapowanie portu aplikacji.

### Obecny NAS: Compose

Odczyt przed migracją 2026-10-11: `savingsapp-1` jest samodzielnym kontenerem (`savingsapp:1.0.14`), bez etykiet Compose. Port to `8090:8080`, użytkownik `app`, baza `/app/data/investment-entries.json`, trwały zapisywalny wolumen `savings-app`. SSH działa na `qnap.tail6b5d67.ts.net:22`; konto `urbanekj` ma w panelu uprawnienie SSH. Dostęp kluczem i do Docker Engine wymaga osobnej weryfikacji.

Po migracji przez Container Station 2026-10-11 projekt i usługa mają nazwę `savingsapp`, kontener `savingsapp-savingsapp-1`, a etykiety wskazują Compose `2.29.1`. Frontend i `/api/users` zwracają HTTP 200; `/actuator/health` zwraca `UP`. Stary kontener `savingsapp-1` jest zatrzymany. Ustawienia do środowiska GitHub `qnap`:

| Zmienna | Wartość |
| --- | --- |
| `QNAP_HOST` | `qnap.tail6b5d67.ts.net` |
| `QNAP_SSH_USER` | `urbanekj` |
| `QNAP_SSH_PORT` | `22` |
| `QNAP_COMPOSE_PROJECT` | `savingsapp` |
| `QNAP_COMPOSE_SERVICE` | `savingsapp` |
| `QNAP_CONTAINER` | `savingsapp-savingsapp-1` |
| `QNAP_COMPOSE_FILE` | `/share/CACHEDEV1_DATA/.qpkg/container-station/data/application/savingsapp/docker-compose.yml` |
| `QNAP_COMPOSE_RESOURCE_FILE` | `/share/CACHEDEV1_DATA/.qpkg/container-station/data/application/savingsapp/docker-compose.resource.yml` |

Wartości pochodzą z etykiet nowego kontenera; dostęp do tych plików i Docker CLI przez SSH nadal wymaga sprawdzenia.

Plik `deploy/qnap-compose.yml` zachowuje te ustawienia. Dla startowego obrazu 1.0.14 pozostawia `APP_DATABASE_FILE`, a dla nowych obrazów ustawia `APP_DATABASE_PATH=/app/data/portfolio`. Pierwsze wdrożenie nowego obrazu zacznie od pustej bazy H2; stary JSON nie jest importowany. Przed automatycznym wdrożeniem dodaj `APP_DATABASE_PATH` również do aktualnego Compose na NAS-ie i odtwórz usługę, aby zmienna była widoczna w konfiguracji kontenera. Wolumen jest **zewnętrzny**, aby Compose używał istniejących danych i zakończył pracę błędem, jeśli wolumen nie istnieje. Nie uruchamiaj tego pliku, gdy stary kontener działa. Sam pipeline nie migruje samodzielnego kontenera.

Jednorazowe przejście wykonaj w oknie serwisowym przez SSH, po sprawdzeniu aktualnego obrazu, portów, wolumenu, wersji Compose v2 i działania aplikacji. Skopiuj YAML do wybranego trwałego katalogu NAS-a (poniżej `/SCIEZKA/compose.yml`). Najpierw zweryfikuj go `docker compose -p savingsapp -f /SCIEZKA/compose.yml config --quiet`. Następnie:

1. Utwórz prywatny katalog kopii (`umask 077`). Zatrzymaj `savingsapp-1` przez `docker stop -t 30 savingsapp-1` i sprawdź, czy jest zatrzymany. Nie usuwaj kontenera ani wolumenu.
2. Wykonaj `docker cp savingsapp-1:/app/data/investment-entries.json /SCIEZKA_PRYWATNEJ_KOPII/database.json`. Jeśli kopia się nie uda, uruchom stary kontener `docker start savingsapp-1` i przerwij migrację.
3. Uruchom `docker compose -p savingsapp -f /SCIEZKA/compose.yml up -d --pull never savingsapp`. Nazwa nowego kontenera będzie `savingsapp-savingsapp-1`, więc stary kontener pozostaje dostępny do powrotu.
4. Sprawdź `/actuator/health`, interfejs na porcie 8090 i istniejące dane. Jeśli start lub weryfikacja się nie uda, zatrzymaj nową usługę i potwierdź jej zatrzymanie przed `docker start savingsapp-1`. Nie odtwarzaj automatycznie bazy z kopii.
5. Odczytaj etykiety nowego kontenera. Ustaw `QNAP_COMPOSE_PROJECT=savingsapp`, `QNAP_COMPOSE_SERVICE=savingsapp`, `QNAP_COMPOSE_FILE` na rzeczywistą bezwzględną ścieżkę YAML oraz `QNAP_CONTAINER=savingsapp-savingsapp-1` do diagnostyki. Dopiero po udanej weryfikacji można włączyć wdrożenia.

Stary obraz nie ma Docker healthchecka; kontrola pierwszego przejścia wymaga sprawdzenia HTTP. Obrazy publikowane przez pipeline mają healthcheck.

## 2. Tailscale i SSH

Włącz zwykłe SSH na NAS-ie oraz uwierzytelnianie dedykowanym kluczem. Nie potrzebujemy funkcji **Tailscale SSH**. NAS musi być osiągalny w Tailnecie i mieć dostęp do `ghcr.io` przez HTTPS.

W panelu Tailscale utwórz klienta OAuth dla GitHub Actions z uprawnieniem zapisu kluczy uwierzytelniających (`auth_keys`) i tagiem `tag:savingsapp-ci`. W polityce dostępu pozwól temu tagowi łączyć się z NAS-em na właściwy port SSH. Tag musi mieć skonfigurowanego właściciela w `tagOwners`; ustaw regułę dostępu według istniejącej polityki Tailnetu. Runner dołącza jako tymczasowe urządzenie. Nie otwieraj portu SSH w routerze.

Klucz hosta SSH pobierz i zweryfikuj z zaufanego połączenia do NAS-a. Sekret `QNAP_SSH_KNOWN_HOSTS` musi zawierać wpis dla dokładnego hosta i portu użytych w pipeline (dla niestandardowego portu: `[HOST]:PORT`). Nie wyłączamy sprawdzania klucza hosta i nie ufamy automatycznie wynikowi `ssh-keyscan` z pipeline.

## 3. Ustawienia GitHub Actions

W repozytorium utwórz środowisko **qnap** (Settings → Environments). Ogranicz dopuszczone branche do `main`. Jeśli wdrożenia mają być automatyczne, nie dodawaj wymaganej ręcznej akceptacji środowiska.

Sekrety środowiska `qnap`:

| Sekret                 | Wartość                                         |
| ---------------------- | ----------------------------------------------- |
| `TS_OAUTH_CLIENT_ID`   | Identyfikator klienta OAuth Tailscale           |
| `TS_OAUTH_SECRET`      | Sekret tego klienta                             |
| `QNAP_SSH_PRIVATE_KEY` | Prywatny klucz do konta wdrożeniowego na NAS-ie |
| `QNAP_SSH_KNOWN_HOSTS` | Zweryfikowany wpis lub wpisy hosta SSH          |

Zmienne środowiska `qnap`:

| Zmienna                | Wartość                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `QNAP_HOST`            | Adres Tailscale `100.x.x.x` lub pełna nazwa MagicDNS NAS-a |
| `QNAP_SSH_USER`        | Konto SSH z dostępem do Dockera                            |
| `QNAP_SSH_PORT`        | Port SSH; pusty oznacza 22                                 |
| `QNAP_COMPOSE_FILE`    | Bezwzględna ścieżka do aktualnego pliku Compose na NAS-ie  |
| `QNAP_COMPOSE_RESOURCE_FILE` | Opcjonalny plik ustawień zasobów Container Station |
| `QNAP_COMPOSE_PROJECT` | Dokładna nazwa projektu z etykiety kontenera               |
| `QNAP_COMPOSE_SERVICE` | Dokładna nazwa usługi z etykiety kontenera                 |
| `QNAP_DOCKER_BIN`      | Opcjonalna pełna ścieżka do Docker CLI                     |

Na końcu ustaw **zmienną repozytorium**, nie środowiska: `QNAP_DEPLOY_ENABLED=true`. Ona włącza zadania `publish` i `deploy`. Zielony CI jest zawsze wymagany. Ręczne uruchomienie workflow na `main` również wdraża; uruchomienia z innych branchy oraz PR-y nigdy nie wdrażają.

Obraz może pozostać prywatny. Pipeline używa własnego, krótkotrwałego `GITHUB_TOKEN` do publikacji oraz pobrania obrazu na NAS. Konfiguracja logowania GHCR na NAS trafia do tymczasowego katalogu usuwanego po wykonaniu skryptu. Nie potrzeba dodatkowego stałego tokena GHCR na NAS-ie. Jeśli pakiet GHCR istniał wcześniej, nadaj repozytorium dostęp Actions do tego pakietu (ustawienia pakietu → Manage Actions access).

### Diagnostyka z GitHub Actions

Uruchom workflow `CI` na `main` z `operation=inspect`. Ten tryb pomija build, publikację i wdrożenie oraz nie wymaga `QNAP_DEPLOY_ENABLED=true`. Korzysta z tego samego środowiska `qnap`, Tailscale i weryfikacji klucza hosta SSH. Wymaga sekretów połączenia oraz `QNAP_HOST`, `QNAP_SSH_USER`; opcjonalnie `QNAP_SSH_PORT`, `QNAP_DOCKER_BIN` i `QNAP_CONTAINER` (domyślnie `savingsapp-1`). Nie wymaga zmiennych Compose ani tokena GHCR.

Raportuje architekturę, wersję Docker/Compose, stan kontenera, porty, montowania, bazę i etykiety Compose. Nie wypisuje całego środowiska ani pełnego `docker inspect`. Brak etykiet Compose oznacza czerwony wynik z instrukcją migracji; kontener nadal działa. Zielony wynik potwierdza obecność etykiet, nie zastępuje sprawdzenia pliku Compose i uprawnień zapisu. Tryb `deploy` pozostaje domyślny; push na `main` zachowuje dotychczasowe zachowanie.

## 4. Co dzieje się przy wdrożeniu

1. Skrypt sprawdza istniejący projekt, trwały wolumen i blokadę wdrożenia. Bez tych warunków kończy pracę przed zatrzymaniem aplikacji.
2. Pobiera obraz, gdy stara wersja nadal działa.
3. Zatrzymuje tylko SavingsApp i kopiuje cały katalog danych z zatrzymanego kontenera do `.savingsapp-deploy/backup.*/data/` (H2 oraz ewentualny oryginalny JSON). Kopia ma prywatne uprawnienia. Przy błędzie kopii uruchamia starą wersję; nie uruchamia nowej bez kopii.
4. Zapisuje `.savingsapp-deploy/override.yml` z nowym obrazem i odtwarza tylko tę usługę, zachowując istniejące porty, wolumeny, środowisko i sekrety.
5. Sprawdza tożsamość obrazu i czeka do dwóch minut na zdrowie kontenera. Błąd uruchomienia, brak healthchecka, przekroczony czas lub obsłużony sygnał przerwania powoduje przywrócenie poprzedniego obrazu. Pipeline pozostaje czerwony.

W czasie zmiany jest krótka przerwa w dostępie. Nie uruchamiamy dwóch JVM-ów na tej samej bazie. Dane nie są automatycznie nadpisywane przy rollbacku, aby nie usunąć zapisów użytkownika; przedwdrożeniowa kopia służy do ręcznego odtworzenia w razie potrzeby. Przejście z wersji JSON rozpoczyna pracę na pustej bazie H2. Kolejne zmiany schematu również wymagają kompatybilności ze starszą wersją lub osobnej procedury migracji. Skrypt zgłasza nieudane uruchomienie rollbacku; poprzednia wersja bez healthchecka nie ma ponownego potwierdzenia zdrowia aplikacji.

Plik override pozostaje na NAS-ie i kolejne automatyczne wdrożenia go wykorzystują. Przy ręcznym odtworzeniu usługi również uwzględnij go:

```sh
docker compose -p NAZWA_PROJEKTU -f /SCIEZKA/compose.yml -f /SCIEZKA/docker-compose.resource.yml -f /SCIEZKA/.savingsapp-deploy/override.yml up -d --no-deps NAZWA_USLUGI
```

Pomiń argument pliku zasobów, jeśli projekt go nie używa. Odtworzenie aplikacji z samego starego YAML w panelu Container Station może przywrócić poprzedni `image:`. Do zmian konfiguracji pod kontrolą automatu używaj pliku bazowego i powyższego polecenia z override. Automat nie zarządza innymi usługami ani sieciami NAS-a.

Wdrożenia są kolejkowane i nie przerywają działającego wdrożenia po kolejnym pushu. Dodatkowa blokada na NAS-ie chroni przed równoległymi wywołaniami. Po awarii zasilania, `SIGKILL` lub zerwanym połączeniu skrypt nie gwarantuje wykonania rollbacku: sprawdź stan usługi i kopię przed ręcznym usunięciem `.savingsapp-deploy/lock`. Nie usuwaj blokady aktywnego wdrożenia.

Kopie pozostają na NAS-ie, nie trafiają do artefaktów GitHub. Okresowo zarządzaj ich retencją i uwzględnij je w swojej strategii kopii zapasowych; są na tym samym urządzeniu co aplikacja.

## Testy

CI uruchamia `python3 -m unittest discover -s deploy/test -v` i testuje rzeczywisty obraz aplikacji: HTTP, Docker healthcheck, zapis danych oraz ich zachowanie po restarcie. Testy skryptu ze stanowym substytutem Dockera sprawdzają kolejność pobrania/zatrzymania/kopii/uruchomienia, trwałość danych, istniejący projekt, blokadę, rollback, błędy pobrania i kopii oraz ochronę sekretów i cytowanie argumentów SSH. Nie łączą się z produkcyjnym NAS-em.
