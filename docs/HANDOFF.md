# Devir notu

Durum: model v2 (geçiş süresi, kayıtlardan ölçülen kasa sayısı, ortak kuyruk saha etkileri) ve portföy sitesi tamam.
Depo: https://github.com/mertkkenarr-dev/market-queue-lab (herkese açık, `main`). Barındırmaya henüz bağlanmadı; `web/dist` kişisel sitenin bir alt klasörüne kopyalanacak.

## Çalıştırma

```bash
(cd sim && npm install && npm test)                                    # motor: 55 test
(cd web && npm install && npm test && npm run lint && npm run build)   # web: 77 test
(cd web && npm run dev)                                                # #/ , #/lab , #/kasa , #/dogrulama , #/yontem
.venv/bin/python scripts/01_load.py && scripts/pipeline.sh             # ham veriden her sayı (≈3 dk)
```

Derleme `base: './'` ve hash yönlendirmesi kullanıyor; `web/dist` herhangi bir alt dizine olduğu gibi kopyalanabilir.

## Mimari kuralları

- Motor tek kaynak: `sim/src`. Web onu `@sim` takma adıyla doğrudan içe aktarıyor, kopyalamıyor.
- Mağaza planı tek kaynak: `sim/src/geometry.ts`. Sahne (`web/src/lib/layout.ts`, `serpentine.ts`) ve yürüme modeli (`sim/src/field.ts`) aynı sayıları kullanıyor.
- Olay izi: `arrival → called → start → scanEnd → end`. `called..start` ortak kuyruktan kasaya yürüme, `scanEnd..end` geçiş süresi.
  Sahne ayrı animasyon verisi kullanmıyor: `web/src/lib/replay.ts` hedef konumları bu izden üretiyor.
- Sayılar `sim/params.json`'dan geliyor (web modeli: P2+P3). Parametre bozuksa zod hata ekranı gösteriyor.
- `utilization` (motor) = kasa meşguliyeti (geçiş dahil); `scanUtilization` = yalnız tarama. Veriyle karşılaştırılan ikincisi.
- Vekil model Python'da eğitiliyor, ağaçları JSON olarak web'e geçiyor. Web'deki personel planı Python planıyla testte birebir eşleşiyor.

## Dürüstlük kuralları (bozulmamalı)

- Veride gerçek bekleme süresi yok. Hiçbir ekran bekleme çıktısını "gerçekle doğrulandı" diye sunmamalı; kasiyer boşluğu dolaylı kanıt.
- Yürüme hızı (1 m/sn) ve yavaşlama (%6,86) varsayım; arayüzde "Ders kitabı" ile kapatılabilir olmalı ve başabaş analizi görünür kalmalı.
- A/B cümlesi eşleştirilmiş %95 aralığından üretiliyor; aralık sıfırı kapsıyorsa "belirgin fark yok" diyor.
- Veri CC BY-NC: ham veri depoya girmiyor, yalnızca türetilmiş özetler var.

## Bilinen açıklar

1. Ayrı kuyrukta sıradaki müşterinin önceden ürün dizmesi modellenmedi (ortak kuyruk lehine).
2. Saatler arası taşınma yok; tam gün kesintisiz simülasyon ve "kuyruk N'yi geçince kasa aç" kuralı doğal bir sonraki adım.
3. Hızlı kasa (≤N ürün) ve kuyruğu terk etme yok.
4. Kasiyer bazında hız farkı (`OperatorID` veride var) kullanılmıyor; servis süresi aralıklarının dar olmasının (%64 kapsama) olası nedeni.
5. Ayrıntılı belgeler (docs/) yalnızca Türkçe; site ve README iki dilli. Metinler: web/src/i18n/ui.ts ve web/src/content/.
