# Doğrulama: neyi biliyoruz, neyi bilmiyoruz

Motor iki ayrı soruyla sınanıyor. Bu belge ikisini ayrı tutuyor, çünkü karıştırılınca sonuç olduğundan iyi görünüyor.

## 1. Motor doğru mu? (teori karşılaştırması)

Kuyruk mantığı kapalı formüllerle karşılaştırıldı: M/M/c için Erlang-C, M/G/1 için Pollaczek–Khinchine, Little yasası.
ρ = 0,3–0,9 ve c = 1, 3, 5 için sapma ±%1,3 içinde kalıyor (`docs/validation.json`, `docs/figures/06_validation.png`).
Geçiş süresi, ortak kuyrukta yürüme ve yavaşlama için ayrı değişmez testleri var: geçiş, kasayı ek servis süresiyle birebir aynı biçimde
meşgul ediyor; yürüme sırasında kasa başka müşteriye verilmiyor; Little yasası tüm mekaniklerle birlikte de tutuyor (`sim/tests/engine.test.ts`).

## 2. Model gerçeğe uyuyor mu? (kayan-başlangıç, zaman dışı doğrulama)

Veri üç ayrı dönemden oluşuyor (P1: Ara 2017, P2: Şub 2019, P3: Mar–Nis 2019). Parametreler yalnızca eğitim dönemlerinden uyduruluyor; test dönemi
hiçbir aşamada görülmüyor (`holdout.ts`, test dönemi eğitime karışırsa "SIZINTI" hatasıyla duruyor). Üç kat var: P1→P2, P1+P2→P3, P2→P3.
Her saatlik pencere 300 tekrarla simüle ediliyor.

Açık kasa sayısı, kasiyerlerin giriş/kilit kayıtlarından zaman ağırlıklı olarak ölçülüyor. Kesirli değer her tekrarda yansız rastgele yuvarlanıyor.

İki mod var:
- **gözlenen sayıya koşullu**: o saat gelen müşteri sayısı modele veriliyor; sepet, servis süresi, doluluk ve kasiyer boşluğu sınanıyor.
- **tahmin**: sayı da modelden geliyor (eğitim profili × gün çarpanı); müşteri sayısı sınanıyor.

### Sonuçlar (ortalama mutlak hata %, P1+P2→P3 katında yanlılık ve %90 kapsama)

| Metrik | P1→P2 | P1+P2→P3 | P2→P3 | yanlılık | kapsama |
|---|---|---|---|---|---|
| Ort. sepet (servis) | 10,1 | 12,8 | 10,7 | −10,5 | 45 |
| Ort. servis süresi (servis) | 6,8 | 8,7 | 8,3 | +6,2 | 64 |
| Kasa doluluğu (servis, kasa sayısı sabit saatler) | 5,6 | 6,5 | 5,8 | +4,1 | 93 |
| Kısa kasiyer boşluğu payı (≤30 sn) | 10,7 | 7,9 | 7,8 | −2,0 | 93 |
| Saatlik müşteri sayısı (servis) | 48,1 | 22,6 | 17,6 | +12,8 | 93 |
| Saatlik müşteri sayısı (self-servis) | 157,4 | 39,2 | 18,7 | +38,7 | 93 |

Tam tablo: `docs/holdout_metrics.json`. Şekiller: `07_holdout.png`, `08_drift_bias.png`, `12_cashier_gaps.png`.

### Kasiyer boşluğu: bekleme verisi yokken en yakın kanıt

Veride `BreakTime`, aynı kasiyerin bir işlemi bitirmesiyle sonrakine başlaması arasındaki süre (zaman damgalarıyla %99,3 eşleşiyor).
Bu süre kasa doluluğundan neredeyse bağımsız: medyan ~16 sn. Yani kasiyer müşteri aralarında boş beklemiyor; bu, her müşteriye eklenen bir
**geçiş süresi** (ödemenin kapanışı, poşetleme, sıradaki sepetin banda gelmesi). İlk sürüm bu süreyi atlıyordu.

Geçiş süresi, kasiyerin kesintisiz meşgul olduğu saatlerden ödeme türüne göre öğreniliyor (web modelinde nakit ~23 sn, kart ~17 sn; `scripts/03_fit.py §7`).
Kuyruk varsa kasiyerin boşluğu yalnızca geçiş süresi kadar, yoksa buna boşta bekleme ekleniyor. Bu yüzden kısa boşlukların payı kasaların ne kadar
dolu çalıştığını, dolayısıyla beklemeyi dolaylı olarak ölçüyor. Simülasyon aynı boşluğu kendi izinden hesaplıyor (`sim/src/gaps.ts`) ve
görülmemiş dönemle karşılaştırılıyor:

