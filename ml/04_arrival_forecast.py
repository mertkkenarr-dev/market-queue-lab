"""Saatlik müşteri sayısı tahmini: ML, basit profil ortalamasını geçiyor mu?

Üç yöntem, aynı zaman-dışı kat yapısında (eğitim dönemleri -> görülmemiş dönem):
  1) profil: gün tipi x saat eğitim ortalaması (simülatörün kullandığı)
  2) profil x dönem ölçeği: son eğitim döneminin genel seviyesine ayarlı
  3) Poisson GBM: gün tipi, saat, haftanın günü, ay -> sayı (ekstra özellikler)
Metrik: MAPE ve Poisson sapması. Test günlerinin hiçbiri eğitimde yok.
"""
import json
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

ROOT = Path(__file__).resolve().parents[1]
P1, P2, P3 = "20171207-20171219", "20190213-20190226", "20190328-20190410"
con = duckdb.connect(str(ROOT / "data/processed/pos.duckdb"), read_only=True)
df = con.execute(
    """SELECT period, date_trunc('day', BeginDateTime) d, dayofweek(BeginDateTime) dow, hour(BeginDateTime) h, count(*) n
       FROM transactions WHERE TranTime > 0 AND Amount > 0 AND ArtNum BETWEEN 1 AND 300 AND hour(BeginDateTime) BETWEEN 8 AND 21
       GROUP BY ALL"""
).df()
GROUP_OF = {1: "mon_thu", 2: "mon_thu", 3: "mon_thu", 4: "mon_thu", 5: "fri", 6: "sat", 0: "sun"}
df["grp"] = df.dow.map(GROUP_OF)
# boş saatleri sıfır say (satış olmayan saat de bir gözlemdir)
days = df[["period", "d", "dow", "grp"]].drop_duplicates()
grid = days.merge(pd.DataFrame({"h": range(8, 22)}), how="cross").merge(df[["d", "h", "n"]], on=["d", "h"], how="left").fillna({"n": 0})
grid["month"] = grid.d.dt.month


def profile(train):
    return train.groupby(["grp", "h"]).n.mean()


def evaluate(train_periods, test_period):
    tr, te = grid[grid.period.isin(train_periods)], grid[grid.period == test_period]
    prof = profile(tr)
    base = te.apply(lambda r: prof.get((r.grp, r.h), np.nan), axis=1).to_numpy()
    last = grid[grid.period == train_periods[-1]]
    scale = last.n.sum() / (last.apply(lambda r: prof.get((r.grp, r.h), np.nan), axis=1).sum())
    feats = ["dow", "h", "month"]
    gbm = HistGradientBoostingRegressor(loss="poisson", max_iter=200, learning_rate=0.05, max_leaf_nodes=8, random_state=0).fit(tr[feats], tr.n)
    preds = {"profil": base, "profil × son dönem ölçeği": base * scale, "Poisson GBM": gbm.predict(te[feats])}
    y = te.n.to_numpy(); mask = y >= 20  # MAPE'yi küçük sayılar şişirmesin
    out = {}
    for k, p in preds.items():
        p = np.maximum(p, 1e-6)
        dev = 2 * np.mean(np.where(y > 0, y * np.log(y / p), 0) - (y - p))
        out[k] = {"mape": float(np.mean(np.abs(p[mask] - y[mask]) / y[mask]) * 100), "bias": float(np.mean((p[mask] - y[mask]) / y[mask]) * 100), "poisson_deviance": float(dev)}
    return out, float(scale)


res = {}
for name, (trn, tst) in {"P1→P2": ([P1], P2), "P1+P2→P3": ([P1, P2], P3), "P2→P3": ([P2], P3)}.items():
    r, sc = evaluate(trn, tst)
    res[name] = {"methods": r, "last_period_scale": sc}
    print(f"\n=== {name} (son dönem ölçeği {sc:.2f})\n{'yöntem':<28}{'MAPE%':>8}{'yanlılık%':>11}{'Poisson sapması':>17}")
    for k, v in r.items():
        print(f"{k:<28}{v['mape']:>8.1f}{v['bias']:>+11.1f}{v['poisson_deviance']:>17.2f}")
(ROOT / "ml/arrival_forecast_metrics.json").write_text(json.dumps(res, indent=2, ensure_ascii=False))
