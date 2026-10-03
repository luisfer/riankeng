# Voice 18 to 27: Thai review

Sat 3 Oct 2026. Read-only: no content file was changed.

**Scope.** Every Voice entry at levels 18 to 27, 496 in all, and the ten level intros:

- `content/words/level-18.ts` to `level-21.ts` (99 words), and `level-22.ts` to `level-27.ts` (158). The Voice 22 to 27 words live in their own word files, so they are included.
- `content/phrases/level-18.ts` to `level-26.ts` (209).
- `content/idioms.ts` (16, Voice 22) and `content/sayings.ts` (14, Voice 27).
- `content/levels.ts:255-394`, the Voice 18 to 27 intros.

Nothing else adds a Voice 18 to 27 entry: all 496 in `ENTRIES` (`content/index.ts`) come from these files.

Method: the tone of every syllable from consonant class, live or dead syllable, vowel length and tone mark; Paiboon conventions as in `content/system.ts`; every note read before flagging.

## Verdict

The Thai is sound: all 496 spellings are right, the 14 sayings are real and correctly worded, and tones and vowel lengths follow Paiboon. One fix is needed before launch: ทัน is written than in 2 entries, the only "th" in Voice, so a learner who types tan is marked wrong. The rest are glosses: Voice 25 prompts that hide the side of the family the level teaches, a "hello" that is not in the Thai, and missing senses.

## Counts

- Entries checked: 496 (257 words, 209 phrases, 16 idioms, 14 sayings), plus the 10 level intros.
- Issues: 2 high (one cause), 6 medium, 22 low.
- For a native speaker: 18 items.

## Findings

High is wrong Thai, tone or meaning that a learner would learn. Medium is a misleading gloss, unnatural phrasing or a register problem. Low is notes and style.

### High

| file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|
| `content/words/level-23.ts:20` | ทัน | than | in time, keep up | ท is t in this system (tam, tîi, tan-waa-kom). "th" is not an onset in `content/system.ts:87-91` and appears nowhere else in Voice. `gradeThai('than', 'tan')` returns wrong: "It is than". | rom `tan`. Add `'w:than': 'w:tan'` to `content/aliases.ts`. Rename `public/audio/w:than.mp3` and its id in the clip manifest and catalog. | high |
| `content/phrases/level-23.ts:14` | พูดเร็วผมไม่ทัน | pûut reo pǒm mâi than | you speak fast I cannot keep up | The same than. The gloss also runs two sentences together. | rom `pûut reo pǒm mâi tan`, gloss "you speak fast, I cannot keep up". Alias the old id and rename `public/audio/p:pûut reo pǒm mâi than.mp3`. | high |

The validator lets this through because it checks letters, not onsets. A rule that each syllable starts with an entry of `ONSETS` would catch the whole class.

### Medium

| file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|
| `content/phrases/level-19.ts:12` | สบายดีจ้า | sà-baai dii jâa | hello, I am fine[, dear] | "hello" is not in the Thai. สบายดี answers "how are you". As a greeting it is Lao, not Thai. From English, the prompt asks for a hello the answer does not have. | en `['I am fine[, dear]', 'I am well']` | high |
| `content/phrases/level-25.ts:7` | ปู่กับย่าอยู่เชียงใหม่ | bpùu gàp yâa yùu chiang-mài | my grandparents live in Chiang Mai | ปู่ and ย่า are the father's parents, which is what Voice 25 teaches. "my grandparents" fits ตากับยาย (line 8) as well, so from English the learner has to guess. | en[0] "my father's parents live in Chiang Mai". Keep the current gloss as an accepted answer. | high |
| `content/phrases/level-25.ts:8` | ตากับยายมาบ้าน | dtaa gàp yaai maa bâan | my grandparents are coming to the house | ตา and ยาย are the mother's parents. The same guess. | en[0] "my mother's parents are coming over". Keep the current gloss. | high |
| `content/phrases/level-25.ts:9` | น้าเป็นคนใจดี | náa bpen kon jai dii | my aunt is kind | น้า is the mother's younger sibling, of either sex (the word's own note, `content/words/level-25.ts:9`). "my aunt" fits ป้า and อา too. | en[0] "my mother's younger sister is kind". Accept "my aunt is kind" and "my uncle is kind". | high |
| `content/words/level-21.ts:19` | เท็จ | tét | false, untrue | Formal and written: true-or-false tests (จริงหรือเท็จ), law, the news (ข่าวเท็จ). Said in conversation it sounds bookish, and no note says so. | Note: "Formal, as in true or false. In speech, mâi jing." | high |
| `content/words/level-22.ts:22` | ใจดำ | jai dam | cruel, black-hearted | ใจดำ is the one who will not help or share: heartless, mean. "cruel" and "black-hearted" suggest malice. `content/phrases/level-22.ts:15` อย่าใจดำ inherits it as "do not be cruel". | en `['heartless', 'mean', 'unkind']`. Phrase: "do not be so heartless", "do not be mean". | medium |

