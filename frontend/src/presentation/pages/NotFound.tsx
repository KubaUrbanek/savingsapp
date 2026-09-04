// @ts-nocheck
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="page" id="main-content">
      <section className="panel">
        <h1 tabIndex={-1}>Nie znaleziono strony</h1>
        <p>Wróć na stronę główną i spróbuj ponownie.</p>
        <Link className="button" to="/">
          Strona główna
        </Link>
      </section>
    </main>
  );
}
