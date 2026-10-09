import type { ValidationCopy } from './validation.types'

export const validationTr: ValidationCopy = {
  title: 'Model gerçeğe ne kadar uyuyor?',
  intro: 'İki ayrı soru var ve bunları karıştırmamaya çalıştım. Motor, kuyruk teorisinin kesin bildiği sonuçları doğru üretiyor mu? Ve veriden öğrenilen mağaza modeli, hiç görmediği bir dönemde gerçek mağazayı yakalıyor mu?',
  callout: 'En büyük sınır: veride yalnızca hizmet almış müşteriler var; bekleme süresi ve kuyruk uzunluğu ölçülmemiş. Bekleme sonuçları bu yüzden gerçekle doğrudan karşılaştırılamıyor. En yakın kanıt, kasiyerin iki müşteri arasındaki boşluğu (ikinci bölüm).',
  theory: {
    title: 'Motor kuyruk teorisini tutturuyor mu?',
    body: 'Ortak kuyrukta (M/M/c) ortalama bekleme, kapalı Erlang-C formülüyle karşılaştırılıyor. Üç kasa sayısı, yük 0,3’ten 0,9’a, her nokta 40 uzun koşu.',
  },
  gaps: {
    title: 'Kasiyer boşluğu: beklemenin dolaylı izi',
    body: (n) => (
      <>
        Kasada sırada biri varsa kasiyer bir sonrakine hemen geçer; kimse yoksa boşluk uzar. Kısa boşlukların payı, kasaların ne kadar dolu çalıştığını ve dolayısıyla
        beklemeyi dolaylı olarak gösterir. Model bu dağılımı eğitimde hiç görmediği dönemde tutturuyor
        {n.gapMape && n.gapCoverage ? <> (saat başına kısa boşluk payında ortalama mutlak hata {n.gapMape}, %90 aralık kapsaması {n.gapCoverage})</> : null}.
      </>
    ),
    scatterTitle: (sec) => `Saat saat: ${sec} sn'den kısa boşluk payı`,
    honest: (n) => <>Dürüst okuma: toplam dağılım çok iyi örtüşüyor, ama saatler arasındaki farkı ayırt etme gücü sınırlı (korelasyon {n.gapCorr}). Model bir saatin ortalama mağaza gibi davranacağını iyi, hangi saatin sıra dışı olacağını zayıf tahmin ediyor.</>,
    bug: (n) => (
      <>
        Bu sınama bir ölçüm hatamı da buldu. Açık kasa sayısını ilk sürümde “15 dakikada işlem yapan farklı kasiyer” sayısıyla tahmin ediyordum; ortalama {n.lanesProxy} kasa
        çıkıyordu. Kasiyerlerin giriş/kilit kayıtlarından ölçülen gerçek değer {n.lanesLogs}. Eski sayıyla simülasyon kasaları olduğundan boş görüyor, kısa boşluk payını %58
        tahmin ediyordu (gerçek %79). Düzeltmeden sonra doluluk hatası %9,5’ten %6,5’e indi.
      </>
    ),
  },
  holdout: {
    title: 'Hiç görmediği dönemde gerçek mağazayı yakalıyor mu?',
    body: 'Veri üç ayrı dönemden oluşuyor. Parametreler yalnızca eğitim dönemlerinden öğreniliyor; test dönemi hiçbir aşamada görülmüyor (kodda sızıntı koruması var). Üç kat: P1→P2, P1+P2→P3, P2→P3.',
    after: 'Servis süresi, doluluk ve kasiyer boşluğu %6–9 hatayla tutuyor. Müşteri sayısı dönemler arası seviye kaymasına çok duyarlı: Aralık dönemi (P1), Şubat’ı (P2) %47 yüksek tahmin ettiriyor. Bu bir model hatasından çok öğrenmenin sınırı; üç dönemlik veriyle mevsimsel seviye öğrenilemiyor. Bu yüzden web’deki modeli yalnızca 2019 dönemleriyle eğittim.',
    scatters: { service: 'Ortalama servis süresi', occupancy: 'Kasa doluluğu (kasa sayısı sabit saatler)', count: 'Saatlik müşteri sayısı (yalnız eğitimden tahmin)', basket: 'Ortalama sepet' },
    fine: 'Dağılım grafikleri P1+P2→P3 katı. Her nokta bir saatlik pencere; dikey çizgi simülasyonun %90 aralığı.',
  },
  recal: {
    title: 'Taze veri ne kadar yardım eder?',
    body: 'Test döneminin ilk 3 günüyle servis hızı ve trafik için yalnızca iki ölçek öğrenildi; skor kalan günlerde.',
    after: 'Kayma büyükken kazanç belirgin, küçükken yok ya da negatif. 3 gün, ölçek tahmini için gürültülü bir örneklem.',
  },
  ml: {
    title: 'Öğrenme modelleri ne kazandırıyor?',
    body: (n) => <>Vekil model simülatörün kendi gürültü tabanına ulaşıyor ve Erlang-C formülünden belirgin iyi (R²: ortalama bekleme {n.r2Mean}, P90 {n.r2P90}). Formül üstel servis süresi ve tek kuyruk varsayıyor; gerçek servis süresi ve geçiş buna uymuyor.</>,
    arrival: 'Varış tahmininde öğrenme modeli konusunda dürüst olmak gerekiyor: Poisson GBM, P1+P2→P3 katında profilden iyi görünüyor ama bu, modelin yakın ve benzer dönemi daha çok dinlemesinden geliyor. Seviye sabit kalınca (P2→P3) basit profille aynı.',
  },
  limits: {
    title: 'Sınırlar',
    items: [
      'Gerçek bekleme süresi verisi yok. Bekleme sonuçları teoriye ve kasiyer boşluğuna dayanıyor.',
      'Ortak kuyruğun iki bedeli varsayım: yürüme hızı 1 m/sn ve başka bir mağazada ölçülmüş %6,86 yavaşlama. Ana sayfa, sonucun hangi yavaşlamada tersine döndüğünü gösteriyor.',
      'Ayrı kuyrukta sıradaki müşterinin, öndeki taranırken ürünlerini banda dizebilmesi modellenmedi. Bu, ortak kuyruğun lehine bir basitleştirme.',
      'Her saat sabit hızla ve 30 dakikalık ısınmayla simüle ediliyor; gerçek kuyruk bir saatten diğerine taşınıyor.',
      'Kuyruğu terk etme, kuyruk değiştirme ve hızlı kasa veride gözlenmedi, modelde yok.',
      'Veri tek bir mağazanın üç dönemine ait; başka mağazalara genelleme iddiası yok.',
    ],
  },
}
