"""Gerçek veriden simülasyon parametreleri: sepet, servis süresi, varış, kanal seçimi."""
import argparse
import json
from pathlib import Path

import duckdb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import optimize, stats

ALL_PERIODS = ["20171207-20171219", "20190213-20190226", "20190328-20190410"]
ap = argparse.ArgumentParser()
ap.add_argument("--train", default=",".join(ALL_PERIODS), help="virgülle ayrılmış eğitim dönemleri")
ap.add_argument("--out", default="sim/params.json")
args = ap.parse_args()
TRAIN = sorted(args.train.split(","))
assert all(t in ALL_PERIODS for t in TRAIN), f"bilinmeyen dönem: {TRAIN}"
HOLDOUT = [p_ for p_ in ALL_PERIODS if p_ not in TRAIN]
print(f"Eğitim dönemleri: {TRAIN} | dışarıda bırakılan: {HOLDOUT or 'yok'}")

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / "docs" / "figures"
con = duckdb.connect(str(ROOT / "data" / "processed" / "pos.duckdb"), read_only=True)

# Temizlik kuralları (EDA'da ölçüldü): servis süresi <= 0 ve tutarı <= 0 işlemler dışlanır.
# Dönem filtresi tüm sorgulara uygulanır: dışarıda bırakılan dönemin tek bir satırı bile öğrenmeye girmez.
PERIOD_SQL = ", ".join(f"'{t}'" for t in TRAIN)
CLEAN = f"TranTime > 0 AND Amount > 0 AND ArtNum BETWEEN 1 AND 300 AND period IN ({PERIOD_SQL})"
df = con.execute(f"SELECT * FROM transactions WHERE {CLEAN}").df()
print(f"Temiz işlem (eğitim dönemleri): {len(df):,}")

params: dict = {"source": "Antczak & Weron 2019 (CC BY-NC)", "clean_rule": CLEAN, "train_periods": TRAIN, "holdout_periods": HOLDOUT}

# ---------------------------------------------------------------- 1) Sepet büyüklüğü
def fit_basket(items: np.ndarray, label: str) -> dict:
    ks = np.arange(1, items.max() + 1)
    counts = np.bincount(items, minlength=ks.max() + 1)[1:]

    def ll_lognorm(p):
        m, s = p
        if s <= 0:
            return 1e18
        edges = np.concatenate([[0.0], ks + 0.5])
        cdf = stats.lognorm.cdf(edges, s=s, scale=np.exp(m))
        pmf = np.clip(np.diff(cdf), 1e-300, None)
        return -(counts * np.log(pmf)).sum()

    def ll_nbinom(p):
        r, pr = p
        if r <= 0 or not (0 < pr < 1):
            return 1e18
        pmf = np.clip(stats.nbinom.pmf(ks - 1, r, pr), 1e-300, None)
        return -(counts * np.log(pmf)).sum()

    ln = optimize.minimize(ll_lognorm, [2.2, 0.9], method="Nelder-Mead")
    nb = optimize.minimize(ll_nbinom, [1.5, 0.1], method="Nelder-Mead")
    aic = {"lognormal": 2 * 2 + 2 * ln.fun, "nbinom": 2 * 2 + 2 * nb.fun}
    best = min(aic, key=aic.get)
    print(f"[sepet {label}] AIC: " + ", ".join(f"{k}={v:,.0f}" for k, v in aic.items()) + f" -> {best}")
    return {
        "n": int(len(items)),
        "mean": float(items.mean()),
        "lognormal": {"mu": float(ln.x[0]), "sigma": float(ln.x[1])},
        "nbinom": {"r": float(nb.x[0]), "p": float(nb.x[1])},
        "aic": aic,
        "best": best,
    }


basket_params = {}
fig, axes = plt.subplots(1, 2, figsize=(11, 4))
for ax, (g, name) in zip(axes, [(1, "servis"), (8, "self-servis")]):
    items = df.loc[df.WorkstationGroupID == g, "ArtNum"].to_numpy()
    basket_params[name] = fit_basket(items, name)
    ks = np.arange(1, 61)
    emp = np.bincount(items, minlength=61)[1:61] / len(items)
    ax.bar(ks, emp, color="#cfc2a8", label="gerçek")
    p = basket_params[name]
    edges = np.concatenate([[0.0], np.arange(1, 62) - 0.5 + 1])
    ln_pmf = np.diff(stats.lognorm.cdf(edges, s=p["lognormal"]["sigma"], scale=np.exp(p["lognormal"]["mu"])))[:60]
    nb_pmf = stats.nbinom.pmf(ks - 1, p["nbinom"]["r"], p["nbinom"]["p"])
    ax.plot(ks, ln_pmf, color="#1f5f5b", lw=2, label="lognormal")
    ax.plot(ks, nb_pmf, color="crimson", lw=2, ls="--", label="neg. binom")
    ax.set(title=f"Sepet: {name}", xlabel="ürün", ylabel="olasılık")
    ax.legend()
