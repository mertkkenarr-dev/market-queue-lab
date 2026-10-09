import numpy as np

CHECKS = [
    ("observed", "servis", "basketMean", "basket_mean_service", False, "Ort. sepet (servis)"),
    ("observed", "servis", "serviceMean", "tran_mean_service", False, "Ort. servis süresi (servis)"),
    ("observed", "servis", "utilization", "util_service", True, "Kasa doluluğu (servis)"),
    ("observed", "self", "basketMean", "basket_mean_self", False, "Ort. sepet (self-servis)"),
    ("observed", "self", "serviceMean", "tran_mean_self", False, "Ort. servis süresi (self-servis)"),
    ("predicted", "servis", "count", "n_service", False, "Saatlik müşteri sayısı (servis)"),
    ("predicted", "self", "count", "n_self", False, "Saatlik müşteri sayısı (self-servis)"),
]


def collect(W, mode, channel, sim_key, real_key, only_stable):
    rows = []
    for w in W:
        if only_stable and not w["stable"]:
            continue
        sim = w[mode]["servis" if channel == "servis" else "self"]
        real = w.get(real_key)
        if sim is None or real is None:
            continue
        s = sim[sim_key]
        rows.append((real, s["p05"], s["p50"], s["p95"]))
    return np.array(rows, dtype=float)


def stats(a):
    real, lo, med, hi = a.T
    return (100 * np.mean((med - real) / real), 100 * np.mean(np.abs(med - real) / real),
            100 * np.mean((real >= lo) & (real <= hi)), len(a))
