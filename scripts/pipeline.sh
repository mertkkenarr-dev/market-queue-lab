#!/usr/bin/env bash
# Ham veriden web'e kadar her sayıyı yeniden üretir (önce: python scripts/01_load.py).
# Sıra önemli: parametreler -> pencereler -> zaman-dışı doğrulama -> süpürme -> vekil -> plan -> web verisi.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=.venv/bin/python
P1=20171207-20171219; P2=20190213-20190226; P3=20190328-20190410

# Web ve ML modeli: 2019 dönemleri. Aralık (P1) bayram alışverişi; kayma analizi trafiğinin ~%56 yüksek olduğunu gösterdi.
$PY scripts/03_fit.py --train $P2,$P3 --out sim/params.json
# Zaman-dışı doğrulama katları: test dönemi asla eğitime girmez.
$PY scripts/03_fit.py --train $P1 --out sim/params.fold1.json
$PY scripts/03_fit.py --train $P1,$P2 --out sim/params.train.json
$PY scripts/03_fit.py --train $P2 --out sim/params.p2only.json
for p in $P1 $P2 $P3; do $PY scripts/06_build_windows.py --period $p; done

scripts/run_holdouts.sh
$PY scripts/07_report_holdout.py
$PY scripts/08_report_recal.py

(cd sim && npx tsx scripts/validate.ts)
$PY scripts/05_plot_validation.py
(cd sim && npx tsx scripts/sweep.ts --params params.json --n 12000 --reps 12 --seed 1 --out ../ml/data/sweep_train.csv \
        && npx tsx scripts/sweep.ts --params params.json --n 3000 --reps 12 --seed 2 --out ../ml/data/sweep_test.csv)
$PY ml/01_surrogate.py
$PY ml/02_staffing.py
(cd sim && npx tsx scripts/verify_staffing.ts)
$PY ml/03_staffing_report.py
$PY ml/04_arrival_forecast.py
(cd sim && npx tsx scripts/field_effect.ts params.json ../docs/field_effect.json)
$PY ml/05_export_web.py
