# Voice 13 to 17, Thai review

Written Sat 3 Oct 2026. Read-only: no content file was changed.

Scope: `content/words/level-13.ts` to `level-17.ts` and `content/phrases/level-13.ts` to `level-17.ts`. That is Voice 13 Feelings and health, 14 Trouble and courtesy, 15 Work, study, tech, 16 Weather and Thailand, and 17 Connectors.

## Verdict

The Thai is clean. None of the 262 entries has a misspelling, a misplaced mark or a wrong vowel sign, and every romanization but one follows Paiboon and the course's own rules. The one tone error is ขโมย, written kà-mooi on two cards and in the Voice 14 focus line. It should be kà-mǒoi. The weak spot is the English. Some first glosses are English words with two meanings (cold, light, kind, which, fine), and the twin check then marks an unrelated Thai word "Also right".

## Counts

- Entries checked: 262. Words 156 (38, 27, 34, 27, 30 for Voice 13 to 17), phrases 106 (24, 19, 20, 13, 30).
- Issues: 32. High 3, medium 9, low 20.
- For a native speaker: 11 questions.

How I checked. I worked out each syllable's tone from its consonant class (counting leading consonants), whether it is live or dead, its vowel length and its mark. I checked vowel and consonant letters against Paiboon, compared each word with the same Thai elsewhere in the course, and ran a script over the Thai strings for mark order, a split sara am and stray characters. It found none.

The English I checked against the grader. A card's prompt is `en[0]` (`src/ui/Session.tsx:416`). If the answer matches another card that lists that prompt among its glosses, the session counts it right and says "Also right. This card is ..." (`src/engine/twins.ts:35-43`, `src/ui/Session.tsx:263-268`). So a gloss with two English meanings lets a wrong word through. `npm run validate` passes.

## Findings

### High

| # | file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|---|
| 1 | `content/words/level-14.ts:6` | ขโมย | kà-mooi | thief; steal | Wrong tone. ข leads ม across a short a, so โมย takes high class: live, no mark, rising. The Royal Institute dictionary reads it ขะ-โหฺมย. The course uses the same rule in kà-nǒm, tà-nǒn and sà-nǎam, and the Script note for ขนม teaches it. A learner who writes what Thais say, kà-mǒoi, is graded wrong on both listening and English cards. | kà-mǒoi. Make the same fix in the Voice 14 focus line, `content/levels.ts:205`. The id changes, so add `w:kà-mooi` to `w:kà-mǒoi` in `content/aliases.ts`, and rename `public/audio/w:kà-mooi.mp3` and its id in `src/audio/clip-manifest.json`. | high |
| 2 | `content/phrases/level-14.ts:5` | มีขโมย | mii kà-mooi | there is a thief; we have been robbed | The same tone error. Also, "we have been robbed" is โดนขโมย, doon kà-mǒoi. มีขโมย says there is a thief about. | mii kà-mǒoi, with the alias and clip rename as in row 1. Drop "we have been robbed". | high |
| 3 | `content/words/level-13.ts:35` | หวัด | wàt | cold; a cold | The prompt "cold" reads as temperature. From Voice 16, the twin check marks wàt "Also right" on nǎao's prompt "cold". So a learner who says pǒm wàt for "I am cold" is told it is right. หวัด only means the illness. | `['(a) cold', 'common cold']`. The card then shows "a cold", the English grader still accepts "cold", and the twin no longer matches nǎao. | high |

### Medium

