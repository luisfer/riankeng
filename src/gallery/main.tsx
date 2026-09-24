import { createRoot } from 'react-dom/client'
import { DEMO, QUIET, sceneSrc } from '@/landing/demo'

/* The contact sheets are left out at the import, not after it, so they never enter the build. */
const candidateUrls = import.meta.glob(['../../art/candidates/*.png', '!../../art/candidates/*sheet.png'], {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const candidates = Object.entries(candidateUrls)
  .map(([path, url]) => {
    const file = path.split('/').pop() ?? path
    return { file, url }
  })
  .sort((a, b) => a.file.localeCompare(b.file))

function Panel(props: { src: string; alt: string; caption: string; extra?: string }) {
  return (
    <li>
      <figure>
        <img src={props.src} alt={props.alt} width={980} height={980} />
        <figcaption>
          <span className="stem">{props.caption}</span>
          {props.extra && <span className="thai">{props.extra}</span>}
        </figcaption>
      </figure>
    </li>
  )
}

function Gallery() {
  return (
    <main>
      <h1>Gallery</h1>
      <p className="lede">Not linked from the site.</p>

      <h2>With a balloon</h2>
      <ul className="grid">
        {DEMO.map((d) => (
          <Panel key={d.stem} src={sceneSrc(d.stem)} alt={d.alt} caption={`${d.stem}. ${d.en}`} extra={d.balloon.lines.join(' ')} />
        ))}
      </ul>

      <h2>No balloon</h2>
      <ul className="grid">
        {QUIET.map((q) => (
          <Panel key={q.stem} src={sceneSrc(q.stem)} alt={q.alt} caption={q.stem} extra={q.alt} />
        ))}
      </ul>

      <h2>Candidates</h2>
      <ul className="grid">
        {candidates.map((c) => (
          <Panel key={c.file} src={c.url} alt={c.file} caption={c.file.replace(/\.png$/, '')} />
        ))}
      </ul>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Gallery />)
