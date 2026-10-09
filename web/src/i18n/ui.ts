import type { Lang } from '../lib/format'
import type { DowGroup, LayoutKind, ModelKind } from '../types/scenario'

/** Kısa arayüz metinleri. Uzun anlatım metinleri `content/` altında; iki dil aynı arayüzü uygulamak zorunda. */
export interface Ui {
  meta: { title: string }
  brand: string
  nav: { aria: string; story: string; lab: string; staffing: string; validation: string; method: string }
  lang: { aria: string }
  loading: string
  footer: string
  errors: { params: string; model: string; validation: string; noCustomersTitle: string; noCustomersBody: string }
  days: Record<DowGroup, string>
  layout: Record<LayoutKind, string>
  layoutShort: Record<LayoutKind, string>
  model: Record<ModelKind, string>
  modelLong: Record<ModelKind, string>
  controls: {
    aria: string; day: string; hour: string; lanes: string; lanesAria: string; lanesDec: string; lanesInc: string
    view: string; single: string; compare: string; layout: string; left: string; right: string; model: string
    speed: string; pause: string; play: string; restart: string
  }
  hud: {
    aria: string; nowWaiting: string; serving: string; done: string; meanSoFar: string; hourResult: string
    meanWait: string; p90: string; probWait: string; occupancy: string; overflow: string; finished: string
  }
  liveTag: string
  lab: { title: string; intro: string; stageAria: string; compareAria: string }
  compare: {
    aria: string
    caption: (reps: number) => string
    rows: { meanWait: string; p90: string; probWait: string; occupancy: string }
    metric: string
    effect: (rival: string, delta: string, lo: string, hi: string) => string
    randomLabel: string
    smartLabel: string
    none: (label: string) => string
    shorter: (label: string, amount: string, pct: string) => string
    longer: (label: string, amount: string, pct: string) => string
    sentence: (random: string, smart: string) => string
    chartCaption: string
    chartLabel: (peaks: string) => string
  }
  staffing: {
    title: string; intro: string; formAria: string; day: string; howChoose: string; target: string
    targetOption: (minutes: number) => string; verifyAll: string
    planLine: (hours: number, ms: string) => string
    checkLine: (hours: number, reps: number, sec: string) => string
    verdict: (n: number, meets: number) => string
    verdictLess: (n: number, fails: number) => string
    unmet: (n: number) => string
    moreThanStore: (lanes: string, p90: string) => string
    lessThanStore: (lanes: string) => string
    sameAsStore: string
    limits: string
    chartCaption: string; legendAvg: string; legendBusy: string; legendObserved: string
    chartAria: (summary: string) => string; unattainable: string
    tableCaption: string
    headers: { hour: string; perHour: string; avgLanes: string; busyLanes: string; surrogateP90: string; simP90: string; oneLess: string; verify: string }
    meets: (p90: string, share: number) => string
    singleLane: string
    verify: string
  }
  validationUi: {
    foldAria: string
    holdoutCaption: string
    holdoutHeaders: { metric: string; n: string; bias: string; mape: string; coverage: string }
    recalCaption: string
    recalHeaders: { fold: string; metric: string; stale: string; fresh: string }
    surrogateCaption: string
    surrogateHeaders: { rho: string; n: string; noise: string; surrogate: string; erlang: string }
    arrivalCaption: string
    arrivalHeaders: { fold: string; profile: string; scaled: string; gbm: string }
    biasCaption: string; biasAria: string
    scatterReal: (unit: string) => string; scatterSim: string
    scatterStats: (n: number, bias: string, mape: string, cov: string) => string
    scatterAria: (title: string, n: number, bias: string, mape: string, cov: string) => string
    theoryPanel: (c: string) => string
    theoryAria: (c: string) => string
    theoryAxis: string
    theoryStats: (worst: string) => string
    metricLabel: (key: string) => string
    units: { seconds: string; share: string; people: string; items: string }
  }
  charts: {
    barcodeAria: (n: number, sep: string, pooled: string) => string
    field: {
      axisX: string; textbook: string; walk: string; field: string; storeBand: string; caption: string
      aria: (best: string, flip: string) => string
    }
    breakEven: { axisX: string; measured: (v: string) => string; caption: string; lanes: (c: number) => string; aria: (rho: string) => string }
    gap: { axisX: string; real: string; sim: string; aria: (sec: number, real: string, sim: string) => string }
  }
}

