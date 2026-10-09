import { Tex } from '../components/Tex'
import { CART_SPEED, NOTICE_SECONDS, POOLED_SLOWDOWN } from '@sim/field'
import { makeFormat } from '../lib/format'

/** TeX'te ondalık virgül noktalama sayılır ve boşluk alır; {,} onu rakamın parçası yapar. */
const texNum = (v: number, d: number): string => makeFormat('tr').num(v, d).replace(',', '{,}')

export function MethodTr() {
  return (
    <article className="method">
      <header className="page-head">
        <h1>Yöntem</h1>
        <p>Modelin her parçası, hangi veriden geldiği ve neyle sınandığı. Kod karşılıkları parantez içinde.</p>
      </header>

      <section aria-labelledby="m-customers">
        <h2 id="m-customers">Müşteri modeli</h2>
        <p>
          <strong>Varış.</strong> Gün tipi <Tex>{'g'}</Tex> (Pzt–Per, Cuma, Cumartesi, Pazar) ve saat <Tex>{'h'}</Tex> için ortalama varış hızı veriden sayılır.
          Saat içinde varışlar Poisson sürecidir. Günden güne dalgalanma tek bir lognormal çarpanla taşınır; bu, “yoğun gün” senaryosunun temelidir
          (<code>scripts/03_fit.py §6</code>).
        </p>
        <Tex block>{'\\Lambda_{g,h} = \\lambda_{g,h}\\, e^{\\sigma Z - \\sigma^2/2},\\qquad Z\\sim\\mathcal N(0,1),\\quad \\mathbb E[\\Lambda_{g,h}] = \\lambda_{g,h}'}</Tex>
        <p>
          <strong>Sepet ve ödeme.</strong> Ürün sayısı ve kart/nakit birlikte, ampirik ortak dağılımdan çekilir. Parametrik aileler medyan sepeti %8 kaydırıyordu.
          Dağılım gün tipi × sabah/akşam bağlamına göre öğrenilir; az verili bağlamlar genel dağılıma büzülür (<Tex>{'K = 300'}</Tex>):
        </p>
        <Tex block>{'\\hat p_{\\text{bağlam}}(n,k) = \\frac{N_{\\text{bağlam}}\\,\\tilde p_{\\text{bağlam}}(n,k) + K\\,\\tilde p(n,k)}{N_{\\text{bağlam}} + K}'}</Tex>
        <p>
          <strong>Tarama süresi.</strong> <Tex>{'n'}</Tex> ürün ve ödeme türü <Tex>{'k\\in\\{0,1\\}'}</Tex> için ortalama ve varyans, momentleri eşleştirilmiş bir lognormal ile
          (en çok olabilirlik, 122 bin işlem; sim/src/store.ts):
        </p>
        <Tex block>{'m(n,k) = a + d\\,k + b\\,n^{\\gamma},\\qquad v(n) = v_0 + v_1 n,\\qquad T \\sim \\operatorname{LogN}\\!\\Big(\\ln m - \\tfrac{s^2}{2},\\ s^2\\Big),\\ \\ s^2 = \\ln\\!\\Big(1+\\frac{v}{m^2}\\Big)'}</Tex>
        <p>
          <strong>Geçiş süresi.</strong> Kayıtlardaki <code>BreakTime</code>, aynı kasiyerin bir işlemi bitirmesiyle sonrakine başlaması arasındaki süredir
          (zaman damgalarıyla %99,3 eşleşiyor). Kasiyerin kesintisiz meşgul olduğu saatlerde bu boşluk boşta bekleme değil, kasanın bir sonraki müşteriye geçişidir.
          Dağılımı bu saatlerden, ödeme türüne göre ayrı ayrı 101 noktalı bir kantil tablosu olarak öğrenilir ve ters dağılım yöntemiyle örneklenir.
        </p>
      </section>

      <section aria-labelledby="m-engine">
        <h2 id="m-engine">Simülasyon motoru</h2>
        <p>
          Ayrık olay simülasyonu: bir öncelik kuyruğunda varış ve ayrılış olayları; eşit zamanda ayrılış önce işlenir, böylece tam o anda boşalan kasa
          gelen müşteriye açıktır. Müşteri <Tex>{'i'}</Tex> kasa <Tex>{'s'}</Tex>'yi şu kadar meşgul eder:
        </p>
        <Tex block>{'B_i = \\underbrace{(1+\\delta\\,\\mathbb 1_{\\text{ortak}})\\,T_i}_{\\text{tarama}} + \\underbrace{C_i}_{\\text{geçiş}} + \\underbrace{w_s\\,\\mathbb 1_{\\text{ortak, bekledi}}}_{\\text{kasaya yürüme}}'}</Tex>
        <p>
          Ayrı kuyrukta müşteri o anda <Tex>{'\\arg\\min_s (q_s + b_s)'}</Tex> kasayı seçer (kuyruktaki ve kasadaki kişi sayısı; eşitlikte rastgele).
          Ürün sayısına değil kişi sayısına bakar; Lu ve ark. (2013) müşterilerin gerçekten böyle karar verdiğini gösterdi.
          Bekleme, kasaya varış anında biter: <Tex>{'W_i = \\text{başlangıç}_i - \\text{varış}_i'}</Tex>.
        </p>
      </section>

      <section aria-labelledby="m-field">
        <h2 id="m-field">Ortak kuyruğun saha etkileri</h2>
        <p>
          <strong>Yürüme</strong> (<code>sim/src/field.ts</code>): kuyruk başından kasa <Tex>{'s'}</Tex>'nin önüne L biçimli yol, ayrı kuyrukta da atılan adım düşülerek,
          araba hızı <Tex>{`v = ${texNum(CART_SPEED, 1)}`}</Tex> m/sn ve fark etme süresi <Tex>{`t_0 = ${texNum(NOTICE_SECONDS, 0)}`}</Tex> sn. Mesafeler 3D sahnenin geometrisinden gelir:
        </p>
        <Tex block>{'w_s = \\frac{|x_s - x_h| + |z_s - z_h| - d_0}{v} + t_0'}</Tex>
        <p>
          <strong>Yavaşlama</strong>: <Tex>{`\\delta = ${texNum(POOLED_SLOWDOWN, 4)}`}</Tex>, Wang ve Zhou'nun (2018) aynı mağazada iki düzeni karşılaştırarak ölçtüğü net etki.
        </p>
        <p>
          Neden yüksek yükte daha çok önemli? Kasa başına etkin yük, yürümenin yalnızca bekleyen müşterilere eklendiği düşünülerek kabaca şöyle artar:
        </p>
        <Tex block>{"\\rho' \\approx \\frac{\\lambda}{c}\\Big((1+\\delta)\\,\\mathbb E[T] + \\mathbb E[C] + \\Pr(W>0)\\,\\bar w\\Big)"}</Tex>
        <p>
          Bekleme <Tex>{'1/(1-\\rho)'}</Tex> gibi büyüdüğü için, <Tex>{'\\rho = 0{,}6'}</Tex>'da önemsiz olan birkaç yüzde puanlık artış <Tex>{'\\rho = 0{,}9'}</Tex>'da beklemeyi
          katlar (Kingman, 1961). Bu artış ortak kuyruğun teorik avantajını yer.
        </p>
      </section>

      <section aria-labelledby="m-theory">
        <h2 id="m-theory">Teoriyle sınama</h2>
        <p>Motor, kapalı çözümü olan durumlarda formüllerle karşılaştırılır (<code>sim/tests/</code>). <Tex>{'c'}</Tex> kasa ve <Tex>{'a = \\lambda/\\mu'}</Tex> yükte Erlang-C:</p>
        <Tex block>{'\\Pr(W>0) = C(c,a) = \\frac{\\dfrac{a^c}{c!}\\dfrac{c}{c-a}}{\\displaystyle\\sum_{k=0}^{c-1}\\frac{a^k}{k!} + \\frac{a^c}{c!}\\frac{c}{c-a}},\\qquad \\mathbb E[W] = \\frac{C(c,a)}{c\\mu - \\lambda}'}</Tex>
        <p>Genel servis süreli tek kasa için Pollaczek–Khinchine ve her koşuda Little yasası:</p>
        <Tex block>{'\\mathbb E[W]_{M/G/1} = \\frac{\\lambda\\,\\mathbb E[S^2]}{2(1-\\rho)},\\qquad L = \\lambda\\,W'}</Tex>
      </section>

      <section aria-labelledby="m-compare">
        <h2 id="m-compare">Düzenleri karşılaştırma</h2>
        <p>
          Her tekrarda düzenler aynı müşteri akışını görür (ortak rastgele sayılar). Fark bu yüzden eşleştirilmiş örneklemle tahmin edilir; iki koşu arasındaki pozitif
          kovaryans farkın varyansını küçültür:
        </p>
        <Tex block>{'D_r = \\bar W^{\\text{ortak}}_r - \\bar W^{\\text{ayrı}}_r,\\qquad \\bar D \\pm t_{0{,}975,\\,R-1}\\frac{s_D}{\\sqrt R},\\qquad \\operatorname{Var}(D) = \\operatorname{Var}(A) + \\operatorname{Var}(B) - 2\\operatorname{Cov}(A,B)'}</Tex>
        <p>Aralık sıfırı kapsıyorsa arayüz “belirgin fark yok” der.</p>
      </section>

      <section aria-labelledby="m-validation">
        <h2 id="m-validation">Zaman dışı doğrulama ve vekil model</h2>
        <p>
          Üç dönem (Ara 2017, Şub 2019, Mar–Nis 2019). Her katta parametreler yalnızca eğitim dönemlerinden öğrenilir. Test dönemi eğitime karışırsa kod
          “SIZINTI” hatasıyla durur. Her saatlik pencere 300 tekrarla simüle edilir. Gerçek değer <Tex>{'y'}</Tex>, simülasyon medyanı <Tex>{'\\hat y'}</Tex> ve %90 aralığı ile:
        </p>
        <Tex block>{'\\text{yanlılık} = \\tfrac1n\\sum \\frac{\\hat y - y}{y},\\qquad \\text{MAPE} = \\tfrac1n\\sum\\Big|\\frac{\\hat y - y}{y}\\Big|,\\qquad \\text{kapsama} = \\tfrac1n\\sum \\mathbb 1\\big[y\\in[\\hat y_{0{,}05},\\hat y_{0{,}95}]\\big]'}</Tex>
        <p>
          Personel planı, simülatörün 12 bin senaryoluk süpürmesiyle eğitilmiş gradyan artırmalı ağaçlarla (monoton kısıtlı: kasa arttıkça bekleme artamaz) anında hesaplanır.
          Her saat için hedefi sağlayan en az kasa:
        </p>
        <Tex block>{'c^* = \\min\\{\\,c \\le 10 : \\hat P_{90}(c) \\le \\tau,\\ \\rho(c) < 0{,}98\\,\\}'}</Tex>
        <p>Öneri, tarayıcıda gerçek simülatörle yeniden sınanabilir.</p>
      </section>

      <section aria-labelledby="m-refs">
        <h2 id="m-refs">Kaynaklar</h2>
        <ul className="refs">
          <li>Antczak, T., Weron, R. (2019). Point of Sale (POS) Data from a Supermarket: Transactions and Cashier Operations. <i>Data</i> 4(2), 67.</li>
          <li>Wang, J., Zhou, Y.-P. (2018). Impact of Queue Configuration on Service Time: Evidence from a Supermarket. <i>Management Science</i> 64(7), 3055–3075.</li>
          <li>Lu, Y., Musalem, A., Olivares, M., Schilkrut, A. (2013). Measuring the Effect of Queues on Customer Purchases. <i>Management Science</i> 59(8), 1743–1763.</li>
          <li>Kingman, J. F. C. (1961). The single server queue in heavy traffic. <i>Mathematical Proceedings of the Cambridge Philosophical Society</i> 57(4).</li>
        </ul>
      </section>
    </article>
  )
}
