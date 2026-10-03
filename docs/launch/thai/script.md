# Script track: Thai review

Scope: `content/script/levels.ts`, `content/script/alphabet.ts`, `content/script/level-00.ts` to `level-28.ts`. Branch `luis/validation-launch`, 3 Oct 2026. Read-only review; nothing in the content was changed.

**Verdict:** Accurate where it matters most. Every Thai spelling is right, every bridge card matches its Voice romanization, and the consonant chart (names, classes, finals) and the level 17 tone rules are correct. Two things teach a wrong sound and should be fixed before launch: the level 2 title writes ไม้โท as mâi too, and the เ แ โ cards show short vowels for long signs. The rest are rules stated more broadly than Thai allows (ห, leading letters, silent ร) and a claim to cover "every vowel sign" that the checklist does not quite meet.

## Counts

- Entries checked: all 205 Script entries (82 letter cards, 122 bridge cards for 110 distinct words, 1 syllable card อา), the 29 level intros (title, rom, blurb, focus), and the 86 checklist rows in `alphabet.ts` (44 consonants, 25 vowel signs, 4 tone marks, 3 other signs, 10 digits).
- Issues: **2 high, 7 medium, 15 low** (24 findings).
- Checked and correct: all 205 Thai strings (right spelling, clean code points, marks in the right order); each bridge card's Thai and rom are identical to its Voice word, and tone, length and final agree with the spelling; all 44 consonant names, classes (9 mid, 11 high, 24 low), initials and finals; the 10 digits; the level 17 live/dead rules; the ห นำ, อ นำ, cluster and hidden-vowel examples at levels 8, 11, 18 and 22.
- Already enforced by tests, so not repeated here: each checklist sign has a card, compose parts are taught at or before use, bridge Thai equals Voice Thai, and the level 17 and 18 wording. The tests do not see multi-part vowels (compose splits them into single signs), titles, notes, or Voice rom equality (which holds today).

## Findings

### High

| file:line | item | issue | proposed fix | confidence |
|---|---|---|---|---|
| content/script/levels.ts:25 | Level 2 title rom `mâi too` | ไม้ (stick) is high tone: low letter ม plus ้ gives high. The mark's name is mái too. The course already writes mái dtài-kúu (level-20.ts:4) and mái yá-mók (level-25.ts:8). | `rom: 'mái too'` | high |
| level-05.ts:9, level-15.ts:9, level-15.ts:11 | Letter cards เ (rom `e`), แ (rom `ε`), โ (rom `o`, gloss "long o") | In this system a single vowel letter is short. alphabet.ts:91-93 says these signs read ee, εε, oo, and level-20.ts:7 says "แ would be long εε". The card face prints the short form under the sign, the โ card contradicts itself, and nothing on the แ card says long. The other long signs already double (า aa, ี ii, ู uu, ื ʉʉ). | rom `ee`, `εε`, `oo`; en[0] "long ee", "long open e", keep "long o". Add ID_ALIASES `s:e#1` to `s:ee`, `s:ε#1` to `s:εε`, `s:o#1` to `s:oo` so saved progress follows. | high |

### Medium

