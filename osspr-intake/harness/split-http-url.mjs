/**
 * Baseline for splitHttpUrlCandidate.
 *
 * Workload: a long presigned CDN URL (no spaces) with a trailing ")" the
 * way a chat sentence captures it: "(see https://cdn...sig)". Counting
 * bracket balance does Array.from on every code unit of that URL, twice,
 * then filters. The returned url/trail stay slices of the input.
 */
import { splitHttpUrlCandidate } from '../../src/lib/markdownUrls.ts'
import { requireGc, summarize } from './stats.mjs'

requireGc()

const url = 'https://cdn.cumora.ai/uploads/attachments/'
  + 'a'.repeat(48_000)
  + '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature='
  + 'b'.repeat(64)
  + ')'

global.gc()
const expected = splitHttpUrlCandidate(url)
if (expected.trail !== ')' || expected.url.length !== url.length - 1) {
  throw new Error(`unexpected split: trail=${JSON.stringify(expected.trail)} url=${expected.url.length}`)
}

const samples = []
for (let i = 0; i < 5; i++) {
  global.gc()
  const before = process.memoryUsage().heapUsed
  const split = splitHttpUrlCandidate(url)
  const after = process.memoryUsage().heapUsed
  if (split.url !== expected.url || split.trail !== expected.trail) {
    throw new Error('splitHttpUrlCandidate result drifted')
  }
  samples.push(after - before)
}

const summary = summarize(samples)
console.log(JSON.stringify({
  function: 'splitHttpUrlCandidate',
  input_chars: url.length,
  url_chars: expected.url.length,
  unit: 'bytes',
  ...summary,
}))
