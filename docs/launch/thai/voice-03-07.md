# Voice 3 to 7, Thai review

Written Sat 3 Oct 2026. Scope: `content/words/level-03.ts` to `level-07.ts` and `content/phrases/level-03.ts` to `level-07.ts`, 370 entries. Paths below drop `content/`.

## Verdict

The Thai is right. No spelling, tone, vowel or consonant in the 370 entries is wrong for the course's system, and the notes are accurate. The English needs a pass: 12 glosses mislead, mostly English homonyms (too, right, when, then, before, long, just) that let the twin rule or the grader pass a word with another meaning, plus congee for ข้าวต้ม, now for ปัจจุบัน, and เดี๋ยวมา without "I'll be right back". Eight questions for Athita.

## Counts

- Entries checked: 370. Words 244, phrases 126. Voice 3 66, Voice 4 110, Voice 5 85, Voice 6 60, Voice 7 49.
- Issues: high 0, medium 12, low 16. They touch 32 entries here, and one fix lands on `words/level-00.ts:46`.
- For a native speaker: 8.

How a gloss bites. Only `en[0]` is shown, as the prompt. Writing from English, `twinAnswer` (`src/engine/twins.ts:35-43`) marks right, as "Also right", any card that lists this card's prompt among its glosses, if it is met or sits no higher. Reading into English, `gradeEnglish` drops stop words such as just and to (`src/engine/grader-en.ts:50`) and treats too as also (`:93`). So an English homonym anywhere in a gloss list passes a word with another meaning. I applied every proposed gloss below in memory: each collision closes, and the answers a learner should give still pass.

Checked and clean:
- Thai spelling and encoding: no stray character, no tone mark stored before its vowel, no split ำ.
- Tone of every syllable from consonant class, live or dead syllable and mark, leading consonants included: ขนม kà-nǒm, ตลาด dtà-làat, สนาม sà-nǎam, อร่อย à-rɔ̀i, ถนน tà-nǒn.
- Vowel length and quality, finals, and g/k, bp/p, dt/t, j/ch.
- Two tones follow speech, not spelling, as Paiboon writes them: rài in เท่าไร and เมื่อไร. Only a note is missing (first low row).
- The Voice 3 to 7 intros in `levels.ts` are right. ao … nɔ̀i is already on the earlier native list.
- Register: 9 phrases here use pǒm. The earlier review's Voice 1 line covers them, and writing from English accepts chǎn. The two phrases with particles are right: kâ on the request, ká on the question.
- `npm run validate`: content ok.

## Findings

### Medium

