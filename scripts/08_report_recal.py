"""Taze veriyle yeniden kalibrasyon: aynı değerlendirme pencerelerinde bayat vs kalibre model."""
import json

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
from _holdout_lib import CHECKS, collect, stats

FOLDS = {"P1+P2→P3": "P1P2_to_P3", "P2→P3": "P2_to_P3"}
rows, summary = [], {}
for fold, key in FOLDS.items():
    stale = json.loads((ROOT / "docs" / f"recal_{key}_stale.json").read_text())
    fresh = json.loads((ROOT / "docs" / f"recal_{key}_fresh.json").read_text())
    assert [w["day"] for w in stale["windows"]] == [w["day"] for w in fresh["windows"]]
    print(f"\n=== {fold} | kalibrasyon: ilk {fresh['meta']['calib_days']} gün | değerlendirme pencereleri: {len(fresh['windows'])}")
    print(f"ölçekler: { {k: round(v, 3) for k, v in fresh['meta']['scales'].items()} }")
    print(f"{'Metrik':<36}{'bayat MAPE':>11}{'taze MAPE':>10}{'bayat yanl.':>12}{'taze yanl.':>11}{'bayat kaps.':>12}{'taze kaps.':>11}")
    summary[fold] = {}
    for mode, ch, sk, rk, stab, label in CHECKS:
        if label not in ("Ort. servis süresi (servis)", "Kasa doluluğu (servis)", "Saatlik müşteri sayısı (servis)", "Saatlik müşteri sayısı (self-servis)"):
            continue
        a, b = (stats(collect(d["windows"], mode, ch, sk, rk, stab)) for d in (stale, fresh))
        print(f"{label:<36}{a[1]:>11.1f}{b[1]:>10.1f}{a[0]:>+12.1f}{b[0]:>+11.1f}{a[2]:>12.0f}{b[2]:>11.0f}")
        summary[fold][label] = {"stale": dict(bias=a[0], mape=a[1], coverage=a[2]), "fresh": dict(bias=b[0], mape=b[1], coverage=b[2]), "n": a[3]}
(ROOT / "docs" / "recalibration_metrics.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))

labels = list(next(iter(summary.values())))
fig, axes = plt.subplots(1, 2, figsize=(11, 4.4), sharey=True)
for ax, (fold, d) in zip(axes, summary.items()):
    x = np.arange(len(labels)); w = 0.38
    ax.bar(x - w / 2, [d[l]["stale"]["mape"] for l in labels], w, label="bayat model", color="#a8763e")
    ax.bar(x + w / 2, [d[l]["fresh"]["mape"] for l in labels], w, label="3 günlük taze veriyle kalibre", color="#1f5f5b")
    ax.set_xticks(x, [l.replace(" (", "\n(") for l in labels], fontsize=8)
    ax.set_title(fold)
    ax.grid(axis="y", alpha=0.3)
axes[0].set_ylabel("MAPE (%)"); axes[0].legend(fontsize=8)
fig.suptitle("Yeniden kalibrasyon: aynı değerlendirme günlerinde hata", fontsize=11)
fig.tight_layout(); fig.savefig(ROOT / "docs" / "figures" / "09_recalibration.png", dpi=150)
print("\nYazıldı: docs/figures/09_recalibration.png, docs/recalibration_metrics.json")
