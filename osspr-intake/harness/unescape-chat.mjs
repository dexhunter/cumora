/**
 * Baseline for unescapeChat.
 *
 * Workload: a ~300KB `cumora reply` body. The shell preserved literal
 * backslash escapes (`\n`, `\"`, `\\`), which is the case this function
 * exists to undo. String.replace with a per-match callback allocates a
 * match record for every escape on top of the decoded string.
 */
import { unescapeChat } from '../../server/src/agents/cli-parse.ts'
import { requireGc, summarize } from './stats.mjs'

requireGc()

const UNIT = '{\\"k\\":\\"v\\",\\"n\\":\\"line\\\\nnext\\"}'
const TARGET = 300_000
let body = ''
while (body.length < TARGET) body += UNIT
body = body.slice(0, TARGET)

global.gc()
const expected = unescapeChat(body)
if (expected.length >= body.length) {
  throw new Error('expected escapes to shrink the body')
}

const samples = []
for (let i = 0; i < 5; i++) {
  global.gc()
  const before = process.memoryUsage().heapUsed
  const decoded = unescapeChat(body)
  const after = process.memoryUsage().heapUsed
  if (decoded !== expected) throw new Error('unescapeChat result drifted')
  samples.push(after - before)
}

const summary = summarize(samples)
console.log(JSON.stringify({
  function: 'unescapeChat',
  input_chars: body.length,
  output_chars: expected.length,
  unit: 'bytes',
  ...summary,
}))
