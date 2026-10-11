// ─────────────────────────────────────────────────────────────
//  API LAYER – the only file the model team needs to touch.
//
//  Expected request  (POST  API_URL):
//  {
//    "age_months": 30, "sex": "F", "language": "Hindi", "family_history": 0,
//    "answers": { "q1": 3, "q2": 4, ... }          // values 0-4
//  }
//  Expected response:
//  { "probability": 0.0-1.0, "domain_scores": {"Social":0-1,"Communication":0-1,"Behaviour":0-1} }
// ─────────────────────────────────────────────────────────────
const API_URL = ""; // e.g. "http://localhost:8000/predict"  (empty = demo mode)

// Converts an answer to a 0-1 "concern" value (reverse items flipped).
function concern(q, v) { return (q.reverse ? 4 - v : v) / 4; }

// Demo scorer used until the real model is connected. NOT a trained model.
function demoPredict(payload) {
  const by = {};
  QUESTIONS.forEach(q => {
    (by[q.domain] = by[q.domain] || []).push(concern(q, payload.answers[q.id]));
  });
  const domain_scores = {};
  let total = 0, n = 0;
  for (const d in by) {
    const a = by[d];
    domain_scores[d] = a.reduce((s, x) => s + x, 0) / a.length;
    total += a.reduce((s, x) => s + x, 0); n += a.length;
  }
  return { probability: total / n, domain_scores };
}

async function predict(payload) {
  if (!API_URL) {
    await new Promise(r => setTimeout(r, 900)); // fake latency for the UI
    return { ...demoPredict(payload), source: "demo" };
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.status);
    return { ...(await res.json()), source: "model" };
  } catch (e) {
    console.warn("Model API unreachable, using demo scorer:", e);
    return { ...demoPredict(payload), source: "demo" };
  }
}
