# Doğrulama: neyi biliyoruz, neyi bilmiyoruz

Motor iki ayrı soruyla sınanır. Bu belge ikisini ayrı tutar, çünkü karıştırılınca sonuç olduğundan iyi görünür.

## 1. Motor doğru mu? (teori karşılaştırması)

Kuyruk mantığı kapalı formüllerle karşılaştırıldı: M/M/c için Erlang-C, M/G/1 için Pollaczek–Khinchine, Little yasası.
ρ = 0,3–0,9 ve c = 1, 3, 5 için sapma ±%1,3 içinde (`docs/validation.json`, `docs/figures/06_validation.png`).
49 birim testi; mutasyon testiyle testlerin gerçekten hata yakaladığı denetlendi.

## 2. Model gerçeğe uyuyor mu? (kayan-başlangıç, zaman dışı doğrulama)

Veri üç ayrı dönemdir (P1: Ara 2017, P2: Şub 2019, P3: Mar–Nis 2019). Parametreler yalnızca eğitim dönemlerinden uydurulur; test dönemi
hiçbir aşamada görülmez (`holdout.ts` test dönemi eğitimdeyse "SIZINTI" hatasıyla durur, testle de kilitli).
Üç kat: P1→P2, P1+P2→P3, P2→P3. Her saatlik pencere 300 tekrarla simüle edilir.

İki mod:
- **gözlenen sayıya koşullu**: o saat gelen müşteri sayısı verilir; sepet, servis süresi, doluluk sınanır.
- **tahmin**: sayı da modelden gelir (eğitim profili × gün çarpanı); müşteri sayısı sınanır.

### Sonuçlar (bağlamlı sepet modeli; yanlılık = simülasyon − gerçek)

| Metrik | P1→P2 MAPE | P1+P2→P3 MAPE | P2→P3 MAPE |
|---|---|---|---|
| Ort. sepet (servis) | 10,1 | 12,8 | 10,7 |
| Ort. servis süresi (servis) | 6,8 | 8,7 | 8,4 |
| Kasa doluluğu (servis) | 9,3 | 9,5 | 9,2 |
| Saatlik müşteri sayısı (servis) | 48,0 | 22,6 | 17,5 |
| Saatlik müşteri sayısı (self-servis) | 158,0 | 39,2 | 18,8 |

Tam tablo (yanlılık, %90 aralık kapsaması): `docs/holdout_metrics.json`, şekiller `07_holdout.png`, `08_drift_bias.png`.

### Doğrulamanın bulduğu model hatası ve düzeltmesi

İlk sürüm tek bir sepet dağılımı kullanıyordu. Gerçek sepet gün tipine ve akşama göre sistematik değişiyor (Cmt sabah ≈ 22 ürün,
Pzt–Per sabah ≈ 15). Dağılım (gün tipi × yarım gün) bağlamına göre öğrenildi, az verili bağlamlar genel dağılıma büzüldü.
P1+P2→P3'te servis süresi MAPE %11,5 → %8,7, %90 kapsama %45 → %62. Önceki sonuçlar `*.noctx.json` dosyalarında.

### Kalan sorunlar (gizlenmedi)

- **Kayma gerçek.** P1 (Aralık, bayram alışverişi) → P2 tahmininde müşteri sayısı %47–158 yanlı. Eğitim dönemi hedefe benzemiyorsa model kötü.
  Sepet P3'te hâlâ ≈ %7–10 küçük tahmin ediliyor (sepetler dönemler arasında büyüyor).
- **Aralıklar dar.** Kapsama hedef %90 iken servis süresinde %62. Saatlik ortalamada kasiyer ve gün heterojenliği var; model bunu yalnız müşteri sayısı için (σ_gün) taşıyor.
- **Bekleme süresi için gerçek veri yok.** Veri yalnızca hizmet almış müşterileri içerir; kuyruk uzunluğu/bekleme ölçülmemiş. Bekleme çıktıları teoriyle
  ve doluluk gibi dolaylı gözlemlerle desteklenir, doğrudan gerçekle karşılaştırılamaz. Bu projenin en büyük sınırlamasıdır.
- **Açık kasa sayısı vekil ölçü.** 15 dk bloklarda işlem yapan farklı kasiyer sayısı; boşta bekleyen kasa görünmez.
- **Saat içi durağanlık varsayımı.** Her saat sabit oranlı simüle edilir (30 dk ısınma); gerçek kuyruk saatler arası taşınır.

## 3. Taze veriyle yeniden kalibrasyon deneyi

Test döneminin (P3) ilk 3 günü küçük bir taze örnek olarak kullanılır; yalnızca kanal başına iki ölçek öğrenilir (servis hızı oranı, trafik oranı).
Skorlama kalan 139 pencerede yapılır, kalibrasyon günleri skora girmez.

| Kat / metrik | Bayat MAPE | Kalibre MAPE |
|---|---|---|
| P1+P2→P3, servis süresi | 9,0 | 8,0 |
| P1+P2→P3, sayı (self-servis) | 30,5 | 17,2 |
| P2→P3, servis süresi | 8,6 | 7,7 |
| P2→P3, sayı (self-servis) | 16,4 | 19,3 |

Sonuç: 3 günlük kalibrasyon servis süresinde tutarlı küçük kazanç, trafikte kayma büyükken büyük kazanç, kayma küçükken kazanç yok/negatif sağlıyor.
3 gün ölçek tahmini için gürültülü; üretimde daha uzun pencere ve sürekli izleme gerekir. Veri: `recalibration_metrics.json`, şekil `09_recalibration.png`.

## Yeniden üretmek

```bash
.venv/bin/python scripts/03_fit.py --train 20171207-20171219,20190213-20190226 --out sim/params.train.json
.venv/bin/python scripts/06_build_windows.py --period 20190328-20190410
cd sim && npx tsx scripts/holdout.ts --params params.train.json --windows ../data/processed/windows_20190328-20190410.json --out ../docs/holdout_P1P2_to_P3.json
```