fig.tight_layout()
if not HOLDOUT:
    fig.savefig(FIG / "04_basket_fit.png", dpi=150)
params["basket"] = basket_params

# Parametrik uyumun sepet ortalaması ve kuyruğundaki hatası + ampirik pmf (simülasyonun varsayılanı)
for g, name in [(1, "servis"), (8, "self-servis")]:
    items = df.loc[df.WorkstationGroupID == g, "ArtNum"].to_numpy()
    bp = basket_params[name]
    nb_sample = stats.nbinom.rvs(bp["nbinom"]["r"], bp["nbinom"]["p"], size=len(items), random_state=0) + 1
    qs = [0.5, 0.9, 0.99]
    err = 100 * (np.quantile(nb_sample, qs) - np.quantile(items, qs)) / np.quantile(items, qs)
    print(f"[sepet {name}] NB: ort hata %{100*(nb_sample.mean()-items.mean())/items.mean():+.1f}, "
          f"kantil(50/90/99) hata % {np.round(err, 1)} -> ampirik pmf varsayılan")
    pmf = np.bincount(items, minlength=301)[1:301] / len(items)
    bp["empirical_pmf"] = [float(v) for v in pmf]
    bp["default"] = "empirical"

# ---------------------------------------------------------------- 2) Servis süresi | sepet, ödeme
# Ortalama m = a + d*kart + b*ürün^g  (güç terimi: küçük sepetlerde doğrusal model yetersizdi)
# Varyans  v = v0 + v1*ürün           (sabit kısım + ürün başına bağımsız süreler)
# Dağılım: ortalaması/varyansı eşleştirilmiş lognormal. Seçim kanıtı: scripts/04_service_models.py
def _moments(p, x, card):
    a, d, b, v0, v1, g = p
    m = np.clip(a + d * card + b * x**g, 1.0, None)
    v = np.clip(v0 + v1 * x, 1.0, None)
    s2 = np.log1p(v / m**2)
    return m, v, s2


def fit_service(d, label: str) -> dict:
    x = d["ArtNum"].to_numpy(float)
    card = d["TNcard"].to_numpy(float)
    y = d["TranTime"].to_numpy(float)

    def nll(p):
        if p[0] < 0 or p[2] < 0 or not 0.3 < p[5] < 1.5:
            return 1e18
        m, _, s2 = _moments(p, x, card)
        return -stats.lognorm.logpdf(y, s=np.sqrt(s2), scale=np.exp(np.log(m) - s2 / 2)).sum()

    # Çok başlangıçlı arama: tek başlangıç, küçük örneklemde (tek dönem) yerel minimuma takılabiliyordu.
    best = None
    for start in ([10, 8, 4, 150, 30, 0.85], [16, 0, 15, 130, 200, 0.8], [5, 7, 8, 60, 35, 0.75], [30, 5, 3, 100, 50, 1.0]):
        r = optimize.minimize(nll, start, method="Nelder-Mead", options={"maxiter": 15000, "xatol": 1e-4, "fatol": 1e-4})
        r = optimize.minimize(nll, r.x, method="Powell", options={"maxiter": 20000, "xtol": 1e-4, "ftol": 1e-9})
        if best is None or r.fun < best.fun:
            best = r
    sol = best
    p = sol.x
    m, _, s2 = _moments(p, x, card)
    sim = np.exp(np.random.default_rng(0).normal(np.log(m) - s2 / 2, np.sqrt(s2)))
    qs = [0.5, 0.9, 0.95, 0.99]
    err = 100 * (np.quantile(sim, qs) - np.quantile(y, qs)) / np.quantile(y, qs)
    mean_err = 100 * (sim.mean() - y.mean()) / y.mean()
    print(f"[servis {label}] n={len(y):,} a={p[0]:.1f} kart={p[1]:.1f} b={p[2]:.2f} g={p[5]:.2f} "
          f"v0={p[3]:.0f} v1={p[4]:.1f} | ort hata %{mean_err:+.1f}, kantil hata % {np.round(err, 1)}")
    assert abs(mean_err) < 3 and np.abs(err).max() < 8, f"servis modeli {label} doğrulamadan geçemedi"
    return {"a": float(p[0]), "card_extra": float(p[1]), "b": float(p[2]), "gamma": float(p[5]),
            "v0": float(p[3]), "v1": float(p[4]), "n": int(len(y)),
            "mean_error_pct": float(mean_err), "quantile_error_pct": [float(e) for e in err]}


