
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import db from './db.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { calculateRunwayAndForecast } from './forecasting.js';
import authRouter from './routes/auth.js';
import { JWT_SECRET } from '../middleware/auth.js';

dotenv.config();

const pool = db;
const app = express();

// -----------------------------------------------------------------------------
// MIDDLEWARE SETUP
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

// -----------------------------------------------------------------------------
// WEBSOCKET SETUP
// -----------------------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data, userId) {
  wss.clients.forEach(client => {
    if (
      client.readyState === WebSocket.OPEN &&
      String(client.userId) === String(userId)
    ) {
      client.send(JSON.stringify(data));
    }
  });
}

// -----------------------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// -----------------------------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  const token =
    (authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null) || req.query?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    return next();
  });
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Calculates the current balance, transaction history, and monthly trends.
 */
async function getCalculatedMetrics(seasonality = 0.0, userId = 1) {
  try {
    const balanceRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS net_ledger
       FROM transactions
       WHERE user_id = $1;`,
      [userId]
    );

    const currentBalance =
      parseFloat(balanceRes.rows[0].net_ledger) || 0;

    const txRes = await pool.query(
      `SELECT amount, timestamp AS date
       FROM transactions
       WHERE user_id = $1
       ORDER BY timestamp DESC;`,
      [userId]
    );

    const transactions = txRes.rows.map(row => ({
      amount: parseFloat(row.amount),
      date: row.date
    }));

    const historyRes = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', timestamp), 'Mon YYYY') AS month,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS outflow,
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS inflow
       FROM transactions
       WHERE user_id = $1
       GROUP BY DATE_TRUNC('month', timestamp)
       ORDER BY DATE_TRUNC('month', timestamp) ASC
       LIMIT 12;`,
      [userId]
    );

    const history = historyRes.rows.map(row => ({
      month: row.month,
      outflow: parseFloat(row.outflow) || 0,
      inflow: parseFloat(row.inflow) || 0
    }));

    const metrics = calculateRunwayAndForecast(
      currentBalance,
      transactions,
      12,
      seasonality
    );

    return {
      ...metrics,
      history
    };
  } catch (err) {
    console.error('Error calculating metrics:', err.message);

    return {
      currentBalance: 0,
      monthlyBurn: 0,
      runwayMonths: 0,
      projectedNextQuarterBurn: 0,
      forecast: [],
      history: []
    };
  }
}

/**
 * Hybrid anomaly detection using a local Z-score and AWS Lambda IsolationForest.
 */
async function detectAnomaly(amount, category, userId) {
  const absAmount = Math.abs(amount);

  // 1. Local statistical check.
  let localZScore = 0;
  let localIsAnomaly = false;

  try {
    const statsQuery = `
      SELECT
        AVG(ABS(amount)) AS mean,
        STDDEV_POP(ABS(amount)) AS stddev
      FROM transactions
      WHERE category = $1
        AND user_id = $2
        AND timestamp >= NOW() - INTERVAL '90 days';
    `;

    const { rows } = await pool.query(statsQuery, [
      category,
      userId
    ]);

    const mean = parseFloat(rows[0].mean) || 0;
    const stddev = parseFloat(rows[0].stddev) || 0;

    if (stddev > 0) {
      localZScore = parseFloat(
        ((absAmount - mean) / stddev).toFixed(2)
      );

      localIsAnomaly = localZScore > 2.2;
    }
  } catch (err) {
    console.error(
      'Local Z-Score calculation error:',
      err.message
    );
  }

  // 2. AWS Lambda ML check.
  let mlResult = {
    isAnomaly: false,
    anomalyScore: 0,
    method: 'IsolationForest'
  };

  try {
    const mlUrl =
      process.env.ML_SERVICE_URL ||
      'https://5i4exa2vqitb427ujgkleloyze0gtmct.lambda-url.us-east-1.on.aws/predict-anomaly';

    const mlResponse = await fetch(mlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: absAmount,
        category
      })
    });

    if (mlResponse.ok) {
      mlResult = await mlResponse.json();
    }
  } catch (err) {
    console.error(
      'Lambda ML anomaly detection error:',
      err.message
    );
  }

  // 3. Combine both detection signals.
  return {
    isAnomaly:
      localIsAnomaly || mlResult.isAnomaly === true,
    zScore: localZScore,
    anomalyScore: mlResult.anomalyScore,
    method:
      mlResult.method ||
      'Hybrid (Z-Score + IsolationForest)'
  };
}

