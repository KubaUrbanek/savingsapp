# Wdrożone poprawki po audycie oszczędności

Wdrożono poprawki wynikające z [audytu](2026-10-10-audyt-oszczednosci.md). Poniżej opis końcowego zachowania i zabezpieczeń przed regresją.

| Problem / potrzeba                            | Końcowe zachowanie                                                                                                                                            | Główne testy                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Zakup wygląda jak zysk                        | Zakup i sprzedaż przenoszą środki między aktywem i wskazanym kontem gotówkowym. Nie zwiększają majątku ani wpłat zewnętrznych.                                | `PortfolioPerformanceCalculatorTest`, `RecordPortfolioChangeServiceTest`, test przeglądarkowy zakupu |
| Nieznany wkład wygląda jak zysk               | Wartość pozostaje widoczna, koszt i wynik mogą być nieznane. Formularz stanu początkowego pozwala podać wartość i własny wkład bez odtwarzania każdej wpłaty. | Testy kalkulatora, `SavingsRegressions.test.tsx`                                                     |
| Częściowy zapis / ponowienie                  | Jeden zapis obejmuje wszystkie operacje i wyceny. Identyfikator żądania chroni przed powtórzeniem, także po odświeżeniu strony po utracie odpowiedzi.         | Testy atomowości, współbieżności, awarii zapisu, test przeglądarkowy utraconej odpowiedzi            |
| Usuwanie rozjeżdża stan                       | Cofanie usuwa całe zdarzenie i przelicza zależne zapisy. Cofnięcie powodujące ujemne saldo jest odrzucane w całości.                                          | `RecordPortfolioChangeServiceTest`, test przeglądarkowy cofania zakupu                               |
| Historyczne wpłaty używają dzisiejszego salda | Saldo liczone jest na dzień operacji. Późniejsze salda wygenerowane z operacji są przeliczane; rzeczywiste wyceny pozostają punktami odniesienia.             | Testy historycznego przeliczenia i mappera formularza                                                |
| Niespójne filtry                              | Podsumowanie, tabela i wykres obejmują wybrany typ oraz podkategorię. Start pokazuje wszystkie inwestycje.                                                    | Testy komponentowe i przeglądarkowe filtrów                                                          |
| Ukryte panele wciąż widoczne                  | Reguła CSS respektuje `hidden`; zakładki działają także na telefonie.                                                                                         | Testy klawiatury oraz Chromium z prawdziwym CSS                                                      |
| Zakupy przekraczają budżet                    | Jeden plan dwupoziomowy: obligacje/akcje/złoto i podział części akcyjnej. Zakupy są nieujemne, bez sprzedaży, z dokładną sumą w groszach.                     | Testy rozdziału budżetu, zaokrągleń i Chromium                                                       |
| Niepoprawne wagi są używane i zapisywane      | Edytowany plan jest oddzielony od zapisanego. Błędne lub niezatwierdzone wagi nie generują zaleceń.                                                           | Testy walidacji domenowej, HTTP, komponentowe i przeglądarkowe                                       |
| Niespójna klasyfikacja                        | Złoto ma osobną klasę. IKE/IKZE dopuszczają instrumenty obligacyjne. PPK/PPO są jawnie niesklasyfikowane i nie są traktowane jak gotówka.                     | Testy klasyfikacji i planowania                                                                      |
| Razem pokazuje zmianę salda jako zysk         | Wspólny pulpit sumuje wyniki uwzględniające przepływy, zachowując brak danych. Wykres nazywa zmianę wartości zmianą wartości.                                 | Testy zakresu gospodarstwa i agregacji                                                               |
| Niejasna aktualność / błąd API                | Pokazujemy daty wycen, informację o starszych danych i nieudanym odświeżeniu wyniku. Wartość portfela pozostaje widoczna.                                     | Testy komponentów i kontrolera odświeżania                                                           |
| Zbyt techniczny ekran                         | Trzy kwoty: „Wpłaciłem”, „Mam teraz”, „Zarobiłem/Straciłem”; tabela inwestycji; jedna zakładka „Co dokupić?”. Kopia danych znajduje się w ustawieniach.       | Testy komponentowe, dostępności i przeglądarkowe                                                     |
| Plany tylko w przeglądarce                    | Plany zapisują się osobno dla osoby i wspólnego portfela, na serwerze i w kopii danych v2. Import wcześniejszych kopii jest obsługiwany.                      | Testy HTTP i eksportu/importu                                                                        |
| Brak ikony strony                             | Dodano lokalną ikonę SVG i odwołanie w dokumencie HTML.                                                                                                       | Weryfikacja działającego JAR                                                                         |

## Weryfikacja

- Backend: **61 testów**, bez błędów, w tym kontrakty repozytoriów, HTTP i granice architektury.
- Frontend: **44 testy jednostkowe**, **67 testów komponentowych**, bez błędów.
- Chromium: **8 testów**, po cztery scenariusze na komputerze i telefonie.
- TypeScript, ESLint i Prettier: bez błędów.
- Produkcyjny `mvn clean package`: zakończony sukcesem na końcowej wersji, wraz z testami importu i kosztu początkowego.
- Ręczny podgląd pulpitu i planu zakupów w Chromium, na komputerze i telefonie.
- GitHub Actions uruchamia kontrole frontendu, pełną budowę Java i testy Chromium.

Testy przeglądarkowe używają osobnego serwera na porcie 8082 i tymczasowej bazy. Ręczny podgląd wykorzystuje osobne dane na porcie 8083. Baza użytkownika na porcie 8080 nie była wykorzystywana do testów. Instrukcje uruchamiania wszystkich kontroli znajdują się w [README](../../README.md).

## Dane historyczne i granice

Nie dopisujemy wymyślonego źródła gotówki do starych, niezależnych operacji ani nie zgadujemy nieznanego wkładu. Można go uzupełnić stanem początkowym. Nowe zdarzenia mają powiązane skutki, stare rekordy zachowują zgodność importu. Kwoty zakupu są podawane w złotych; liczba jednostek wymaga znajomości ich ceny. PPK/PPO są widoczne w oszczędnościach, lecz bez rozpoznanego składu nie uczestniczą w planie zakupów.

Regresje opisane w audycie są objęte kontrolami automatycznymi. Testy zmniejszają ryzyko ich powrotu; nie gwarantują braku wszystkich przyszłych błędów.