| # | file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|---|
| 4 | `content/words/level-13.ts:40` | เบา | bao | light; gentle; soft | The prompt "light" is also fai, light from a lamp (Voice 10), so fai is marked right here. "soft" is the prompt of ɔ̀ɔn (Voice 9), soft to the touch, so once bao is met it is marked right there. | `['gentle', 'light[, not heavy]', 'softly']` | high |
| 5 | `content/words/level-13.ts:12` | เสียใจ | sǐa jai | sad; sorry; regret | "sorry" is the prompt of kɔ̌ɔ tôot (Voice 1), so sǐa jai is marked right for an apology. เสียใจ means sadness, regret or sympathy, never "excuse me". The phrase at `content/phrases/level-13.ts:14` has the same "I am sorry". | `['sad', 'sorry[, regretful]', 'regret']`, with the note: "Sad, or sorry for a loss. To apologise, kɔ̌ɔ tôot." | high |
| 6 | `content/words/level-15.ts:9` | นายจ้าง | naai jâang | boss; employer | นายจ้าง is the employer in a contract, or of a maid or a driver. Staff do not call their manager นายจ้าง. They say hǔa-nâa (`:20`). | `['employer', 'boss']`, with the note: "The employer, as in a contract. The boss at work is hǔa-nâa." | high |
| 7 | `content/words/level-17.ts:11` | ที่ | tîi | that[, which]; which | Bare "which" is the prompt of nǎi (Voice 3), the question word. After Voice 17, tîi is marked right for "which?". | Replace `'which'` with `'which[, relative]'`. | high |
| 8 | `content/words/level-17.ts:24` | ซึ่ง | sʉ̂ng | which; that | The prompt "which" reads as the question word, and nǎi is marked "Also right" here. ซึ่ง is also formal. | `['which, formal', 'which[, relative]', 'that[, relative]']`, like hàak's `'if, formal'`. | high |
| 9 | `content/words/level-17.ts:32` | อย่าง | yàang | kind; way; like; example | Each gloss is also another word's prompt. "kind" is jai dii (Voice 9), which is marked right here. "like" is chɔ̂ɔp (Voice 2) and "way" is taang (Voice 6), and once yàang is met it is marked right on both. "example" is ตัวอย่าง, dtua-yàang. | `['kind[, sort]', 'sort', 'type', 'way[, manner]', 'like[, such as]']` | high |
| 10 | `content/phrases/level-16.ts:11` | ผมชอบเมืองไทย | pǒm chɔ̂ɔp mʉang tai | I like Thailand; I like Thai towns | เมืองไทย is a name for Thailand. "I like Thai towns" accepts a wrong reading. | Drop "I like Thai towns". | high |
| 11 | `content/phrases/level-17.ts:8` | ก็ได้ | gɔ̂ dâi | fine; alright; that works | The prompt "fine" reads as "I am fine". sà-baai dii, dii and sà-baai are marked right here, and gɔ̂ dâi is marked right on sà-baai dii's prompt "fine". ก็ได้ gives way: OK then, that works too. | `['fine[, if you like]', 'alright then', 'that works too']` | high |
| 12 | `content/phrases/level-17.ts:19` | ดังนั้นผมกลับ | dang nán pǒm glàp | so I went back | ดังนั้น is written style, and its clause needs จึง. Without it the sentence sounds cut off. In speech a Thai would say ผมก็เลยกลับ. | ดังนั้นผมจึงกลับ, dang nán pǒm jʉng glàp, with the note: "Written. Speech says pǒm gɔ̂ ləəi glàp." The id changes, so alias it and point the existing `p:dâng nán pǒm glàp` alias (`content/aliases.ts:28`) at the new id. | high |

### Low