### Low

| file:line | Thai | rom | English | issue | proposed fix | confidence |
|---|---|---|---|---|---|---|
| `content/words/level-18.ts:9` | เหมือนกัน | mʉ̌an gan | the same, alike | Its commonest use is missing. As a reply it is likewise, me too. After a negative it is either (ผมก็ไม่รู้เหมือนกัน). | Add "likewise", "me too". Note: "pǒm gɔ̂ mâi rúu mʉ̌an gan: I do not know either." | high |
| `content/words/level-18.ts:13` | ดีกว่า | dii gwàa | better | At the end of a sentence it means had better, would rather (กลับบ้านดีกว่า). | Note: "glàp bâan dii gwàa: I had better go home." | high |
| `content/words/level-19.ts:7` | จ๊ะ | já | close polite[, female], affectionate ending | Not female-only. Adults of either sex use จ๊ะ and จ้ะ with children and close friends; women use them more. The clarifier tells a man he cannot. | en[0] "close polite[, to a child or friend]". Note: "Women use it more. Men use it with children." | medium |
| `content/words/level-19.ts:20` | จัง | jang | so, really, very (casual) | The prompt "so" is also ləəi's (therefore, `content/words/level-17.ts:10`), in the validator's shared-prompt list. The card cannot say which so. | en[0] "so[, as in so tasty]" | high |
| `content/words/level-20.ts:6` | ตกลง | dtòk long | agree, deal | Agreeing to a plan, not with an opinion. That is hěn dûai, which shares the prompt "agree". | en[0] "agree[, to a plan]". Note: "To agree with what someone says: hěn dûai." | high |
| `content/words/level-21.ts:10` | สงสัย | sǒng-sǎi | suspect, wonder | Missing the everyday "looks like, probably" before a clause: สงสัยฝนจะตก. | Add "looks like". Note: "sǒng-sǎi fǒn jà dtòk: looks like rain." | high |
| `content/words/level-25.ts:11` | หลาน | lǎan | grandchild, niece, nephew | The note says "One word for the generation below". A grandchild is two generations below. | Note: "Grandchild, niece or nephew: one word for all three." | high |
| `content/words/level-25.ts:25` | เล่ม | lêm | classifier for books | It also counts knives and blades, as in Voice 27's práa lêm ngaam (`content/sayings.ts:8`). | Add "classifier for knives". Note: "práa lêm ngaam: a fine blade." | high |
| `content/words/level-26.ts:26` | เสมอ | sà-mə̌ə | draw, a draw, tie | Its other everyday sense, always, is not mentioned. | Note: "Also always: kít tʉ̌ng sà-mə̌ə, always thinking of you." | high |
| `content/words/level-26.ts:39` | พอดี | pɔɔ dii | just right, exactly, it fits | At the start of a sentence it means as it happens, the usual start of an excuse. | Note: "pɔɔ dii pǒm mâi wâang: as it happens, I am busy." | high |
| `content/phrases/level-19.ts:7` | ไม่ใช่หรอก | mâi châi rɔ̀k | it is not, you know; not at all | "not at all" reads as the reply to thanks (mâi bpen rai). This is a soft denial. | en `['no, it is not', 'that is not it', 'not really']` | medium |
| `content/phrases/level-21.ts:25` | คิดว่าจะมา | kít wâa jà maa | I thought they would come | Thai has no tense. The present reading is as likely, and it is not accepted. | Add "I think they will come", "I think I will come". | high |
| `content/phrases/level-21.ts:26` | เห็นด้วยมาก | hěn dûai mâak | I agree a lot | Not natural English. | "I strongly agree", "I completely agree" | high |
| `content/phrases/level-25.ts:10` | ลุงทำงานที่ตลาด | lung tam-ngaan tîi dtà-làat | my uncle works at the market | ลุง is a parent's older brother. "my uncle" also fits náa and aa, both glossed uncle. | en[0] "my uncle works at the market[, a parent's older brother]" | medium |
| `content/phrases/level-25.ts:11` | หลานสามคน | lǎan sǎam kon | three grandchildren | หลาน is also niece and nephew. | Add "three nieces and nephews", "three nephews", "three nieces". | high |
| `content/phrases/level-26.ts:21` | บางทีเขาไม่มา | baang tii kǎo mâi maa | sometimes they do not come | บางที is also maybe (`content/words/level-26.ts:40`). "maybe they are not coming" is a fair reading and is not accepted. | Add "maybe they are not coming". | medium |
| `content/sayings.ts:9` | ไก่เห็นตีนงู งูเห็นนมไก่ | gài hěn dtiin nguu, nguu hěn nom gài | literal "... the snake sees the hen's breast" | นม here is the teats a hen does not have, as a snake has no feet. "breast" reads as chicken breast, which is อก. | literal "the hen sees the snake's feet, the snake sees the hen's teats" | medium |
| `content/sayings.ts:16` | หมูๆ | mǔu mǔu | literal "pork, pork" | หมู is the pig. The slang comes from the pig as easy prey. | literal "pig, pig" | medium |
| `content/sayings.ts:17` | ช่างมัน | châang man | forget it, whatever | Voice 27 promises every saying a word-for-word reading (`content/levels.ts:386`). This one has none. | literal "let it be" | high |
| `content/levels.ts:276` | ล่ะ | lâ | Voice 19 intro: "Soften, insist, contradict, leave it." | The course glosses lâ as "and you?, what about" (`content/words/level-03.ts:18`, and təə lâ at `content/phrases/level-19.ts:21`). "leave it" is neither. | "ná, sì, rɔ̀k, lâ. Soften, insist, contradict, and you?" | medium |
| `content/levels.ts:362` | | | Voice 25 intro: "Noun, number, classifier. That order, every time." | Not every time. For "a" or "one" the classifier often comes first: บ้านหลังหนึ่ง, a house. | "Noun, number, classifier, when you count. For a house, bâan lǎng nʉ̀ng works too." | high |
| `content/phrases/level-19.ts:5`, `level-20.ts:8`, `level-21.ts:12`, `level-22.ts:8` | ไปสิ, ตกลง, ไม่แน่ใจ, ไม่สบายใจ | bpai sì, dtòk long, mâi nε̂ε jai, mâi sà-baai jai | | Each is also a word card in the same level (`content/words/level-19.ts:22`, `level-20.ts:6`, `level-21.ts:12`, `level-22.ts:15`), with near-identical glosses: the same answer twice in one sitting. | Drop the phrase, or make it a fuller sentence. | high |

