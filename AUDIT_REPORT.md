# HorizonFi Code Audit

## Summary

The uploaded project had a useful React + Express + PostgreSQL/TimescaleDB + Python anomaly-service structure, but it did not fully match the technical report and the container setup was not runnable as packaged. The uploaded ZIP had flattened directory paths, so this reviewed package restores the intended directory structure using the imports and the VS Code tree as evidence.

## Changes made

1. **Restored the folder layout** (`backend/src`, `backend/middleware`, `frontend/src`, and `ml_service`) so relative imports and Docker build contexts have their intended locations.
2. **Added backend and frontend Dockerfiles** and changed the Python anomaly service from an AWS-Lambda-only container to a regular FastAPI/uvicorn container for local Compose demos.
3. **Reworked Docker Compose** to build all three services, wait for PostgreSQL health, and configure a local ML-service URL.
4. **Fixed PostgreSQL pool configuration** so the authentication router uses `DATABASE_URL`, as supplied by Compose, instead of trying to connect to `localhost` inside the backend container.
5. **Fixed the TimescaleDB transaction table design** so the primary key includes the time partition column. Added `user_id` to transaction ownership and useful user/time indexes.
6. **Scoped ledger reads, writes, anomaly statistics, and WebSocket broadcasts by authenticated user**, preventing one user's transaction/metric updates from being broadcast to all connected users.
7. **Removed invalid-token and missing-token development bypasses**. The demo login still works through the explicit demo credentials, but normal API/WebSocket requests must present a valid JWT.
8. **Removed fictional `$10,000,000` funding from the balance calculation**; balance now derives from the user's ledger.
9. **Changed the runway baseline** to use average outflow across up to the three most recent quarters with transaction history, with the seasonality slider applied as a transparent multiplier. The response exposes the number of quarters used.
10. **Removed fabricated forecast-evaluation accuracy fallbacks**. Evaluation now reports insufficient history instead of claiming a made-up MAPE/RMSE.
11. **Connected the scenario page's baseline to the backend runway** and removed the hardcoded 14.2-month baseline and unsupported Monte Carlo/confidence claim. The scenario remains a simplified deterministic what-if calculation.
12. **Fixed the Plaid modal's token key** to use the same `hz_token` key as the authentication context.
13. Added `.env.example`, setup instructions, and limitations in `README.md`.

## Current alignment and remaining gaps

- **Real-time ingestion and WebSockets:** implemented in the Express server; not load-tested at the stated 50+ transactions/second target.
- **PostgreSQL/TimescaleDB:** Compose and schema are configured, but this package has not been run against a live Docker/PostgreSQL instance in this review environment.
- **Quarterly forecasting:** the revised baseline uses up to three quarters that contain transactions. The included seed SQL has only six transactions from a short period, so it cannot demonstrate a credible 8–12-quarter backtest. Add a multi-quarter seed dataset before presenting forecast-accuracy claims.
- **Evaluation:** the evaluator is a backend module, not currently exposed as a dashboard API endpoint. Accuracy cannot be claimed from the included seed data.
- **Anomaly detection:** the Isolation Forest is trained on a small hard-coded synthetic amount sample in `ml_service/app.py`; it is a demonstration model, not a trained model on the financial transaction ledger. The external production Lambda URL is retained as a fallback when `ML_SERVICE_URL` is not set.
- **Bank connection:** the Plaid-like flow is simulated. It does not use real Plaid credentials or fetch live bank transactions.
- **Scenario simulation:** now uses the live backend runway as its starting point, but the what-if formula is deterministic and is not Monte Carlo simulation or a server-side scenario API.
- **Dataset:** no external dataset URL was present in the supplied files. The database seed data is synthetic and included in `init.sql`; the anomaly service's sample data is embedded in `ml_service/app.py`. If the course requires an external dataset link, add a real source URL to the procedure document before submission.
- **Performance targets:** latency, 10M-row query performance, and MAPE thresholds are target criteria in the specification, not measured results in the supplied code.

## Checks performed

- Node.js syntax checks passed for the backend JavaScript files.
- A smoke test of the revised forecasting function passed using a small in-memory sample.
- Full frontend build, Docker Compose startup, SQL initialization, WebSocket integration, and database-backed integration tests were **not run** in this review environment. Run them locally before the demo.
