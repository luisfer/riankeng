import { scriptWords } from '../build'

export default scriptWords(5, [
  ['kɔɔ', 'ค', ['k', 'the letter k'], 'n', ['letter'], 'The letter in คน. Aspirated k.'],
  ['nɔɔ', 'น', ['n', 'the letter n'], 'n', ['letter'], 'The letter n. Ends คน.'],
  ['kon', 'คน', ['person', 'people'], 'n', ['bridge', 'voice:w:kon', 'parts:ค+น']],
  ['kɔ̌ɔ', 'ข', ['kh', 'the letter kh'], 'n', ['letter'], 'The letter in ไข่. Same k to the ear, another shape.'],
  ['kài', 'ไข่', ['egg'], 'n', ['bridge', 'voice:w:kài', 'parts:ไ+ข+่']],
  ['e#1', 'เ', ['e', 'e to the left'], 'n', ['letter', 'vowel'], 'Sits to the left. Alone it is long ee. With า after the consonant it is ao. เขา, เข้า.'],
  ['kǎo', 'เขา', ['he', 'she', 'they'], 'pron', ['bridge', 'voice:w:kǎo', 'parts:เ+ข+า']],
  ['kâo', 'เข้า', ['enter', 'to enter'], 'v', ['bridge', 'voice:w:kâo', 'parts:เ+ข+้+า']],
])
