"""Keşifsel analiz: veri kalitesi, varış deseni, sepet ve servis süresi."""
from pathlib import Path

import duckdb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / "docs" / "figures"
FIG.mkdir(parents=True, exist_ok=True)
con = duckdb.connect(str(ROOT / "data" / "processed" / "pos.duckdb"), read_only=True)


def q(sql: str):
    return con.execute(sql).df()


print("== Veri kalitesi")
print(
    q(
        """
SELECT count(*) n,
       sum((TranTime <= 0)::int) tran_le0,
       sum((ArtNum <= 0)::int) art_le0,
       sum((TranTime > 1800)::int) tran_gt30min,
       sum((Amount <= 0)::int) amount_le0,
       sum(BeginDateTime IS NULL OR EndDateTime IS NULL)::int null_times,
       count(DISTINCT WorkstationGroupID) n_groups,
       count(DISTINCT OperatorID) n_operators
FROM transactions"""
    ).T
)
print(q("SELECT WorkstationGroupID g, count(*) n, round(avg(TranTime),1) avg_tran, round(avg(ArtNum),1) avg_items FROM transactions GROUP BY 1 ORDER BY 1"))
print(q("SELECT quantile_cont(TranTime,[0.01,0.25,0.5,0.75,0.95,0.99]) q, quantile_cont(ArtNum,[0.5,0.75,0.95,0.99]) items_q FROM transactions"))

# --- Saatlik varış deseni (hafta içi / hafta sonu) ---
hourly = q(
    """
SELECT period, date_trunc('day', BeginDateTime) d, dayofweek(BeginDateTime) dow,
       hour(BeginDateTime) h, count(*) n
FROM transactions GROUP BY ALL"""
)
hourly["weekend"] = hourly["dow"].isin([0, 6])
prof = hourly.groupby(["weekend", "h"])["n"].mean().unstack(0)
fig, ax = plt.subplots(figsize=(8, 4))
prof[False].plot(ax=ax, label="Hafta içi", lw=2)
prof[True].plot(ax=ax, label="Hafta sonu", lw=2)
ax.set(title="Saatlik ortalama işlem sayısı (gerçek veri)", xlabel="Saat", ylabel="işlem/saat")
ax.legend()
fig.tight_layout()
fig.savefig(FIG / "01_hourly_arrivals.png", dpi=150)

# --- Sepet büyüklüğü ---
items = q("SELECT ArtNum FROM transactions WHERE ArtNum BETWEEN 1 AND 100")["ArtNum"]
fig, ax = plt.subplots(figsize=(8, 4))
ax.hist(items, bins=np.arange(0, 101, 1), density=True, color="#a8763e")
ax.set(title="Sepet büyüklüğü dağılımı (ürün/işlem)", xlabel="Ürün sayısı", ylabel="yoğunluk")
fig.tight_layout()
fig.savefig(FIG / "02_basket_size.png", dpi=150)

# --- Servis süresi vs ürün sayısı ---
svc = q(
    """
SELECT ArtNum, TranTime, (TNcard::int) card
FROM transactions WHERE ArtNum BETWEEN 1 AND 60 AND TranTime BETWEEN 1 AND 1800"""
)
b, a = np.polyfit(svc["ArtNum"], svc["TranTime"], 1)
print(f"\nServis süresi ≈ {a:.1f} sn + {b:.2f} sn/ürün (OLS)")
for card in (0, 1):
    s = svc[svc.card == card]
    bb, aa = np.polyfit(s["ArtNum"], s["TranTime"], 1)
    print(f"  kart={card}: {aa:.1f} sn + {bb:.2f} sn/ürün (n={len(s):,})")
fig, ax = plt.subplots(figsize=(8, 4))
sample = svc.sample(8000, random_state=0)
ax.scatter(sample["ArtNum"], sample["TranTime"], s=4, alpha=0.25)
xs = np.array([1, 60])
ax.plot(xs, a + b * xs, color="crimson", lw=2, label=f"{a:.0f} sn + {b:.1f} sn/ürün")
ax.set(title="Servis süresi ve sepet büyüklüğü", xlabel="Ürün sayısı", ylabel="TranTime (sn)")
ax.legend()
fig.tight_layout()
fig.savefig(FIG / "03_service_vs_items.png", dpi=150)

# --- Aktif kasiyer sayısı (saatlik) ---
act = q(
    """
SELECT date_trunc('day', BeginDateTime) d, hour(BeginDateTime) h,
       count(DISTINCT OperatorID) ops, count(*) n
FROM transactions GROUP BY ALL"""
)
print("\nSaatte ortalama aktif kasiyer / işlem:")
print(act.groupby("h")[["ops", "n"]].mean().round(1).T.to_string())
print("\nKasa başına saatlik işlem (ort.):", round((act["n"] / act["ops"]).mean(), 1))
print("Grafikler:", sorted(p.name for p in FIG.glob("*.png")))
