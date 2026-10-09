"""Vekil modeli ve doğrulama özetlerini web katmanı için dışa aktarır.

Ağaçlar düz diziler olarak yazılır; web tarafı kendi değerlendiricisini kullanır ve
ml/ içindeki Python tahminleriyle eşleştiği bir parite testiyle doğrulanır.
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "src" / "data"
OUT.mkdir(parents=True, exist_ok=True)
FEATS = ["lanes", "pooled", "rho", "mean_service"]


def r(x, k=5):
    return round(float(x), k)


models = joblib.load(ROOT / "ml/surrogate.joblib")
export = {"features": FEATS, "targets": {}}
for name, hm in models.items():
    trees = []
    for it in hm._predictors:
        nd = it[0].nodes
        feat = np.where(nd["is_leaf"], -1, nd["feature_idx"]).astype(int).tolist()
        trees.append({
            "f": feat,
            "t": [r(v, 9) if f >= 0 else 0 for v, f in zip(nd["num_threshold"], feat)],
            "l": nd["left"].astype(int).tolist(),
            "r": nd["right"].astype(int).tolist(),
            "v": [r(v, 8) if f < 0 else 0 for v, f in zip(nd["value"], feat)],
        })
    export["targets"][name] = {"baseline": r(hm._baseline_prediction[0][0], 9), "trees": trees}
(OUT / "surrogate.json").write_text(json.dumps(export, separators=(",", ":")))

# parite için sabit test satırları: web testi bu satırları kendi değerlendiricisinde çalıştırıp karşılaştırır
te = pd.read_csv(ROOT / "ml/data/sweep_test.csv").sample(150, random_state=0)
te["pooled"] = (te.layout == "pooled").astype(int)
X = te[FEATS]
pred = {
    "wait_mean": np.expm1(models["wait_mean"].predict(X)),
    "wait_p90": np.expm1(models["wait_p90"].predict(X)),
    "p_wait": np.clip(models["p_wait"].predict(X), 0, 1),
}
fixture = [{"x": [float(v) for v in row], "y": {k: float(pred[k][i]) for k in pred}} for i, row in enumerate(X.to_numpy())]
(OUT / "surrogate_parity.json").write_text(json.dumps(fixture, separators=(",", ":")))

# ---- doğrulama özetleri
h = json.loads((ROOT / "docs/holdout_P1P2_to_P3.json").read_text())["windows"]


def col(mode, ch, key, real, stable=False):
    rows = []
    for w in h:
        if stable and not w["stable"]:
            continue
        sim = w[mode][ch]
        rv = w.get(real)
        if sim is None or rv is None:
            continue
        s = sim[key]
        rows.append([r(rv, 3), r(s["p05"], 3), r(s["p50"], 3), r(s["p95"], 3)])
    return rows


val = json.loads((ROOT / "docs/validation.json").read_text())
theory = {c: [{k: r(v, 4) for k, v in row.items()} for row in rows] for c, rows in val["mmc"].items()}
out = {
    "scatter": {
        "serviceMean": col("observed", "servis", "serviceMean", "tran_mean_service"),
        "utilization": col("observed", "servis", "utilization", "util_service", True),
        "count": col("predicted", "servis", "count", "n_service"),
        "basket": col("observed", "servis", "basketMean", "basket_mean_service"),
    },
    "holdout": json.loads((ROOT / "docs/holdout_metrics.json").read_text()),
    "recalibration": json.loads((ROOT / "docs/recalibration_metrics.json").read_text()),
    "arrival": json.loads((ROOT / "ml/arrival_forecast_metrics.json").read_text()),
    "surrogate": json.loads((ROOT / "ml/surrogate_metrics.json").read_text()),
    "theory": theory,
}
(OUT / "validation.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
for f in sorted(OUT.glob("*.json")):
    print(f.name, round(f.stat().st_size / 1024), "KB")
