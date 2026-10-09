"""Simülatörün vekil modeli: (kasa, düzen, yük, müşteri başına kasa meşguliyeti) -> bekleme ölçüleri.

Neden gradient boosting: tablo veri, 4 özellik, keskin doğrusal olmayan yapı (ρ→1'de patlama),
monoton kısıtlarla fiziksel tutarlılık. Derin ağ bu boyutta gereksiz.
"""
import json
import math
import time
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

ROOT = Path(__file__).resolve().parents[1]
REPS = 12
tr = pd.read_csv(ROOT / "ml/data/sweep_train.csv")
te = pd.read_csv(ROOT / "ml/data/sweep_test.csv")
for d in (tr, te):
    d["pooled"] = (d.layout == "pooled").astype(int)
FEATS = ["lanes", "pooled", "rho", "mean_occupancy"]
MONO = [-1, 0, 1, 1]  # kasa↑ bekleme↓, yük↑ bekleme↑, kasa meşguliyeti↑ bekleme↑ (ρ sabitken zaman ölçeği)

TARGETS = {  # hedef -> (dönüşüm, ters dönüşüm); bekleme sağa çarpık: log uzayında öğren
    "wait_mean": (np.log1p, np.expm1),
    "wait_p90": (np.log1p, np.expm1),
    "p_wait": (lambda y: y, lambda y: np.clip(y, 0, 1)),
}
models, pred = {}, {}
for t, (f, finv) in TARGETS.items():
    m = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.06, max_leaf_nodes=24, monotonic_cst=MONO, random_state=0)
    m.fit(tr[FEATS], f(tr[t]))
    models[t] = m
    pred[t] = finv(m.predict(te[FEATS]))
joblib.dump(models, ROOT / "ml/surrogate.joblib")


def erlang_c_wait(c: int, lam: float, es: float) -> float:
    """M/M/c ortalama bekleme (sn). ρ>=1 için tanımsız -> NaN."""
    a = lam * es / 3600.0
    if a >= c:
        return float("nan")
    s = sum(a**k / math.factorial(k) for k in range(c))
    top = a**c / math.factorial(c) * c / (c - a)
    pc = top / (s + top)
    return pc / (c / es - lam / 3600.0)


te["erlang"] = [erlang_c_wait(int(r.lanes), r.lam_per_hour, r.mean_occupancy) for r in te.itertuples()]
te["sur"] = pred["wait_mean"]
te["noise"] = te.wait_mean_sd / math.sqrt(REPS)  # simülatörün kendi 12-tekrar ortalama hatası

bins = [(0.2, 0.5), (0.5, 0.7), (0.7, 0.85), (0.85, 0.95), (0.95, 1.05)]
rows = []
print(f"{'ρ aralığı':<12}{'n':>5}{'simülatör gürültüsü':>21}{'vekil MAE':>11}{'Erlang-C MAE':>14}   (ortalama bekleme, sn)")
for lo, hi in bins:
    s = te[(te.rho >= lo) & (te.rho < hi)]
    e_sur = float(np.mean(np.abs(s.sur - s.wait_mean)))
    e_erl = float(np.nanmean(np.abs(s.erlang - s.wait_mean))) if s.erlang.notna().any() else float("nan")
    noise = float(np.mean(s.noise))
    rows.append({"rho": f"{lo}-{hi}", "n": int(len(s)), "sim_noise": noise, "surrogate_mae": e_sur, "erlang_c_mae": e_erl})
    print(f"{lo:.2f}-{hi:.2f}   {len(s):>5}{noise:>21.2f}{e_sur:>11.2f}{e_erl:>14.2f}")

mae_p = float(np.mean(np.abs(pred["p_wait"] - te.p_wait)))
r2 = {t: float(1 - np.sum((pred[t] - te[t]) ** 2) / np.sum((te[t] - te[t].mean()) ** 2)) for t in TARGETS}
cover = float(np.mean(np.abs(te.sur - te.wait_mean) <= 2 * te.noise + 1.0))
t0 = time.perf_counter(); [m.predict(te[FEATS]) for m in models.values()]; dt = time.perf_counter() - t0
print(f"\nR²: { {k: round(v, 3) for k, v in r2.items()} } | P(bekleme) MAE: {mae_p:.4f}")
print(f"{len(te)} senaryo x 3 hedef tahmini: {dt*1000:.0f} ms ({dt/len(te)*1e6:.0f} µs / senaryo)")
(ROOT / "ml/surrogate_metrics.json").write_text(json.dumps({"by_rho": rows, "r2": r2, "p_wait_mae": mae_p, "predict_ms_per_scenario": dt / len(te) * 1000, "n_test": len(te)}, indent=2))

fig, ax = plt.subplots(1, 2, figsize=(11, 4.6))
ax[0].scatter(te.wait_mean + 0.1, te.sur + 0.1, s=4, alpha=0.35, color="#1f5f5b", label="vekil model")
ok = te.erlang.notna()
ax[0].scatter(te.wait_mean[ok] + 0.1, te.erlang[ok] + 0.1, s=4, alpha=0.25, color="#a8763e", label="Erlang-C (M/M/c)")
lim = [0.1, te.wait_mean.max() * 1.5]; ax[0].plot(lim, lim, "k--", lw=1)
ax[0].set(xscale="log", yscale="log", xlabel="simülatör (12 tekrar ort.), sn", ylabel="tahmin, sn", title="Hiç görülmemiş 3 000 senaryo")
ax[0].legend(markerscale=3, fontsize=8)
x = np.arange(len(rows)); w = 0.27
ax[1].bar(x - w, [r["sim_noise"] for r in rows], w, color="#bbb", label="simülatör gürültüsü (taban)")
ax[1].bar(x, [r["surrogate_mae"] for r in rows], w, color="#1f5f5b", label="vekil MAE")
ax[1].bar(x + w, [0 if math.isnan(r["erlang_c_mae"]) else r["erlang_c_mae"] for r in rows], w, color="#a8763e", label="Erlang-C MAE")
ax[1].set_xticks(x, [r["rho"] for r in rows]); ax[1].set(xlabel="yük oranı ρ", ylabel="ort. mutlak hata, sn", yscale="log", title="Hata, yüke göre")
ax[1].legend(fontsize=8)
fig.tight_layout(); fig.savefig(ROOT / "docs/figures/10_surrogate.png", dpi=150)
