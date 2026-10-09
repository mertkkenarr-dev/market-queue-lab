import type { StoryCopy } from './story.types'

export const storyTr: StoryCopy = {
  hero: {
    title: 'Tek kuyruk mu, her kasaya ayrı kuyruk mu?',
    lede: 'Kuyruk teorisinin bu soruya net bir cevabı var: tek ortak kuyruk. Bir süpermarketin gerçek kasa kayıtlarıyla bir simülasyon kurup bu cevabı sınadım. Teorinin dışarıda bıraktığı iki küçük ayrıntı eklenince, mağazanın yoğun saatlerinde cevap tersine dönüyor.',
    key: (lanes, customers) => `Cuma 17:00, ${lanes} kasa, aynı ${customers} müşteri. Her çizgi bir müşteri; uzunluğu beklediği süre.`,
    toggleAria: 'Ortak kuyruk modeli',
    separate: 'Ayrı kuyruklar, ortalama bekleme',
    pooled: (textbook) => `Tek ortak kuyruk${textbook ? ' (ders kitabı)' : ''}, ortalama bekleme`,
    perCustomer: 'müşteri başına',
    watch: 'Mağazada izle',
    validate: 'Nasıl doğruladım',
  },
  problem: {
    title: 'Teori tek kuyruk diyor, marketler ayrı kuyruk kuruyor',
    body: (
      <>
        <p>
          Her kasanın kendi kuyruğu olduğunda bir kasa boş dururken yanındakinde insanlar bekleyebilir. Tek ortak kuyrukta bu olamaz: boşalan ilk kasa
          sıradaki kişiyi alır. Bu yüzden aynı kasa sayısı ve aynı müşterilerle ortak kuyruk ortalama beklemeyi kısaltır; bankalar ve havalimanları
          buna göre kurulur. Yine de süpermarketlerin çoğu her kasaya ayrı kuyruk koyar.
        </p>
        <p>
          Merak ettiğim şuydu: marketler bir şeyi mi kaçırıyor, yoksa teori mi? Soru küçük görünse de gerçek bir işletme kararı.
          Kaç kasanın açılacağı ve kuyruğun nasıl kurulacağı hem personel maliyetini hem de müşterinin kasada geçirdiği süreyi belirliyor.
        </p>
      </>
    ),
  },
  approach: {
    title: 'Nasıl yaklaştım',
    steps: [
      <><strong>Veriden bir müşteri modeli.</strong> Polonya'da bir süpermarketin üç dönemine ait 163 bin kasa işleminden sepet büyüklüğünü, ödeme türünü, ürün başına tarama süresini ve saat saat müşteri akışını öğrendim.</>,
      <><strong>Bir simülasyon motoru.</strong> Her müşterinin geldiği, beklediği, tarandığı ve çıktığı anı hesaplayan ayrık olay simülasyonu yazdım. Aynı müşteri akışı her düzende aynen tekrar oynatılıyor; böylece iki düzen arasındaki fark şanstan değil, düzenden geliyor.</>,
      <><strong>İki ayrı sınama.</strong> Motoru kuyruk teorisinin kesin formüllerine, müşteri modelini de hiç görmediği bir dönemin kayıtlarına karşı sınadım.</>,
      <><strong>Teorinin atladığı ayrıntılar.</strong> Kayıtlarda ve literatürde bulduğum etkileri modele ekledim ve sonucun hangi varsayıma ne kadar bağlı olduğunu ölçtüm.</>,
    ],
    reproducible: <>Bu sayfadaki her sayı ham veriden tek komutla yeniden üretilebiliyor; kod ve testler açık.</>,
  },
  changeover: {
    title: 'Müşteriler arasındaki süre boş bekleme değil',
    body: (n) => (
      <>
        <p>
          Kayıtlarda, kasiyerin bir işlemi bitirip sonrakine başlaması arasındaki süre de var. Bu süre mağaza boşken de dolarken de neredeyse aynı:
          medyan yaklaşık 16 saniye. Yani bu süre boş beklemek değil. Ödemenin kapanışı, poşetleme ve sıradaki sepetin banda gelmesi; her müşteriye
          eklenen bir “geçiş” süresi. Ders kitabı modelleri bu süreyi atlar.
        </p>
        <p>
          Geçiş süresini modele ekledim ve sonucu, modelin hiç görmediği bir dönemin kayıtlarıyla sınadım. Gerçek boşlukların {n.gapReal} kadarı {n.gapSec} saniyeden
          kısa, simülasyonda {n.gapSim}. Veride bekleme süresi ölçülmemiş; kasaların ne kadar dolu çalıştığını gösteren en yakın iz bu.
        </p>
      </>
    ),
    aside: (n) => (
      <>
        Bu sınama benim bir hatamı da yakaladı. Açık kasa sayısını önce “15 dakikada işlem yapan kasiyer sayısı” ile tahmin etmiştim. Kasiyerlerin
        giriş ve kilit kayıtlarıyla ölçünce ortalama {n.lanesProxy} değil {n.lanesLogs} kasa açık çıktı. Eski sayıyla simülasyon kasaları olduğundan boş görüyordu.
      </>
    ),
  },
  field: {
    title: 'Ortak kuyruğun iki gizli bedeli',
    body: (n) => (
      <>
        <p>
          <strong>Yürüme.</strong> Ayrı kuyrukta sıradaki müşteri zaten bandın başında, ürünlerini diziyor. Ortak kuyrukta ise kasa boşalınca hangisinin
          boşaldığını fark edip arabasıyla oraya yürümesi gerekiyor; bu sırada kasa boş bekliyor. 5 açık kasada bu yürüyüş, 3D sahnedeki mesafelerden ve 1 m/sn
          araba hızından kasaya göre {n.walkMin}–{n.walkMax} saniye tutuyor.
        </p>
        <p>
          <strong>Yavaşlama.</strong> Wang ve Zhou (2018) aynı süpermarketi iki düzende gözlemledi: ortak kuyrukta kasiyerler ortalama {n.slowdown} daha yavaş çalıştı.
          Önündeki kuyruk “kendisinin” olmayınca kasiyer acele etmiyor; literatürde buna sosyal kaytarma deniyor.
        </p>
        <p>
          Bu iki etki eklenince tablo değişiyor: 5 kasada doluluk {n.flip} civarını geçince ayrı kuyruklar daha az bekletiyor. Bu mağazanın saatlerinin yarısında
          doluluk {n.occP25} ile {n.occP75} arasında, yani mağaza tam da ayrı kuyrukların öne geçtiği bölgede çalışıyor.
        </p>
      </>
    ),
    fine: 'Her nokta aynı müşteri akışlarıyla 200 eşleştirilmiş tekrar; bant %95 güven aralığı. 5 açık kasa, Cuma akşamı sepet karışımı.',
  },
  breakEven: {
    title: 'Peki yavaşlama ölçümü bu mağazaya uymuyorsa?',
    body: (
      <p>
        %6,9'luk yavaşlama başka bir ülkedeki başka bir mağazadan geliyor; bu veride ölçülemiyor, çünkü mağaza hep ayrı kuyrukla çalışmış. Bu yüzden soruyu
        tersinden sordum: tek kuyruğun hâlâ kazanması için kasiyerler en fazla ne kadar yavaşlayabilir? Az dolu bir mağazada %10'u aşan bir pay var.
        Doluluk %80'i geçince yürüme tek başına avantajı siliyor; yavaşlama sıfır olsa bile ayrı kuyruklar önde.
      </p>
    ),
  },
  store: {
    title: 'Bu mağaza için anlamı',
    body: (n) => (
      <>
        <p>
          Mağazanın gerçekte açtığı kasa sayısıyla simülasyon, kasaların zamanın {n.occMed} kadarında dolu olduğunu ve müşterilerin {n.probWaitMed} kadarının
          sırada beklediğini tahmin ediyor. Tipik bir saatte müşterilerin %90'ı en fazla {n.p90Med} bekliyor; saatlerin {n.p90Over2} kadarında bu süre 2 dakikayı aşıyor.
        </p>
        <p>
          Hedef “müşterilerin %90'ı 2 dakikadan az beklesin” olsaydı kaç kasa gerekeceğini <a href="#/kasa">Kaç kasa lazım?</a> sayfası saat saat hesaplıyor
          ve her öneriyi simülatörle sınıyor. Kendi senaryonu <a href="#/lab">laboratuvarda</a>, 3D mağazada izleyebilirsin.
        </p>
      </>
    ),
  },
  limits: {
    title: 'Neyi göstermiyor, sırada ne var',
    intro: (
      <p>
        Motor kuyruk teorisinin kesin sonuçlarını ±%1,3 içinde üretiyor; müşteri modeli hiç görmediği dönemde servis süresini, doluluğu ve kasiyer boşluğunu
        yaklaşık %6–9 hatayla tutturuyor. Ama bazı sınırlar sonucu doğrudan etkiliyor:
      </p>
    ),
    items: [
      <>Bekleme süresi veride yok. Bekleme sonuçları teoriye ve kasiyer boşluğuna dayanıyor, gerçek bekleme ölçümüyle karşılaştırılamıyor.</>,
      <>Yürüme hızı ve yavaşlama varsayım. İkisini de laboratuvarda kapatabilirsin; başabaş grafiği sonucun hangi koşulda değiştiğini gösteriyor.</>,
      <>Ayrı kuyrukta sıradaki müşterinin, öndeki taranırken ürünlerini banda dizebilmesini modellemedim. Bu basitleştirme ortak kuyruğun lehine.</>,
      <>Veri tek bir mağazanın üç dönemine ait; başka mağazalar için genel bir iddiada bulunmuyorum.</>,
    ],
    nextTitle: 'Bir sonraki adımda yapmak istediklerim:',
    next: [
      <>Tam günü kesintisiz simüle edip “kuyruk N kişiyi geçince kasa aç” gibi işletme kurallarını sınamak.</>,
      <>Kasiyerler arasındaki hız farkını modele katmak (veride kasiyer kimliği var).</>,
      <>Hızlı kasa (≤N ürün) düzenini ve uygun ürün sınırını incelemek.</>,
      <>En önemlisi: sonucu kamera ya da sensörle ölçülmüş gerçek bekleme verisiyle doğrulamak.</>,
    ],
    closing: <>Bu çalışma kesin bir cevap değil; teorinin cevabının hangi koşullarda geçerli olduğunu, hangilerinde olmadığını göstermeye çalışıyor.</>,
    links: { validation: 'Doğrulamanın tamamı', method: 'Matematik ve yöntem' },
  },
}
