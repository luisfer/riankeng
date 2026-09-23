/**
 * The phrases drawn on the landing page. Data only, so the landing bundle and
 * the gate never pull in the whole course. Every row is a real entry with a
 * shipped clip. tests/landing.test.ts holds each one to getEntry(id).
 */
export interface DemoCard {
  /** Panel stem, as in public/scenes/<stem>-980.webp. */
  stem: string
  /** Entry id in content/. Greek ε, NFC, as stored. */
  id: string
  thai: string
  rom: string
  /** cleanGloss(entry.en[0]). */
  en: string
  /** What the drawing shows. */
  alt: string
  /** The Thai as lettered into the balloon: its lines, and the widest line's width in em of Mali. */
  balloon: { lines: string[]; em: number }
}

/** One day of speaking Thai, in order. */
export const DEMO: DemoCard[] = [
  {
    stem: 'door',
    id: 'w:sà-wàt-dii',
    thai: 'สวัสดี',
    rom: 'sà-wàt-dii',
    en: 'hello',
    alt: 'A woman greets an older neighbour at her door, both with hands pressed together.',
    balloon: { lines: ['สวัสดี'], em: 2.74 },
  },
  {
    stem: 'well',
    id: 'p:sà-baai dii mái',
    thai: 'สบายดีไหม',
    rom: 'sà-baai dii mái',
    en: 'how are you',
    alt: 'At a bus stop, a woman waves hello to a friend with a shoulder bag.',
    balloon: { lines: ['สบายดีไหม'], em: 5.25 },
  },
  {
    stem: 'stairs',
    id: 'p:dèk kon níi nâa rák',
    thai: 'เด็กคนนี้น่ารัก',
    rom: 'dèk kon níi nâa rák',
    en: 'this child is cute',
    alt: 'On a stairway, a woman speaks to a mother holding a small child.',
    balloon: { lines: ['เด็กคนนี้', 'น่ารัก'], em: 4.1 },
  },
  {
    stem: 'coffee',
    id: 'p:kɔ̌ɔ gaa-fεε yen nụ̀ng gε̂εo',
    thai: 'ขอกาแฟเย็นหนึ่งแก้ว',
    rom: 'kɔ̌ɔ gaa-fεε yen nụ̀ng gε̂εo',
    en: 'one iced coffee please',
    alt: 'At a wooden counter, a woman orders from a grey-haired man in an apron. An iced coffee sits between them.',
    balloon: { lines: ['ขอกาแฟเย็น', 'หนึ่งแก้ว'], em: 5.72 },
  },
  {
    stem: 'jasmine',
    id: 'p:ao an níi',
    thai: 'เอาอันนี้',
    rom: 'ao an níi',
    en: 'I will take this one',
    alt: 'A woman holds up a jasmine garland at a flower stall.',
    balloon: { lines: ['เอาอันนี้'], em: 3.75 },
  },
  {
    stem: 'mango',
    id: 'w:má-mûang',
    thai: 'มะม่วง',
    rom: 'má-mûang',
    en: 'mango',
    alt: 'A fruit seller bags mangoes while a woman holds up two fingers.',
    balloon: { lines: ['มะม่วง'], em: 3.05 },
  },
  {
    stem: 'thanks',
    id: 'w:kɔ̀ɔp kun',
    thai: 'ขอบคุณ',
    rom: 'kɔ̀ɔp kun',
    en: 'thank you',
    alt: 'At a fruit stall, a woman presses her hands together as the grey-haired seller hands her a paper bag.',
    balloon: { lines: ['ขอบคุณ'], em: 3.7 },
  },
  {
    stem: 'help',
    id: 'p:chûai dûai',
    thai: 'ช่วยด้วย',
    rom: 'chûai dûai',
    en: 'help',
    alt: 'Oranges roll from a torn paper bag as a woman calls out and the fruit seller hurries over.',
    balloon: { lines: ['ช่วยด้วย'], em: 3.77 },
  },
  {
    stem: 'from',
    id: 'p:kun maa jàak tîi-nǎi',
    thai: 'คุณมาจากที่ไหน',
    rom: 'kun maa jàak tîi-nǎi',
    en: 'where are you from',
    alt: 'At a fruit cart under a red umbrella, a vendor in a straw hat hands a woman a bag of cut fruit.',
    balloon: { lines: ['คุณมา', 'จากที่ไหน'], em: 4.64 },
  },
  {
    stem: 'slowly',
    id: 'p:pûut cháa cháa nɔ̀i',
    thai: 'พูดช้าๆหน่อย',
    rom: 'pûut cháa cháa nɔ̀i',
    en: 'speak slowly please',
    alt: 'At a floating market, a woman crouches on the landing to speak with an older seller in a boat full of fruit.',
    balloon: { lines: ['พูดช้าๆหน่อย'], em: 6.09 },
  },
  {
    stem: 'pricey',
    id: 'w:pεεng bpai',
    thai: 'แพงไป',
    rom: 'pεεng bpai',
    en: 'too expensive',
    alt: 'At a market clothes rail, a woman holds up a shirt with a price tag to a grey-haired seller.',
    balloon: { lines: ['แพงไป'], em: 3.27 },
  },
  {
    stem: 'howmuch',
    id: 'p:nîi tâo-rài',
    thai: 'นี่เท่าไร',
    rom: 'nîi tâo-rài',
    en: 'how much is this',
    alt: 'At a counter of folded shirts, a woman points to one while an older woman looks on.',
    balloon: { lines: ['นี่เท่าไร'], em: 3.5 },
  },
  {
    stem: 'bike',
    id: 'w:mɔɔ-dtəə-sai',
    thai: 'มอเตอร์ไซค์',
    rom: 'mɔɔ-dtəə-sai',
    en: 'motorbike',
    alt: 'A woman talks to a motorbike taxi rider in a helmet and orange vest.',
    balloon: { lines: ['มอเตอร์', 'ไซค์'], em: 3.68 },
  },
  {
    stem: 'passenger',
    id: 'p:dtrong bpai',
    thai: 'ตรงไป',
    rom: 'dtrong bpai',
    en: 'go straight',
    alt: 'Riding pillion on a motorbike, a woman points the way ahead.',
    balloon: { lines: ['ตรงไป'], em: 3.15 },
  },
  {
    stem: 'left',
    id: 'p:líao sáai',
    thai: 'เลี้ยวซ้าย',
    rom: 'líao sáai',
    en: 'turn left',
    alt: 'Riding pillion on a motorbike taxi, a woman points left.',
    balloon: { lines: ['เลี้ยวซ้าย'], em: 4.12 },
  },
  {
    stem: 'stop',
    id: 'p:jɔ̀ɔt tîi nîi',
    thai: 'จอดที่นี่',
    rom: 'jɔ̀ɔt tîi nîi',
    en: 'stop here',
    alt: 'From the back of a tuk-tuk, a woman taps the driver on the shoulder outside a shop.',
    balloon: { lines: ['จอดที่นี่'], em: 3.59 },
  },
  {
    stem: 'hotel',
    id: 'p:roong-rεεm yùu tîi-nǎi',
    thai: 'โรงแรมอยู่ที่ไหน',
    rom: 'roong-rεεm yùu tîi-nǎi',
    en: 'where is the hotel',
    alt: 'A woman with a suitcase asks the way, and a man in an apron points.',
    balloon: { lines: ['โรงแรม', 'อยู่ที่ไหน'], em: 4.07 },
  },
  {
    stem: 'heat',
    id: 'p:aa-gàat rɔ́ɔn',
    thai: 'อากาศร้อน',
    rom: 'aa-gàat rɔ́ɔn',
    en: 'the weather is hot',
    alt: 'In the noon sun, a woman fans herself at an iced drinks cart.',
    balloon: { lines: ['อากาศร้อน'], em: 5.16 },
  },
  {
    stem: 'water',
    id: 'p:kɔ̌ɔ náam bplào nụ̀ng kùat',
    thai: 'ขอน้ำเปล่าหนึ่งขวด',
    rom: 'kɔ̌ɔ náam bplào nụ̀ng kùat',
    en: 'one bottle of water please',
    alt: 'At a corner shop, a woman holds up one finger as the shopkeeper hands her a bottle of water.',
    balloon: { lines: ['ขอน้ำเปล่า', 'หนึ่งขวด'], em: 4.88 },
  },
  {
    stem: 'scan',
    id: 'p:sà-gεεn tîi nîi',
    thai: 'สแกนที่นี่',
    rom: 'sà-gεεn tîi nîi',
    en: 'scan here',
    alt: 'At a convenience store counter, the cashier points to a QR code as a woman holds up her phone.',
    balloon: { lines: ['สแกนที่นี่'], em: 4.46 },
  },
  {
    stem: 'cash',
    id: 'p:jàai bpen ngən sòt',
    thai: 'จ่ายเป็นเงินสด',
    rom: 'jàai bpen ngən sòt',
    en: 'pay in cash',
    alt: 'At a convenience store counter, a woman hands the cashier a red banknote.',
    balloon: { lines: ['จ่ายเป็น', 'เงินสด'], em: 3.69 },
  },
  {
    stem: 'praise',
    id: 'p:kun pûut tai gèng',
    thai: 'คุณพูดไทยเก่ง',
    rom: 'kun pûut tai gèng',
    en: 'you speak Thai well',
    alt: 'At a papaya salad stall, a cook in a white cap pounds the mortar while a woman smiles behind her hand.',
    balloon: { lines: ['คุณ', 'พูดไทยเก่ง'], em: 5.05 },
  },
  {
    stem: 'name',
    id: 'p:kun chụ̂ụ à-rai',
    thai: 'คุณชื่ออะไร',
    rom: 'kun chụ̂ụ à-rai',
    en: 'what is your name',
    alt: 'At a noodle shop, a schoolgirl with an open notebook chats with a woman eating a bowl of noodles.',
    balloon: { lines: ['คุณชื่ออะไร'], em: 5.22 },
  },
  {
    stem: 'umbrella',
    id: 'p:wan níi fǒn dtòk',
    thai: 'วันนี้ฝนตก',
    rom: 'wan níi fǒn dtòk',
    en: 'it is raining today',
    alt: 'In the rain, a woman shares her umbrella with a passer-by.',
    balloon: { lines: ['วันนี้ฝนตก'], em: 5.06 },
  },
  {
    stem: 'pharmacy',
    id: 'p:kɔ̌ɔ yaa gε̂ε bpùat',
    thai: 'ขอยาแก้ปวด',
    rom: 'kɔ̌ɔ yaa gε̂ε bpùat',
    en: 'a painkiller please',
    alt: 'At a pharmacy counter, a woman holds her temple as the pharmacist listens.',
    balloon: { lines: ['ขอยาแก้ปวด'], em: 5.79 },
  },
  {
    stem: 'tooth',
    id: 'p:bpùat fan',
    thai: 'ปวดฟัน',
    rom: 'bpùat fan',
    en: 'toothache',
    alt: 'At the dentist, a woman in the chair holds her aching cheek.',
    balloon: { lines: ['ปวดฟัน'], em: 3.63 },
  },
  {
    stem: 'tea',
    id: 'w:chaa yen',
    thai: 'ชาเย็น',
    rom: 'chaa yen',
    en: 'Thai iced tea',
    alt: 'A woman orders from a tea seller at a cart under a hanging lamp.',
    balloon: { lines: ['ชาเย็น'], em: 2.94 },
  },
  {
    stem: 'stall',
    id: 'w:gǔai-dtǐao',
    thai: 'ก๋วยเตี๋ยว',
    rom: 'gǔai-dtǐao',
    en: 'noodles',
    alt: 'A cook ladles noodles into a bowl at a stall while a woman waits.',
    balloon: { lines: ['ก๋วยเตี๋ยว'], em: 4.17 },
  },
  {
    stem: 'nospicy',
    id: 'p:mâi pèt',
    thai: 'ไม่เผ็ด',
    rom: 'mâi pèt',
    en: 'not spicy',
    alt: 'A woman raises her hand to a cook tossing a wok over the flame.',
    balloon: { lines: ['ไม่เผ็ด'], em: 2.9 },
  },
  {
    stem: 'tasty',
    id: 'p:à-rɔ̀i mâak',
    thai: 'อร่อยมาก',
    rom: 'à-rɔ̀i mâak',
    en: 'very delicious',
    alt: 'At a night stall under a string of bulbs, a woman tastes her noodles while the cook stirs a wok.',
    balloon: { lines: ['อร่อยมาก'], em: 4.46 },
  },
  {
    stem: 'table',
    id: 'p:kɔ̌ɔ jɔɔng dtó',
    thai: 'ขอจองโต๊ะ',
    rom: 'kɔ̌ɔ jɔɔng dtó',
    en: 'I would like to book a table',
    alt: 'At a restaurant, a woman holds up two fingers to a waitress holding menus.',
    balloon: { lines: ['ขอจองโต๊ะ'], em: 4.89 },
  },
  {
    stem: 'bill',
    id: 'p:gèp dtang dûai',
    thai: 'เก็บตังด้วย',
    rom: 'gèp dtang dûai',
    en: 'the bill please',
    alt: 'Seated at a table with two bowls, a woman calls over a grey-haired waiter with a notepad.',
    balloon: { lines: ['เก็บตังด้วย'], em: 5.05 },
  },
  {
    stem: 'toilet',
    id: 'p:hɔ̂ng náam yùu tîi-nǎi',
    thai: 'ห้องน้ำอยู่ที่ไหน',
    rom: 'hɔ̂ng náam yùu tîi-nǎi',
    en: 'where is the toilet',
    alt: 'A woman asks a grey-haired man in an apron the way. Behind him, a corridor leads to a door.',
    balloon: { lines: ['ห้องน้ำ', 'อยู่ที่ไหน'], em: 4.07 },
  },
  {
    stem: 'sorry',
    id: 'w:kɔ̌ɔ tôot',
    thai: 'ขอโทษ',
    rom: 'kɔ̌ɔ tôot',
    en: 'sorry',
    alt: 'A woman presses her hands together to an older man at a door, a dropped parcel at his feet.',
    balloon: { lines: ['ขอโทษ'], em: 3.33 },
  },
  {
    stem: 'laugh',
    id: 'p:mâi bpen rai',
    thai: 'ไม่เป็นไร',
    rom: 'mâi bpen rai',
    en: 'never mind',
    alt: 'Two women laugh together on red stools.',
    balloon: { lines: ['ไม่เป็นไร'], em: 4.13 },
  },
  {
    stem: 'tired',
    id: 'w:nụ̀ai',
    thai: 'เหนื่อย',
    rom: 'nụ̀ai',
    en: 'tired',
    alt: 'After work, a woman sits on her front step while her older neighbour waters the plants.',
    balloon: { lines: ['เหนื่อย'], em: 3.19 },
  },
  {
    stem: 'eaten',
    id: 'p:gin kâao rụ̌ụ yang',
    thai: 'กินข้าวหรือยัง',
    rom: 'gin kâao rụ̌ụ yang',
    en: 'have you eaten yet',
    alt: 'A security guard at his desk in an apartment lobby greets a woman walking in with an iced drink.',
    balloon: { lines: ['กินข้าว', 'หรือยัง'], em: 3.26 },
  },
  {
    stem: 'hungry',
    id: 'w:hǐu',
    thai: 'หิว',
    rom: 'hǐu',
    en: 'hungry',
    alt: 'In the kitchen at night, a woman sits before an empty plate while an older woman stirs a pot.',
    balloon: { lines: ['หิว'], em: 1.31 },
  },
]