const EN_METRICS: Record<string, string> = {
  'Ort. sepet (servis)': 'Mean basket (staffed)',
  'Ort. servis süresi (servis)': 'Mean service time (staffed)',
  'Kasa doluluğu (servis)': 'Lane utilisation (staffed)',
  'Ort. sepet (self-servis)': 'Mean basket (self-checkout)',
  'Ort. servis süresi (self-servis)': 'Mean service time (self-checkout)',
  'Saatlik müşteri sayısı (servis)': 'Customers per hour (staffed)',
  'Saatlik müşteri sayısı (self-servis)': 'Customers per hour (self-checkout)',
  'Kısa kasiyer boşluğu payı (≤30 sn)': 'Share of short cashier gaps (≤30 s)',
}

const tr: Ui = {
  meta: { title: 'Kuyruk Laboratuvarı: tek kuyruk mu, ayrı kuyruklar mı?' },
  brand: 'Kuyruk Laboratuvarı',
  nav: { aria: 'Sayfalar', story: 'Proje', lab: 'Laboratuvar', staffing: 'Kaç kasa lazım?', validation: 'Doğrulama', method: 'Yöntem' },
  lang: { aria: 'Dil' },
  loading: 'Yükleniyor',
  footer: 'Veri: Antczak ve Weron (2019), “Point of Sale (POS) Data from a Supermarket”, Data 4(2), 67. CC BY-NC. Ham veri depoda yok; yalnızca ondan öğrenilmiş özetler var.',
  errors: {
    params: 'Parametre dosyası okunamadı', model: 'Vekil model okunamadı', validation: 'Doğrulama verisi okunamadı',
    noCustomersTitle: 'Bu saatte müşteri yok', noCustomersBody: 'Başka bir gün ya da saat seç.',
  },
  days: { mon_thu: 'Pazartesi–Perşembe', fri: 'Cuma', sat: 'Cumartesi', sun: 'Pazar' },
  layout: { 'separate-jsq': 'Ayrı kuyruk, en kısayı seçer', 'separate-random': 'Ayrı kuyruk, rastgele seçer', pooled: 'Tek ortak kuyruk' },
  layoutShort: { 'separate-jsq': 'ayrı (en kısa)', 'separate-random': 'ayrı (rastgele)', pooled: 'ortak' },
  model: { saha: 'Saha', ders: 'Ders kitabı' },
  modelLong: { saha: 'Saha modeli', ders: 'Ders kitabı' },
  controls: {
    aria: 'Senaryo ayarları', day: 'Gün', hour: 'Saat', lanes: 'Açık kasa', lanesAria: 'Açık kasa sayısı', lanesDec: 'Kasa azalt', lanesInc: 'Kasa artır',
    view: 'Görünüm', single: 'Tek sahne', compare: 'Yan yana karşılaştır', layout: 'Kuyruk düzeni', left: 'Sol sahne', right: 'Sağ sahne',
    model: 'Ortak kuyruk modeli', speed: 'Oynatma hızı', pause: 'Duraklat', play: 'Oynat', restart: 'Baştan',
  },
  hud: {
    aria: 'Canlı durum', nowWaiting: 'şu an kuyrukta', serving: 'kasada', done: 'çıkan', meanSoFar: 'şimdiye dek ort. bekleme', hourResult: 'Bu saatin sonucu',
    meanWait: 'ortalama bekleme', p90: '%90 en fazla', probWait: 'bekleyen müşteri payı', occupancy: 'kasa doluluğu',
    overflow: 'Kuyruk sahneye sığmıyor: sayı gerçek, ama fazla kişiler üst üste yığılarak çiziliyor.',
    finished: 'Saat bitti. Yeniden başlat ya da ayarı değiştir.',
  },
  liveTag: 'kuyrukta',
  lab: {
    title: 'Laboratuvar',
    intro: 'Simülasyonun ürettiği saat, gerçek yürüme hızıyla oynatılıyor. Gün, saat ve kasa sayısını seç; aynı müşterileri farklı kuyruk düzenlerinde izle. Yan yana karşılaştırma, altında 30 tekrarlı eşleştirilmiş sonucu da hesaplar.',
    stageAria: 'Mağaza sahnesi', compareAria: 'Yan yana karşılaştırma',
  },
  compare: {
    aria: 'Düzen karşılaştırması',
    caption: (reps) => `${reps} tekrarın ortalaması; her tekrarda üç düzen aynı müşterileri görür`,
    rows: { meanWait: 'ortalama bekleme', p90: '%90 en fazla', probWait: 'bekleyen müşteri payı', occupancy: 'kasa doluluğu' },
    metric: 'Ölçü',
    effect: (rival, delta, lo, hi) => `Tek ortak kuyruk, “${rival}” düzenine göre ortalama beklemeyi ${delta} değiştiriyor (%95 aralık: ${lo} ile ${hi} arası).`,
    randomLabel: 'rastgele kuyruk', smartLabel: 'en kısa kuyruğu',
    none: (label) => `${label} seçenlere göre belirgin bir fark yok`,
    shorter: (label, amount, pct) => `${label} seçenlere göre ortalama beklemeyi ${amount} (${pct}) kısaltıyor`,
    longer: (label, amount, pct) => `${label} seçenlere göre ortalama beklemeyi ${amount} (${pct}) uzatıyor`,
    sentence: (random, smart) => `Aynı müşteriler, aynı kasalar: tek ortak kuyruk, ${random}; ${smart}.`,
    chartCaption: 'Kuyruktaki kişi sayısı, saat boyunca',
    chartLabel: (peaks) => `Kuyrukta bekleyen sayısı. Zirve: ${peaks}.`,
  },
  staffing: {
    title: 'Her saat kaç kasa açık olmalı?',
    intro: 'Hedef: müşterilerin %90\'ı en fazla seçtiğin süre kadar beklesin. Öneriyi, simülatörün 12 bin koşusundan öğrenilmiş bir vekil model milisaniyeler içinde verir. Her satırı gerçek simülatörle sınayabilirsin. Hesap saha modeliyle yapılır: geçiş süresi, ortak kuyrukta yürüme ve yavaşlama dahil.',
    formAria: 'Planlama ayarları', day: 'Gün', howChoose: 'Müşteriler kuyruğu nasıl seçiyor?', target: '%90 en fazla bekleme',
    targetOption: (m) => `${m} dk`, verifyAll: 'Tüm saatleri simülatörle sına',
    planLine: (h, ms) => `Plan: 2 senaryo × ${h} saat × en çok 10 kasa, vekil modelle ${ms} ms.`,
    checkLine: (h, reps, sec) => ` Simülatörle sınama (${h} saat × 2 kasa sayısı × ${reps} tekrar): ${sec} sn.`,
    verdict: (n, meets) => `Simülatör sonucu: önerilen kasa sayısı ${n} saatin ${meets} tanesinde hedefi sağlıyor`,
    verdictLess: (n, fails) => `; bir eksik kasa ${n} saatin ${fails} tanesinde sağlamıyor`,
    unmet: (n) => `${n} saatte 10 kasayla bile hedef sağlanamıyor (mağazada 10 kasa var); tabloda “sağlanamıyor” yazar.`,
    moreThanStore: (lanes, p90) => `Bu hedef için öneri, mağazanın gerçekte açtığından saat başına ortalama ${lanes} kasa fazla. Mağaza daha az kasayla çalışıyor ve bunun bedelini bekleme ödüyor: model, fiili kadroyla tipik bir saatte müşterilerin %90'ının ${p90} kadar beklediğini tahmin ediyor.`,
    lessThanStore: (lanes) => `Bu hedef için öneri, mağazanın gerçekte açtığından saat başına ortalama ${lanes} kasa az: hedef, mağazanın fiili hizmet düzeyinden gevşek.`,
    sameAsStore: 'Öneri, mağazanın gerçekte açtığı kasa sayısına çok yakın.',
    limits: 'Sınırlar: vekil model eğitim aralığında (yük oranı ρ ≤ 1,05, en çok 10 kasa) güvenilir; plan ayrıca ρ < 0,98 şartını arar. “Yoğun gün”, günlük talep çarpanının %90 üst dilimidir. Bekleme için gerçek mağaza verisi yok; doğrulama simülatörle yapılır.',
    chartCaption: 'Önerilen açık kasa sayısı, saat saat', legendAvg: 'öneri, ortalama gün', legendBusy: 'öneri, yoğun gün (%90 üst dilim)',
    legendObserved: 'mağazanın gerçekte açtığı (Mar–Nis 2019)',
    chartAria: (s) => `Saatlik önerilen kasa sayısı. Ortalama gün: ${s}.`, unattainable: 'sağlanamıyor',
    tableCaption: 'Vekil model önerisi ve simülatörle sınama (sınama ortalama gün talebiyle yapılır)',
    headers: { hour: 'Saat', perHour: 'Müşteri / saat', avgLanes: 'Ortalama gün: kasa', busyLanes: 'Yoğun gün: kasa', surrogateP90: 'Vekil P90', simP90: 'Simülatör P90', oneLess: 'Bir eksik kasa (sim.)', verify: 'Sına' },
    meets: (p90, share) => `${p90}, %${share} sağlıyor`,
    singleLane: 'tek kasa', verify: 'Sına',
  },
  validationUi: {
    foldAria: 'Kat',
    holdoutCaption: 'Eğitim → test. Yanlılık = simülasyon − gerçek; kapsama = gerçeğin simülasyonun %90 aralığında kaldığı pencere payı.',
    holdoutHeaders: { metric: 'Ölçü', n: 'n', bias: 'Yanlılık', mape: 'Ort. mutlak hata', coverage: '%90 kapsama' },
    recalCaption: 'Test döneminin ilk 3 günüyle iki ölçek öğrenildi; skor kalan günlerde. Ortalama mutlak hata.',
    recalHeaders: { fold: 'Kat', metric: 'Ölçü', stale: 'Bayat model', fresh: 'Kalibre model' },
    surrogateCaption: 'Hiç görülmemiş 3000 senaryoda ortalama mutlak hata (sn). Simülatör gürültüsü, daha iyisinin mümkün olmadığı tabandır.',
    surrogateHeaders: { rho: 'Yük ρ', n: 'n', noise: 'Simülatör gürültüsü', surrogate: 'Vekil model', erlang: 'Erlang-C formülü' },
    arrivalCaption: 'Saatlik müşteri sayısı tahmini, görülmemiş dönemde ortalama mutlak hata.',
    arrivalHeaders: { fold: 'Kat', profile: 'Profil ortalaması', scaled: 'Son dönem ölçekli', gbm: 'Poisson GBM' },
    biasCaption: 'Simülasyon yanlılığı: aynı model, farklı dönemlerde farklı', biasAria: 'Üç kat için ölçü başına simülasyon yanlılığı yüzdesi',
    scatterReal: (u) => `gerçek (${u})`, scatterSim: 'simülasyon',
    scatterStats: (n, b, m, c) => `n=${n}, yanlılık ${b}, hata ${m}, %90 aralık kapsaması ${c}`,
    scatterAria: (t, n, b, m, c) => `${t}: ${n} saat. Yanlılık ${b}, ortalama mutlak hata ${m}, %90 aralığın kapsaması ${c}.`,
    theoryPanel: (c) => `${c} kasa, tek ortak kuyruk (M/M/${c})`,
    theoryAria: (c) => `${c} kasalı ortak kuyrukta simülasyon, Erlang-C formülüne ρ 0,3 ile 0,9 arasında uyuyor.`,
    theoryAxis: 'yük oranı ρ',
    theoryStats: (w) => `Çizgi: Erlang-C formülü. Nokta ve çubuk: simülasyon ve %95 aralığı. En büyük sapma ${w}. Dikey eksen: ortalama bekleme / ortalama servis süresi.`,
    metricLabel: (k) => k,
    units: { seconds: 'sn', share: 'oran', people: 'kişi', items: 'ürün' },
  },
  charts: {
    barcodeAria: (n, sep, pooled) => `${n} müşteri. Ayrı kuyruklarda ortalama bekleme ${sep}, tek ortak kuyrukta ${pooled}.`,
    field: {
      axisX: 'kasa doluluğu (yük oranı ρ)', textbook: 'ders kitabı', walk: 'yalnız yürüme', field: 'saha modeli', storeBand: 'bu mağazanın saatlerinin yarısı →',
      caption: 'Tek kuyruğun ortalama beklemesi eksi ayrı kuyrukların, saniye. Sıfırın üstünde ayrı kuyruklar daha iyi.',
      aria: (best, flip) => `Ders kitabı modelinde ortak kuyruk her yükte daha kısa bekletiyor (en çok ${best}). Yürüme ve yavaşlama eklenince doluluk ${flip} civarında ayrı kuyruklar öne geçiyor.`,
    },
    breakEven: {
      axisX: 'kasa doluluğu (yük oranı ρ)', measured: (v) => `ölçülen ${v}`,
      caption: 'Tek kuyruğun hâlâ kazandığı en büyük kasiyer yavaşlaması (yürüme dahil). Çizginin altı tek kuyruk, üstü ayrı kuyruklar.',
      lanes: (c) => `${c} kasa`,
      aria: (rho) => `Yük arttıkça ortak kuyruğun dayanabileceği yavaşlama düşüyor. 5 kasada doluluk ${rho} civarında ölçülen %6,9'un altına iniyor; %80'den sonra yürüme tek başına avantajı siliyor.`,
    },
    gap: {
      axisX: 'iki müşteri arasında kasiyerin boşluğu (sn)', real: 'gerçek', sim: 'simülasyon',
      aria: (s, r, m) => `Gerçek boşlukların ${r} kadarı ${s} saniyeden kısa; simülasyonda ${m}.`,
    },
  },
}

