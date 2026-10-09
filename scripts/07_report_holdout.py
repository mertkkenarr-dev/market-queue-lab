"""Kayan-başlangıç doğrulaması raporu: üç kat, gerçek vs simülasyon."""
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FOLDS = {
    "P1→P2": "holdout_P1_to_P2.json",
    "P1+P2→P3": "holdout_P1P2_to_P3.json",
    "P2→P3": "holdout_P2_to_P3.json",
}
from _holdout_lib import CHECKS, collect, stats

all_results, loaded = {}, {}
for fold, fn in FOLDS.items():
    data = json.loads((ROOT / "docs" / fn).read_text())
    loaded[fold] = data
    W = data["windows"]
    print(f"\n=== {fold}: eğitim {data['meta']['train_periods']} -> test {data['meta']['test_period']}")
    print(f"{'Metrik':<36}{'n':>4}{'yanlılık%':>11}{'MAPE%':>8}{'%90 kapsama':>13}")
    out = {}
    for mode, ch, sk, rk, stab, label in CHECKS:
        a = collect(W, mode, ch, sk, rk, stab)
        b, m, c, n = stats(a)
        out[label] = {"mode": mode, "n": n, "bias_pct": b, "mape_pct": m, "coverage_pct": c}
        print(f"{label:<36}{n:>4}{b:>+11.1f}{m:>8.1f}{c:>13.0f}")
    all_results[fold] = out
(ROOT / "docs" / "holdout_metrics.json").write_text(json.dumps(all_results, indent=2, ensure_ascii=False))

# ---- Şekil 1: kayma. Her metrik için üç katın yanlılığı
labels = [c[5] for c in CHECKS]
fig, ax = plt.subplots(figsize=(11, 4.8))
x = np.arange(len(labels)); wdt = 0.26
for i, (fold, col) in enumerate(zip(FOLDS, ["#a8763e", "#1f5f5b", "#7a3b6e"])):
    ax.bar(x + (i - 1) * wdt, [all_results[fold][l]["bias_pct"] for l in labels], wdt, label=fold, color=col)
ax.axhline(0, color="k", lw=0.8)
ax.set_xticks(x, labels, rotation=18, ha="right", fontsize=8.5)
ax.set(ylabel="simülasyon yanlılığı (%)", title="Kalibrasyon eskiyor: aynı model, farklı dönemlerde farklı yanlılık")
ax.legend(title="eğitim → test")
ax.grid(axis="y", alpha=0.3)
fig.tight_layout()
fig.savefig(ROOT / "docs" / "figures" / "08_drift_bias.png", dpi=150)

# ---- Şekil 2: ana kat (P1+P2→P3) dağılım grafikleri
W = loaded["P1+P2→P3"]["windows"]
fig, axes = plt.subplots(2, 2, figsize=(11, 9))
panels = [
    (axes[0, 0], "observed", "servis", "serviceMean", "tran_mean_service", False, "Ort. servis süresi (sn), servis kasası"),
    (axes[0, 1], "observed", "servis", "utilization", "util_service", True, "Kasa doluluğu, stabil saatler"),
    (axes[1, 0], "predicted", "servis", "count", "n_service", False, "Saatlik müşteri sayısı, yalnız eğitimden tahmin"),
    (axes[1, 1], "observed", "servis", "basketMean", "basket_mean_service", False, "Ort. sepet (ürün), servis kasası"),
]
for ax, mode, ch, sk, rk, stab, title in panels:
    a = collect(W, mode, ch, sk, rk, stab)
    real, lo, med, hi = a.T
    ax.errorbar(real, med, yerr=[med - lo, hi - med], fmt="o", ms=3.5, color="#1f5f5b", ecolor="#9fc3bf", elinewidth=1, alpha=0.8)
    lim = [min(real.min(), lo.min()) * 0.95, max(real.max(), hi.max()) * 1.05]
    ax.plot(lim, lim, "k--", lw=1)
    b, m, c, n = stats(a)
    ax.set(title=f"{title}\nn={n} | yanlılık %{b:+.1f} | MAPE %{m:.1f} | %90 kapsama %{c:.0f}",
           xlabel="gerçek (hold-out)", ylabel="simülasyon (medyan, %90 aralık)")
    ax.title.set_fontsize(9.5)
fig.suptitle("Eğitim: P1+P2, test: P3 (modelin hiç görmediği dönem)", fontsize=11)
fig.tight_layout()
fig.savefig(ROOT / "docs" / "figures" / "07_holdout.png", dpi=150)
print("\nYazıldı: docs/figures/07_holdout.png, 08_drift_bias.png, docs/holdout_metrics.json")

# ---- Şekil 3: kasiyer boşluğu. Veride bekleme yok ama boşluk var: kuyruk varsa kısa, yoksa uzun.
fig, axes = plt.subplots(1, 2, figsize=(11, 4.4))
hist = loaded["P1+P2→P3"]["gap_hist"]
real_h, sim_h = np.array(hist["real"], float), np.array(hist["sim"], float)
xs = np.arange(len(real_h))
axes[0].plot(xs, np.cumsum(real_h) / real_h.sum(), color="#a8763e", lw=2, label="gerçek (P3)")
axes[0].plot(xs, np.cumsum(sim_h) / sim_h.sum(), color="#1f5f5b", lw=2, ls="--", label="simülasyon (P1+P2'den)")
axes[0].set(xlabel="iki müşteri arası kasiyer boşluğu (sn, 120 = 120+)", ylabel="birikimli pay", title="Boşluk dağılımı, tüm saatler")
axes[0].legend(); axes[0].grid(alpha=0.3)
a = collect(W, "observed", "servis", "gapShort", "gap_short_service", False)
real, lo, med, hi = a.T
axes[1].errorbar(real, med, yerr=[med - lo, hi - med], fmt="o", ms=3, alpha=0.5, color="#1f5f5b", elinewidth=0.6)
lim = [min(real.min(), lo.min()) - 0.02, 1.0]
axes[1].plot(lim, lim, "k--", lw=1)
axes[1].set(xlabel="gerçek: ≤30 sn boşluk payı", ylabel="simülasyon (medyan, %90 aralık)", title="Saat saat: kasiyer kesintisiz meşgul mü?")
axes[1].grid(alpha=0.3)
fig.tight_layout()
fig.savefig(ROOT / "docs" / "figures" / "12_cashier_gaps.png", dpi=150)
print("Yazıldı: docs/figures/12_cashier_gaps.png")