svc = {}
for g, name in [(1, "servis"), (8, "self-servis")]:
    svc[name] = fit_service(df[df.WorkstationGroupID == g], name)
params["service"] = svc
params["service_model"] = (
    "mean = a + card_extra*kart + b*items^gamma ; var = v0 + v1*items ; lognormal (moment-matched)"
)

# ---------------------------------------------------------------- 3) Varış süreci: Poisson mu?
arr = con.execute(
    f"""
SELECT date_trunc('day', BeginDateTime) d, hour(BeginDateTime) h,
       floor(minute(BeginDateTime) / 5) b, count(*) n
FROM transactions WHERE {CLEAN} GROUP BY ALL"""
).df()
cell = arr.groupby(["d", "h"])["n"].agg(["mean", "var", "count"])
cell = cell[(cell["count"] >= 10) & (cell["mean"] > 0)]
iod_per_cell = cell["var"] / cell["mean"]
print(f"\n5-dk sayımlar: hücre içi dağılım indeksi (var/ort; Poisson=1): "
      f"ort={iod_per_cell.mean():.2f}, medyan={iod_per_cell.median():.2f}")

# Saatlik oran profilleri: gün tipi x saat, dakikada müşteri (tüm kanallar)
daily = con.execute(
    f"""
SELECT date_trunc('day', BeginDateTime) d, dayofweek(BeginDateTime) dow, hour(BeginDateTime) h, count(*) n
FROM transactions WHERE {CLEAN} GROUP BY ALL"""
).df()
daily["daytype"] = np.where(daily["dow"].isin([0, 6]), "weekend", "weekday")
prof = daily.groupby(["daytype", "h"])["n"].mean() / 60.0
params["arrival_rate_per_min"] = {
    dt: {int(h): float(prof[(dt, h)]) for h in sorted(daily["h"].unique()) if (dt, h) in prof.index}
    for dt in ("weekday", "weekend")
}
params["arrival_index_of_dispersion"] = float(iod_per_cell.median())

# ---------------------------------------------------------------- 4) Kanal seçimi (ML: lojistik regresyon)
if len(TRAIN) >= 2:
    from sklearn.linear_model import LogisticRegression  # noqa: E402
    from sklearn.metrics import roc_auc_score  # noqa: E402

    X = np.column_stack([np.log(df["ArtNum"]), df["TNcard"].astype(float)])
    y = (df["WorkstationGroupID"] == 8).astype(int).to_numpy()
    train = df["period"].isin(TRAIN[:-1]).to_numpy()
    clf = LogisticRegression(max_iter=1000).fit(X[train], y[train])
    auc = roc_auc_score(y[~train], clf.predict_proba(X[~train])[:, 1])
    base = y[~train].mean()
    print(f"\nKanal seçimi (self-servis): test dönemi AUC={auc:.3f}, taban oran={base:.3f}")
    print(f"  katsayılar: log(ürün)={clf.coef_[0][0]:.2f}, kart={clf.coef_[0][1]:.2f}, sabit={clf.intercept_[0]:.2f}")
    params["channel_choice"] = {
        "intercept": float(clf.intercept_[0]),
        "coef_log_items": float(clf.coef_[0][0]),
        "coef_card": float(clf.coef_[0][1]),
        "test_auc": float(auc),
        "self_service_share_test": float(base),
    }
else:
    params["channel_choice"] = None

# ---------------------------------------------------------------- 5) Kanal payı ve (sepet, kart) ortak dağılımı
share_by_hour = con.execute(
    f"SELECT hour(BeginDateTime) h, avg((WorkstationGroupID = 8)::int) s, count(*) n FROM transactions "
    f"WHERE {CLEAN} GROUP BY 1 HAVING count(*) > 500 ORDER BY 1"
).df()
print("\nSelf-servis payı saate göre (min/maks):", round(share_by_hour.s.min(), 3), round(share_by_hour.s.max(), 3))
share_self = float((df["WorkstationGroupID"] == 8).mean())
joint = {}
for g, name in [(1, "servis"), (8, "self-servis")]:
    d = df[df.WorkstationGroupID == g]
    table = np.zeros((300, 2))
    np.add.at(table, (d["ArtNum"].to_numpy() - 1, d["TNcard"].astype(int).to_numpy()), 1)
    joint[name] = {"pmf_items_x_card": [float(v) for v in (table / table.sum()).ravel()], "n": int(len(d)),
                   "card_share": float(d["TNcard"].mean())}
