import type { ValidationCopy } from './validation.types'

export const validationEn: ValidationCopy = {
  title: 'How well does the model match reality?',
  intro: 'There are two separate questions, and I tried not to mix them up. Does the engine reproduce what queueing theory knows exactly? And does the store model learned from data capture the real store in a period it has never seen?',
  callout: 'The biggest limit: the data only contains customers who were served; waiting time and queue length were never measured. Waiting results therefore cannot be compared with reality directly. The closest evidence is the cashier’s gap between two customers (second section).',
  theory: {
    title: 'Does the engine match queueing theory?',
    body: 'The mean wait in a shared line (M/M/c) is compared with the closed-form Erlang-C formula. Three lane counts, load from 0.3 to 0.9, each point 40 long runs.',
  },
  gaps: {
    title: 'Cashier gaps: an indirect trace of waiting',
    body: (n) => (
      <>
        If someone is already in line, the cashier moves straight on to the next customer; if not, the gap grows. The share of short gaps therefore shows how busy the
        lanes were, and indirectly how much people waited. The model reproduces this distribution in a period it never saw during training
        {n.gapMape && n.gapCoverage ? <> (mean absolute error in the hourly share of short gaps {n.gapMape}, 90% interval coverage {n.gapCoverage})</> : null}.
      </>
    ),
    scatterTitle: (sec) => `Hour by hour: share of gaps shorter than ${sec} s`,
    honest: (n) => <>Read honestly: the overall distribution matches very well, but the model’s ability to tell hours apart is limited (correlation {n.gapCorr}). It predicts that an hour behaves like the average store well, and which hour will be unusual poorly.</>,
    bug: (n) => (
      <>
        This test also found a measurement mistake of mine. In the first version I estimated open lanes as “distinct cashiers who rang something up in a 15-minute block”,
        which gave {n.lanesProxy} lanes on average. Measured from the cashiers’ sign-in and lock records, the real value is {n.lanesLogs}. With the old count the simulation saw
        the lanes as emptier than they were and predicted 58% short gaps (real: 79%). After the fix, the occupancy error dropped from 9.5% to 6.5%.
      </>
    ),
  },
  holdout: {
    title: 'Does it capture the real store in a period it has never seen?',
    body: 'The data covers three separate periods. Parameters are learned only from the training periods; the test period is never seen at any stage (the code guards against leakage). Three folds: P1→P2, P1+P2→P3, P2→P3.',
    after: 'Service time, occupancy and cashier gaps match within 6–9%. Customer counts are very sensitive to level shifts between periods: training on December (P1) over-predicts February (P2) by 47%. That is a limit of learning more than a model error; a seasonal level cannot be learned from three periods. This is why the model on this site is trained on the 2019 periods only.',
    scatters: { service: 'Mean service time', occupancy: 'Lane utilisation (hours with a stable lane count)', count: 'Customers per hour (forecast from training only)', basket: 'Mean basket' },
    fine: 'Scatter plots are for the P1+P2→P3 fold. Each point is one hourly window; the vertical line is the simulated 90% interval.',
  },
  recal: {
    title: 'How much does fresh data help?',
    body: 'Only two scale factors, for service speed and traffic, were learned from the first 3 days of the test period; scoring uses the remaining days.',
    after: 'When the shift is large the gain is clear; when it is small there is no gain or a slight loss. Three days are a noisy sample for estimating a scale.',
  },
  ml: {
    title: 'What do the learning models add?',
    body: (n) => <>The surrogate reaches the simulator’s own noise floor and is clearly better than the Erlang-C formula (R²: mean wait {n.r2Mean}, P90 {n.r2P90}). The formula assumes exponential service times and a single line; real service times and the changeover do not fit that.</>,
    arrival: 'On forecasting arrivals I want to be honest about machine learning: the Poisson GBM looks better than the profile in the P1+P2→P3 fold, but that comes from the model listening more to the recent, similar period. When the level stays the same (P2→P3), it is no better than the simple profile.',
  },
  limits: {
    title: 'Limits',
    items: [
      'There is no real waiting-time data. Waiting results rest on theory and on cashier gaps.',
      'The two costs of a shared line are assumptions: a walking speed of 1 m/s and a 6.86% slowdown measured in a different store. The project page shows at which slowdown the result flips.',
      'A separate-line customer unloading onto the belt while the person ahead is scanned is not modelled. This simplification favours the shared line.',
      'Each hour is simulated at a constant rate with a 30-minute warm-up; a real queue carries over from one hour to the next.',
      'Leaving the line, switching lines and express lanes were not observed in the data and are not in the model.',
      'The data comes from three periods at a single store; there is no claim that it generalises to other stores.',
    ],
  },
}