| file:line | item | issue | proposed fix | confidence |
|---|---|---|---|---|
| level-25.ts:10 | ฯ gloss "and so on" | On its own, ฯ (ไปยาลน้อย) marks a shortened name, as in กรุงเทพฯ. "And so on" is ฯลฯ (ไปยาลใหญ่). A learner who answers "and so on" for ฯ is marked right. | en `['short-form mark', 'abbreviation mark']`. Add to the note: "ฯลฯ, with ล between two ฯ, means and so on." | high |
| level-04.ts:5, levels.ts:46 (also src/ui/Alphabet.tsx:103, outside scope) | ห rule | "In front of another consonant it is silent" is too broad. At level 8, หก puts ห in front of ก, and the ห is said. ห is silent and lends high class only before the low letters with no high partner: ง ญ น ม ย ร ล ว. The chart's "lends this class to a low letter" has the same gap. | Note: "In front of ง ญ น ม ย ร ล ว it is silent and only changes the tone. ไหม, หมา." Focus: "ห. Silent before ง ญ น ม ย ร ล ว, changes the tone." | high |
| levels.ts:171-172 | "A letter in front can also lend its class to the next" | This only holds when the next letter is a low letter with no high partner (ง ญ ณ น ม ย ร ล ว ฬ). Voice has a counterexample: พฤษภาคม prʉ́t-sà-paa-kom keeps ภา mid after ษ, and the ษ card cites that word. Two Voice words are exceptions even though the next letter is one of these: อนุญาต à-nú-yâat (not nù) and ไปรษณีย์ bprai-sà-nii (not nǐi). | Blurb: "A high or mid letter in front can lend its class to a following ง ญ น ม ย ร ล ว, the way ห does in หมา." Add a focus line: "Not every word follows it: อนุญาต is à-nú-yâat." | high |
| levels.ts:261, levels.ts:267, level-28.ts:15-16 | "ร after จ or ส is silent" | This holds when the two letters open one syllable (จริง, เสร็จ, สร้าง). Voice 21 has สรุป sà-rùp: ส takes its own short a, ร is said and takes high class. The rule also covers ศร and ซร (ศรี sǐi), and ทร often reads s (ทราบ sâap). None of those is in Voice yet. | Focus: "จริง, เสร็จ. ร right after จ or ส in one syllable is silent. In สรุป, ส takes a short a and ร is said: sà-rùp." | high |
| level-16.ts:4 | ตั๋ว uses ◌ัว at level 16, but the ◌ัว card is at level 21 (level-21.ts:9) | The parts test passes because ั (level 12) and ว (level 7) each have a card. But level-12.ts:5 teaches ั as "a, before a final", which would read ตั๋ว as dtǎo. Nothing on the card says that ั plus ว is ua. | Add to the note: "ั with ว after it is one vowel, ua. You meet it again in ตัว." Or move the ◌ัว card to level 16. Consider a test that checks multi-part vowels (◌ัว, เ◌ีย, เ◌ือ, เ◌อ, เ◌ิ◌, เ◌ย, เ◌าะ) against the level of their card. | high |
| level-19.ts:10, level-12.ts:10, level-24.ts:7, level-24.ts:14 | Finals of ศ, ษ, ธ | The ศ card's only example is ประเทศ, where ศ is the final and says t. The card calls ศ "high-class s" and never mentions t. Likewise ษ ends อังกฤษ (ang-grìt) and ธ ends ปฏิเสธ (bpà-dtì-sèet), with no note. The level 17 list of finals names only ด ส บ พ ร ล. | ศ: "High-class s. At the end of ประเทศ it says t, like ส." ษ: add "At the end of อังกฤษ it says t." ปฏิเสธ: "ธ at the end says t." | high |
| alphabet.ts:80-106, README.md:40 | "every vowel sign" | The checklist has no ฤๅ (rʉʉ), ฦ (lʉ) or ฦๅ (lʉʉ), and no lengthener ๅ. ฤๅ is still in print: it spells ฤๅษี, the name of ษ the course uses (alphabet.ts:62). The track includes the two retired consonants, so leaving out the retired vowels is inconsistent. | Add ฤๅ at level 24 next to ฤ, with ฤๅษี as its example (a letter card, no bridge), and add ฦ and ฦๅ at level 26 as retired. Or narrow the claim to "every vowel sign in use". | high |

### Low

