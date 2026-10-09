import { BiasBars } from '../components/validation/BiasBars'
import { Scatter } from '../components/validation/Scatter'
import { ArrivalTable, HoldoutTable, RecalTable, SurrogateTable } from '../components/validation/Tables'
import { TheoryChart } from '../components/validation/TheoryChart'
import raw from '../data/validation.json'
import { parseValidation } from '../lib/validationData'

const state = parseValidation(raw)

export default function ValidationView() {
  if (state.status === 'error') return <div className="state"><h1>Doğrulama verisi okunamadı</h1><p>{state.message}</p></div>
  const d = state.data
  return (
    <div className="validation">
      <section className="staff-intro">
        <h2>Model gerçeğe ne kadar uyuyor?</h2>
        <p>
          İki ayrı soru var ve karıştırılmaz. Motor, kuyruk teorisinin bildiği sonuçları doğru üretiyor mu?
          Ve öğrenilmiş müşteri modeli, hiç görmediği bir dönemde gerçek mağazayı yakalıyor mu?
        </p>
        <p className="hud-note">
          En büyük sınır: veride yalnızca hizmet almış müşteriler var. Gerçek bekleme süresi ve kuyruk uzunluğu hiç ölçülmemiş,
          bu yüzden bekleme çıktıları gerçek mağazayla doğrudan karşılaştırılamaz. Aşağıda gerçekle karşılaştırılanlar sepet, servis süresi, doluluk ve müşteri sayısıdır.
        </p>
      </section>

      <section aria-labelledby="v1">
        <h3 id="v1">1. Motor kuyruk teorisini tutturuyor mu?</h3>
        <p>Ortak kuyrukta (M/M/c) ortalama bekleme için bilinen kapalı formülle karşılaştırma. Üç kasa sayısı, yük oranı 0,3'ten 0,9'a.</p>
        <TheoryChart theory={d.theory} />
      </section>

      <section aria-labelledby="v2">
        <h3 id="v2">2. Hiç görmediği dönemde gerçek mağazayı yakalıyor mu?</h3>
        <p>
          Veri üç ayrı dönemden oluşuyor. Parametreler yalnızca eğitim dönemlerinden öğrenilir, test dönemi hiçbir aşamada görülmez
          (kodda sızıntı koruması var). Üç kat: P1→P2, P1+P2→P3, P2→P3.
        </p>
        <HoldoutTable holdout={d.holdout} />
        <BiasBars holdout={d.holdout} />
        <p>
          Sepet ve servis süresi yaklaşık %7–12 hatayla tutuyor. Müşteri sayısı dönemler arası seviye kaymasına çok duyarlı: Aralık dönemi (P1) Şubat'ı (P2) yaklaşık %56 yüksek tahmin ettiriyor.
          Bu bir model hatası değil, öğrenmenin sınırı: üç dönemlik veriyle mevsimsel seviye öğrenilemez.
          %90 aralıklar da hedefin altında kalıyor (servis süresinde ~%60): kasiyer ve gün farklarını model tam taşımıyor.
        </p>
        <div className="scatter-grid">
          <Scatter title="Ortalama servis süresi" unit="sn" rows={d.scatter.serviceMean} />
          <Scatter title="Kasa doluluğu (stabil saatler)" unit="oran" rows={d.scatter.utilization} />
          <Scatter title="Saatlik müşteri sayısı (yalnız eğitimden tahmin)" unit="kişi" rows={d.scatter.count} />
          <Scatter title="Ortalama sepet" unit="ürün" rows={d.scatter.basket} />
        </div>
        <p className="fine">Dağılım grafikleri P1+P2→P3 katı. Her nokta bir saatlik pencere.</p>
      </section>

      <section aria-labelledby="v3">
        <h3 id="v3">3. Taze veri ne kadar yardım eder?</h3>
        <p>Test döneminin ilk 3 günüyle servis hızı ve trafik için yalnızca iki ölçek öğrenildi, skor kalan günlerde.</p>
        <RecalTable recal={d.recalibration} />
        <p>Kayma büyükken kazanç belirgin (self-servis müşteri sayısı hatası %30,5 → %17,2), küçükken kazanç yok ya da negatif. 3 gün, ölçek tahmini için gürültülü bir örneklem.</p>
      </section>

      <section aria-labelledby="v4">
        <h3 id="v4">4. Öğrenme modelleri ne kazandırıyor?</h3>
        <p>
          Vekil model, simülatörün kendi gürültü tabanına ulaşıyor ve Erlang-C formülünden belirgin iyi
          (R²: ortalama bekleme {d.surrogate.r2.wait_mean?.toFixed(2)}, P90 {d.surrogate.r2.wait_p90?.toFixed(2)}).
        </p>
        <SurrogateTable s={d.surrogate} />
        <p>
          Varış tahmininde ise öğrenme modeli hakkında dürüst olmak gerekir: Poisson GBM, P1+P2→P3 katında profilden iyi görünüyor,
          ama bu modelin yakın ve benzer dönemi daha çok dinlemesinden geliyor. Seviye tutunca (P2→P3) basit profille aynı.
        </p>
        <ArrivalTable arrival={d.arrival} />
      </section>

      <section aria-labelledby="v5">
        <h3 id="v5">Sınırlar</h3>
        <ul className="limits">
          <li>Gerçek bekleme süresi verisi yok: bekleme çıktıları teori ve dolaylı ölçülerle desteklenir.</li>
          <li>"Açık kasa sayısı", 15 dakikalık bloklarda işlem yapan farklı kasiyer sayısıdır; boşta bekleyen kasa görünmez.</li>
          <li>Her saat sabit oranlı simüle edilir; gerçek kuyruk saatler arası taşınır.</li>
          <li>Müşterilerin kuyruk seçimi ve sabırsızlık (kuyruğu terk etme) veride gözlenmedi; iki düzen varsayımdır.</li>
          <li>Veri tek bir mağazaya ve üç döneme ait; başka mağazalara genelleme iddiası yok.</li>
        </ul>
        <p className="fine">Veri: Antczak &amp; Weron (2019), CC BY-NC. Güney Polonya'da bir mağaza, üç iki haftalık dönem.</p>
      </section>
    </div>
  )
}