const en: Ui = {
  meta: { title: 'Queue Lab: one shared line or a line per checkout?' },
  brand: 'Queue Lab',
  nav: { aria: 'Pages', story: 'Project', lab: 'Lab', staffing: 'How many lanes?', validation: 'Validation', method: 'Method' },
  lang: { aria: 'Language' },
  loading: 'Loading',
  footer: 'Data: Antczak and Weron (2019), “Point of Sale (POS) Data from a Supermarket”, Data 4(2), 67. CC BY-NC. The raw data is not in the repository; only summaries learned from it are.',
  errors: {
    params: 'Could not read the parameter file', model: 'Could not read the surrogate model', validation: 'Could not read the validation data',
    noCustomersTitle: 'No customers in this hour', noCustomersBody: 'Pick another day or hour.',
  },
  days: { mon_thu: 'Monday–Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' },
  layout: { 'separate-jsq': 'Separate lines, join the shortest', 'separate-random': 'Separate lines, pick at random', pooled: 'One shared line' },
  layoutShort: { 'separate-jsq': 'separate (shortest)', 'separate-random': 'separate (random)', pooled: 'shared' },
  model: { saha: 'Field', ders: 'Textbook' },
  modelLong: { saha: 'Field model', ders: 'Textbook' },
  controls: {
    aria: 'Scenario settings', day: 'Day', hour: 'Hour', lanes: 'Open lanes', lanesAria: 'Number of open lanes', lanesDec: 'Fewer lanes', lanesInc: 'More lanes',
    view: 'View', single: 'One scene', compare: 'Side by side', layout: 'Queue layout', left: 'Left scene', right: 'Right scene',
    model: 'Shared-line model', speed: 'Playback speed', pause: 'Pause', play: 'Play', restart: 'Restart',
  },
  hud: {
    aria: 'Live status', nowWaiting: 'waiting now', serving: 'at a lane', done: 'done', meanSoFar: 'mean wait so far', hourResult: 'This hour',
    meanWait: 'mean wait', p90: '90% wait at most', probWait: 'customers who wait', occupancy: 'lane occupancy',
    overflow: 'The line no longer fits the scene: the count is real, extra people are drawn stacked.',
    finished: 'The hour is over. Restart or change a setting.',
  },
  liveTag: 'waiting',
  lab: {
    title: 'Lab',
    intro: 'The simulated hour is replayed at real walking speed. Pick a day, an hour and the number of open lanes, and watch the same customers under different queue layouts. Side by side also computes a 30-replication paired comparison below.',
    stageAria: 'Store scene', compareAria: 'Side-by-side comparison',
  },
  compare: {
    aria: 'Layout comparison',
    caption: (reps) => `Mean of ${reps} replications; in each one all three layouts see the same customers`,
    rows: { meanWait: 'mean wait', p90: '90% wait at most', probWait: 'customers who wait', occupancy: 'lane occupancy' },
    metric: 'Measure',
    effect: (rival, delta, lo, hi) => `Against “${rival}”, one shared line changes the mean wait by ${delta} (95% interval: ${lo} to ${hi}).`,
    randomLabel: 'picking a line at random', smartLabel: 'joining the shortest line',
    none: (label) => `makes no clear difference compared with ${label}`,
    shorter: (label, amount, pct) => `cuts the mean wait by ${amount} (${pct}) compared with ${label}`,
    longer: (label, amount, pct) => `adds ${amount} (${pct}) to the mean wait compared with ${label}`,
    sentence: (random, smart) => `Same customers, same lanes: one shared line ${random}, and ${smart}.`,
    chartCaption: 'People waiting in line over the hour',
    chartLabel: (peaks) => `People waiting in line. Peak: ${peaks}.`,
  },
  staffing: {
    title: 'How many lanes should be open each hour?',
    intro: 'Target: 90% of customers wait no longer than the time you pick. A surrogate model, trained on 12,000 simulator runs, answers in milliseconds, and you can check every row against the real simulator. The plan uses the field model: changeover time, the walk to the lane and the slowdown in a shared line are all included.',
    formAria: 'Planning settings', day: 'Day', howChoose: 'How do customers choose a line?', target: '90% wait at most',
    targetOption: (m) => `${m} min`, verifyAll: 'Check every hour in the simulator',
    planLine: (h, ms) => `Plan: 2 scenarios × ${h} hours × up to 10 lanes, ${ms} ms with the surrogate.`,
    checkLine: (h, reps, sec) => ` Simulator check (${h} hours × 2 lane counts × ${reps} replications): ${sec} s.`,
    verdict: (n, meets) => `Simulator result: the recommended lane count meets the target in ${meets} of ${n} hours`,
    verdictLess: (n, fails) => `; one lane fewer misses it in ${fails} of ${n}`,
    unmet: (n) => `In ${n} hours even 10 lanes cannot meet the target (the store has 10); the table says “not reachable”.`,
    moreThanStore: (lanes, p90) => `For this target the plan opens ${lanes} more lanes per hour than the store actually did. The store runs leaner and customers pay in waiting time: with its real staffing, the model estimates 90% of customers wait up to ${p90} in a typical hour.`,
    lessThanStore: (lanes) => `For this target the plan opens ${lanes} fewer lanes per hour than the store actually did: the target is looser than the store's real service level.`,
    sameAsStore: 'The plan is very close to the number of lanes the store actually opened.',
    limits: 'Limits: the surrogate is reliable inside its training range (load ρ ≤ 1.05, up to 10 lanes); the plan also requires ρ < 0.98. A “busy day” is the 90th percentile of the daily demand multiplier. There is no real waiting-time data; checks are done with the simulator.',
    chartCaption: 'Recommended open lanes, hour by hour', legendAvg: 'plan, average day', legendBusy: 'plan, busy day (90th percentile)',
    legendObserved: 'what the store actually opened (Mar–Apr 2019)',
    chartAria: (s) => `Recommended lanes per hour. Average day: ${s}.`, unattainable: 'not reachable',
    tableCaption: 'Surrogate recommendation and simulator check (checked with average-day demand)',
    headers: { hour: 'Hour', perHour: 'Customers / hour', avgLanes: 'Average day: lanes', busyLanes: 'Busy day: lanes', surrogateP90: 'Surrogate P90', simP90: 'Simulator P90', oneLess: 'One lane fewer (sim.)', verify: 'Check' },
    meets: (p90, share) => `${p90}, meets ${share}%`,
    singleLane: 'single lane', verify: 'Check',
  },
  validationUi: {
    foldAria: 'Fold',
    holdoutCaption: 'Train → test. Bias = simulation − real; coverage = share of hours where the real value falls inside the simulated 90% interval.',
    holdoutHeaders: { metric: 'Measure', n: 'n', bias: 'Bias', mape: 'Mean abs. error', coverage: '90% coverage' },
    recalCaption: 'Two scale factors learned from the first 3 days of the test period; scored on the remaining days. Mean absolute error.',
    recalHeaders: { fold: 'Fold', metric: 'Measure', stale: 'Stale model', fresh: 'Recalibrated' },
    surrogateCaption: 'Mean absolute error (s) on 3,000 unseen scenarios. Simulator noise is the floor: nothing can do better.',
    surrogateHeaders: { rho: 'Load ρ', n: 'n', noise: 'Simulator noise', surrogate: 'Surrogate', erlang: 'Erlang-C formula' },
    arrivalCaption: 'Customers-per-hour forecast, mean absolute error on an unseen period.',
    arrivalHeaders: { fold: 'Fold', profile: 'Profile mean', scaled: 'Scaled to last period', gbm: 'Poisson GBM' },
    biasCaption: 'Simulation bias: same model, different periods, different bias', biasAria: 'Simulation bias per measure for the three folds',
    scatterReal: (u) => `real (${u})`, scatterSim: 'simulation',
    scatterStats: (n, b, m, c) => `n=${n}, bias ${b}, error ${m}, 90% interval coverage ${c}`,
    scatterAria: (t, n, b, m, c) => `${t}: ${n} hours. Bias ${b}, mean absolute error ${m}, coverage of the 90% interval ${c}.`,
    theoryPanel: (c) => `${c} lane${c === '1' ? '' : 's'}, one shared line (M/M/${c})`,
    theoryAria: (c) => `With ${c} lanes and a shared line, the simulation matches the Erlang-C formula for ρ from 0.3 to 0.9.`,
    theoryAxis: 'load ρ',
    theoryStats: (w) => `Line: Erlang-C formula. Dot and bar: simulation and its 95% interval. Largest gap ${w}. Vertical axis: mean wait / mean service time.`,
    metricLabel: (k) => EN_METRICS[k] ?? k,
    units: { seconds: 's', share: 'share', people: 'people', items: 'items' },
  },
  charts: {
    barcodeAria: (n, sep, pooled) => `${n} customers. Mean wait with separate lines ${sep}, with one shared line ${pooled}.`,
    field: {
      axisX: 'lane occupancy (load ρ)', textbook: 'textbook', walk: 'walk only', field: 'field model', storeBand: 'half of this store’s hours →',
      caption: 'Mean wait in one shared line minus separate lines, in seconds. Above zero, separate lines do better.',
      aria: (best, flip) => `In the textbook model the shared line waits less at every load (by up to ${best}). With the walk and the slowdown added, separate lines pull ahead from about ${flip} occupancy.`,
    },
    breakEven: {
      axisX: 'lane occupancy (load ρ)', measured: (v) => `measured ${v}`,
      caption: 'The largest cashier slowdown at which one shared line still wins (walk included). Below the line the shared line wins, above it separate lines do.',
      lanes: (c) => `${c} lanes`,
      aria: (rho) => `The slowdown a shared line can afford shrinks with load. With 5 lanes it drops below the measured 6.9% at about ${rho}; above 80% the walk alone erases the advantage.`,
    },
    gap: {
      axisX: 'cashier gap between two customers (s)', real: 'real', sim: 'simulation',
      aria: (s, r, m) => `${r} of real gaps are shorter than ${s} seconds; ${m} in the simulation.`,
    },
  },
}

export const UI: Record<Lang, Ui> = { tr, en }
