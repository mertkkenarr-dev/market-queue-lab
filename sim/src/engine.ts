import { Fifo, MinHeap } from './heap'
import { Random } from './random'
import { quantileSorted } from './stats'

export interface Customer {
  id: number
  arrival: number
  /** Service time is fixed when the customer is generated, so the same stream replays identically under any layout. */
  service: number
}

export type Layout = 'pooled' | 'separate-random' | 'separate-jsq'

export interface TraceRecord {
  id: number
  arrival: number
  start: number
  end: number
  server: number
}

export interface SimConfig {
  servers: number
  layout: Layout
  /** Customers arriving before this time are simulated but not measured. */
  warmup: number
  /** Measurement window is [warmup, horizon). The system is drained after the last arrival. */
  horizon: number
  routingSeed?: number
  /** Report the share of measured customers who waited at most each threshold. */
  waitThresholds?: readonly number[]
  /** Record every customer's journey (for invariant tests and animation replay). */
  trace?: boolean
}

export interface SimResult {
  generated: number
  served: number
  measured: number
  arrivalRate: number
  meanWait: number
  meanSojourn: number
  probWait: number
  waitP50: number
  waitP90: number
  waitP95: number
  waitP99: number
  meanQueueLength: number
  meanInSystem: number
  utilization: number
  serverUtilization: number[]
  maxQueueLength: number
  fractionWaitingAtMost: number[]
  trace?: TraceRecord[]
}

interface Departure {
  time: number
  server: number
}

const EPS = 1e-12

/**
 * Discrete-event simulation of c identical servers fed by a fixed customer stream.
 * Ties go to departures first: a server that frees at the instant someone arrives
 * is available to them.
 */
export function simulate(customers: readonly Customer[], cfg: SimConfig): SimResult {
  const { servers: c, layout, warmup: w0, horizon: w1 } = cfg
  if (!Number.isInteger(c) || c < 1) throw new Error(`servers must be a positive integer, got ${c}`)
  if (!(w1 > w0)) throw new Error('horizon must exceed warmup')
  for (let i = 1; i < customers.length; i++) {
    if ((customers[i] as Customer).arrival < (customers[i - 1] as Customer).arrival) {
      throw new Error('customers must be sorted by arrival time')
    }
  }

  const rng = new Random(cfg.routingSeed ?? 1)
  const pooled = layout === 'pooled'
  const queues: Fifo<Customer>[] = Array.from({ length: pooled ? 1 : c }, () => new Fifo<Customer>())
  const busy: boolean[] = new Array<boolean>(c).fill(false)
  const busyTime: number[] = new Array<number>(c).fill(0)
  const departures = new MinHeap<Departure>((a, b) =>
    a.time !== b.time ? a.time < b.time : a.server < b.server,
  )

  let busyCount = 0
  let waiting = 0
  let maxQueue = 0
  let last = 0
  let areaQueue = 0
  let areaSystem = 0
  const waits: number[] = []
  const trace: TraceRecord[] | undefined = cfg.trace ? [] : undefined
  let sojournSum = 0
  let served = 0

  const advance = (t: number): void => {
    const a = Math.max(last, w0)
    const b = Math.min(t, w1)
    if (b > a) {
      areaQueue += waiting * (b - a)
      areaSystem += (waiting + busyCount) * (b - a)
    }
    last = t
  }

  const startService = (server: number, customer: Customer, t: number): void => {
    busy[server] = true
    busyCount++
    const end = t + customer.service
    departures.push({ time: end, server })
    const overlap = Math.min(end, w1) - Math.max(t, w0)
    if (overlap > 0) busyTime[server] = (busyTime[server] as number) + overlap
    served++
    trace?.push({ id: customer.id, arrival: customer.arrival, start: t, end, server })
    if (customer.arrival >= w0 && customer.arrival < w1) {
      waits.push(t - customer.arrival)
      sojournSum += end - customer.arrival
    }
  }

  const load = (s: number): number => (queues[s] as Fifo<Customer>).length + (busy[s] ? 1 : 0)

  const onArrival = (customer: Customer): void => {
    const t = customer.arrival
    if (pooled) {
      const idle = busy.indexOf(false)
      if (idle >= 0) {
        startService(idle, customer, t)
      } else {
        ;(queues[0] as Fifo<Customer>).push(customer)
        waiting++
      }
    } else {
      let target: number
      if (layout === 'separate-random') {
        target = rng.int(c)
      } else {
        let best = Infinity
        const ties: number[] = []
        for (let s = 0; s < c; s++) {
          const l = load(s)
          if (l < best) {
            best = l
            ties.length = 0
            ties.push(s)
          } else if (l === best) {
            ties.push(s)
          }
        }
        target = ties.length === 1 ? (ties[0] as number) : (ties[rng.int(ties.length)] as number)
      }
      if (!busy[target]) {
        startService(target, customer, t)
      } else {
        ;(queues[target] as Fifo<Customer>).push(customer)
        waiting++
      }
    }
    if (waiting > maxQueue) maxQueue = waiting
  }

  const onDeparture = (server: number, t: number): void => {
    busy[server] = false
    busyCount--
    const next = (queues[pooled ? 0 : server] as Fifo<Customer>).shift()
    if (next) {
      waiting--
      startService(server, next, t)
    }
  }

  let i = 0
  while (i < customers.length || departures.size > 0) {
    const nextArrival = i < customers.length ? (customers[i] as Customer).arrival : Infinity
    const nextDeparture = departures.peek()?.time ?? Infinity
    if (nextDeparture <= nextArrival) {
      const d = departures.pop() as Departure
      advance(d.time)
      onDeparture(d.server, d.time)
    } else {
      const customer = customers[i++] as Customer
      advance(customer.arrival)
      onArrival(customer)
    }
  }
  advance(w1)

  const sorted = Float64Array.from(waits).sort()
  const measured = waits.length
  const window = w1 - w0
  const thresholds = cfg.waitThresholds ?? []
  const waited = sorted.reduce((n, v) => n + (v > EPS ? 1 : 0), 0)
  return {
    generated: customers.length,
    served,
    measured,
    arrivalRate: measured / window,
    meanWait: measured ? waits.reduce((a, b) => a + b, 0) / measured : Number.NaN,
    meanSojourn: measured ? sojournSum / measured : Number.NaN,
    probWait: measured ? waited / measured : Number.NaN,
    waitP50: quantileSorted(sorted, 0.5),
    waitP90: quantileSorted(sorted, 0.9),
    waitP95: quantileSorted(sorted, 0.95),
    waitP99: quantileSorted(sorted, 0.99),
    meanQueueLength: areaQueue / window,
    meanInSystem: areaSystem / window,
    utilization: busyTime.reduce((a, b) => a + b, 0) / (c * window),
    serverUtilization: busyTime.map((b) => b / window),
    maxQueueLength: maxQueue,
    ...(trace ? { trace } : {}),
    fractionWaitingAtMost: thresholds.map((th) =>
      measured ? sorted.reduce((n, v) => n + (v <= th + EPS ? 1 : 0), 0) / measured : Number.NaN,
    ),
  }
}