| file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|
| `words/level-03.ts:7` | เมื่อไร | mʉ̂a-rài | when | dtɔɔn and mʉ̂a (Voice 7) are also prompted "when", as conjunctions. On their cards mʉ̂a-rài passes as Also right, so a question word stands in for "at the time when" | en `['when?']`. "when" still grades right here, as the grader drops the question mark | high |
| `words/level-04.ts:15` | ข้าวต้ม | kâao dtôm | rice porridge, boiled rice soup, congee | ข้าวต้ม is rice soup, whole grains in broth. Congee, the smooth porridge, is jóok (โจ๊ก), another dish | en `['rice soup', 'boiled rice soup', 'rice porridge']`, drop congee. Note: "Whole grains in broth. Smooth congee is jóok." | high |
| `words/level-04.ts:74` | เกิน | gəən | too, over, exceed | dûai (Voice 1) is prompted "too", meaning also. dûai passes on this card, gəən passes on dûai's once met, and the also/too synonym grades "also" right for เกิน | en `['too much', 'over', 'exceed']`. "too" alone then fails, since the grader reads it as also | high |
| `words/level-05.ts:41` | กลางคืน | glaang kʉʉn | night, at night, midnight hours | Midnight is tîang kʉʉn (`:63`). A learner who types "midnight" here is told It means "midnight hours", the closest gloss | Drop midnight hours, add night-time | high |
| `words/level-06.ts:5` | ขวา | kwǎa | right | châi (Voice 1, right as correct) passes on this card. kwǎa passes on nə́'s card (Voice 19, prompt "right") | en `['right[, the side]', 'right-hand side']`. The prompt reads "right, the side" | high |
| `words/level-07.ts:8` | ตอนนั้น | dtɔɔn nán | then, at that time | jàak nán, same level, also has "then", so "after that" passes for "at that time" | en `['at that time', 'back then', 'then[, at that time]']` | high |
| `words/level-07.ts:10` | เมื่อก่อน | mʉ̂a gɔ̀ɔn | before, in the past, formerly | The prompt "before" is a gloss of gɔ̀ɔn (Voice 1), which passes here. เมื่อก่อน is "in the past", never "before X" | en `['in the past', 'formerly', 'before[, in the past]']` | high |
| `words/level-07.ts:13` | นาน | naan | a long time, long | The gloss "long" is the prompt of yaao (ยาว, Voice 11), so naan passes there: length for time, the classic mix-up | Replace long with `'long[, of time]'` | high |
| `words/level-07.ts:20` | เพิ่ง | pə̂ng | just, just now, only just | The grader drops "just", so this card grades "now" and "currently" right, and "only", which is kε̂ε. "recently" fails | en `['just[, recently]', 'recently', 'just']` | high |
| `words/level-07.ts:34` | ปัจจุบัน | bpàt-jù-ban | now, the present | Means the present, nowadays, currently, and is formal. Prompted "now", it takes the place of dtɔɔn níi | en `['nowadays', 'at present', 'the present', 'currently']`. Note: "Formal. For now, dtɔɔn níi." | high |
| `phrases/level-07.ts:10` | หลังจากงาน | lǎng jàak ngaan | after the event, after work | After work, the end of the working day, is lǎng lə̂ək ngaan (หลังเลิกงาน). หลังจากงาน reads as after the event | Drop after work | medium |
| `phrases/level-07.ts:15` | เดี๋ยวมา | dǐao maa | coming in a moment, just a moment | Misses the everyday sense, "I'll be right back", which the grader fails. "Coming!" to someone who calls is maa lέεo, or dǐao bpai | en `['I will be right back', 'be right back', 'back in a moment', 'just a moment']` | high |

### Low

| file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|
| `words/level-03.ts:7`, `:12` | เมื่อไร, เท่าไร | mʉ̂a-rài, tâo-rài | when, how much | The rom has the spoken low tone. ไร is written mid, as in อะไร à-rai. Right as Paiboon writes it, but no note says so, as ฉัน's does | Note: "Written ไร, said rài, as the everyday spelling เท่าไหร่ shows." เมื่อไหร่ for the other. The clip is native item 1 | high |
| `words/level-03.ts:14`, `phrases/level-03.ts:34` | หรือ, ไปหรือ | rʉ̌ʉ, bpai rʉ̌ʉ | or, really?; oh you are going? | At the end of a sentence it is said rə̌ə (เหรอ). rʉ̌ʉ there sounds read aloud | Add to the note: "At the end, said rə̌ə (เหรอ): bpai rə̌ə." | high |
| `words/level-03.ts:16` | เปล่า | bplào | no, not at all, nothing | Misses plain or empty, the sense in náam bplào (Voice 4) | Note: "Also plain, empty: náam bplào." | high |
| `words/level-03.ts:6` | ไหน | nǎi | which | ที่ and ซึ่ง (Voice 17, the relative which) pass here once met | en[0] `'which?'` | high |
| `words/level-04.ts:82` | ถั่ว | tùa | peanuts, beans, nuts | ถั่ว is beans and nuts in general. A peanut is tùa lí-sǒng (ถั่วลิสง) | en `['beans', 'nuts', 'peanuts']`. Note: "On a dish, often crushed peanuts." | high |
| `words/level-05.ts:28`, `words/level-06.ts:35` | เงินทอน, เปลี่ยน | ngən tɔɔn, bplìan | change | One prompt, two unrelated words: each passes on the other's card | ngən tɔɔn en[0] `'change[, money back]'`. bplìan en[0] `'to change'` | high |
| `words/level-05.ts:36` | วินาที | wí-naa-tii | second | tîi sɔ̌ɔng (Voice 25, the ordinal) passes here once met | en[0] `'second[, of time]'` | high |
| `words/level-05.ts:37` | เวลา | wee-laa | time | ที tii (Voice 0, time as in once more) passes here, and wee-laa passes on tii's card | On `words/level-00.ts:46`, en[0] `'time[, an occasion]'` | high |
| `words/level-06.ts:7` | เลี้ยว | líao | turn, to turn | tii's gloss turn, as in my turn, passes here | en[0] `'turn[, a corner]'` | high |
| `words/level-06.ts:8` | จอด | jɔ̀ɔt | stop, park | bpâai (Voice 12, a bus stop sign) passes here once met | en[0] `'stop[, a vehicle]'` | high |
| `words/level-06.ts:9` | รถยนต์ | rót yon | car, automobile | Formal and written. In speech a car is rót | Note: "Formal. In speech, rót." | high |
| `words/level-06.ts:24` | หน้า | nâa | in front, front, page | Misses its commonest sense, face, and next after a time word (dʉan nâa, Voice 7) | Add face. Note: "After a time word, next: dʉan nâa." | high |
| `words/level-06.ts:30` | ทาง | taang | way, path, route | yàang (Voice 17, way as manner) passes here once met | en[0] `'way[, a route]'` | high |
| `words/level-07.ts:11` | จากนั้น | jàak nán | after that, then | Its gloss then is the prompt of ก็ gɔ̂ (Voice 17), so jàak nán passes there | then becomes `'then[, next]'` | high |
| `words/level-07.ts:12` | สุดท้าย | sùt táai | finally, in the end, last | Its gloss last is the prompt of tîi lέεo (Voice 24, last month), so the final one passes for the previous one | last becomes `'last[, final]'` | high |
| `words/level-06.ts:23`, `words/level-05.ts:60` | ข้าง, จะ | kâang, jà | next to; about to | The grader drops "to": kâang grades "next" right, jà grades "about" right | Drop next to and about to, or keep "to" when it ends a gloss | high |

