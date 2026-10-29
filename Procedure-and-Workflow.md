# HorizonFi — Setup and Workflow Procedure

## Prerequisites

- Windows 10/11 or another OS with Docker Desktop and Docker Compose.
- A browser such as Chrome or Edge.
- Internet access for initial container image and package downloads.

## Setup and run

1. Extract the submitted ZIP while preserving its folder structure.
2. Open PowerShell in the extracted `horizonfi` project root (the folder containing `docker-compose.yml`).
3. Copy `.env.example` to `.env` and replace the placeholder password and JWT secret. Do not submit real secrets in the ZIP.
4. Start the services with:

   ```powershell
   docker compose up --build
   ```

5. Wait until PostgreSQL reports healthy and the backend/frontend containers start.
6. Open `http://localhost:5173` in a browser.
7. Sign in with the coursework demo account: `admin@horizonfi.io` / `horizon2026`.
8. Review the dashboard balance, runway, transaction list, trend chart, anomaly center, and scenario page.
9. Submit a test transaction to observe the REST response and WebSocket-driven dashboard update.
10. Use the bank-connect modal only as a simulation; it does not connect to a real financial institution.
11. Stop the services with `Ctrl+C`, or run `docker compose down` in another terminal.

To reset the local database and re-run the SQL seed from scratch, run `docker compose down -v` and then `docker compose up --build`. **This deletes the database volume and all locally stored demo data.**

## Workflow

1. The user signs in; the backend validates credentials and issues a JWT.
2. The React client sends the JWT with protected REST requests and as a query parameter when opening the WebSocket.
3. The Express backend validates transaction inputs and writes transactions to PostgreSQL/TimescaleDB with a user ID and UTC timestamp.
4. The backend calculates ledger balance, historical inflow/outflow trends, quarterly outflow baseline, projected burn, and estimated runway.
5. The dashboard receives initial metrics over REST/WebSocket and subsequent transaction/metric events over WebSocket.
6. For anomaly checks, the backend combines a category-level Z-score check with the configured Isolation Forest service when available.
7. The scenario page fetches the current backend runway and calculates a simplified deterministic what-if result from the selected revenue, headcount, and marketing assumptions.

## Dataset notes

The supplied project does not contain a separate external dataset URL. `init.sql` inserts six synthetic demo transactions, and `ml_service/app.py` contains a small hard-coded synthetic amount sample for Isolation Forest initialization. These are demonstration data only and are not enough to substantiate multi-quarter forecast accuracy or production anomaly-detection performance. If an external dataset is required by the course, add the actual source URL here and include its license/access notes.

## Demo video

Add the team's final Google Drive demo URL here after recording and verifying access permissions. All team members should appear and explain the paper, as required by the course announcement.

## Known limitations

- Bank sync is simulated, not a live Plaid integration.
- The scenario page is deterministic and is not a Monte Carlo simulation.
- Forecast evaluation needs more quarterly history before meaningful accuracy metrics can be reported.
- The performance targets in the report have not been benchmarked in this submission.
