import { words } from '../build'

export default words(23, [
  // the four grandparents. Thai names the side.
  ['bpùu', 'ปู่', ["father's father", 'grandfather', '(paternal) grandfather'], 'n', ['family'], "Father's father. Mother's father is dtaa."],
  ['dtaa#2', 'ตา', ["mother's father", 'grandfather', '(maternal) grandfather'], 'n', ['family'], 'Same letters as the eye you already read.'],
  ['yaai', 'ยาย', ["mother's mother", 'grandmother', '(maternal) grandmother'], 'n', ['family'], "Mother's mother. Father's mother is yâa."],
  // aunts and uncles, by side and by age
  ['náa', 'น้า', ['aunt', 'uncle', "mother's younger sibling"], 'n', ['family'], "Mother's younger sibling, either sex."],
  ['yâat', 'ญาติ', ['relative', 'relatives'], 'n', ['family']],
  ['lǎan', 'หลาน', ['grandchild', 'niece', 'nephew'], 'n', ['family'], 'One word for the generation below, however it is related.'],
  // brothers and sisters, said by age first
  ['pîi-nɔ́ɔng', 'พี่น้อง', ['siblings', 'brothers and sisters'], 'n', ['family']],
  ['pîi-chaai', 'พี่ชาย', ['older brother'], 'n', ['family']],
  ['pîi-sǎao', 'พี่สาว', ['older sister'], 'n', ['family']],
  ['nɔ́ɔng-chaai', 'น้องชาย', ['younger brother'], 'n', ['family']],
  ['nɔ́ɔng-sǎao', 'น้องสาว', ['younger sister'], 'n', ['family']],
  ['lûuk-chaai', 'ลูกชาย', ['son'], 'n', ['family']],
  ['lûuk-sǎao', 'ลูกสาว', ['daughter'], 'n', ['family']],
  ['chaai', 'ชาย', ['male', 'man'], 'n', ['family']],
  ['dtὲng-ngaan', 'แต่งงาน', ['marry', 'get married', 'be married'], 'v', ['family']],
  ['sòot', 'โสด', ['single', 'unmarried'], 'adj', ['family']],
  // the words that count things
  ['lûuk#2', 'ลูก', ['classifier for fruit', 'classifier for round things'], 'clf', ['classifier'], 'glûai hâa lûuk: five bananas.'],
  ['lêm', 'เล่ม', ['classifier for books'], 'clf', ['classifier']],
  ['krʉ̂ang', 'เครื่อง', ['machine', 'classifier for machines'], 'n', ['classifier']],
  ['pὲn', 'แผ่น', ['sheet', 'classifier for flat things'], 'clf', ['classifier']],
  ['lǎng#2', 'หลัง', ['classifier for houses'], 'clf', ['classifier'], 'bâan nʉ̀ng lǎng: one house.'],
  ['dtôn-mái', 'ต้นไม้', ['tree', 'a tree'], 'n', ['classifier'], 'Counted with dtôn: dtôn-mái sɔ̌ɔng dtôn.'],
  ['dtôn', 'ต้น', ['classifier for trees', 'plant', 'trunk'], 'clf', ['classifier'], 'A tree on its own is dtôn-mái.'],
  ['gɔ̂ɔn', 'ก้อน', ['lump', 'classifier for lumps'], 'clf', ['classifier']],
  ['duang', 'ดวง', ['classifier for lights', 'classifier for stars'], 'clf', ['classifier']],
  ['táng mòt', 'ทั้งหมด', ['altogether', 'all of it', 'in total'], 'adv', ['classifier']],
  ['dtὲε lá', 'แต่ละ', ['each', 'every one'], 'adj', ['classifier']],
  ['tîi nʉ̀ng', 'ที่หนึ่ง', ['first', 'the first'], 'adj', ['classifier'], 'tîi plus a number is the order.'],
  ['tîi sɔ̌ɔng', 'ที่สอง', ['second', 'the second'], 'adj', ['classifier']],
])