## For a native speaker

Questions for Athita. Each can be answered yes or no.

| # | Where | Thai, rom, gloss | Question | Change |
|---|---|---|---|---|
| 1 | `content/words/level-19.ts:17` | นะสิ, ná sì, "see? of course" | For "of course!" (ก็ใช่...สิ), do you say น่ะสิ, with a falling nâ? | If yes: น่ะสิ, nâ sì |
| 2 | `content/phrases/level-19.ts:22` | ผมนะ, pǒm ná, "as for me" | For "as for me", is it ผมน่ะ, with a falling nâ? | If yes: ผมน่ะ, pǒm nâ, or drop the gloss "as for me" |
| 3 | `content/phrases/level-19.ts:11` | มาจ๊ะ, maa já, "come here, dear" | Calling a child over, do you say มาจ้ะ (falling), not มาจ๊ะ (high)? | If yes: มาจ้า, maa jâa, with the course's jâa, or a new word jâ |
| 4 | `content/phrases/level-19.ts:26` | ยินดีนะ, yin-dii ná, "happy to" | Would you answer a thank-you with ยินดีนะ? | If no: drop it |
| 5 | `content/phrases/level-19.ts:38` | เสร็จนะ, sèt ná, "done, okay?" | Does it need แล้ว: เสร็จแล้วนะ? | If yes: sèt lέεo ná |
| 6 | `content/phrases/level-20.ts:23-24` | เที่ยวบ้านเขา, ไม่ว่างเที่ยว | Do both need ไป: ไปเที่ยวบ้านเขา, ไม่ว่างไปเที่ยว? | If yes: add bpai |
| 7 | `content/phrases/level-20.ts:25` | ไปบาร์นิดหน่อย, bpai baa nít-nɔ̀i, "go to a bar for a bit" | Is this natural for a short visit to a bar? | If no: the line you would say |
| 8 | `content/phrases/level-21.ts:17` | จากนั้นเข้าใจ, jàak nán kâo jai, "after that I understood" | Does it need ก็: จากนั้นก็เข้าใจ? | If yes: jàak nán gɔ̂ kâo jai |
| 9 | `content/phrases/level-21.ts:27` | ไม่เชื่อแต่ฟัง, "I do not believe it but I listen" | Would a Thai say this? | If no: ฟังไว้แต่ไม่เชื่อ, or drop it |
| 10 | `content/phrases/level-21.ts:28` | เรื่องนี้ยาว, "this is a long story" | For "it's a long story", is เรื่องมันยาว the usual line? | If yes: rʉ̂ang man yaao |
| 11 | `content/phrases/level-22.ts:14` | ใจกว้างนะ, jai gwâang ná, "be generous, yeah" | Said alone, is it a remark, "you are generous", rather than "be generous"? | If yes: gloss "that is generous of you" |
| 12 | `content/phrases/level-22.ts:20` | ทำบุญแล้วดีใจ, "I made merit and I am glad" | Do people say ทำบุญแล้วสบายใจ instead? | If yes: tam bun lέεo sà-baai jai, "I made merit and I feel at peace" |
| 13 | `content/phrases/level-23.ts:7` | สำนวนนี้สวย, "this saying is beautiful" | Do you call a saying สวย? | If no: the word you use, such as เพราะ or คม |
| 14 | `content/phrases/level-23.ts:14` | พูดเร็วผมไม่ทัน | Would you add ฟัง: พูดเร็ว ผมฟังไม่ทัน? | If yes: pûut reo pǒm fang mâi tan |
| 15 | `content/phrases/level-26.ts:13` | เสมอหนึ่งหนึ่ง, sà-mə̌ə nʉ̀ng nʉ̀ng, "a one all draw" | Is a 1-1 draw said เสมอหนึ่งต่อหนึ่ง? | If yes: sà-mə̌ə nʉ̀ng dtɔ̀ɔ nʉ̀ng |
| 16 | `content/words/level-26.ts:33` | ลูกโทษ, lûuk tôot, "penalty" | In football talk, is a penalty usually จุดโทษ? | If yes: จุดโทษ, jùt tôot |
| 17 | `content/words/level-22.ts:8` | น้ำใจ, nám jai | The course writes น้ำ short in น้ำใจ and สีน้ำเงิน (nám), long in น้ำปลา, น้ำแข็ง, อาบน้ำ (náam). Is that how you say them? The grader calls the other length a slip. | If no: make them agree |
| 18 | Clips of `content/phrases/level-24.ts:4` and `level-25.ts:20` | เท่าไร, tâo-rài | In these clips, does เท่าไร sound like เท่าไหร่, with a low rài? | If no: a clip text override as ไหม has (`scripts/gen-audio.py:26`), for every เท่าไร line |

