"""Motor doğrulama grafiği: Erlang-C teori eğrisi vs simülasyon, ve havuzlama etkisi."""
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
d = json.loads((ROOT / "docs" / "validation.json").read_text())
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.6))

colors = {"1": "#a8763e", "3": "#1f5f5b", "5": "#7a3b6e"}
for c, rows in d["mmc"].items():
    rho = np.array([r["rho"] for r in rows])
    th = np.array([r["theory"] for r in rows])
    sim = np.array([r["sim"] for r in rows])
    lo = np.array([r["lo"] for r in rows])
    hi = np.array([r["hi"] for r in rows])
    ax1.plot(rho, th, "-", color=colors[c], lw=2, label=f"Erlang-C teori, c={c}")
    ax1.errorbar(rho, sim, yerr=[sim - lo, hi - sim], fmt="o", color=colors[c], ms=5, capsize=2)
ax1.set_yscale("log")
ax1.set(title="Motor doğrulaması: teori (çizgi) vs simülasyon (nokta, %95 GA)",
        xlabel="doluluk ρ", ylabel="ortalama bekleme (ort. servis süresi birimiyle)")
ax1.legend()
ax1.grid(alpha=0.3)

names = {"pooled": ("Tek ortak kuyruk", "#1f5f5b"), "separate-jsq": ("Ayrı kuyruk, en kısayı seç", "#a8763e"),
         "separate-random": ("Ayrı kuyruk, rastgele", "#b04030")}
for key, (label, col) in names.items():
    rows = d["layouts"][key]
    rho = [r["rho"] for r in rows]
    w = [r["wait"] for r in rows]
    ax2.plot(rho, w, "o-", color=col, lw=2, label=label)
ax2.set_yscale("log")
ax2.set(title="Havuzlama etkisi (3 kasa, aynı müşteri akışı)", xlabel="doluluk ρ",
        ylabel="ortalama bekleme")
ax2.legend()
ax2.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(ROOT / "docs" / "figures" / "06_validation.png", dpi=150)
print("ok")
