# ML katmanı (Faz 4)

Üç parça. Hiçbiri simülatörün yerine geçmez; simülatör referanstır, ML onun üstünde hızlı karar desteği sağlar.

## 1. Vekil model (surrogate)

**Soru:** "Bu yükte, şu kadar kasayla bekleme ne olur?" cevabı her seferinde 12 tekrarlık simülasyon gerektirmesin.

**Yöntem:** `sim/scripts/sweep.ts` ile 12 000 senaryo (kasa 1–10, düzen, servis hızı ×0,8–1,25, bağlam, yük ρ 0,2–1,05; her biri 12 tekrar ortalaması).
`ml/01_surrogate.py`: HistGradientBoosting, hedefler ortalama bekleme, P90 bekleme (log uzayında) ve bekleme olasılığı. Özellikler: kasa, düzen, ρ, ortalama servis süresi.
Monoton kısıtlar: kasa↑ → bekleme↓, ρ↑ → bekleme↑. Model fiziksel olarak tutarsız tahmin üretemez.

**Sonuç (farklı tohumla üretilmiş 3 000 senaryo):**

| ρ | simülatör gürültüsü (sn) | vekil MAE | Erlang-C MAE |
|---|---|---|---|
| 0,2–0,5 | 1,22 | 1,15 | 1,86 |
| 0,5–0,7 | 3,30 | 3,15 | 5,53 |
| 0,7–0,85 | 9,03 | 9,22 | 17,05 |
| 0,85–0,95 | 22,9 | 23,2 | 90,6 |
| 0,95–1,05 | 45,7 | 48,3 | 2146 |

Vekil, simülatörün kendi gürültü tabanına ulaşıyor (daha iyisi mümkün değil) ve M/M/c formülünden belirgin iyi, çünkü gerçek servis süresi üstel değil ve düzen JSQ.
R²: ortalama bekleme 0,89, P90 0,84, bekleme olasılığı 0,99 (MAE 0,025).
Hız: simülatör ≈ 0,9 ms / senaryo, vekil ≈ 7 µs → **~125×**. Motor zaten hızlı olduğu için kazanç büyüklük sırası olarak orta; asıl değer tarayıcıda motorsuz anlık yanıt.
Sınır: eğitim aralığı dışında (ρ>1,05, 10 kasadan fazla) güvenilmez.

## 2. Personel planı

`ml/02_staffing.py`: her gün tipi × saat için P90 bekleme ≤ 2 dk sağlayan en az kasa, vekille aranır (ortalama gün ve %90 yoğun gün).
`sim/scripts/verify_staffing.ts` planı **gerçek simülatörle** sınar (400 tekrar):

- 112 hücrenin 112'sinde önerilen kasa hedefi sağlıyor (medyan P90 78 sn). *Düzeltme (web katmanı yazılırken bulundu):* planı 12 kasaya kadar aramıştım; bunun bir hücresi (Cumartesi 11:00, yoğun gün: 11 kasa) vekilin 10 kasalık eğitim aralığı ve mağazadaki 10 fiziksel kasa dışındaydı. Web planlayıcısı bu hücreyi "10 kasayla sağlanamıyor" olarak gösterir.
- Bir eksik kasa 97 hücrede hedefi bozuyor (medyan P90 231 sn). 15 hücrede bir eksik de yetiyor → vekil hafif tutucu.
- P3'te gerçekte açık olan kasalarla (vekil ölçü, 37 stabil hücre) fark ortalama −0,23 kasa: plan mağazanın fiili düzenine yakın.

Şekil: `figures/11_staffing.png`. Not: "gerçekte açık kasa" 15 dk bloklarda işlem yapan farklı kasiyer sayısıdır, kesin ölçü değil. Plan doğrudan gerçek bekleme verisiyle doğrulanamaz (veride bekleme yok).

## 3. Varış tahmini: ML gerçekten kazandırıyor mu?

`ml/04_arrival_forecast.py`: profil ortalaması, profil × son dönem ölçeği, Poisson GBM, zaman-dışı üç katta.

| Kat | profil MAPE | ölçekli profil | Poisson GBM |
|---|---|---|---|
| P1→P2 | 56,2 | 56,2 | 55,9 |
| P1+P2→P3 | 23,3 | 14,4 | 12,0 |
| P2→P3 | 14,4 | 14,4 | 14,3 |

Dürüst okuma: GBM'nin P1+P2→P3 kazancı ML becerisi değil. Ay özelliği modeli örtük olarak Şubat dönemine benzer ağırlıklandırıyor, yani "yakın ve benzer dönemi dinle".
Seviye tutunca (P2→P3) profil ile GBM eşit. Hata ağırlıkla **dönemler arası seviye kaymasından** geliyor (P1, Aralık: P2'den ~%56 yüksek); bunu 3 dönemlik veriyle öğrenmek mümkün değil.
Sonuç: bu veri boyutunda varış için basit profil + son dönem ölçeği yeterli; daha fazla ML için daha uzun, çok yıllı veri gerekir.
