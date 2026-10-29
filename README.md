# HorizonFi

HorizonFi is a coursework prototype for financial transaction monitoring and runway analytics.

## Run with Docker Compose

Prerequisites: Docker Desktop with Compose enabled.

1. Copy `.env.example` to `.env` and replace the placeholder secrets.
2. From this directory, run `docker compose up --build`.
3. Open the frontend at `http://localhost:5173`.
4. Demo login: `admin@horizonfi.io` / `horizon2026`.
5. Stop the services with `docker compose down`. To delete the local database volume as well, use `docker compose down -v` (this deletes stored demo data).

The initial SQL file runs only when the database volume is first created. If you change `init.sql` after first launch, recreate the volume only if you are happy to delete its data.

## Notes and limitations

- Bank connection is simulated; it is not a live Plaid integration.
- The anomaly model is trained on a small hard-coded synthetic sample, not a supplied production dataset.
- Forecast and evaluation methods are coursework approximations and should not be represented as validated financial advice or production-grade predictions.
- Set `JWT_SECRET` and `POSTGRES_PASSWORD` to secure values outside a local demo. Never commit `.env`.