/** The closing image. Night, no balloon. */
export const NIGHT = {
  stem: 'night',
  alt: 'A woman walks home past a closed shutter at night, a dog asleep on the step.',
}

/** The panels with no balloon, painted to every edge. The course opens on one of them. */
export const QUIET: { stem: string; alt: string }[] = [
  NIGHT,
  { stem: 'train', alt: 'A woman waits on a train platform beside an older man on a bench.' },
  { stem: 'pier', alt: 'At dusk a woman stands on a river pier, a long-tail boat on the water.' },
  { stem: 'temple', alt: 'At a temple door a woman slips off her sandals while an older woman greets her with a wai.' },
  { stem: 'canal', alt: 'A woman sits on the steps of a stilt house over a canal full of lotus.' },
  { stem: 'park', alt: 'A woman sits on a park bench while a monitor lizard crosses the path between two pigeons.' },
  { stem: 'shrine', alt: 'A woman lights incense at a spirit house, marigolds laid along its ledge.' },
  { stem: 'soi', alt: 'A woman walks down a soi past hanging laundry and a cat asleep on a motorbike.' },
  { stem: 'ferry', alt: 'A woman rides a river boat past a temple on the far bank.' },
  { stem: 'alms', alt: 'At dawn a woman kneels barefoot on a mat, her shoes set aside, and puts sticky rice in the alms bowl of a monk.' },
  { stem: 'krathong', alt: 'Under a full moon a woman crouches on a pier and sets a krathong of banana leaf and marigolds on the river.' },
  { stem: 'rain', alt: 'A woman waits out the rain under a striped awning beside an older man and his pushcart.' },
]

export const DEMO_IDS: string[] = DEMO.map((d) => d.id)

/** The live card opens on these, in this order. Short, then one word with tones, then hello. */
export const TRY_ORDER = ['tea', 'mango', 'door']

export function demoByStem(stem: string): DemoCard | undefined {
  return DEMO.find((d) => d.stem === stem)
}

export function sceneSrc(stem: string): string {
  return `/scenes/${stem}-980.webp`
}

export function sceneSrcSet(stem: string): string {
  return `/scenes/${stem}-490.webp 490w, /scenes/${stem}-980.webp 980w`
}