// -----------------------------------------------------------------------------
// ANALYTICS AND FORECAST
// -----------------------------------------------------------------------------
app.get(
  '/api/analytics/forecast',
  authenticateToken,
  async (req, res) => {
    try {
      const seasonality = parseFloat(
        req.query.seasonality || '0.0'
      );

      const metrics = await getCalculatedMetrics(
        seasonality,
        req.user.id
      );

      res.json(metrics);
    } catch (err) {
      console.error(
        'Forecast calculation error:',
        err.message
      );

      res.status(500).json({
        error: 'Failed to fetch forecast'
      });
    }
  }
);

// -----------------------------------------------------------------------------
// FETCH RECENT TRANSACTIONS
// Includes the persisted triage_status column.
// -----------------------------------------------------------------------------
app.get(
  '/api/transactions',
  authenticateToken,
  async (req, res) => {
    try {
      const requestedLimit = parseInt(req.query.limit, 10) || 50;
      const limit = Math.min(
        Math.max(requestedLimit, 1),
        200
      );

      const { rows } = await pool.query(
        `SELECT
           id,
           amount,
           type,
           category,
           timestamp,
           triage_status
         FROM transactions
         WHERE user_id = $1
         ORDER BY timestamp DESC
         LIMIT $2;`,
        [req.user.id, limit]
      );

      const enrichedRows = await Promise.all(
        rows.map(async tx => {
          const anomalyResult = await detectAnomaly(
            Number(tx.amount),
            tx.category,
            req.user.id
          );

          return {
            ...tx,
            isAnomaly: anomalyResult.isAnomaly,
            zScore: anomalyResult.zScore,
            anomalyScore: anomalyResult.anomalyScore,
            method: anomalyResult.method
          };
        })
      );

      res.json(enrichedRows);
    } catch (err) {
      console.error(
        'Error fetching transactions:',
        err.message
      );

      res.status(500).json({
        error: 'Failed to fetch transactions'
      });
    }
  }
);

// -----------------------------------------------------------------------------
// INGEST NEW TRANSACTION
// -----------------------------------------------------------------------------
app.post(
  '/api/transactions',
  authenticateToken,
  async (req, res) => {
    const { amount, type, category } = req.body;
    const numericInput = Number(amount);

    if (
      !Number.isFinite(numericInput) ||
      numericInput <= 0 ||
      !['INFLOW', 'OUTFLOW'].includes(type) ||
      typeof category !== 'string' ||
      !category.trim()
    ) {
      return res.status(400).json({
        error:
          'A positive finite amount, valid INFLOW/OUTFLOW type, and category are required.'
      });
    }

    try {
      const numericAmount =
        type === 'OUTFLOW'
          ? -Math.abs(numericInput)
          : Math.abs(numericInput);

      const anomalyResult = await detectAnomaly(
        numericAmount,
        category,
        req.user.id
      );

      const query = `
        INSERT INTO transactions
          (user_id, amount, type, category, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *;
      `;

      const { rows } = await pool.query(query, [
        req.user.id,
        numericAmount,
        type,
        category.trim()
      ]);

      const metrics = await getCalculatedMetrics(
        0,
        req.user.id
      );

      const transactionPayload = {
        ...rows[0],
        isAnomaly: anomalyResult.isAnomaly,
        zScore: anomalyResult.zScore,
        anomalyScore: anomalyResult.anomalyScore,
        method: anomalyResult.method
      };

      broadcast(
        {
          event: 'NEW_TRANSACTION',
          transaction: transactionPayload,
          metrics
        },
        req.user.id
      );

      res.status(201).json({
        success: true,
        transaction: transactionPayload
      });
    } catch (err) {
      console.error(
        'Transaction ingestion error:',
        err.message
      );

      res.status(500).json({
        error: 'Failed to ingest transaction'
      });
    }
  }
);

