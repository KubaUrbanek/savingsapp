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

Wymagamy Compose v2 (`docker compose` lub `docker-compose` v2), jednej działającej repliki i istniejącego pliku Compose dostępnego w SSH. Jeśli etykieta wymienia kilka plików Compose, przygotuj najpierw jeden plik zawierający ich pełną konfigurację; automat przyjmuje jeden plik bazowy. Konto SSH musi mieć dostęp do Docker Engine i zapisu w katalogu projektu. Opcjonalna zmienna `QNAP_DOCKER_BIN` wskazuje pełną ścieżkę do Docker CLI, jeśli nie ma go w PATH sesji SSH.

`APP_DATABASE_PATH` musi wskazywać bezwzględną ścieżkę wewnątrz zapisywalnego, trwałego **wolumenu katalogowego**, np. `/app/data/portfolio` przy wolumenie `/app/data`. Podaj ścieżkę bez rozszerzenia. H2 utworzy `<APP_DATABASE_PATH>.mv.db`; podpinaj cały katalog, nie pojedynczy plik. Przy przejściu ze starej wersji zastąp `APP_DATABASE_FILE` przez `APP_DATABASE_PATH` w Compose i odtwórz usługę. Stare dane JSON nie są automatycznie importowane. Zachowaj ten sam wolumen przy odtwarzaniu kontenera. Katalog musi być zapisywalny dla użytkownika kontenera `app` lub użytkownika ustawionego w istniejącym Compose. Użyj aktualnego katalogu danych, portów i ustawień — nie uruchamiaj drugiej aplikacji na tej samej bazie. Port panelu QNAP może zajmować 8080; automat zachowuje obecne mapowanie portu aplikacji.

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
| `QNAP_COMPOSE_PROJECT` | Dokładna nazwa projektu z etykiety kontenera               |
| `QNAP_COMPOSE_SERVICE` | Dokładna nazwa usługi z etykiety kontenera                 |
| `QNAP_DOCKER_BIN`      | Opcjonalna pełna ścieżka do Docker CLI                     |

Na końcu ustaw **zmienną repozytorium**, nie środowiska: `QNAP_DEPLOY_ENABLED=true`. Ona włącza zadania `publish` i `deploy`. Zielony CI jest zawsze wymagany. Ręczne uruchomienie workflow na `main` również wdraża; uruchomienia z innych branchy oraz PR-y nigdy nie wdrażają.

Obraz może pozostać prywatny. Pipeline używa własnego, krótkotrwałego `GITHUB_TOKEN` do publikacji oraz pobrania obrazu na NAS. Konfiguracja logowania GHCR na NAS trafia do tymczasowego katalogu usuwanego po wykonaniu skryptu. Nie potrzeba dodatkowego stałego tokena GHCR na NAS-ie. Jeśli pakiet GHCR istniał wcześniej, nadaj repozytorium dostęp Actions do tego pakietu (ustawienia pakietu → Manage Actions access).

## 4. Co dzieje się przy wdrożeniu

1. Skrypt sprawdza istniejący projekt, trwały wolumen i blokadę wdrożenia. Bez tych warunków kończy pracę przed zatrzymaniem aplikacji.
2. Pobiera obraz, gdy stara wersja nadal działa.
3. Zatrzymuje tylko SavingsApp i kopiuje cały katalog danych z zatrzymanego kontenera do `.savingsapp-deploy/backup.*/data/` (H2 oraz ewentualny oryginalny JSON). Kopia ma prywatne uprawnienia. Przy błędzie kopii uruchamia starą wersję; nie uruchamia nowej bez kopii.
4. Zapisuje `.savingsapp-deploy/override.yml` z nowym obrazem i odtwarza tylko tę usługę, zachowując istniejące porty, wolumeny, środowisko i sekrety.
5. Sprawdza tożsamość obrazu i czeka do dwóch minut na zdrowie kontenera. Błąd uruchomienia, brak healthchecka, przekroczony czas lub obsłużony sygnał przerwania powoduje przywrócenie poprzedniego obrazu. Pipeline pozostaje czerwony.

W czasie zmiany jest krótka przerwa w dostępie. Nie uruchamiamy dwóch JVM-ów na tej samej bazie. Dane nie są automatycznie nadpisywane przy rollbacku, aby nie usunąć zapisów użytkownika; przedwdrożeniowa kopia służy do ręcznego odtworzenia w razie potrzeby. Przejście z wersji JSON rozpoczyna pracę na pustej bazie H2. Kolejne zmiany schematu również wymagają kompatybilności ze starszą wersją lub osobnej procedury migracji. Skrypt zgłasza nieudane uruchomienie rollbacku; poprzednia wersja bez healthchecka nie ma ponownego potwierdzenia zdrowia aplikacji.

Plik override pozostaje na NAS-ie i kolejne automatyczne wdrożenia go wykorzystują. Przy ręcznym odtworzeniu usługi również uwzględnij go:

```sh
docker compose -p NAZWA_PROJEKTU -f /SCIEZKA/compose.yml -f /SCIEZKA/.savingsapp-deploy/override.yml up -d --no-deps NAZWA_USLUGI
```

Odtworzenie aplikacji z samego starego YAML w panelu Container Station może przywrócić poprzedni `image:`. Do zmian konfiguracji pod kontrolą automatu używaj pliku bazowego i powyższego polecenia z override. Automat nie zarządza innymi usługami ani sieciami NAS-a.

Wdrożenia są kolejkowane i nie przerywają działającego wdrożenia po kolejnym pushu. Dodatkowa blokada na NAS-ie chroni przed równoległymi wywołaniami. Po awarii zasilania, `SIGKILL` lub zerwanym połączeniu skrypt nie gwarantuje wykonania rollbacku: sprawdź stan usługi i kopię przed ręcznym usunięciem `.savingsapp-deploy/lock`. Nie usuwaj blokady aktywnego wdrożenia.

Kopie pozostają na NAS-ie, nie trafiają do artefaktów GitHub. Okresowo zarządzaj ich retencją i uwzględnij je w swojej strategii kopii zapasowych; są na tym samym urządzeniu co aplikacja.

## Testy

CI uruchamia `python3 -m unittest discover -s deploy/test -v` i testuje rzeczywisty obraz aplikacji: HTTP, Docker healthcheck, zapis danych oraz ich zachowanie po restarcie. Testy skryptu ze stanowym substytutem Dockera sprawdzają kolejność pobrania/zatrzymania/kopii/uruchomienia, trwałość danych, istniejący projekt, blokadę, rollback, błędy pobrania i kopii oraz ochronę sekretów i cytowanie argumentów SSH. Nie łączą się z produkcyjnym NAS-em.
