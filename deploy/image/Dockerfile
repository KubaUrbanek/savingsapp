# The JAR is downloaded from the successful verification job in the same run.
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/data && chown -R app:app /app

COPY --chown=app:app app.jar /app/app.jar
USER app
EXPOSE 8080
VOLUME ["/app/data"]
ENV APP_DATABASE_FILE=/app/data/investment-entries.json
ENV JAVA_OPTS=""
HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=12 \
    CMD curl --fail --silent --max-time 2 "http://localhost:${SERVER_PORT:-8080}/actuator/health" || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