| # | file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|---|
| 13 | `content/words/level-13.ts:11` | ตลก | dtà-lòk | funny; a joke | ตลก means funny. As a noun it means a comedian. A joke is เรื่องตลก or มุก. | `['funny', 'comic']` | high |
| 14 | `content/words/level-13.ts:6`, `:22` | เจ็บ, ปวด | jèp, bpùat | hurt; in pain / ache; hurt | Both accept "hurt", and the twin check accepts either. Thai splits them: ปวด is an ache inside (head, stomach, tooth), เจ็บ is sore or sharp (a wound, the throat). The level's phrases follow this, bpùat hǔa and jèp kɔɔ, but no note tells the learner. | Add a note to each: "An ache inside: bpùat hǔa." and "Sore or sharp: jèp kɔɔ." | high |
| 15 | `content/words/level-13.ts:25` | ท้อง | tɔ́ɔng | stomach; belly | A common sense is missing: pregnant. kǎo tɔ́ɔng means "she is pregnant". | Note: "Also pregnant: kǎo tɔ́ɔng." | high |
| 16 | `content/words/level-13.ts:41` | แรง | rεεng | strong; hard; forceful | "hard" is the prompt of kε̌ng (Voice 9), hard as in solid, and rεεng is marked right there. | `'hard[, with force]'` | high |
| 17 | `content/words/level-14.ts:19` | อ้วก | ûak | vomit; throw up; be sick | Casual. At a clinic the word is อาเจียน, aa-jian. | Note: "Casual. To a doctor, aa-jian." | high |
| 18 | `content/words/level-14.ts:30` | เชิญ | chəən | please go ahead; after you; do come in | The core sense, to invite, is missing. | Add `'invite'`. | high |
| 19 | `content/words/level-14.ts:31` | แล้วแต่ | lέεo dtὲε | up to you; whatever you like; as you please | "It depends" is missing, though it is the most common sense when the word stands alone: แล้วแต่ราคา, it depends on the price. | Add `'it depends'`. | high |
| 20 | `content/words/level-15.ts:17` | วาง | waang | put down; place; set down | "place" is the prompt of sà-tǎan-tîi (Voice 20), a venue, and waang is marked right there. | `'to place'` | high |
| 21 | `content/words/level-15.ts:22` | กฎ | gòt | rule; law | Law is กฎหมาย, gòt-mǎai. | `['rule', 'regulation']` | high |
| 22 | `content/words/level-15.ts:25` | ลา | laa | take leave; day off | "day off" is a noun, wan yùt (`:26`), but ลา is a verb. "Say goodbye", as in ลาก่อน, is missing. | `['take leave', 'take a day off', 'say goodbye']` | high |
| 23 | `content/words/level-15.ts:29` | นักเรียน | nák-rian | student | This is a pupil at a school or a language school. A university student is นักศึกษา, nák-sʉ̀k-sǎa. It affects `content/phrases/level-15.ts:8` too. | Note: "A pupil. At university, nák-sʉ̀k-sǎa." | high |
| 24 | `content/words/level-15.ts:35` | ตก | dtòk | fail; fall | The core sense is fall (fǒn dtòk, Voice 16). It means fail only of an exam, sɔ̀ɔp dtòk. | `['fall', 'fail[, an exam]']` | high |
| 25 | `content/words/level-15.ts:36` | กับ | gàp | with | "And" between nouns is missing, though it is the usual spoken "and". The course uses it that way at `content/phrases/level-17.ts:17`. | Add `'and'`. | high |
| 26 | `content/words/level-17.ts:25` | คือ | kʉʉ | is; namely; that is | The prompt "is" is a gloss of bpen (Voice 1), which is marked right here. คือ identifies or defines. | `['that is[, namely]', 'is', 'namely']` | high |
| 27 | `content/words/level-17.ts:26` | ระหว่าง | rá-wàang | between | "During" is missing: ระหว่างทาง, on the way. | Add `'during'`. | high |
| 28 | `content/words/level-17.ts:15`, `:20`, `:23`, `:24`, `:27` | ดังนั้น, แม้ว่า, เนื่องจาก, ซึ่ง, ทั้งนี้ | dang nán, mέε wâa, nʉ̂ang jàak, sʉ̂ng, táng níi | therefore; even if; due to; which; in this regard | These are formal or written, but only hàak says so. | Add a note to each with the spoken form: gɔ̂ ləəi; tʉ̌ng jà; prɔ́ wâa; tîi. táng níi is written only. Speech has táng níi táng nán, all things considered. | high |
| 29 | `content/phrases/level-14.ts:11` | ผมท้องเสีย | pǒm tɔ́ɔng sǐa | I have an upset stomach | ท้องเสีย is diarrhoea, as the word card says (`content/words/level-14.ts:18`). An upset stomach can also mean nausea. | `['I have diarrhoea', 'I have an upset stomach']` | high |
| 30 | `content/phrases/level-17.ts:12` | แม้ว่าแพงผมก็เอา | mέε wâa pεεng pǒm gɔ̂ ao | even if it is expensive I will take it | This mixes formal แม้ว่า with casual เอา. In speech: ถึงจะแพงผมก็เอา. | Note: "แม้ว่า is formal. In speech: tʉ̌ng jà pεεng pǒm gɔ̂ ao." | high |
| 31 | `content/phrases/level-17.ts:15` | โดยรถไฟ | dooi rót fai | by train | Formal, as on a ticket. In speech: นั่งรถไฟไป, nâng rót fai bpai. | Add a note with the spoken form. | high |
| 32 | `content/phrases/level-17.ts:26` | ว่าจะมา | wâa jà maa | said they would come | The reading most Thais hear first is missing: ว่าจะ as "was going to". ว่าจะมา can mean "I was going to come". | Add `'was going to come'`. | medium |

