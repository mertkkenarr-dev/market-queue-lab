/**
 * Closed-form queueing results the simulator is validated against.
 * All rates share one time unit; a = lambda/mu is the offered load.
 */

/** Erlang-B blocking probability, via the numerically stable recursion. */
export function erlangB(servers: number, offeredLoad: number): number {
  let b = 1
  for (let k = 1; k <= servers; k++) {
    b = (offeredLoad * b) / (k + offeredLoad * b)
  }
  return b
}

/** Erlang-C: probability an arriving customer must wait in an M/M/c queue. */
export function erlangC(servers: number, offeredLoad: number): number {
  const rho = offeredLoad / servers
  if (rho >= 1) return 1
  const b = erlangB(servers, offeredLoad)
  return b / (1 - rho * (1 - b))
}

export interface QueueMetrics {
  rho: number
  probWait: number
  meanWait: number
  meanQueueLength: number
  meanSojourn: number
  meanInSystem: number
}

export function mmc(lambda: number, mu: number, servers: number): QueueMetrics {
  const a = lambda / mu
  const rho = a / servers
  if (rho >= 1) throw new Error(`M/M/${servers} unstable: rho=${rho.toFixed(3)} >= 1`)
  const probWait = erlangC(servers, a)
  const meanWait = probWait / (servers * mu - lambda)
  return {
    rho,
    probWait,
    meanWait,
    meanQueueLength: lambda * meanWait,
    meanSojourn: meanWait + 1 / mu,
    meanInSystem: lambda * (meanWait + 1 / mu),
  }
}

/** Pollaczek-Khinchine mean wait for M/G/1 with service mean and variance given. */
export function mg1(lambda: number, serviceMean: number, serviceVariance: number): QueueMetrics {
  const rho = lambda * serviceMean
  if (rho >= 1) throw new Error(`M/G/1 unstable: rho=${rho.toFixed(3)} >= 1`)
  const secondMoment = serviceVariance + serviceMean * serviceMean
  const meanWait = (lambda * secondMoment) / (2 * (1 - rho))
  return {
    rho,
    probWait: rho,
    meanWait,
    meanQueueLength: lambda * meanWait,
    meanSojourn: meanWait + serviceMean,
    meanInSystem: lambda * (meanWait + serviceMean),
  }
}

/**
 * Allen-Cunneen approximation for M/G/c: scales the M/M/c wait by
 * (1 + cs^2)/2. An approximation, not an identity — never used as a hard test.
 */
export function mgcApprox(
  lambda: number,
  serviceMean: number,
  serviceVariance: number,
  servers: number,
): number {
  const cs2 = serviceVariance / (serviceMean * serviceMean)
  return mmc(lambda, 1 / serviceMean, servers).meanWait * ((1 + cs2) / 2)
}
