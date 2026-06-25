import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import './styles.css';

function Home() {
  const [hello, setHello] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetch('/api/hello')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(setHello)
      .catch((fetchError) => setError(fetchError.message));
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">React SPA + Spring Boot</p>
        <h1>Jedna aplikacja, jeden JAR.</h1>
        <p>
          Frontend jest budowany przez Vite, kopiowany do zasobow statycznych
          backendu i serwowany bez osobnego serwera produkcyjnego.
        </p>
      </section>

      <section className="panel" aria-label="Backend response">
        <h2>Odpowiedz z /api/hello</h2>
        {hello && (
          <pre>{JSON.stringify(hello, null, 2)}</pre>
        )}
        {error && (
          <p className="error">Nie udalo sie pobrac danych: {error}</p>
        )}
        {!hello && !error && (
          <p>Ladowanie danych z backendu...</p>
        )}
      </section>
    </main>
  );
}

function About() {
  return (
    <main className="page">
      <section className="hero heroCompact">
        <p className="eyebrow">/about</p>
        <h1>Routing SPA dziala po stronie klienta.</h1>
        <p>
          Odwiezanie tej strony trafia najpierw do Spring Boota, a konfiguracja
          MVC przekazuje nie-API request do index.html.
        </p>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="page">
      <section className="panel">
        <h1>Nie znaleziono strony</h1>
        <p>Wroc na strone glowna i sprobuj ponownie.</p>
        <Link className="button" to="/">Home</Link>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <Link className="brand" to="/">Oszczednosci</Link>
        <nav aria-label="Glowne">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
