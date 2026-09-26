import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { getEntry } from '@content/index'
import { prefetchClip } from '@/audio/clips'
import { speakThai } from '@/audio/tts'
import { DEMO, NIGHT, sceneSrc, sceneSrcSet } from '@/landing/demo'
import type { ProgressDoc } from '@/storage/progress-schema'
import { HearBtn } from './bits'
import { chrome } from './copy'

const SEEN_KEY = 'riankeng:day-seen:v1'
const SIZES = '(max-width: 680px) 46vw, 310px'

/** The panels whose line the learner has met. Her day letters in with the course, panel by panel. */
export function saidStems(doc: ProgressDoc): Set<string> {
  return new Set(DEMO.filter((d) => (doc.items[d.id]?.days?.length ?? 0) > 0).map((d) => d.stem))
}

/**
 * The panels lettered at the last visit, on this device, or null before the first. A convenience:
 * lost, every line letters in once more.
 */
function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (raw === null) return null
    const list: unknown = JSON.parse(raw)
    return new Set(Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [])
  } catch {
    return null
  }
}

function writeSeen(stems: Iterable<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...stems]))
  } catch {
    // Private windows and full storage: the page still reads, it only letters in again.
  }
}

/**
 * The comic from the front page, as one day in order. A balloon holds her line once the learner has
 * met it in Voice; until then the drawing waits with its balloon empty and names the level that
 * brings the line. Lines met since the last visit letter themselves in as they come into view.
 */
export function HerDay(props: { doc: ProgressDoc; audioRate: number }) {
  const said = saidStems(props.doc)
  const [seen] = useState(readSeen)
  const fresh = DEMO.filter((d) => said.has(d.stem) && !seen?.has(d.stem)).map((d) => d.stem)
  const list = useRef<HTMLOListElement>(null)
  const saidKey = [...said].join()

  useEffect(() => {
    writeSeen(new Set([...(seen ?? []), ...said]))
  }, [saidKey])

  // A fresh balloon letters in when its panel reaches the screen, not somewhere below it.
  useEffect(() => {
    const cells = [...(list.current?.querySelectorAll<HTMLElement>('.day-cell[data-fresh]') ?? [])]
    if (typeof IntersectionObserver === 'undefined') {
      for (const cell of cells) cell.dataset.inView = ''
      return
    }
    const io = new IntersectionObserver(
      (seenNow) => {
        for (const e of seenNow) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).dataset.inView = ''
          io.unobserve(e.target)
        }
      },
      { threshold: 0.6 },
    )
    for (const cell of cells) io.observe(cell)
    return () => io.disconnect()
  }, [])

  return (
    <main className="page her-day">
      <h2>{chrome.dayTitle}</h2>
      <p className="lede">{chrome.dayLede}</p>
      {said.size > 0 && (
        <p className="day-count">
          {said.size === DEMO.length
            ? chrome.dayAll
            : `${said.size} of ${DEMO.length} lines${seen && fresh.length ? `, ${fresh.length} new since last time.` : '.'}`}
        </p>
      )}
      <ol className="day-strip" ref={list}>
        {DEMO.map((card) => {
          const has = said.has(card.stem)
          const k = fresh.indexOf(card.stem)
          return (
            <li
              key={card.stem}
              className="day-cell"
              data-fresh={k >= 0 ? '' : undefined}
              style={k >= 0 ? ({ '--k': k % 4 } as CSSProperties) : undefined}
            >
              <figure className="day-panel" data-scene={card.stem}>
                <img
                  src={sceneSrc(card.stem)}
                  srcSet={sceneSrcSet(card.stem)}
                  sizes={SIZES}
                  width={980}
                  height={980}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                />
                {has && (
                  <span
                    className="balloon"
                    lang="th"
                    style={{ '--em': card.balloon.em, '--lines': card.balloon.lines.length } as CSSProperties}
                  >
                    {card.balloon.lines.map((line, i) => (
                      <Fragment key={i}>
                        {i > 0 && <br />}
                        {line}
                      </Fragment>
                    ))}
                  </span>
                )}
              </figure>
              {has ? (
                <p
                  className="day-caption"
                  onPointerEnter={() => prefetchClip(card.id)}
                  onFocus={() => prefetchClip(card.id)}
                >
                  <HearBtn
                    className="day-hear"
                    onClick={() => void speakThai(card.thai, card.id, props.audioRate, { gesture: true })}
                  >
                    <span className="rom" lang="th-Latn">
                      {card.rom}
                    </span>
                  </HearBtn>
                  <span className="day-en">{card.en}</span>
                </p>
              ) : (
                <p className="day-caption day-later">Voice {getEntry(card.id)?.level ?? ''}</p>
              )}
            </li>
          )
        })}
        <li className="day-cell day-night">
          <figure className="day-panel" data-scene={NIGHT.stem}>
            <img
              src={sceneSrc(NIGHT.stem)}
              srcSet={sceneSrcSet(NIGHT.stem)}
              sizes={SIZES}
              width={980}
              height={980}
              alt={NIGHT.alt}
              loading="lazy"
              decoding="async"
            />
          </figure>
        </li>
      </ol>
    </main>
  )
}