kǎo (เขา) appears in seven of these phrases. The clip question in `docs/launch/01-content.md` section 1 covers it.

## Checked and clean

- Spelling: all 496 Thai strings are right, including the twelve months, ปฏิเสธ, ศิลปิน, นักธุรกิจ, ผู้รักษาประตู and every saying.
- Tones: the syllables with a hidden leader are right (ตลาด dtà-làat, ตำรวจ dtam-rùat, ประโยค bprà-yòok, สรุป sà-rùp, สนาม sà-nǎam, เสมอ sà-mə̌ə, ฉลอง chà-lɔ̌ɔng), and so are the linking syllables in ตั๊กแตน dták-gà-dtεεn, ศิลปิน sǐn-lá-bpin, กรกฎาคม gà-rá-gà-daa-kom and พฤศจิกายน prʉ́t-sà-jì-gaa-yon.
- Vowel length follows Paiboon, with the short spoken vowels included: ก็ gɔ̂, ต้อง dtɔ̂ng, เงิน ngən, แต่ง dtὲng, แข่ง kὲng, แผ่น pὲn, บอล bɔn.
- Spoken forms kept on purpose: tâo-rài for เท่าไร, kǎo for เขา, châat for ชาติ (noted at `content/words/level-27.ts:13`).
- Sayings: all 14 are real, in standard wording, with the right meaning. The heart idioms are natural Thai, and the sǐa jai dûai ná note (sympathy, not an apology) is right.
- Notes: all read. Only the lǎan note and the two intro lines above are wrong.
