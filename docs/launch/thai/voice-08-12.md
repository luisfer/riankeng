# Voice 8 to 12, Thai review

Sat 3 Oct 2026. Scope: `content/words/level-08.ts` to `level-12.ts` and `content/phrases/level-08.ts` to `level-12.ts`. Paths below are under `content/`. Read only: nothing in the course was changed.

## Verdict

The Thai is clean. In the 275 entries of Voice 8 to 12 I found no wrong spelling, tone, vowel length, initial or final, and every phrase romanizes its words exactly as the course's word cards do.
The fixes are in the English: six prompts shared with another card (three credit a word with another meaning), two phrases missing their commonest reading, and one น้ำ that breaks the course's own pattern.

## Counts

| Level | Words | Phrases | Total |
|---|---|---|---|
| Voice 8 | 27 | 16 | 43 |
| Voice 9 | 42 | 24 | 66 |
| Voice 10 | 37 | 17 | 54 |
| Voice 11 | 40 | 19 | 59 |
| Voice 12 | 31 | 22 | 53 |
| Total | 177 | 98 | 275 |

Issues: high 0, medium 8, low 13. For a native speaker: 9.

A shared prompt matters because an English-to-Thai card counts the other card's answer as right ("Also right", `src/ui/Session.tsx:263-268`). So on the jɔɔng card, prompted "book", nǎng-sʉ̌ʉ passes.

## Findings

### Medium (8)

| # | file:line | Thai | rom | English | Issue | Proposed fix | Conf. |
|---|---|---|---|---|---|---|---|
| 1 | `words/level-09.ts:7` | ลูก | lûuk | child, kid, offspring | First gloss "child" is also dèk's (`:12`), and either word passes on either card. ลูก is someone's own son or daughter. Any child is เด็ก. Learners will say lûuk for a child in the street. | First gloss "son or daughter", then "child[, one's own]", "kid", "offspring". Note: "Someone's own child. Any child is dèk." | high |
| 2 | `phrases/level-09.ts:14` | เธอสวย | təə sǔai | she is beautiful | In speech เธอ is mostly "you", to a partner or a close friend. The course's təə (`words/level-00.ts:58`) puts "you" first. "you are beautiful" is marked wrong. | Add "you are beautiful". | high |
| 3 | `phrases/level-11.ts:6` | ถูกไหม | tùuk mái | is it cheap, is this cheap | Mostly means "is that right?". tùuk is also "correct" (`words/level-11.ts:35`). A shopper rarely asks whether a thing is cheap. "is that right" is marked wrong. | Add "is that right", "is it right", "is that correct". Note: "Most often: is that right? For a better price, lót nɔ̀i dâi mái." See native 2. | high |
| 4 | `words/level-11.ts:6` | สีน้ำเงิน | sǐi nám ngən | blue | Every other น้ำ up to here is long: náam at Voice 1, náam dtaan and náam kε̌ng (`words/level-04.ts:34`, `:41`), and sǐi náam dtaan at `:11`, which the 25 Sep pass lengthened to match sugar. Only nám jai (Voice 22) is short. A learner who follows the pattern gets a length slip here. | sǐi náam ngən, with the old id aliased in `aliases.ts`, as the pass did for brown. Unless Athita hears it short (native 1). | high |
| 5 | `words/level-11.ts:40` | ถุง | tǔng | bag, plastic bag | First gloss "bag" is also grà-bpǎo's (`words/level-10.ts:27`), and either passes. ถุง is a plastic or paper bag, กระเป๋า a handbag or a case. ไม่เอากระเป๋า at the till is wrong. | First gloss "plastic bag". Bare "bag" becomes "bag[, plastic or paper]". | high |
| 6 | `words/level-12.ts:5` | จอง | jɔɔng | book, reserve, to book | First gloss "book" is also nǎng-sʉ̌ʉ's, a book (`words/level-02.ts:62`). On this card nǎng-sʉ̌ʉ passes, and jɔɔng passes on that one once met. | Glosses "to book", "reserve". "book" still passes from Thai, since "to" is a stop word. | high |
| 7 | `words/level-10.ts:30` | ไฟ | fai | light, electricity, fire | "light" is also bao's, light in weight (`words/level-13.ts:40`). On bao's card fai passes, and the reverse once bao is met. | "light[, a lamp]" in place of bare "light". | high |
| 8 | `words/level-09.ts:27` | ใจดี | jai dii | kind, kind-hearted | "kind" is also yàang's, a kind or a type (`words/level-17.ts:32`). On yàang's card jai dii passes, and the reverse once yàang is met. | First gloss "kind-hearted", then "kind[, nice]" in place of bare "kind". | high |

