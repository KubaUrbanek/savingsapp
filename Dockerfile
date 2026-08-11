# syntax=docker/dockerfile:1

FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml ./
COPY backend/pom.xml backend/pom.xml
COPY frontend/package*.json frontend/

RUN mvn -B -pl backend -am dependency:go-offline

COPY backend backend
COPY frontend frontend

RUN mvn -B -pl backend -am clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/data \
    && chown -R app:app /app

COPY --from=build --chown=app:app /workspace/backend/target/app-*.jar /app/app.jar

USER app
EXPOSE 8080
VOLUME ["/app/data"]

ENV APP_DATABASE_FILE=/app/data/investment-entries.json
ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