// -----------------------------------------------------------------------------
// PERSISTENT ANOMALY TRIAGE
// Approved and Flagged Fraud statuses are stored in PostgreSQL.
// -----------------------------------------------------------------------------
app.patch(
  '/api/transactions/:id/status',
  authenticateToken,
  async (req, res) => {
    const transactionId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatuses = [
      'Under Investigation',
      'Approved',
      'Flagged Fraud'
    ];

    if (
      !Number.isSafeInteger(transactionId) ||
      transactionId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid transaction ID.'
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid triage status.'
      });
    }

    try {
      const { rows } = await pool.query(
        `UPDATE transactions
         SET triage_status = $1
         WHERE id = $2
           AND user_id = $3
         RETURNING id, triage_status;`,
        [status, transactionId, req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Transaction not found.'
        });
      }

      res.json({
        success: true,
        transaction: rows[0]
      });
    } catch (err) {
      console.error(
        'Triage status update error:',
        err.message
      );

      res.status(500).json({
        error: 'Failed to update triage status.'
      });
    }
  }
);

// -----------------------------------------------------------------------------
// SIMULATED PLAID WEBHOOK: BANK CONNECTION SYNC
// -----------------------------------------------------------------------------
app.post(
  '/api/webhooks/plaid',
  authenticateToken,
  async (req, res) => {
    const { bankName, accountType } = req.body;

    if (!bankName) {
      return res.status(400).json({
        success: false,
        error: 'bankName is required'
      });
    }

    try {
      const query = `
        INSERT INTO transactions
          (user_id, amount, type, category, timestamp)
        VALUES ($1, 0, 'INFLOW', 'Plaid Sync', NOW())
        RETURNING *;
      `;

      const { rows } = await pool.query(query, [
        req.user.id
      ]);

      const metrics = await getCalculatedMetrics(
        0,
        req.user.id
      );

      broadcast(
        {
          event: 'PLAID_SYNC',
          bankName,
          accountType:
            accountType || 'Business Operating',
          metrics
        },
        req.user.id
      );

      res.status(200).json({
        success: true,
        bankName,
        transaction: rows[0],
        metrics
      });
    } catch (err) {
      console.error(
        'Plaid webhook error:',
        err.message
      );

      res.status(500).json({
        success: false,
        error: 'Failed to process bank connection webhook'
      });
    }
  }
);

// -----------------------------------------------------------------------------
// WEBSOCKET INITIAL SYNC
// -----------------------------------------------------------------------------
wss.on('connection', async (ws, req) => {
  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Access token required');
    return;
  }

  let user;

  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    ws.close(4003, 'Invalid or expired token');
    return;
  }

  ws.userId = user.id;

  try {
    const metrics = await getCalculatedMetrics(
      0,
      user.id
    );

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          event: 'METRICS_UPDATE',
          metrics
        })
      );
    }
  } catch (err) {
    console.error(
      'WebSocket initial sync error:',
      err.message
    );

    ws.close(1011, 'Unable to load metrics');
  }
});

// -----------------------------------------------------------------------------
// BACKGROUND METRICS UPDATES
// -----------------------------------------------------------------------------
setInterval(async () => {
  const userIds = new Set(
    [...wss.clients]
      .filter(
        client =>
          client.readyState === WebSocket.OPEN &&
          client.userId != null
      )
      .map(client => String(client.userId))
  );

  for (const userId of userIds) {
    try {
      const metrics = await getCalculatedMetrics(
        0,
        userId
      );

      broadcast(
        {
          event: 'METRICS_UPDATE',
          metrics
        },
        userId
      );
    } catch (err) {
      console.error(
        'Background metric update error:',
        err.message
      );
    }
  }
}, 30000);

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});