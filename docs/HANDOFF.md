# Devir notu (başka bir oturum/model devralırsa)

Durum: Faz 1–4 ve web katmanı tamam. Son commit'ler `git log --oneline` ile görülür. GitHub'a itilmedi, Vercel'e bağlanmadı.

## Çalıştırma

```bash
(cd sim && npm install && npm test)          # motor: 49 test
(cd web && npm install && npm test && npm run lint && npm run build)   # web: 72 test
(cd web && npm run dev)                      # http://localhost:5191  (#/ , #/kasa , #/dogrulama)
.venv/bin/python ml/05_export_web.py         # vekil model ve doğrulama özetlerini web/src/data'ya yeniden yazar
```

## Mimari (tek cümlelik kurallar)

- Motor tek kaynak: `sim/src`. Web onu `@sim` takma adıyla doğrudan içe aktarır, kopyalamaz.
- Sahne ayrı animasyon verisi kullanmaz: `web/src/lib/replay.ts` motorun olay izinden hedef konumları üretir, `Crowd.tsx` onları gerçek yürüme hızıyla izler.
- Sayılar `sim/params.json`'dan gelir (Python `scripts/03_fit.py` üretir). Parametre bozuksa zod hata ekranı gösterir.
- Vekil model Python'da eğitilir (`ml/01_surrogate.py`), ağaçları JSON olur, web'de `lib/surrogate.ts` değerlendirir. Parite testi Python tahminleriyle eşleşmeyi doğrular.
- Kıvrımlı ortak kuyruk geometrisi tek yerde: `web/src/lib/serpentine.ts` (şeritler, direkler ve konumlar buradan çıkar).

## Bilinen şüpheli noktalar (gözle bakılmalı, testle kanıtlanmadı)

1. Geniş ekranda (≥960 px) yan yana A/B yerleşimi: yalnızca dar bölmede gözle görüldü.
2. Sıra ilerlemesindeki "dalga" (rank başına 0,1 sn gecikme): davranış birim testli ama canlı görünümü öznel. `QUEUE_DELAY_PER_RANK`, `MAX_QUEUE_DELAY` (`Crowd.tsx`).
3. Kıvrımlı kuyrukta satırlar arası arabalar komşu şeride yaklaşabiliyor (`SNAKE.rowSpacing`).
4. Ortak kuyruğun girişi satır sayısına göre sağda ya da solda olabilir; kapı solda, bazen uzun yürüyüş.
5. İki sahne aynı anda çizilirken düşük cihazlarda fps ölçülmedi (yalnızca tek sahnede ~61 fps ölçüldü).
6. Doğrulama sayfası metin ağır; sadeleştirilebilir.

## Dürüstlük kuralları (bozulmamalı)

- Veride gerçek bekleme süresi yok. Hiçbir ekran bekleme çıktısını "gerçekle doğrulandı" diye sunmamalı.
- Vekil model 10 kasa ve ρ ≤ 1,05 dışında güvenilmez; plan bunu sınırlar.
- A/B cümlesi eşleştirilmiş %95 aralığından üretilir; aralık sıfırı kapsıyorsa "belirgin fark yok" der.
- Veri CC BY-NC (Antczak & Weron 2019): ham veri depoya girmez, yalnızca türetilmiş özetler.

## Sıradaki işler (öncelik sırasıyla)

1. Gözle görsel/UX incelemesi (yukarıdaki 1–5).
2. GitHub + Vercel (kullanıcı onayı gerekir).
3. Faz 5: LLM yardımcısı + değerlendirme seti, ya da ER ikizi (PhysioNet kimlik doğrulaması kullanıcıda).
