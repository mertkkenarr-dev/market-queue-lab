"""Dışarıda bırakılan dönem (28 Mart - 10 Nisan 2019) için saatlik gözlem pencereleri.

Her pencere: o saat kaç kasa açıktı (kasiyer giriş/kilit kayıtlarından), kaç müşteri geldi, ortalama sepet / servis süresi,
kasa doluluğu. Simülasyon bu pencerelerin hiçbirini öğrenmede görmedi.
"""
import argparse
import json
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument("--period", default="20190328-20190410")
HOLDOUT = ap.parse_args().period
con = duckdb.connect(str(ROOT / "data" / "processed" / "pos.duckdb"), read_only=True)
GROUP_OF = {1: "mon_thu", 2: "mon_thu", 3: "mon_thu", 4: "mon_thu", 5: "fri", 6: "sat", 0: "sun"}

tx = con.execute(
    f"""SELECT WorkstationGroupID g, OperatorID o, BeginDateTime b, EndDateTime e, TranTime, ArtNum, TNcard::int card, BreakTime gap
        FROM transactions WHERE period = '{HOLDOUT}' AND TranTime > 0 AND Amount > 0 AND ArtNum BETWEEN 1 AND 300"""
).df()
logs = con.execute(
    f"""SELECT WorkstationGroupID g, WorkstationID w, BeginDateTime t, Items it FROM operator_logs
        WHERE period = '{HOLDOUT}' AND WorkstationGroupID = 8 ORDER BY w, t"""
).df()
lane_logs = con.execute(
    f"""SELECT WorkstationID w, BeginDateTime t, Items it FROM operator_logs
        WHERE period = '{HOLDOUT}' AND WorkstationGroupID = 1 ORDER BY w, t"""
).df()


def lane_intervals(frame: pd.DataFrame) -> pd.DataFrame:
    """Servis kasası açık aralıkları: SignOn..SignOff, kilitli (Lock..UnLock, mola/kapalı) süreler çıkarılır."""
    out = []
    for w, grp in frame.groupby("w"):
        start, locked = None, False
        for t, it in zip(grp.t, grp.it):
            if it == "OperatorSignOn":
                start, locked = t, False
            elif it == "OperatorLock" and start is not None and not locked:
                out.append((w, start, t))
                locked = True
            elif it == "OperatorUnLock" and locked:
                start, locked = t, False
            elif it == "OperatorSignOff" and start is not None:
                if not locked:
                    out.append((w, start, t))
                start, locked = None, False
    return pd.DataFrame(out, columns=["w", "start", "end"])


lanes_iv = lane_intervals(lane_logs)
print(f"Servis kasası açık aralık (giriş/kilit kayıtlarından): {len(lanes_iv)}")

# --- Self-servis makineleri: SignOn..SignOff aralıkları (bu grupta Lock olayı yok, aralıklar temiz)
intervals = []
for w, grp in logs.groupby("w"):
    start = None
    for t, it in zip(grp.t, grp.it):
        if it == "OperatorSignOn":
            start = t
        elif it == "OperatorSignOff" and start is not None:
            intervals.append((w, start, t))
            start = None
iv = pd.DataFrame(intervals, columns=["w", "start", "end"])
print(f"Self-servis açık aralık: {len(iv)} | makine sayısı: {iv.w.nunique()}")


def time_weighted(frame: pd.DataFrame, w0: pd.Timestamp, w1: pd.Timestamp) -> float:
    """Pencerede zaman-ağırlıklı ortalama açık birim (kasa ya da makine) sayısı."""
    ov = (frame.end.clip(upper=w1) - frame.start.clip(lower=w0)).dt.total_seconds().clip(lower=0)
    return float(ov.sum() / (w1 - w0).total_seconds())


def open_self_machines(w0: pd.Timestamp, w1: pd.Timestamp) -> float:
    return time_weighted(iv, w0, w1)


