import { CART_SPEED, NOTICE_SECONDS, POOLED_SLOWDOWN } from '@sim/field'
import { Tex } from '../components/Tex'

export function MethodEn() {
  return (
    <article className="method">
      <header className="page-head">
        <h1>Method</h1>
        <p>Every part of the model, the data it comes from and what it was tested against. Code locations are given in brackets.</p>
      </header>

      <section aria-labelledby="m-customers">
        <h2 id="m-customers">Customer model</h2>
        <p>
          <strong>Arrivals.</strong> For each day type <Tex>{'g'}</Tex> (Mon–Thu, Friday, Saturday, Sunday) and hour <Tex>{'h'}</Tex>, the mean arrival rate is counted
          from the data. Within an hour arrivals follow a Poisson process. Day-to-day variation is carried by a single lognormal multiplier, which is what the
          “busy day” scenario is built on (<code>scripts/03_fit.py §6</code>).
        </p>
        <Tex block>{'\\Lambda_{g,h} = \\lambda_{g,h}\\, e^{\\sigma Z - \\sigma^2/2},\\qquad Z\\sim\\mathcal N(0,1),\\quad \\mathbb E[\\Lambda_{g,h}] = \\lambda_{g,h}'}</Tex>
        <p>
          <strong>Basket and payment.</strong> The number of items and card/cash are drawn together from the empirical joint distribution; parametric families
          shifted the median basket by 8%. The distribution is learned per context (day type × morning/evening), and contexts with little data are shrunk toward
          the overall distribution (<Tex>{'K = 300'}</Tex>):
        </p>
        <Tex block>{'\\hat p_{\\text{context}}(n,k) = \\frac{N_{\\text{context}}\\,\\tilde p_{\\text{context}}(n,k) + K\\,\\tilde p(n,k)}{N_{\\text{context}} + K}'}</Tex>
        <p>
          <strong>Scanning time.</strong> For <Tex>{'n'}</Tex> items and payment type <Tex>{'k\\in\\{0,1\\}'}</Tex>, a mean and a variance, turned into a
          moment-matched lognormal (maximum likelihood on 122,000 transactions; <code>sim/src/store.ts</code>):
        </p>
        <Tex block>{'m(n,k) = a + d\\,k + b\\,n^{\\gamma},\\qquad v(n) = v_0 + v_1 n,\\qquad T \\sim \\operatorname{LogN}\\!\\Big(\\ln m - \\tfrac{s^2}{2},\\ s^2\\Big),\\ \\ s^2 = \\ln\\!\\Big(1+\\frac{v}{m^2}\\Big)'}</Tex>
        <p>
          <strong>Changeover.</strong> <code>BreakTime</code> in the records is the time between a cashier finishing one transaction and starting the next
          (it matches the timestamps 99.3% of the time). In hours when a cashier is continuously busy, that gap is not idle time but the lane switching to the next
          customer. Its distribution is learned from those hours, separately for each payment type, as a 101-point quantile table sampled by inverse transform.
        </p>
      </section>

      <section aria-labelledby="m-engine">
        <h2 id="m-engine">Simulation engine</h2>
        <p>
          A discrete-event simulation: arrival and departure events in a priority queue. At equal times departures are processed first, so a lane that frees up
          at exactly that moment is open to the arriving customer. Customer <Tex>{'i'}</Tex> occupies lane <Tex>{'s'}</Tex> for:
        </p>
        <Tex block>{'B_i = \\underbrace{(1+\\delta\\,\\mathbb 1_{\\text{shared}})\\,T_i}_{\\text{scanning}} + \\underbrace{C_i}_{\\text{changeover}} + \\underbrace{w_s\\,\\mathbb 1_{\\text{shared, waited}}}_{\\text{walk to lane}}'}</Tex>
        <p>
          With separate lines a customer joins lane <Tex>{'\\arg\\min_s (q_s + b_s)'}</Tex> at that moment (people in line plus people at the lane; ties broken at random).
          They count people, not items; Lu et al. (2013) showed customers really do decide this way. Waiting ends when the customer reaches the lane:
          {' '}<Tex>{'W_i = \\text{start}_i - \\text{arrival}_i'}</Tex>.
        </p>
      </section>

      <section aria-labelledby="m-field">
        <h2 id="m-field">Field effects of a shared line</h2>
        <p>
          <strong>Walk</strong> (<code>sim/src/field.ts</code>): an L-shaped path from the head of the line to lane <Tex>{'s'}</Tex>, minus the step a separate-line customer
          takes anyway, at cart speed <Tex>{`v = ${CART_SPEED.toFixed(1)}`}</Tex> m/s plus a noticing time <Tex>{`t_0 = ${NOTICE_SECONDS.toFixed(0)}`}</Tex> s. Distances come from the 3D scene geometry:
        </p>
        <Tex block>{'w_s = \\frac{|x_s - x_h| + |z_s - z_h| - d_0}{v} + t_0'}</Tex>
        <p>
          <strong>Slowdown</strong>: <Tex>{`\\delta = ${POOLED_SLOWDOWN.toFixed(4)}`}</Tex>, the net effect Wang and Zhou (2018) measured by comparing both layouts in the same store.
        </p>
        <p>Why does this matter more under heavy load? Since the walk only applies to customers who waited, the effective load per lane rises roughly to:</p>
        <Tex block>{"\\rho' \\approx \\frac{\\lambda}{c}\\Big((1+\\delta)\\,\\mathbb E[T] + \\mathbb E[C] + \\Pr(W>0)\\,\\bar w\\Big)"}</Tex>
        <p>
          Because waiting grows like <Tex>{'1/(1-\\rho)'}</Tex>, a few percentage points that are harmless at <Tex>{'\\rho = 0.6'}</Tex> multiply the wait
          at <Tex>{'\\rho = 0.9'}</Tex> (Kingman, 1961). That increase eats the shared line’s theoretical advantage.
        </p>
      </section>

      <section aria-labelledby="m-theory">
        <h2 id="m-theory">Testing against theory</h2>
        <p>Where a closed-form answer exists, the engine is compared with it (<code>sim/tests/</code>). With <Tex>{'c'}</Tex> lanes and load <Tex>{'a = \\lambda/\\mu'}</Tex>, Erlang-C:</p>
        <Tex block>{'\\Pr(W>0) = C(c,a) = \\frac{\\dfrac{a^c}{c!}\\dfrac{c}{c-a}}{\\displaystyle\\sum_{k=0}^{c-1}\\frac{a^k}{k!} + \\frac{a^c}{c!}\\frac{c}{c-a}},\\qquad \\mathbb E[W] = \\frac{C(c,a)}{c\\mu - \\lambda}'}</Tex>
        <p>Pollaczek–Khinchine for a single lane with general service times, and Little’s law in every run:</p>
        <Tex block>{'\\mathbb E[W]_{M/G/1} = \\frac{\\lambda\\,\\mathbb E[S^2]}{2(1-\\rho)},\\qquad L = \\lambda\\,W'}</Tex>
      </section>

      <section aria-labelledby="m-compare">
        <h2 id="m-compare">Comparing layouts</h2>
        <p>
          In each replication every layout sees the same stream of customers (common random numbers). The difference is therefore estimated as a paired sample;
          the positive covariance between the two runs shrinks the variance of the difference:
        </p>
        <Tex block>{'D_r = \\bar W^{\\text{shared}}_r - \\bar W^{\\text{separate}}_r,\\qquad \\bar D \\pm t_{0.975,\\,R-1}\\frac{s_D}{\\sqrt R},\\qquad \\operatorname{Var}(D) = \\operatorname{Var}(A) + \\operatorname{Var}(B) - 2\\operatorname{Cov}(A,B)'}</Tex>
        <p>If the interval contains zero, the interface says there is no clear difference.</p>
      </section>

      <section aria-labelledby="m-validation">
        <h2 id="m-validation">Out-of-time validation and the surrogate model</h2>
        <p>
          Three periods (Dec 2017, Feb 2019, Mar–Apr 2019). In each fold the parameters are learned from the training periods only; if the test period leaks into
          training, the code stops with a “LEAK” error. Each hourly window is simulated 300 times. With the real value <Tex>{'y'}</Tex>, the simulated median <Tex>{'\\hat y'}</Tex> and its 90% interval:
        </p>
        <Tex block>{'\\text{bias} = \\tfrac1n\\sum \\frac{\\hat y - y}{y},\\qquad \\text{MAPE} = \\tfrac1n\\sum\\Big|\\frac{\\hat y - y}{y}\\Big|,\\qquad \\text{coverage} = \\tfrac1n\\sum \\mathbb 1\\big[y\\in[\\hat y_{0.05},\\hat y_{0.95}]\\big]'}</Tex>
        <p>
          The staffing plan is computed instantly with gradient-boosted trees trained on a 12,000-scenario sweep of the simulator (with monotone constraints:
          more lanes can never mean a longer wait). For each hour, the fewest lanes that meet the target:
        </p>
        <Tex block>{'c^* = \\min\\{\\,c \\le 10 : \\hat P_{90}(c) \\le \\tau,\\ \\rho(c) < 0.98\\,\\}'}</Tex>
        <p>Each recommendation can be re-checked in the browser with the real simulator.</p>
      </section>

      <section aria-labelledby="m-refs">
        <h2 id="m-refs">References</h2>
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