I ran each proposed gloss list through `gradeEnglish` and the twin index. Every old answer still passes from Thai, and each shared prompt above goes away.

### Low (13)

| # | file:line | Thai | rom | English | Issue | Proposed fix | Conf. |
|---|---|---|---|---|---|---|---|
| 9 | `words/level-12.ts:6`, `:7` | เช่า, ค่าเช่า | châo, kâa châo | rent | Both first glosses are "rent", verb and noun, so each card takes the other. | châo first "to rent", kâa châo first "the rent". | high |
| 10 | `words/level-08.ts:7` | ต้องการ | dtɔ̂ng gaan | need, to need, require | Missing "want", its commonest sense, formal: ต้องการอะไรคะ. `:16` already takes "do you want it". | Add "want[, formal]". | high |
| 11 | `words/level-08.ts:23` | สามารถ | sǎa-mâat | can, be able to, capable | Formal and written. In speech Thais say dâi. Nothing says so. | First gloss "be able to[, formal]". Note: "Formal. In speech, dâi." | high |
| 12 | `words/level-09.ts:13` | คนแก่ | kon gὲε | old person, elderly person | Plain, and blunt about someone present. "elderly person" suggests a politeness it lacks. | Note: "Plain. About someone present it can sound rude. Polite: pûu sǔung aa-yú, ผู้สูงอายุ." | high |
| 13 | `words/level-09.ts:17` | ตัว | dtua | classifier for animals, body, self | Missing clothes (เสื้อตัวนี้), chairs and tables, the things Voice 10 and 11 count. | First gloss "classifier for animals, clothes, furniture". | high |
| 14 | `words/level-09.ts:37` | มีความสุข | mii kwaam sùk | happy, be happy, content | The note calls it the everyday way to say happy, but dii jai (`words/level-13.ts:10`) is "glad, happy" too. They differ. | Note: "Literally 'have happiness'. Happy as a state. Glad at good news is dii jai." | high |
| 15 | `words/level-09.ts:40` | โง่ | ngôo | stupid, foolish | No register note. Said of a person, it is an insult. | Note: "An insult, said of someone." | high |
| 16 | `words/level-10.ts:13` | ตู้ | dtûu | cabinet, cupboard | Missing "wardrobe", the sense in `phrases/level-10.ts:11`. | Add "wardrobe", "closet" here, and "the shirt is in the wardrobe" there. | high |
| 17 | `words/level-11.ts:30` | ใบ | bai | classifier for leaves, bags, sheets | Missing its commonest uses: cups, glasses, plates, tickets. Sheets of paper take pὲn (`words/level-25.ts:27`). | "classifier for bags, cups, plates, tickets, leaves". | high |
| 18 | `words/level-11.ts:6`, `:37` | สีน้ำเงิน, สีฟ้า | sǐi nám ngən, sǐi fáa | blue; sky blue, light blue | Thai has two blues. Nothing tells the learner sǐi nám ngən is the dark one. | Add "dark blue", "navy" to `:6`, with the note "Dark blue. Light or sky blue is sǐi fáa." See native 9. | high |
| 19 | `phrases/level-11.ts:20` | อุ่นไหม | ùn mái | heat it up?, shall I heat it up | The note says "with anything from the fridge". Not a drink: a ready meal, a toastie, a bun. | Note: "What the 7-Eleven cashier asks with a ready meal or a toastie." | high |
| 20 | `words/level-08.ts:16` | ต้องการไหม | dtɔ̂ng gaan mái | do you need it, do you want it | A phrase in the words file, with no pos and no tags. | pos 'expr' and tag 'modal'. Moving it to phrases renames the id, which needs an alias. | high |
| 21 | `words/level-08.ts:30` | เที่ยว | tîao | go out, travel, trip | Tagged 'modal'. It is not one. | A topic tag, such as 'travel'. | high |

