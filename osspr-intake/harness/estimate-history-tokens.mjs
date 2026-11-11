/**
 * Baseline for estimateHistoryTokens.
 *
 * Workload: one user message plus 12 bash tool calls, each with its own
 * 128KiB shell transcript. Compaction calls this on every shrink step, and
 * each call JSON.stringifies every item — a second full copy of those
 * transcripts — before counting code units. The return value is only the
 * integer token estimate. 12×128KiB is large enough to show that copy and
 * still small enough that a young-gen GC does not reclaim it mid-call, so
 * the heap delta is the temporary JSON itself.
 */
import { estimateHistoryTokens } from '../../server/src/agents/turn-compaction.ts'
import { requireGc, summarize } from './stats.mjs'

requireGc()

const TRANSCRIPT_BYTES = 128 * 1024
const PAIRS = 12
const LINE = 'stdout user_id=42 order_id=7 path=/var/log/app.log status=ok\n'
const transcript = LINE.repeat(Math.ceil(TRANSCRIPT_BYTES / LINE.length)).slice(0, TRANSCRIPT_BYTES)

const history = [
  { type: 'message', role: 'user', content: 'Investigate the outage. Read the log and keep the relevant lines.' },
]
for (let i = 0; i < PAIRS; i++) {
  history.push({
    type: 'function_call',
    call_id: `call_${i}`,
    name: 'bash',
    arguments: '{"command":"sed -n 1,400p /var/log/app.log"}',
  })
  // Real transcripts differ per call. A shared string would let V8 reclaim
  // the JSON copies mid-loop and hide the peak this benchmark is measuring.
  history.push({
    type: 'function_call_output',
    call_id: `call_${i}`,
    output: `${transcript}\n# call ${i}`,
  })
}

global.gc()
const warmup = estimateHistoryTokens(history)
if (warmup < TRANSCRIPT_BYTES / 4) {
  throw new Error(`token estimate ${warmup} is far below the transcript size`)
}

const samples = []
let tokens = 0
for (let i = 0; i < 5; i++) {
  global.gc()
  const before = process.memoryUsage().heapUsed
  tokens = estimateHistoryTokens(history)
  const after = process.memoryUsage().heapUsed
  samples.push(after - before)
}

if (tokens !== warmup) {
  throw new Error(`token estimate drifted: ${warmup} vs ${tokens}`)
}

const summary = summarize(samples)
console.log(JSON.stringify({
  function: 'estimateHistoryTokens',
  tokens,
  pairs: PAIRS,
  transcript_bytes: TRANSCRIPT_BYTES,
  unit: 'bytes',
  ...summary,
}))
