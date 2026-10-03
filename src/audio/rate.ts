/** Slower, on the landing card and the preview, as the course plays it at the default rate. */
export const SLOWER = 0.7

/**
 * Chrome resets playbackRate when a clip has not loaded yet, so a rate set
 * before play() comes out at full speed. Put the rate back until it holds.
 */
export function stickPlaybackRate(audio: HTMLAudioElement, rate: number): void {
  const apply = () => {
    if (Math.abs(audio.playbackRate - rate) > 0.001) audio.playbackRate = rate
  }
  audio.addEventListener('loadedmetadata', apply)
  audio.addEventListener('playing', apply)
  audio.addEventListener('play', () => requestAnimationFrame(apply))
  apply()
}
