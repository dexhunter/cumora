/** Median and full-spread noise for a list of numeric samples. */
export function summarize(samples) {
  if (samples.length < 5) {
    throw new Error(`need at least 5 samples, got ${samples.length}`)
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
  const noisePct = ((sorted[sorted.length - 1] - sorted[0]) / median) * 100
  return { samples, median, noise_pct: noisePct }
}

export function requireGc() {
  if (typeof global.gc !== 'function') {
    console.error('peak-memory harness requires node --expose-gc')
    process.exit(2)
  }
}