## For a native speaker

Nine quick questions for Athita. Each is a yes or no.

| # | Where | Thai | Question | Then |
|---|---|---|---|---|
| 1 | `words/level-11.ts:6`, `:11` | สีน้ำเงิน, สีน้ำตาล | Is น้ำ long in both, as long as น้ำ on its own? | Yes: finding 4 as written. No: say which is short, and that card keeps nám with a note. |
| 2 | `phrases/level-11.ts:6` | ถูกไหม | In a shop, would anyone ask ถูกไหม to mean "is it cheap?" | No: also replace the card with อันนี้ถูก, an níi tùuk, "this one is cheap". |
| 3 | `phrases/level-10.ts:15` | ขึ้นบ้าน | Apart from ขึ้นบ้านใหม่, a housewarming, would you say ขึ้นบ้าน in Bangkok? | No: drop the card, or make it kʉ̂n bâan mài, "housewarming". |
| 4 | `phrases/level-10.ts:9`, `:10` | นอนที่เตียง, นั่งที่เก้าอี้ | Would you rather say นอนบนเตียง and นั่งเก้าอี้? | Yes: nɔɔn bon dtiang, nâng gâo-îi. bon is Voice 6 (`words/level-06.ts:26`). |
| 5 | `phrases/level-12.ts:21`, `:23`, `phrases/level-09.ts:26` | สแกนที่นี่, เซ็นที่นี่, จอดที่นี่ | Pointing at the spot, would staff and riders say ตรงนี้ rather than ที่นี่? | Yes: dtrong níi, as Voice 6 already has in jɔ̀ɔt dtrong níi (`phrases/level-06.ts:20`). |
| 6 | `phrases/level-08.ts:7` | คุณควรพูดช้า | Is คุณควรพูดช้าๆ the natural way to say "you should speak slowly"? | Yes: kun kuan pûut cháa cháa. cháa cháa is Voice 1 (`words/level-01.ts:41`). |
| 7 | `phrases/level-09.ts:17` | ชอบคนเงียบ | For "I like quiet people", is ชอบคนเงียบๆ more natural? | Yes: chɔ̂ɔp kon ngîap ngîap. |
| 8 | `phrases/level-09.ts:16` | คนแก่คนนี้ | Said about someone within earshot, does คนแก่คนนี้ sound rude? | Yes: drop the card. |
| 9 | `words/level-11.ts:6`, `:37` | สีน้ำเงิน, สีฟ้า | For a plain blue shirt, would you say สีฟ้า? | Yes: add "blue" to sǐi fáa as well, so the prompt "blue" takes either. |

## How it was checked

- Every syllable by hand: tone from consonant class, live or dead syllable, vowel length and tone mark. Then vowel length and quality, initial, final and aspiration, against Paiboon.
- A code-point scan of every Thai and rom string: no stray characters, no tone mark typed before a vowel sign, no ำ built from ํ and า.
- Each phrase split into the course's own word cards, both tracks. The same Thai always has the same rom, and no Thai word in scope has two romanizations anywhere in the course.
- `npm run validate`: content ok. Findings 1 and 5 to 9 come from its list of shared prompts.

Conventions kept and not flagged: kǎo for เขา, mái for ไหม, tâo-rài for เท่าไร, ngən for เงิน, έp for แอป (noted), short hɔ̂ng, dtɔ̂ng and nɔ̀i as Paiboon writes them, ká when calling or asking and kâ on a statement. Thirteen phrases here use pǒm and none uses chǎn. That is section 7 of `docs/launch/01-content.md`, not counted again.

## Outside the scope

- `words/level-01.ts:22`: bpen has only "to be, be, is, am, are". Voice 8 teaches it as one of three cans (`levels.ts:125`, and bpen mái at `phrases/level-08.ts:11`). Add "know how to".
- yàang (`words/level-17.ts:32`) and bao (`words/level-13.ts:40`) are the other halves of findings 8 and 7. The fixes on jai dii and fai clear both.
