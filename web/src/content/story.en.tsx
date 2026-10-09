import type { StoryCopy } from './story.types'

export const storyEn: StoryCopy = {
  hero: {
    title: 'One shared line, or a line for every checkout?',
    lede: 'Queueing theory has a clear answer: one shared line. I built a simulation from a real supermarket’s checkout records to test that answer. Once two small details the theory leaves out are added, the answer flips during the store’s busy hours.',
    key: (lanes, customers) => `Friday 17:00, ${lanes} lanes, the same ${customers} customers. Each bar is a customer; its length is how long they waited.`,
    toggleAria: 'Shared-line model',
    separate: 'Separate lines, mean wait',
    pooled: (textbook) => `One shared line${textbook ? ' (textbook)' : ''}, mean wait`,
    perCustomer: 'per customer',
    watch: 'Watch it in the store',
    validate: 'How I validated it',
  },
  problem: {
    title: 'Theory says one line, supermarkets build many',
    body: (
      <>
        <p>
          When every checkout has its own line, one cashier can sit idle while people wait at the next lane. A single shared line rules that out: the first
          lane to free up takes the next person. With the same lanes and the same customers, a shared line therefore shortens the average wait, which is why
          banks and airports use one. Most supermarkets still put a separate line at every checkout.
        </p>
        <p>
          I wanted to know who is missing something: the supermarkets or the theory. It is a small question with a real business decision behind it.
          How many lanes to open and how to arrange the line set both staffing cost and how long customers spend at the checkout.
        </p>
      </>
    ),
  },
  approach: {
    title: 'How I approached it',
    steps: [
      <><strong>A customer model from data.</strong> From 163,000 checkout transactions over three periods at a supermarket in Poland, I learned basket sizes, payment types, scanning time per item and the hour-by-hour flow of customers.</>,
      <><strong>A simulation engine.</strong> I wrote a discrete-event simulation that computes when every customer arrives, waits, is scanned and leaves. The same stream of customers is replayed under every layout, so differences come from the layout, not from luck.</>,
      <><strong>Two separate tests.</strong> I checked the engine against exact queueing formulas, and the customer model against records from a period it had never seen.</>,
      <><strong>What the theory leaves out.</strong> I added effects I found in the records and in the literature, then measured how much the result depends on each assumption.</>,
    ],
    reproducible: <>Every number on this page can be regenerated from the raw data with a single command; the code and tests are open.</>,
  },
  changeover: {
    title: 'The gap between customers is not idle time',
    body: (n) => (
      <>
        <p>
          The records also hold the time between a cashier finishing one transaction and starting the next. It is almost the same whether the store is quiet
          or packed: about 16 seconds at the median. So this is not idle time. It is closing the payment, bagging and the next basket reaching the belt, a
          “changeover” that comes with every customer. Textbook models leave it out.
        </p>
        <p>
          I added the changeover to the model and tested it against records from a period the model had never seen. {n.gapReal} of real gaps are shorter than {n.gapSec} seconds;
          the simulation gives {n.gapSim}. Waiting time was never recorded in the data, so this is the closest trace of how busy the lanes really were.
        </p>
      </>
    ),
    aside: (n) => (
      <>
        This test also caught one of my own mistakes. I first estimated the number of open lanes as “cashiers who rang something up in a 15-minute block”.
        Measured from the cashiers’ sign-in and lock records, the average was {n.lanesLogs} open lanes, not {n.lanesProxy}. With the old count the simulation saw the lanes as emptier than they were.
      </>
    ),
  },
  field: {
    title: 'Two hidden costs of a shared line',
    body: (n) => (
      <>
        <p>
          <strong>The walk.</strong> With separate lines the next customer is already at the belt, unloading. With a shared line they have to notice which lane
          freed up and push their cart over, while that lane sits idle. With 5 open lanes the walk takes {n.walkMin}–{n.walkMax} seconds depending on the lane,
          using the distances in the 3D scene and a cart speed of 1 m/s.
        </p>
        <p>
          <strong>The slowdown.</strong> Wang and Zhou (2018) observed the same supermarket under both layouts: with a shared line, cashiers worked {n.slowdown} slower on average.
          When the line in front of them is not “theirs”, cashiers hurry less; the literature calls this social loafing.
        </p>
        <p>
          With both effects in, the picture changes: with 5 lanes, separate lines wait less once occupancy passes about {n.flip}. In half of this store’s hours,
          occupancy is between {n.occP25} and {n.occP75}, so the store runs right where separate lines come out ahead.
        </p>
      </>
    ),
    fine: 'Each point is 200 paired replications on the same customer streams; the band is the 95% confidence interval. 5 open lanes, Friday-evening basket mix.',
  },
  breakEven: {
    title: 'What if the slowdown estimate does not fit this store?',
    body: (
      <p>
        The 6.9% slowdown comes from a different store in a different country; it cannot be measured in this data, because this store always used separate lines.
        So I asked the question the other way round: how much can cashiers slow down before the shared line stops winning? In a quiet store there is room for more
        than 10%. Above 80% occupancy the walk alone erases the advantage; separate lines stay ahead even with no slowdown at all.
      </p>
    ),
  },
  store: {
    title: 'What it means for this store',
    body: (n) => (
      <>
        <p>
          With the number of lanes the store actually opened, the simulation estimates that lanes were busy {n.occMed} of the time and that {n.probWaitMed} of
          customers had to wait. In a typical hour, 90% of customers waited up to {n.p90Med}; in {n.p90Over2} of hours that went above 2 minutes.
        </p>
        <p>
          If the goal were “90% of customers wait under 2 minutes”, the <a href="#/kasa">How many lanes?</a> page works out the lanes needed hour by hour and checks every
          recommendation in the simulator. You can try your own scenario in the <a href="#/lab">lab</a>, in the 3D store.
        </p>
      </>
    ),
  },
  limits: {
    title: 'What this does not show, and what is next',
    intro: (
      <p>
        The engine reproduces exact queueing results within ±1.3%, and the customer model matches service time, occupancy and cashier gaps in an unseen period
        with roughly 6–9% error. Some limits still bear directly on the conclusion:
      </p>
    ),
    items: [
      <>Waiting time is not in the data. Waiting results rest on theory and on the cashier gaps; they cannot be compared with measured waits.</>,
      <>The walking speed and the slowdown are assumptions. Both can be switched off in the lab, and the break-even chart shows where the result changes.</>,
      <>I did not model a separate-line customer unloading onto the belt while the person ahead is being scanned. This simplification favours the shared line.</>,
      <>The data covers three periods at a single store; I am not making a general claim about other stores.</>,
    ],
    nextTitle: 'What I would like to do next:',
    next: [
      <>Simulate a whole day continuously and test operating rules such as “open a lane when the line passes N people”.</>,
      <>Add speed differences between cashiers (the data identifies each cashier).</>,
      <>Study an express lane (≤N items) and the right item limit.</>,
      <>Most importantly, check the result against real waiting times measured with cameras or sensors.</>,
    ],
    closing: <>This is not a final answer. It tries to show under which conditions the textbook answer holds, and under which it does not.</>,
    links: { validation: 'Full validation', method: 'Maths and method' },
  },
}
