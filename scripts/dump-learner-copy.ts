import { readFileSync, writeFileSync } from 'node:fs'
import { Window } from 'happy-dom'
import { LEVELS } from '../content/levels'
import { SCRIPT_LEVELS } from '../content/script/levels'
import { landing } from '../src/landing/copy'
import { chrome } from '../src/ui/copy'

/** The landing page's static words, read out of index.html. */
function landingLines(): string[] {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf-8')
  const window = new Window()
  const { document } = window
  document.body.innerHTML = html.slice(html.indexOf('<body>'), html.indexOf('</body>'))
  const picked = document.querySelectorAll('h1, h2, h3, .lede, .caption, .signin-label, .close-copy .btn, .footer')
  const seen = new Set<string>()
  const lines: string[] = []
  for (const el of picked) {
    const line = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (line && !seen.has(line)) {
      seen.add(line)
      lines.push(line)
    }
  }
  void window.happyDOM.close()
  return lines
}

const lines = [
  '# Learner copy',
  '',
  '## Voice',
  ...LEVELS.flatMap((l) => [`### ${l.n} ${l.title}`, l.blurb, '']),
  '## Script',
  ...SCRIPT_LEVELS.flatMap((l) => [`### ${l.n} ${l.title}`, l.blurb, '']),
  '## Chrome',
  '',
  ...Object.values(chrome).flatMap((line) => [line, '']),
  '## Landing',
  '',
  ...landingLines().flatMap((line) => [line, '']),
  ...Object.values(landing).flatMap((line) => [line, '']),
]

const out = new URL('../content/.learner-copy.md', import.meta.url)
writeFileSync(out, lines.join('\n'))
console.log(`wrote ${out.pathname}`)
