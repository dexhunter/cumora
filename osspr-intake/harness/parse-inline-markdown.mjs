/**
 * Baseline for parseInlineMarkdown.
 *
 * Workload: one 100_000-character agent document paragraph made of
 * snake_case identifiers. That is the input the underscore rules exist
 * for (user_id, order_id, config_path) and the shape a pasted spec takes
 * when it arrives as a single block. No emphasis markers succeed, so the
 * result is one text node whose text is the input.
 *
 * The scanner still indexOf-searches the remainder for every other
 * delimiter at each underscore, which is quadratic in paragraph length.
 */
import { parseInlineMarkdown } from '../../server/src/documents/markdown.ts'
import { summarize } from './stats.mjs'

const UNIT = 'call user_id and order_id then read config_path from env_file before writing cache_key. '
const TARGET = 100_000

function paragraph(target) {
  let text = ''
  while (text.length < target) text += UNIT
  return text.slice(0, target)
}

const text = paragraph(TARGET)

function check(nodes) {
  if (nodes.length !== 1 || nodes[0].type !== 'text' || nodes[0].text !== text) {
    throw new Error(`unexpected parse shape: ${nodes.length} nodes`)
  }
}

check(parseInlineMarkdown(text))
check(parseInlineMarkdown(text))

const samples = []
for (let i = 0; i < 5; i++) {
  const start = performance.now()
  const nodes = parseInlineMarkdown(text)
  samples.push(performance.now() - start)
  check(nodes)
}

const summary = summarize(samples)
console.log(JSON.stringify({
  function: 'parseInlineMarkdown',
  workload_chars: text.length,
  unit: 'ms',
  ...summary,
}))
