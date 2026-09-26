/**
 * Who is speaking now: a clip's id and the audio element playing it. The pitch lines over a
 * romanization follow that element's own clock, so they keep time at any rate, Slower included.
 * The landing and the course both play clips; both announce them here, and nothing else is imported.
 */
type Listener = (id: string, audio: HTMLAudioElement) => void

const listeners = new Set<Listener>()

export function onClipPlay(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function announceClip(id: string, audio: HTMLAudioElement): void {
  for (const listener of listeners) listener(id, audio)
}