# Bağlama (gün tipi x yarım gün) göre (sepet, kart) dağılımı. Sepet gün tipine ve akşama göre sistematik
# değişiyor (hold-out'ta Cmt ~22, Pzt-Per ~17.6 ürün); tek dağılım bunu kaçırıyordu. Az verili bağlamlar
# genel dağılıma doğru büzülür: (n*ampirik + K*genel) / (n + K).
GROUP_OF = {1: "mon_thu", 2: "mon_thu", 3: "mon_thu", 4: "mon_thu", 5: "fri", 6: "sat", 0: "sun"}
SHRINK_K = 300
df["ctx"] = (df["BeginDateTime"].dt.dayofweek.add(1) % 7).map(GROUP_OF) + "|" + np.where(df["BeginDateTime"].dt.hour >= 17, "pm", "am")
for g, name in [(1, "servis"), (8, "self-servis")]:
    base = np.array(joint[name]["pmf_items_x_card"])
    by_ctx = {}
    for ctx, d in df[df.WorkstationGroupID == g].groupby("ctx"):
        t = np.zeros((300, 2))
        np.add.at(t, (d["ArtNum"].to_numpy() - 1, d["TNcard"].astype(int).to_numpy()), 1)
        pm = (t.ravel() + SHRINK_K * base) / (t.sum() + SHRINK_K)
        by_ctx[ctx] = {"pmf_items_x_card": [float(v) for v in pm], "n": int(len(d)),
                       "basket_mean": float(d["ArtNum"].mean())}
    joint[name]["by_context"] = by_ctx
    print(name, {k: (v["n"], round(v["basket_mean"], 1)) for k, v in sorted(by_ctx.items())})
hour_share = con.execute(
    f"SELECT hour(BeginDateTime) h, avg((WorkstationGroupID = 8)::int) s, count(*) n FROM transactions "
    f"WHERE {CLEAN} GROUP BY 1 HAVING count(*) >= 200 ORDER BY 1"
).df()
params["channel"] = {"self_service_share": share_self,
                     "share_by_hour": {int(r.h): float(r.s) for r in hour_share.itertuples()}, "share_by_hour_min": float(share_by_hour.s.min()),
                     "share_by_hour_max": float(share_by_hour.s.max()), "joint": joint,
                     "layout_note": "pmf index = (items-1)*2 + card"}

# ---------------------------------------------------------------- 6) Varış profili (gün tipi x saat) ve gün-içi çarpan
days = con.execute(
    f"""
SELECT date_trunc('day', BeginDateTime) d, dayofweek(BeginDateTime) dow, hour(BeginDateTime) h, count(*) n
FROM transactions WHERE {CLEAN} GROUP BY ALL"""
).df()
days["grp"] = days["dow"].map(GROUP_OF)
all_days = days[["d", "grp"]].drop_duplicates()
n_days = all_days.groupby("grp").size().to_dict()
print("Eğitim gün sayısı (grup):", n_days)
grid = all_days.merge(pd.DataFrame({"h": range(24)}), how="cross")
grid = grid.merge(days[["d", "h", "n"]], on=["d", "h"], how="left").fillna({"n": 0})
rate = grid.groupby(["grp", "h"])["n"].mean() / 3600.0  # müşteri / saniye
profile = {g: {int(h): float(rate[(g, h)]) for h in range(24) if (g, h) in rate.index and rate[(g, h)] > 0}
           for g in sorted(n_days)}
# Gün seviyesi değişkenlik: günlük toplamın grup ortalamasına oranı, bırak-biri-dışarı (kendi gününü ortalamaya katma)
tot = grid.groupby(["grp", "d"])["n"].sum().reset_index()
ratios = []
for g_, t_ in tot.groupby("grp"):
    if len(t_) < 3:
        continue
    for i_ in range(len(t_)):
        loo = t_["n"].drop(t_.index[i_]).mean()
        ratios.append(np.log(t_["n"].iloc[i_] / loo))
sigma_day = float(np.std(ratios, ddof=1)) if len(ratios) > 3 else 0.0
print(f"Gün seviyesi log-sapma (LOO): sigma_day={sigma_day:.3f} (n={len(ratios)})")
params["arrival_profile"] = {"per_second_by_group_hour": profile, "days_in_training": {k: int(v) for k, v in n_days.items()},
                             "sigma_day": sigma_day, "group_of_dow": {str(k): v for k, v in GROUP_OF.items()},
                             "note": "dow: DuckDB (0=Pazar). Oran = gün başına ortalama işlem / 3600."}

out = ROOT / args.out
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(params, indent=2, ensure_ascii=False))
print("\nYazıldı:", out.relative_to(ROOT))