tx["day"] = tx.b.dt.floor("D")
rows = []
GAP_SHORT = 30
GAP_BINS = 121  # 0..119 sn tek tek, son kutu >= 120 sn
all_gaps: list[float] = []
for day in sorted(tx.day.unique()):
    day_ts = pd.Timestamp(day)
    d = tx[tx.day == day]
    for h in range(8, 22):
        w0 = day_ts + pd.Timedelta(hours=h)
        w1 = w0 + pd.Timedelta(hours=1)
        v = d[(d.g == 1)]
        s = d[(d.g == 8)]
        started_v = v[(v.b >= w0) & (v.b < w1)]
        started_s = s[(s.b >= w0) & (s.b < w1)]
        if len(started_v) < 20:
            continue
        # Açık kasa: kasiyer giriş/kilit kayıtlarından zaman-ağırlıklı. Eski vekil (15 dk bloklarda işlem yapan farklı
        # kasiyer) kısa açılışları tam kasa sayıp kapasiteyi ~%13 şişiriyordu; karşılaştırma için saklanır.
        q = [w0 + pd.Timedelta(minutes=15 * k) for k in range(5)]
        proxy15 = float(np.mean([v[(v.b >= q[k]) & (v.b < q[k + 1])].o.nunique() for k in range(4)]))
        blocks = [time_weighted(lanes_iv, q[k], q[k + 1]) for k in range(4)]
        n_v = time_weighted(lanes_iv, w0, w1)
        # Kasa-saniye cinsinden gerçek doluluk: işlem aralığının pencereyle kesişimi
        def busy(frame):
            ov = (frame.e.clip(upper=w1) - frame.b.clip(lower=w0)).dt.total_seconds().clip(lower=0)
            return float(ov.sum())
        n_s = open_self_machines(w0, w1)
        # Kasiyerin bu işlemden sonraki boşluğu (BreakTime = sonraki işlemin başı - bu işlemin sonu). Vardiya sonu (>= 1 sa) dışarıda.
        g_v = started_v.gap[(started_v.gap >= 0) & (started_v.gap < 3600)].to_numpy(float)
        rows.append({
            "day": str(day_ts.date()), "dow_group": GROUP_OF[(day_ts.dayofweek + 1) % 7], "hour": h,
            "service_lanes": n_v, "service_lanes_proxy15": proxy15, "service_lanes_spread": float(max(blocks) - min(blocks)),
            "self_machines": n_s,
            "n_service": int(len(started_v)), "n_self": int(len(started_s)),
            "basket_mean_service": float(started_v.ArtNum.mean()),
            "basket_mean_self": float(started_s.ArtNum.mean()) if len(started_s) else None,
            "tran_mean_service": float(started_v.TranTime.mean()),
            "tran_mean_self": float(started_s.TranTime.mean()) if len(started_s) else None,
            "util_service": busy(v) / (max(n_v, 1e-9) * 3600.0),
            "util_self": busy(s) / (max(n_s, 1e-9) * 3600.0) if n_s > 0.5 else None,
            "gap_n_service": int(len(g_v)),
            "gap_short_service": float(np.mean(g_v <= GAP_SHORT)) if len(g_v) else None,
            "gap_median_service": float(np.median(g_v)) if len(g_v) else None,
        })
        all_gaps.extend(g_v.tolist())

win = pd.DataFrame(rows)
win["stable"] = (win.service_lanes_spread <= 1) & (win.service_lanes >= 2)
print(f"Toplam pencere: {len(win)} | gün: {win.day.nunique()} | stabil (kasa farkı<=1, >=2 kasa): {int(win.stable.sum())}")
print("Gün tipi dağılımı:", win.groupby("dow_group").day.nunique().to_dict())
print("Servis kasası sayısı (stabil): ", win[win.stable].service_lanes.describe().round(1).to_dict())
print("Self-servis makine (ort.):", win.self_machines.describe().round(1).to_dict())
print("Doluluk (stabil, servis):", win[win.stable].util_service.describe().round(2).to_dict())

out = ROOT / "data" / "processed" / f"windows_{HOLDOUT}.json"
gap_hist = np.bincount(np.minimum(np.floor(all_gaps).astype(int), GAP_BINS - 1), minlength=GAP_BINS)
print(f"Kasiyer boşluğu (servis): n={len(all_gaps):,}, <= {GAP_SHORT} sn payı={np.mean(np.array(all_gaps) <= GAP_SHORT):.3f}")
out.write_text(json.dumps({"period": HOLDOUT, "gap_short_seconds": GAP_SHORT, "gap_hist_service": gap_hist.tolist(),
                           "windows": json.loads(win.to_json(orient="records"))}, indent=1))
print("Yazıldı:", out.relative_to(ROOT))
