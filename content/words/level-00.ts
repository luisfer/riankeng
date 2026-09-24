import { words } from '../build.js'
import type { Entry } from '../types.js'

/**
 * Level 0 — the sound system. Real words chosen as minimal pairs so the ear
 * learns tone, length and the unaspirated stops on meaning, not on theory.
 */
const rows = words(0, [
  // ── five tones on maa / mai
  ['maa', 'มา', ['come', 'to come'], 'v', ['tone-mid', 'pair-maa']],
  ['máa', 'ม้า', ['horse'], 'n', ['tone-high', 'pair-maa']],
  ['mǎa', 'หมา', ['dog'], 'n', ['tone-rising', 'pair-maa']],
  ['mâi', 'ไม่', ['not', 'no'], 'adv', ['tone-falling', 'pair-mai']],
  ['mài', 'ใหม่', ['new'], 'adj', ['tone-low', 'pair-mai']],
  ['mái', 'ไหม', ['question particle', '(yes/no) question word', 'right?'], 'particle', ['tone-high', 'pair-mai', 'homograph'], 'Turns a statement into a yes/no question. Spelled with a rising tone, said high in Bangkok.'],
  ['mǎi', 'ไหม', ['silk'], 'n', ['tone-rising', 'pair-mai', 'homograph']],
  // ── kao family: tone and length
  ['kâo', 'เข้า', ['enter', 'to enter', 'go in', 'come in'], 'v', ['tone-falling', 'pair-kao', 'length']],
  ['kǎo', 'เขา', ['he', 'she', 'they', 'him', 'her', 'he/she'], 'pron', ['tone-rising', 'pair-kao', 'length'], 'Said káo (high) in everyday speech.'],
  ['kâao', 'ข้าว', ['rice', '(cooked) rice'], 'n', ['tone-falling', 'pair-kao', 'length']],
  ['kǎao', 'ขาว', ['white'], 'adj', ['tone-rising', 'pair-kao', 'length']],
  ['kàao', 'ข่าว', ['news', '(the) news'], 'n', ['tone-low', 'pair-kao']],
  ['gào', 'เก่า', ['old', '(of things) old'], 'adj', ['tone-low', 'pair-kao', 'g-k'], 'Old things. Old people are gὲε.'],
  // ── yaa family
  ['yaa', 'ยา', ['medicine', 'drug', 'medication'], 'n', ['tone-mid', 'pair-yaa']],
  ['yàa', 'อย่า', ["don't", 'do not'], 'adv', ['tone-low', 'pair-yaa']],
  ['yâa', 'ย่า', ['grandmother', '(paternal) grandmother', "father's mother"], 'n', ['tone-falling', 'pair-yaa']],
  // ── glai / glâi
  ['glai', 'ไกล', ['far', 'far away'], 'adj', ['tone-mid', 'pair-glai']],
  ['glâi', 'ใกล้', ['near', 'close', 'nearby'], 'adj', ['tone-falling', 'pair-glai']],
  // ── g / k
  ['gài', 'ไก่', ['chicken'], 'n', ['g-k', 'pair-gai']],
  ['kài', 'ไข่', ['egg'], 'n', ['g-k', 'pair-gai']],
  ['gin', 'กิน', ['eat', 'to eat'], 'v', ['g-k']],
  ['kon', 'คน', ['person', 'people'], 'n', ['g-k']],
  // ── bp / p
  ['bpèt', 'เป็ด', ['duck'], 'n', ['bp-p', 'pair-pet']],
  ['pèt', 'เผ็ด', ['spicy', 'hot (spicy)'], 'adj', ['bp-p', 'pair-pet']],
  ['bpâa', 'ป้า', ['aunt', '(older) aunt', 'auntie'], 'n', ['bp-p', 'pair-paa']],
  ['pâa', 'ผ้า', ['cloth', 'fabric'], 'n', ['bp-p', 'pair-paa']],
  ['bpai', 'ไป', ['go', 'to go'], 'v', ['bp-p']],
  // ── dt / t
  ['dtaa', 'ตา', ['eye', 'eyes'], 'n', ['dt-t', 'pair-taa']],
  ['taa', 'ทา', ['apply', 'to apply', 'spread on', 'paint on', 'put on (cream)'], 'v', ['dt-t', 'pair-taa']],
  ['dtii', 'ตี', ['hit', 'to hit', 'strike'], 'v', ['dt-t', 'pair-tii']],
  ['tii', 'ที', ['time', 'occasion', 'turn'], 'n', ['dt-t', 'pair-tii'], 'As in "one more time".'],
  // ── j / ch
  ['jaan', 'จาน', ['plate', 'dish'], 'n', ['j-ch', 'pair-jaan']],
  ['chaam', 'ชาม', ['bowl'], 'n', ['j-ch', 'pair-jaan']],
  ['jai', 'ใจ', ['heart', 'mind'], 'n', ['j-ch']],
  ['chái', 'ใช้', ['use', 'to use'], 'v', ['j-ch']],
  // ── the four odd vowels
  ['pεεng', 'แพง', ['expensive'], 'adj', ['vowel-ε']],
  ['lέεo', 'แล้ว', ['already', 'and then'], 'adv', ['vowel-ε']],
  ['rɔɔ', 'รอ', ['wait', 'to wait'], 'v', ['vowel-ɔ']],
  ['rɔ́ɔn', 'ร้อน', ['hot', 'hot (temperature)'], 'adj', ['vowel-ɔ']],
  ['jəə', 'เจอ', ['meet', 'to meet', 'run into', 'find'], 'v', ['vowel-ə']],
  ['təə', 'เธอ', ['you', 'she', '(intimate) you'], 'pron', ['vowel-ə'], 'Intimate "you", also "she".'],
  ['sʉ́ʉ', 'ซื้อ', ['buy', 'to buy'], 'v', ['vowel-ʉ']],
  ['lʉʉm', 'ลืม', ['forget', 'to forget'], 'v', ['vowel-ʉ']],
  ['dʉ̀ʉm', 'ดื่ม', ['drink', 'to drink'], 'v', ['vowel-ʉ']],
  ['nʉ̀ng', 'หนึ่ง', ['one', '1'], 'num', ['vowel-ʉ']],
  // ── glottal stop and ng onset
  ["sà-àat", 'สะอาด', ['clean'], 'adj', ['glottal']],
  ['ngaan', 'งาน', ['work', 'job', 'event'], 'n', ['ng-onset']],
  ['nguu', 'งู', ['snake'], 'n', ['ng-onset']],
  // ── ao and aa: short a with a glide, long aa with none
  ['ao', 'เอา', ['take', 'to take', 'want', "I'll have"], 'v', ['length']],
  ['aa#2', 'อา', ['uncle', "(father's younger) brother"], 'n', ['length'], 'Long aa, nothing after it. Also the letter อ plus า.'],
])

// Link minimal pairs by shared "pair-*" tag.
const byPair = new Map<string, Entry[]>()
for (const e of rows) {
  for (const t of e.tags) {
    if (t.startsWith('pair-')) {
      const arr = byPair.get(t) ?? []
      arr.push(e)
      byPair.set(t, arr)
    }
  }
}
for (const group of byPair.values()) {
  for (const e of group) e.minimalPairOf = group.filter((o) => o !== e).map((o) => o.id)
}

export default rows
