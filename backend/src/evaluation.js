import pool from './db.js';

/**
 * Walk-forward evaluation of quarterly outflow forecasts for a single user.
 * Returns no fabricated accuracy values when there is insufficient history.
 */
export async function evaluateForecastAccuracy(userId) {
  if (userId == null) throw new Error('userId is required for forecast evaluation');

  const query = `
    SELECT
      date_trunc('quarter', timestamp AT TIME ZONE 'UTC') AS quarter_start,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS actual_outflow
    FROM transactions
    WHERE user_id = $1
    GROUP BY 1
    ORDER BY 1 ASC;
  `;
  const { rows } = await pool.query(query, [userId]);
  const actuals = rows.map((row) => Number.parseFloat(row.actual_outflow) || 0);

  if (actuals.length < 2) {
    return {
      mape: null,
      rmse: null,
      evaluations: 0,
      status: 'Insufficient historical quarters',
      interpretation: 'At least two quarters with transaction history are required to evaluate forecast error.',
    };
  }

  let percentageError = 0;
  let squaredError = 0;
  let evaluationWindows = 0;

  for (let index = 1; index < actuals.length; index += 1) {
    const trainingWindow = actuals.slice(Math.max(0, index - 3), index);
    const predicted = trainingWindow.reduce((sum, value) => sum + value, 0) / trainingWindow.length;
    const actual = actuals[index];
    const error = actual - predicted;
    squaredError += error ** 2;
    if (actual > 0) percentageError += Math.abs(error / actual);
    evaluationWindows += 1;
  }

  const mapeWindows = actuals.slice(1).filter((actual) => actual > 0).length;
  const mape = mapeWindows > 0 ? Number(((percentageError / mapeWindows) * 100).toFixed(2)) : null;
  const rmse = Number(Math.sqrt(squaredError / evaluationWindows).toFixed(2));

  return {
    mape,
    rmse,
    evaluations: evaluationWindows,
    status: mape == null ? 'MAPE unavailable (zero actual outflows)' : mape <= 15 ? 'Pass (within target)' : 'Requires calibration',
    targetThreshold: 'MAPE <= 15% (target, not guaranteed)',
  };
}
