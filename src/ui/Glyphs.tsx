import { SYSTEM_SUMMARY, TONE_MARKS, VOWEL_BASES } from '@content/system'

const MARKS = ['', TONE_MARKS.low, TONE_MARKS.falling, TONE_MARKS.high, TONE_MARKS.rising]

export function Glyphs() {
  const vowels = [...VOWEL_BASES, 'ụ']
  return (
    <main className="page glyphs">
      <h1>Glyphs</h1>
      <p className="lede">If a cell looks broken, Charis SIL is not stacking that mark.</p>
      <table className="tbl glyphs-tbl">
        <thead>
          <tr>
            <th></th>
            <th>mid</th>
            <th>low</th>
            <th>falling</th>
            <th>high</th>
            <th>rising</th>
          </tr>
        </thead>
        <tbody>
          {vowels.map((v) => (
            <tr key={v}>
              <td className="rom">{v}</td>
              {MARKS.map((m) => (
                <td key={m || 'mid'} className="rom">
                  {(v.normalize('NFD') + m).normalize('NFC')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <h2>System</h2>
      <ul className="preview">
        {SYSTEM_SUMMARY.tones.map((row) => (
          <li key={row.name}>
            <span className="rom">{row.mark}</span>
            <span>{row.hint}</span>
          </li>
        ))}
        {[...SYSTEM_SUMMARY.vowels, ...SYSTEM_SUMMARY.consonants].map((row) => (
          <li key={row.rom}>
            <span className="rom">{row.rom}</span>
            <span>{row.hint}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