## For a native speaker

Questions for Athita. Each one can be answered yes or no.

| # | Item | Where | Question |
|---|---|---|---|
| 1 | คอมพิวเตอร์ | `content/words/level-15.ts:15`, kɔm-piu-dtəə | Do you say the last syllable with a falling tone, เต้อ, so kɔm-piu-dtə̂ə? If yes, check มอเตอร์ไซค์ and มิเตอร์ too (`content/words/level-06.ts:15`, `:44`). They use the same dtəə. |
| 2 | ดิฉัน | `content/words/level-15.ts:37`, dì-chǎn | In normal speech, do you say dì-chán, with a high tone, as with ฉัน? If yes, give it the same spoken-tone note as ฉัน. |
| 3 | อินเทอร์เน็ต | `content/words/level-15.ts:13`, `content/phrases/level-15.ts:7`, in-təə-nét | Do most people say in-dtəə-nét, with the ต of the common spelling อินเตอร์เน็ต? If yes, keep the rom, which matches the spelling and the clip, and add a note. |
| 4 | สำนักงาน | `content/words/level-15.ts:6`, sǎm-nák-ngaan | Is นัก high here, as in นักเรียน, and not low (sǎm-nàk)? I expect yes. |
| 5 | ผมเจ็บ | `content/phrases/level-13.ts:6` | Would you say ผมเจ็บ on its own for "I am in pain"? Or only เจ็บ or เจ็บมาก? |
| 6 | เอายาหน่อย | `content/phrases/level-13.ts:17` | At a pharmacy, is เอายาหน่อย natural for "some medicine, please"? Or would you say ขอยาหน่อย? |
| 7 | นี่ฉุกเฉิน | `content/phrases/level-14.ts:9` | Is นี่ฉุกเฉิน natural for "this is an emergency"? Or would you say มีเหตุฉุกเฉิน? |
| 8 | โรงเรียนอยู่ใกล้ | `content/phrases/level-15.ts:10` | Is it natural with nothing after ใกล้? Or would you say อยู่ใกล้ๆ? |
| 9 | มีลมมาก | `content/phrases/level-16.ts:7` | For "it is very windy", do you say มีลมมาก? Or ลมแรงมาก, using lom rεεng from the same level? |
| 10 | วันนี้แดดมาก | `content/phrases/level-16.ts:15` | For "very sunny today", do you say แดดมาก? Or แดดแรง? |
| 11 | มาก or เยอะ | `content/phrases/level-16.ts:12`, `content/phrases/level-15.ts:18` | In นักท่องเที่ยวมาก and งานมากไป, would you say เยอะ instead of มาก? The course does not teach เยอะ yet. |
