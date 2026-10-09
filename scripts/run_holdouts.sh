#!/usr/bin/env bash
# Tüm zaman-dışı doğrulama koşuları: üç kat (bağlamlı ve bağlamsız) + yeniden kalibrasyon deneyi.
set -euo pipefail
cd "$(dirname "$0")/../sim"
W=../data/processed
H="npx tsx scripts/holdout.ts"
$H --params params.fold1.json  --windows $W/windows_20190213-20190226.json --out ../docs/holdout_P1_to_P2.json
$H --params params.train.json  --windows $W/windows_20190328-20190410.json --out ../docs/holdout_P1P2_to_P3.json
$H --params params.p2only.json --windows $W/windows_20190328-20190410.json --out ../docs/holdout_P2_to_P3.json
$H --params params.fold1.json  --windows $W/windows_20190213-20190226.json --out ../docs/holdout_P1_to_P2.noctx.json --no-context
$H --params params.train.json  --windows $W/windows_20190328-20190410.json --out ../docs/holdout_P1P2_to_P3.noctx.json --no-context
$H --params params.p2only.json --windows $W/windows_20190328-20190410.json --out ../docs/holdout_P2_to_P3.noctx.json --no-context
for k in "train:P1P2_to_P3" "p2only:P2_to_P3"; do
  p=${k%%:*}; n=${k##*:}
  $H --params params.$p.json --windows $W/windows_20190328-20190410.json --out ../docs/recal_${n}_stale.json --calib-days 3 --no-recal
  $H --params params.$p.json --windows $W/windows_20190328-20190410.json --out ../docs/recal_${n}_fresh.json --calib-days 3
done
