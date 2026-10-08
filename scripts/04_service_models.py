"""Servis süresi modeli seçimi: MLE + kantil doğrulaması (log-uzayı en küçük kareler yerine)."""
from pathlib import Path

import duckdb
import numpy as np
from scipy import optimize, stats

ROOT = Path(__file__).resolve().parents[1]
con = duckdb.connect(str(ROOT / "data" / "processed" / "pos.duckdb"), read_only=True)
df = con.execute(
    "SELECT ArtNum x, TranTime y, TNcard::int card, period FROM transactions "
    "WHERE TranTime > 0 AND Amount > 0 AND ArtNum BETWEEN 1 AND 300 AND WorkstationGroupID = 1"
).df()
x, y, card = df.x.to_numpy(float), df.y.to_numpy(float), df.card.to_numpy(float)
print(f"n={len(df):,}, ortalama süre={y.mean():.1f}")

# Ortalama: m = a + d*card + b*x.  Varyans modelleri:
#   const_cv : sd = cv * m             (gamma / lognormal, sabit varyasyon katsayısı)
#   additive : var = v0 + v1 * x       (sabit kısım + ürün başına bağımsız süreler)
def mean_fn(p):
    a, d, b = p[:3]
    return np.clip(a + d * card + b * x, 1.0, None)


def var_fn(kind, p):
    m = mean_fn(p)
    if kind == "const_cv":
        return (p[3] * m) ** 2
    v0, v1 = p[3], p[4]
    return np.clip(v0 + v1 * x, 1.0, None)


def nll(kind, dist):
    def f(p):
        if p[0] < 0 or p[2] < 0:
            return 1e18
        m, v = mean_fn(p), var_fn(kind, p)
        if dist == "gamma":
            k, th = m**2 / v, v / m
            return -stats.gamma.logpdf(y, k, scale=th).sum()
        s2 = np.log1p(v / m**2)  # lognormal momentlerinden
        mu = np.log(m) - s2 / 2
        return -stats.lognorm.logpdf(y, s=np.sqrt(s2), scale=np.exp(mu)).sum()

    return f


starts = {"const_cv": [30, 12, 2.6, 0.5], "additive": [30, 12, 2.6, 400, 40]}
results = {}
for kind in ("const_cv", "additive"):
    for dist in ("gamma", "lognormal"):
        sol = optimize.minimize(nll(kind, dist), starts[kind], method="Nelder-Mead",
                                options={"maxiter": 6000, "xatol": 1e-4, "fatol": 1e-4})
        k = len(starts[kind])
        results[(kind, dist)] = (sol.x, 2 * k + 2 * sol.fun)

rng = np.random.default_rng(1)


def simulate(kind, dist, p):
    m, v = mean_fn(p), var_fn(kind, p)
    if dist == "gamma":
        return rng.gamma(m**2 / v, v / m)
    s2 = np.log1p(v / m**2)
    return np.exp(rng.normal(np.log(m) - s2 / 2, np.sqrt(s2)))


qs = [0.5, 0.9, 0.95, 0.99]
real_q = np.quantile(y, qs)
print(f"\n{'model':<22}{'AIC':>12}{'ort.':>8}  " + "  ".join(f"q{q:<4}" for q in qs) + "   (kantil hatası %)")
for (kind, dist), (p, aic) in sorted(results.items(), key=lambda kv: kv[1][1]):
    s = simulate(kind, dist, p)
    err = 100 * (np.quantile(s, qs) - real_q) / real_q
    print(f"{kind+'/'+dist:<22}{aic:12,.0f}{100*(s.mean()-y.mean())/y.mean():+7.1f}%  "
          + "  ".join(f"{e:+5.1f}" for e in err))
    print(f"   params: a={p[0]:.1f} kart={p[1]:.1f} b={p[2]:.2f} var:{np.round(p[3:], 2)}")

# En iyi model için ürün-gruplarına göre kantil kontrolü
best_key = min(results, key=lambda k: results[k][1])
kind, dist = best_key
p = results[best_key][0]
s = simulate(kind, dist, p)
print(f"\nSeçilen: {kind}/{dist}. Ürün sayısı kümesine göre q50 / q95 hatası %:")
for lo, hi in [(1, 3), (4, 8), (9, 15), (16, 30), (31, 80)]:
    mask = (x >= lo) & (x <= hi)
    rq = np.quantile(y[mask], [0.5, 0.95])
    sq = np.quantile(s[mask], [0.5, 0.95])
    print(f"  ürün {lo:>2}-{hi:<2} (n={mask.sum():>6,}): " + "  ".join(f"{100*(a-b)/b:+5.1f}" for a, b in zip(sq, rq)))
