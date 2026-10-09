# ML katmanı

Üç parça var. Hiçbiri simülatörün yerine geçmiyor: simülatör referans, ML onun üstünde hızlı karar desteği sağlıyor.

## 1. Vekil model (surrogate)

**Soru:** "Bu yükte, şu kadar kasayla bekleme ne olur?" sorusunun cevabı her seferinde onlarca tekrarlık simülasyon gerektirmesin.

**Yöntem:** `sim/scripts/sweep.ts` ile 12 000 eğitim ve farklı tohumla 3 000 test senaryosu üretiliyor (kasa 1–10, düzen, servis hızı ×0,8–1,25, bağlam, yük ρ 0,2–1,05;
her biri 12 tekrar ortalaması). ρ kasanın gerçek meşguliyetini sayıyor: tarama + geçiş süresi. Ortak kuyruk saha etkileriyle (yürüme, yavaşlama) simüle ediliyor.
`ml/01_surrogate.py`: HistGradientBoosting; hedefler ortalama bekleme, P90 bekleme (log uzayında) ve bekleme olasılığı.
Özellikler: kasa, düzen, ρ, müşteri başına ortalama kasa meşguliyeti. Monoton kısıtlar var (kasa↑ → bekleme↓, ρ↑ → bekleme↑); model fiziksel olarak tutarsız tahmin üretemiyor.

**Sonuç (görülmemiş 3 000 senaryo, ortalama bekleme MAE, sn):**

| ρ | simülatör gürültüsü | vekil | Erlang-C |
|---|---|---|---|
| 0,2–0,5 | 1,6 | 1,5 | 2,6 |
| 0,5–0,7 | 4,7 | 4,8 | 7,7 |
| 0,7–0,85 | 14,6 | 14,3 | 23,8 |
| 0,85–0,95 | 34,0 | 34,3 | 127,6 |
| 0,95–1,05 | 57,3 | 67,7 | 2856 |

Vekil, simülatörün kendi gürültü tabanına ulaşıyor (bundan iyisi mümkün değil) ve M/M/c formülünden belirgin iyi, çünkü gerçek servis süresi üstel değil,
geçiş süresi var ve düzen JSQ. R²: ortalama bekleme 0,89, P90 0,89, bekleme olasılığı 0,99 (MAE 0,026). Tahmin senaryo başına ~8 µs.
Web tarafı ağaçları JSON olarak alıp kendi değerlendiricisiyle çalıştırıyor; parite testi scikit-learn tahminleriyle eşleşmeyi doğruluyor.
Sınır: eğitim aralığı dışında (ρ > 1,05, 10'dan fazla kasa) güvenilmez.

## 2. Personel planı

`ml/02_staffing.py`: her gün tipi × saat için P90 bekleme ≤ 2 dk sağlayan en az kasa, vekille aranıyor (ortalama gün ve %90 yoğun gün; en çok 10 kasa).
`sim/scripts/verify_staffing.ts` planı **gerçek simülatörle** sınıyor (400 tekrar):

- 112 hücrenin 109'unda 10 kasa yetiyor. Kalan 3 hücre Cumartesi 11–13, yoğun gün; web planlayıcısı bunları "10 kasayla sağlanamıyor" olarak gösteriyor.
- 109 hücrenin 108'inde önerilen kasa hedefi sağlıyor (medyan P90 80 sn).
- Bir eksik kasa, 108 hücrenin 89'unda hedefi bozuyor (medyan P90 189 sn). 19 hücrede bir eksik kasa da yetiyor, yani vekil hafif tutucu.
- P3'te gerçekte açık olan kasalarla (kasiyer kayıtları, 30 stabil hücre) karşılaştırınca plan saat başına ortalama +1,0 kasa daha fazla öneriyor.
  Mağaza 2 dk hedefinden daha sıkı bir kadroyla çalışıyor; model, fiili kadroyla tipik bir saatte P90 beklemenin ~3,4 dk olduğunu tahmin ediyor.

Şekil: `figures/11_staffing.png`. Plan doğrudan gerçek bekleme verisiyle doğrulanamıyor, çünkü veride bekleme yok.

## 3. Varış tahmini: ML gerçekten kazandırıyor mu?

`ml/04_arrival_forecast.py`: profil ortalaması, profil × son dönem ölçeği ve Poisson GBM, zaman dışı üç katta karşılaştırılıyor (MAPE %).

| Kat | profil | ölçekli profil | Poisson GBM |
|---|---|---|---|
| P1→P2 | 56,2 | 56,2 | 55,9 |
| P1+P2→P3 | 23,3 | 14,4 | 12,0 |
| P2→P3 | 14,4 | 14,4 | 14,3 |

Dürüst okuma: GBM'nin P1+P2→P3 kazancı bir ML becerisi değil. Ay özelliği modeli örtük olarak Şubat dönemine benzer ağırlıklandırıyor, yani model "yakın ve benzer dönemi dinliyor".
Seviye sabit kalınca (P2→P3) profil ile GBM eşit. Hatanın çoğu **dönemler arası seviye kaymasından** geliyor (P1, Aralık: P2'den ~%56 yüksek); bunu 3 dönemlik veriyle öğrenmek mümkün değil.
Bu veri boyutunda varış için basit profil + son dönem ölçeği yeterli; daha fazla ML için daha uzun, çok yıllı veri gerekir.
