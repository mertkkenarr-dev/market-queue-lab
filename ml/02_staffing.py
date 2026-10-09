"""Personel planı: her gün tipi x saat için hedefi sağlayan en az kasa sayısı (vekil modelle).

İki talep senaryosu: ortalama gün ve 'yoğun gün' (günlük çarpanın %90 üst dilimi, σ_gün'den).
Plan simülatörden bağımsız üretilir; sim/scripts/verify_staffing.ts onu gerçek motorla sınar.
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
TARGET_P90 = 120.0  # sn: müşterilerin %90'ı en fazla 2 dk beklesin
P = json.loads((ROOT / "sim/params.json").read_text())
models = joblib.load(ROOT / "ml/surrogate.joblib")
sm = P["service"]["servis"]
sigma = P["arrival_profile"]["sigma_day"]
Z90 = 1.2816


def mean_service(ctx: str) -> float:
    pmf = np.array(P["channel"]["joint"]["servis"]["by_context"][ctx]["pmf_items_x_card"])
    idx = np.arange(600)
    items, card = (idx >> 1) + 1, idx & 1
    return float(np.sum(pmf * np.maximum(1.0, sm["a"] + sm["card_extra"] * card + sm["b"] * items ** sm["gamma"])))


def predict_p90(c: int, lam_h: float, es: float) -> float:
    x = pd.DataFrame([{"lanes": c, "pooled": 0, "rho": lam_h * es / 3600 / c, "mean_service": es}])
    return float(np.expm1(models["wait_p90"].predict(x))[0])


plan = []
for grp, hours in P["arrival_profile"]["per_second_by_group_hour"].items():
    for h_str, per_sec in hours.items():
        h = int(h_str)
        if not 8 <= h <= 21:
            continue
        share = P["channel"]["share_by_hour"].get(h_str, P["channel"]["self_service_share"])
        ctx = f"{grp}|{'pm' if h >= 17 else 'am'}"
        es = mean_service(ctx)
        for scen, mult in (("ortalama", 1.0), ("yoğun", float(np.exp(sigma * Z90)))):
            lam_h = per_sec * 3600 * (1 - share) * mult
            # ρ<0.98 sınırı: vekil, eğitim aralığının (ρ<=1.05) dışında güvenilmez
            c = next((c for c in range(1, 13) if lam_h * es / 3600 / c < 0.98 and predict_p90(c, lam_h, es) <= TARGET_P90), None)
            plan.append({"group": grp, "hour": h, "scenario": scen, "lam_per_hour": lam_h, "mean_service": es, "ctx": ctx,
                         "lanes": c, "pred_p90": predict_p90(c, lam_h, es) if c else None,
                         "pred_p90_one_less": predict_p90(c - 1, lam_h, es) if c and c > 1 else None})
bad = [p for p in plan if p["lanes"] is None]
if bad:
    sys.exit(f"Hedef 12 kasayla bile sağlanamayan {len(bad)} hücre: {bad[:2]}")
(ROOT / "ml/staffing_plan.json").write_text(json.dumps({"target_p90_s": TARGET_P90, "sigma_day": sigma, "plan": plan}, indent=1))
df = pd.DataFrame(plan)
print(df.pivot_table(index="hour", columns=["group", "scenario"], values="lanes").astype(int).to_string())
