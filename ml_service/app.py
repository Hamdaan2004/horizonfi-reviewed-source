from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from mangum import Mangum

app = FastAPI(title="HorizonFi Anomaly Detection Service")

DATA_PATH = Path(__file__).parent / "transaction_training_data.csv"

# Load and validate the synthetic training dataset.
training_data = pd.read_csv(DATA_PATH)

required_columns = {"amount", "category"}
if not required_columns.issubset(training_data.columns):
    raise ValueError("Training CSV must contain amount and category columns.")

training_data["amount"] = pd.to_numeric(
    training_data["amount"], errors="raise"
)

if training_data.empty or training_data["amount"].isna().any():
    raise ValueError("Training data must contain valid, non-empty amounts.")

# Isolation Forest currently uses absolute amount as its only feature.
X_train = training_data[["amount"]].abs().to_numpy()

model = IsolationForest(
    contamination=0.1,
    random_state=42
)
model.fit(X_train)


class TransactionPayload(BaseModel):
    amount: float = Field(..., allow_inf_nan=False)
    category: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "trainingRows": len(training_data),
        "features": ["absolute_amount"],
        "model": "IsolationForest"
    }


@app.post("/predict-anomaly")
def predict_anomaly(tx: TransactionPayload):
    abs_amount = abs(tx.amount)
    prediction = model.predict([[abs_amount]])
    score = model.decision_function([[abs_amount]])

    return {
        "isAnomaly": bool(prediction[0] == -1),
        "anomalyScore": float(round(score[0], 4)),
        "method": "IsolationForest"
    }


# Mangum converts FastAPI requests into AWS Lambda handlers.
handler = Mangum(app)