| file:line | item | issue | proposed fix | confidence |
|---|---|---|---|---|
| levels.ts:162-163 | Tone-mark table | Level 17 never says that ้ on a high letter gives falling, yet ข้าว, ห้า, ให้, เข้า and ผ้า all rely on it. The chart (src/ui/Alphabet.tsx:154-159) covers only mid and low letters. | Add a focus line: "ข้าว, ห้า. ้ on a high letter: falling." | high |
| level-15.ts:7-8, levels.ts:144 | ำ and น้ำ | The ำ card reads am (short), the blurb says "the am in น้ำ", and the next card is náam (long). Nothing explains the difference. | Note on น้ำ: "ำ writes a short am. น้ำ is said long: náam." | high |
| level-23.ts:4 | ญ note order | "At the end of a syllable it says n. ผู้หญิง, ใหญ่." reads as if these words show the final n, but in both ญ is the initial y. | "Same sound as ย at the start: ผู้หญิง, ใหญ่. At the end of a syllable it says n." | high |
| level-15.ts:4-5, levels.ts:145 | ะ card | The card's gloss is "short a", but its only word is และ, where ะ shortens แ (lέ). | Add จะ (jà, Voice 5) or นะ (ná, Voice 1) as the first ะ word, and keep และ to show that ะ also shortens other vowels. | high |
| level-06.ts:8, levels.ts:172 | อย่า at level 6 | The card shows อ in front of ย, next to ย่า (yâa), without saying why อย่า is yàa. The rule comes at level 18. Only four words work this way, all in Voice: อย่า, อยู่, อยาก, อย่าง. | Note at 6: "อ in front is silent and makes it low. Level 18 says why." At 18, add: "Only four words: อย่า, อยู่, อยาก, อย่าง." | high |
| level-00.ts:4, levels.ts:10 | อ "silent seat" | At the start of a syllable, อ writes a glottal stop, the catch that the system writes as ' between syllables. "Silent" is a fair first picture, but it can mislead later. | "A seat for a vowel. At the start it is a soft catch, not written in the romanization." | medium |
| level-25.ts:4, levels.ts:232-233 | Name of ์ | In school grammar the mark is ทัณฑฆาต (tan-tá-kâat; Unicode calls it THANTHAKHAT), and การันต์ is the letter it silences. Many speakers also say การันต์ for the mark. | Keep gaa-ran and add: "Its formal name is ทัณฑฆาต." | medium |
| level-24.ts:12 | ฤ readings | The card gives rʉ́ and rí. ฤ also reads rəə (ฤกษ์ rə̂ək), and its tone comes from the word, so a tone mark on the reading misleads. Voice 24 has ฤดู rʉ́-duu, the clearest case of ฤ standing alone. | "Reads rʉ, ri, or in a few words rəə. ฤดู, พฤหัส, อังกฤษ." | high |
| level-28.ts:4 | เ◌ิ◌ gloss "the vowel in ngən" | The card reads long əə, but ngən is the one word said short (level-28.ts:8 says so). | "the vowel in dəən" | high |
| alphabet.ts:80-106, level-05.ts:9, levels.ts:126 | Vowel shapes with no card | เ◌า (ao) is taught only in notes, while the other multi-part vowels get cards. The short open vowels เ◌ะ (Voice 26 has เตะ dtè) and เ◌อะ never appear, and neither does ก็ (Voice 17, gɔ̂), the common word where ็ sits with no vowel. | Add a เ◌า card at level 13 with เอา. Optionally add a เ◌ะ card with เตะ and a note on ก็. | high |
| levels.ts:8, levels.ts:115-116, levels.ts:141-142 | Level titles use signs before they are taught | หน้า at level 0 (ห, น, ้), เพื่อน in the level 12 title (ื comes at 14, เ◌ือ at 21), and เป็น in the level 15 title (็ comes at 20). | Use พ่อ for เพื่อน in title 12 and และ for เป็น in title 15. Keep หน้า if the cover word is meant as a picture. | high |
| level-11.ts:4, level-11.ts:6, level-14.ts:8 | Letter-card rom pattern | The ร, ล and ซ cards carry the full name (rɔɔ rʉa, lɔɔ ling, sɔɔ sôo). Every other letter card carries the bare syllable (mɔɔ, gɔɔ). | Use one pattern. The bare syllable plus #n is the common one. Add ID_ALIASES if ids change. | high |
| level-22.ts:12, level-23.ts:8, level-00.ts:5, level-15.ts:4 | Pick prompts that fit a distractor | Pick shows en[0] and takes distractors from earlier levels. "I" (ฉัน) also fits ผม, whose gloss "I (male)" accepts "I". "you" (คุณ) also fits เธอ ("you (close)"). By meaning, "aa" also fits า beside อา, and "short a" fits ั beside ะ. | ฉัน en[0] "I, female speaker", as in Voice. คุณ "you, polite". อา "the syllable aa". ะ "short a, after". | high |
| level-25.ts:9 | ช้าๆ spacing | Royal Institute style puts a space before and after ๆ: ช้า ๆ. Casual text often leaves it out. | Keep the spelling, or add to the note: "Formal writing puts a space: ช้า ๆ." | medium |
| levels.ts:72 | Level 7 blurb | "ข plus า plus ว is ข้าว" leaves out ้. | "ข plus ้ plus า plus ว is ข้าว." | high |

## For a native speaker

Quick yes/no questions for Athita. The expected answer is in brackets.

1. ไม้โท: is ไม้ said with a high tone, mái too, like ไม้ "wood"? (yes)
2. Does ฯ alone, as in กรุงเทพฯ, only mark a shortened name, with "and so on" written ฯลฯ? (yes)
3. สรุป: is the ร said, sà-rùp? (yes)
4. พฤษภาคม: is ภา said mid, prʉ́t-sà-paa-kom, not rising? (yes)
5. อนุญาต: is นุ high, à-nú-yâat? (yes)
6. ไปรษณีย์: is ณี mid, bprai-sà-nii? (yes)
7. น้ำ: in normal speech, is the vowel long, náam? (yes, for most speakers)
8. Would a Thai teacher accept การันต์ as the name of the mark ์ itself? (unsure; school grammar says ทัณฑฆาต)
9. ฤกษ์: is it said rə̂ək? (yes)
10. Were you taught to leave a space before ๆ, as in ช้า ๆ? (yes)
