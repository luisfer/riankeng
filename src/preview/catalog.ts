import type { Entry } from '../../content/types.js'

/** A real course word, copied here so the preview never imports a level file. */
function word(rom: string, thai: string, en: string): Entry {
  return { id: `w:${rom}`, rom, thai, en: [en], kind: 'word', level: 0, tags: [] }
}

/** Twenty-five words of daily speech. Nothing else from the course is in this page. */
export const PREVIEW_VOICE: Entry[] = [
  word('sà-wàt-dii', 'สวัสดี', 'hello'),
  word('kɔ̀ɔp kun', 'ขอบคุณ', 'thank you'),
  word('kráp', 'ครับ', 'polite particle[, male]'),
  word('kâ', 'ค่ะ', 'polite particle[, female]'),
  word('châi', 'ใช่', 'yes'),
  word('mâi châi', 'ไม่ใช่', 'no'),
  word('mâi', 'ไม่', 'not'),
  word('pǒm', 'ผม', 'I (male)'),
  word('chǎn', 'ฉัน', 'I (female)'),
  word('kun', 'คุณ', 'you'),
  word('náam', 'น้ำ', 'water'),
  word('gin', 'กิน', 'eat'),
  word('kâao', 'ข้าว', 'rice'),
  word('bpai', 'ไป', 'go'),
  word('maa', 'มา', 'come'),
  word('hɔ̂ng náam', 'ห้องน้ำ', 'toilet'),
  word('tâo-rài', 'เท่าไร', 'how much'),
  word('à-rai', 'อะไร', 'what'),
  word('tîi-nǎi', 'ที่ไหน', 'where'),
  word('nîi', 'นี่', 'this'),
  word('dâi', 'ได้', 'can'),
  word('yùu', 'อยู่', 'to be at'),
  word('hǐu', 'หิว', 'hungry'),
  word('à-rɔ̀i', 'อร่อย', 'delicious'),
  word('pεεng', 'แพง', 'expensive'),
]

export const PREVIEW_IDS: string[] = PREVIEW_VOICE.map((e) => e.id)
