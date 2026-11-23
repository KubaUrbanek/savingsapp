import { Link } from 'react-router-dom';
export function About() {
  return (
    <main className="page helpPage" id="main-content">
      <h1 tabIndex={-1}>Jak korzystać</h1>
      <Link className="button" to="/">
        Wróć do poprzedniego widoku
      </Link>
      <ol>
        <li>
          <strong>Dodaj posiadane oszczędności.</strong> Wpisz obecną wartość. Jeśli nie znasz sumy wpłat, wybierz „Nie
          znam”.
        </li>
        <li>
          <strong>Zapisuj wpłaty i zakupy.</strong> Wpłata to nowe pieniądze w oszczędnościach. Zakup przenosi pieniądze
          z konta na inwestycję.
        </li>
        <li>
          <strong>Aktualizuj wartość.</strong> Zapisz bieżące saldo konta lub wycenę inwestycji. Saldo konta bankowego
          wlicza się do wartości oszczędności. Wynik pokazuje zyski i straty z inwestycji, w tym odsetki z konta
          oszczędnościowego.
        </li>
        <li>
          <strong>Zaplanuj zakupy.</strong> Wspólny plan ma te same proporcje dla wszystkich. Wybór osoby zmienia
          inwestycje do obliczeń. Budżet jest symulacją; zakup zapisz osobno po jego wykonaniu.
        </li>
        <li>
          <strong>Pobierz kopię.</strong> W Ustawieniach zapiszesz kopię obu osób i wspólnego planu.
        </li>
      </ol>
      <details>
        <summary>Co oznaczają skróty?</summary>
        <p>
          IKE i IKZE oznaczają rachunki, w których możesz trzymać różne inwestycje. PPK i PPO są osobnymi produktami w
          ewidencji; ich skład nie jest znany aplikacji.
        </p>
      </details>
    </main>
  );
}
