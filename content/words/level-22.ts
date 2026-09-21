import { words } from '../build'

export default words(22, [
  // the twelve months. -kom months are 31 days, -yon months are 30.
  ['má-gà-raa-kom', 'มกราคม', ['January'], 'n', ['month']],
  ['gum-paa-pan', 'กุมภาพันธ์', ['February'], 'n', ['month']],
  ['mii-naa-kom', 'มีนาคม', ['March'], 'n', ['month']],
  ['mee-sǎa-yon', 'เมษายน', ['April'], 'n', ['month']],
  ['prụ́t-sà-paa-kom', 'พฤษภาคม', ['May'], 'n', ['month']],
  ['mí-tù-naa-yon', 'มิถุนายน', ['June'], 'n', ['month']],
  ['gà-rá-gà-daa-kom', 'กรกฎาคม', ['July'], 'n', ['month']],
  ['sǐng-hǎa-kom', 'สิงหาคม', ['August'], 'n', ['month']],
  ['gan-yaa-yon', 'กันยายน', ['September'], 'n', ['month']],
  ['dtù-laa-kom', 'ตุลาคม', ['October'], 'n', ['month']],
  ['prụ́t-sà-jì-gaa-yon', 'พฤศจิกายน', ['November'], 'n', ['month']],
  ['tan-waa-kom', 'ธันวาคม', ['December'], 'n', ['month']],
  // the three seasons
  ['rụ́-duu', 'ฤดู', ['season'], 'n', ['calendar']],
  ['nâa rɔ́ɔn', 'หน้าร้อน', ['hot season', 'summer'], 'n', ['calendar']],
  ['nâa fǒn', 'หน้าฝน', ['rainy season'], 'n', ['calendar']],
  ['nâa nǎao', 'หน้าหนาว', ['cool season', 'winter'], 'n', ['calendar']],
  // the date, and the clock the six-hour one does not cover
  ['wan tîi', 'วันที่', ['date', 'the date', 'on the date'], 'n', ['calendar'], 'wan tîi sìp: the tenth.'],
  ['bpà-dtì-tin', 'ปฏิทิน', ['calendar'], 'n', ['calendar']],
  ['sàp-daa', 'สัปดาห์', ['week', 'week (formal)'], 'n', ['calendar'], 'aa-tít in speech, sàp-daa in writing.'],
  ['krụ̂ng', 'ครึ่ง', ['half'], 'n', ['calendar'], 'After the hour: sɔ̌ɔng moong krụ̂ng.'],
  ['tîang', 'เที่ยง', ['noon', 'midday'], 'n', ['calendar']],
  ['tîang kụụn', 'เที่ยงคืน', ['midnight'], 'n', ['calendar']],
  ['kụụn', 'คืน', ['night', 'a night'], 'n', ['calendar']],
  ['dtôn dụan', 'ต้นเดือน', ['the start of the month'], 'n', ['calendar']],
  ['sîn dụan', 'สิ้นเดือน', ['the end of the month'], 'n', ['calendar']],
  ['tîi lέεo', 'ที่แล้ว', ['last', 'previous', 'ago'], 'adj', ['calendar'], 'dụan tîi lέεo: last month.'],
  ['mụ̂a-waan sụụn', 'เมื่อวานซืน', ['the day before yesterday'], 'n', ['calendar']],
  ['má-rụụn níi', 'มะรืนนี้', ['the day after tomorrow'], 'n', ['calendar']],
  // what the calendar is for
  ['gə̀ət', 'เกิด', ['be born', 'happen', 'occur'], 'v', ['calendar']],
  ['chà-lɔ̌ɔng', 'ฉลอง', ['celebrate'], 'v', ['calendar']],
  ['bpii mài', 'ปีใหม่', ['new year'], 'n', ['festival']],
  ['sǒng-graan', 'สงกรานต์', ['Songkran'], 'n', ['festival'], 'The Thai new year, in April. Water everywhere.'],
  ['lɔɔi grà-tong', 'ลอยกระทง', ['Loy Krathong'], 'n', ['festival'], 'Baskets on the water, full moon of the twelfth month.'],
  ['wan prá', 'วันพระ', ['Buddhist holy day'], 'n', ['festival']],
])
