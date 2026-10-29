/**
 * Runway and 12-month cash projection using the average outflow of the latest
 * three calendar quarters (or the available quarters during cold start).
 * All date grouping uses UTC to avoid local-time quarter-boundary drift.
 */
function parseNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function quarterKey(date) {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3);
  return year * 4 + quarter;
}

function calculateQuarterlyBaseline(transactions) {
  const dated = transactions
    .map((transaction) => ({
      amount: parseNumber(transaction.amount),
      date: new Date(transaction.timestamp || transaction.event_timestamp || transaction.date),
    }))
    .filter((transaction) => Number.isFinite(transaction.date.getTime()));

  if (dated.length === 0) return { baselineQuarterlyBurn: 0, quartersUsed: 0 };

  const quarterOutflows = new Map();
  for (const transaction of dated) {
    const key = quarterKey(transaction.date);
    if (!quarterOutflows.has(key)) quarterOutflows.set(key, 0);
    if (transaction.amount < 0) {
      quarterOutflows.set(key, quarterOutflows.get(key) + Math.abs(transaction.amount));
    }
  }

  const keys = [...quarterOutflows.keys()].sort((a, b) => a - b);
  const latestThree = keys.slice(-3).map((key) => quarterOutflows.get(key));
  const baselineQuarterlyBurn = latestThree.length
    ? latestThree.reduce((sum, amount) => sum + amount, 0) / latestThree.length
    : 0;

  return {
    baselineQuarterlyBurn,
    quartersUsed: latestThree.length,
  };
}

export function calculateRunwayAndForecast(
  currentBalance = 0,
  transactions = [],
  monthsToForecast = 12,
  seasonalityFactor = 0.0
) {
  const balance = parseNumber(currentBalance);
  const seasonality = Math.min(0.5, Math.max(-0.5, parseNumber(seasonalityFactor)));
  const monthCount = Math.min(60, Math.max(1, Math.trunc(parseNumber(monthsToForecast) || 12)));
  const { baselineQuarterlyBurn, quartersUsed } = calculateQuarterlyBaseline(transactions);

  // One quarter is three months. The forecast uses the trailing-quarter baseline,
  // adjusted by the user-selected scenario factor.
  const monthlyBurn = baselineQuarterlyBurn / 3;
  const safeBalance = Math.max(0, balance);
  const runwayMonths = monthlyBurn > 0 ? safeBalance / monthlyBurn : 0;
  const forecast = [];
  let projectedBalance = safeBalance;
  const adjustedMonthlyBurn = monthlyBurn * (1 + seasonality);

  for (let month = 1; month <= monthCount; month += 1) {
    projectedBalance -= adjustedMonthlyBurn;
    forecast.push({
      month,
      projectedBurn: Number(adjustedMonthlyBurn.toFixed(2)),
      projectedBalance: Number(Math.max(0, projectedBalance).toFixed(2)),
    });
  }

  const projectedNextQuarterBurn = adjustedMonthlyBurn * 3;

  return {
    currentBalance: Number(balance.toFixed(2)),
    monthlyBurn: Number(monthlyBurn.toFixed(2)),
    runwayMonths: Number(Math.max(0, runwayMonths).toFixed(1)),
    baselineQuarterlyBurn: Number(baselineQuarterlyBurn.toFixed(2)),
    quartersUsedForBaseline: quartersUsed,
    seasonalityFactor: seasonality,
    projectedNextQuarterBurn: Number(projectedNextQuarterBurn.toFixed(2)),
    forecast,
  };
}
