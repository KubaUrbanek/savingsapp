# Oszczednosci

Monorepo z backendem Spring Boot i frontendem React SPA. Produkcyjnie aplikacja
dziala z jednego wykonywalnego pliku JAR: Spring Boot serwuje pliki statyczne
zbudowane przez Vite.

## Struktura

```text
.
├── backend
│   ├── src/main/java
│   ├── src/main/resources/static
│   └── pom.xml
├── frontend
│   ├── src
│   ├── package.json
│   └── vite.config.js
├── pom.xml
└── README.md
```

## Uruchomienie w trybie produkcyjnym

Zbuduj caly projekt z katalogu glownego:

```bash
mvn clean package
```

Uruchom finalny JAR:

```bash
java -jar backend/target/app-0.0.1-SNAPSHOT.jar
```

Aplikacja bedzie dostepna pod adresem:

```text
http://localhost:8080
```

Endpointy API:

```text
GET /api/hello
GET /api/status
```

## Tryb developerski frontendu

Mozesz uruchomic Vite osobno podczas pracy nad UI:

```bash
cd frontend
npm install
npm run dev
```

Frontend developerski dziala na `http://localhost:5173` i proxyuje `/api` do
backendu na `http://localhost:8080`. CORS dla tych adresow jest wlaczony po
stronie Spring Boot.

## Integracja React + Spring Boot

`frontend/vite.config.js` ustawia `build.outDir` na:

```text
../backend/src/main/resources/static
```

Dlatego `npm run build` kopiuje wynik produkcyjny Reacta bezposrednio do:

```text
backend/src/main/resources/static
```

`backend/pom.xml` uzywa `frontend-maven-plugin`, ktory podczas `mvn clean package`:

1. instaluje lokalnie Node.js i npm,
2. wykonuje `npm install`,
3. wykonuje `npm run build`,
4. pakuje zbudowany frontend do jednego JAR-a Spring Boot.

W produkcji nie jest potrzebny osobny serwer frontendu.

## Routing SPA

React uzywa `BrowserRouter` z trasami `/` i `/about`. Spring Boot ma konfiguracje
`WebMvcConfigurer`, ktora przekazuje nie-API requesty bez rozszerzenia pliku do
`/index.html`.

Dzieki temu deep linki i refresh strony, np.:

```text
http://localhost:8080/about
```

nie koncza sie 404, tylko laduja aplikacje React, a routing po stronie klienta
renderuje odpowiednia strone.
