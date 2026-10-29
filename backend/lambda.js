// Example inside your transaction route (e.g., src/routes/transactions.js)
import express from 'express';
const router = express.Router();

router.post('/transactions', async (req, res) => {
    try {
        const { amount, category } = req.body;

        // 1. Call your deployed Python ML Lambda microservice
        const mlResponse = await fetch('https://5i4exa2vqitb427ujgkleloyze0gtmct.lambda-url.us-east-1.on.aws/predict-anomaly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, category })
        });

        if (!mlResponse.ok) {
            throw new Error('ML service failed to respond correctly');
        }

        const anomalyResult = await mlResponse.json();

        // 2. Continue with your database logic using the ML result
        res.status(200).json({
            success: true,
            transaction: { amount, category },
            anomalyCheck: anomalyResult // { isAnomaly: true/false, anomalyScore: ... }
        });

    } catch (error) {
        console.error("Error processing transaction:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;