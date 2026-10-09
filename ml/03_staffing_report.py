import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
ver = pd.DataFrame(json.loads((ROOT / "ml/staffing_verified.json").read_text()))
win = pd.DataFrame(json.loads((ROOT / "data/processed/windows_20190328-20190410.json").read_text())["windows"])
obs = win[win.stable].groupby(["dow_group", "hour"]).service_lanes.mean().rename("observed").reset_index().rename(columns={"dow_group": "group"})
avg = ver[ver.scenario == "ortalama"].merge(obs, on=["group", "hour"], how="left")
print(f"c*-1 de yeterli olan hücre: {int(((ver.sim_ok_less >= 0.5)).sum())}/{int(ver.sim_ok_less.notna().sum())} (vekil tutucu)")
d = (avg.lanes - avg.observed).dropna()
print(f"Plan (ortalama gün) − P3'te gözlenen açık kasa: ortalama {d.mean():+.2f}, medyan {d.median():+.2f} kasa (n={len(d)} hücre; gözlenen = kasiyer giriş/kilit kayıtları, yalnız stabil saatler)")
for g in ("mon_thu", "sat"):
    s = avg[avg.group == g].dropna(subset=["observed"])
    print(g, "plan:", s.lanes.tolist(), "\n   gözlenen:", [round(x, 1) for x in s.observed])

names = {"mon_thu": "Pazartesi–Perşembe", "fri": "Cuma", "sat": "Cumartesi", "sun": "Pazar"}
fig, axes = plt.subplots(1, 4, figsize=(14, 3.8), sharey=True)
for ax, g in zip(axes, names):
    a = ver[(ver.group == g) & (ver.scenario == "ortalama")].sort_values("hour")
    b = ver[(ver.group == g) & (ver.scenario == "yoğun")].sort_values("hour")
    o = obs[obs.group == g].sort_values("hour")
    ax.step(a.hour, a.lanes, where="mid", color="#1f5f5b", lw=2, label="plan: ortalama gün")
    ax.step(b.hour, b.lanes, where="mid", color="#7a3b6e", lw=1.4, ls="--", label="plan: yoğun gün (%90)")
    ax.plot(o.hour, o.observed, "o", ms=4, color="#a8763e", label="gerçekte açık (kasiyer kayıtları)")
    ax.set_title(names[g], fontsize=10); ax.set_xlabel("saat"); ax.grid(alpha=0.3)
axes[0].set_ylabel("kasa sayısı"); axes[0].legend(fontsize=7)
fig.suptitle("Hedef: müşterilerin %90'ı ≤2 dk beklesin | vekil model planı, simülatörle doğrulandı", fontsize=11)
fig.tight_layout(); fig.savefig(ROOT / "docs/figures/11_staffing.png", dpi=150)