## For a native speaker

For Athita. Each question takes a yes or a no.

| # | Where | Question | Then |
|---|---|---|---|
| 1 | Clips `w:tâo-rài`, `w:mʉ̂a-rài` | Play them. Does the last syllable sound like ไหร่, low, the way you say it? | If no, voice the 13 entries with เท่าไร or เมื่อไร (7 here) from เท่าไหร่ and เมื่อไหร่, with clip text overrides as ไหม has (`scripts/gen-audio.py:25-29`). Otherwise a listening card plays mid and grades low |
| 2 | เก้า, Voice 1, 5, 10 | Do เก้า (nine) and ก้าว (step) sound the same? | If yes, the vowel is long: gâo would be gâao, as เช้า is cháao (`words/level-05.ts:38`). เท้า, táo in Voice 10 and 13, is the same case |
| 3 | เปล่า, 6 entries in Voice 3, 4, 21 | Is the vowel in เปล่า as long as in ข้าว? | If yes, bplào would be bplàao |
| 4 | `phrases/level-04.ts:33` | Answering กินข้าวหรือยัง, do you say ยังไม่กิน, not only ยังไม่ได้กิน? | If no, yang mâi dâi gin, ยังไม่ได้กิน |
| 5 | `phrases/level-06.ts:10` | Would you ask ไกลหรือใกล้ for "is it far or near?", rather than just ไกลไหม? | If no, glai mái, ไกลไหม. The pair stays: glai and glâi are Voice 0 words, and glâi mâak, glai mâak follow at `:11-12` |
| 6 | `phrases/level-06.ts:16` | With no place named, does ไปได้ยังไง sound like "how do I get there?", not "how could you go?!"? | If no, name a place, bpai sà-nǎam bin dâi yang-ngai, or rely on bpai yang-ngai (Voice 3) |
| 7 | `phrases/level-07.ts:16` | For "I go to work every day", is ทุกวันไปทำงาน natural, rather than ไปทำงานทุกวัน? | If no, bpai tam-ngaan túk wan. The id changes and the clip needs regenerating |
| 8 | `phrases/level-03.ts:17` | Is ทำไมคุณเรียนภาษาไทย natural as it is, without ถึง? | If no, tam-mai kun tʉ̌ng rian paa-sǎa tai, ทำไมคุณถึงเรียนภาษาไทย |