- Toplam dağılım çok iyi örtüşüyor: gerçekte boşlukların %79'u 30 sn'den kısa, simülasyonda %77.
- Saat saat ayırma gücü sınırlı: korelasyon 0,53. Model bir saatin ortalama mağaza gibi davranacağını iyi, hangi saatin sıra dışı olacağını zayıf tahmin ediyor.

### Doğrulamanın bulduğu iki model hatası

1. **Bağlamsız sepet.** Tek bir sepet dağılımı, gün tipine ve akşama göre değişen yapıyı kaçırıyordu (Cmt sabah ≈ 22 ürün, Pzt–Per sabah ≈ 15).
   Dağılım artık gün tipi × yarım gün bağlamına göre öğreniliyor, az verili bağlamlar genel dağılıma büzülüyor. P1+P2→P3'te servis süresi
   hatası %11,5'ten %8,7'ye indi. Önceki sonuçlar `*.noctx.json` dosyalarında.
2. **Şişkin kasa sayısı.** Açık kasa ilk sürümde "15 dakikalık blokta işlem yapan farklı kasiyer" sayısıyla tahmin ediliyordu. Bu yöntem kısa açılışları
   tam kasa sayıyordu (ortalama 5,6; kayıtlardan ölçülen gerçek 4,9). Kasiyer boşluğu sınaması bunu yakaladı: eski sayıyla simülasyon kısa boşluk payını
   %58 tahmin ediyordu (gerçek %79). Düzeltmeden sonra doluluk hatası %9,5'ten %6,5'e indi, kapsama %58'den %93'e çıktı.

### Kalan sorunlar (gizlenmedi)

- **Kayma gerçek.** P1 (Aralık, bayram alışverişi) → P2 tahmininde müşteri sayısı %47–157 yanlı. Bu yüzden web'deki model yalnızca 2019 dönemleriyle (P2+P3) eğitiliyor.
  Sepet P3'te hâlâ ≈ %7–10 küçük tahmin ediliyor (sepetler dönemler arasında büyüyor).
- **Aralıklar dar.** Servis süresinde kapsama hedef %90 iken %64. Saatlik ortalamada kasiyer ve gün heterojenliği var; model bunu yalnız müşteri sayısı için (σ_gün) taşıyor.
- **Bekleme süresi doğrudan gerçekle karşılaştırılamıyor.** Kasiyer boşluğu dolaylı bir kanıt, bekleme ölçümü değil.
- **Saat içi durağanlık.** Her saat sabit oranla ve 30 dk ısınmayla simüle ediliyor; gerçek kuyruk bir saatten diğerine taşınıyor.

## 3. Ortak kuyruğun saha etkileri (varsayım, ölçüm değil)

Kaynak mağaza her zaman ayrı kuyrukla çalıştı. Bu yüzden ortak kuyruğun bedelleri bu veriden ölçülemiyor; dışarıdan alınıyor ve açıkça varsayım olarak sunuluyor:

- **Yürüme**: kuyruk başından boşalan kasaya L biçimli yol, 3D sahnenin geometrisinden (`sim/src/geometry.ts`). Ayrı kuyrukta da atılan adım düşülüyor;
  araba hızı 1 m/sn, fark etme süresi 1 sn. 5 kasada kasaya göre 2,4–5,8 sn. Yürüme sırasında kasa boş bekliyor.
- **Yavaşlama**: %6,86. Wang & Zhou (2018), aynı süpermarketi iki düzende gözlemleyerek ölçtü (sosyal kaytarma).

Sonucun bu varsayımlara duyarlılığı `docs/field_effect.json` ve web Sonuç sayfasında gösteriliyor. Her yükte, ortak kuyruğun avantajını
sıfırlayan yavaşlama ikiye bölme yöntemiyle aranıyor. Doluluk %80'in üstündeyken başabaş yavaşlama sıfır: yürüme tek başına yetiyor.
Ayrı kuyrukta sıradaki müşterinin öndeki taranırken ürünlerini banda dizebilmesi modellenmedi. Bu, ortak kuyruğun lehine bir basitleştirme.

## 4. Taze veriyle yeniden kalibrasyon deneyi

Test döneminin (P3) ilk 3 günü küçük bir taze örnek olarak kullanılıyor; yalnızca kanal başına iki ölçek öğreniliyor (servis hızı oranı, trafik oranı).
Skorlama kalan 139 pencerede yapılıyor. Sonuç: servis süresinde küçük ama tutarlı bir kazanç (P1+P2→P3: %8,9 → %7,9). Trafikte kayma büyükken
büyük kazanç var, küçükken yok ya da negatif. Veri: `recalibration_metrics.json`, şekil `09_recalibration.png`.

## Yeniden üretmek

```bash
.venv/bin/python scripts/01_load.py && scripts/pipeline.sh
```
