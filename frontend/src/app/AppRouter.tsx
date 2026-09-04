// @ts-nocheck
import React from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from '../presentation/pages/Home.jsx';
import { About } from '../presentation/pages/About.jsx';
import { NotFound } from '../presentation/pages/NotFound.jsx';

const ROUTE_TITLES = {
  '/': 'Portfele | Oszczędności',
  '/about': 'Informacje | Oszczędności'
};

function RouteAnnouncement() {
  const location = useLocation();
  const previousPath = React.useRef(location.pathname);

  React.useEffect(() => {
    document.title = ROUTE_TITLES[location.pathname] || 'Nie znaleziono strony | Oszczędności';

    if (previousPath.current !== location.pathname) {
      document.querySelector('#main-content h1')?.focus();
    }

    previousPath.current = location.pathname;
  }, [location.pathname]);

  return null;
}

export function AppRouter({ dependencies }) {
  return (
    <BrowserRouter>
      <a className="skipLink" href="#main-content">
        Przejdź do treści
      </a>
      <header className="siteHeader">
        <div className="topbar">
          <Link className="brand" to="/">
            <span className="brandMark" aria-hidden="true">
              O
            </span>
            <span>
              Oszczędności<small>Twój portfel</small>
            </span>
          </Link>
          <nav aria-label="Główne">
            <NavLink to="/" end>
              Portfele
            </NavLink>
            <NavLink to="/about">Informacje</NavLink>
          </nav>
        </div>
      </header>
      <RouteAnnouncement />
      <Routes>
        <Route path="/" element={<Home dependencies={dependencies} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
