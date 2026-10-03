# 08. Thai review: the whole course

Sat 3 Oct 2026. Six reviews, one per slice of the course:
- [01-content.md](01-content.md): the 40 demo cards, the 25 preview words, Voice 0 to 2;
- [thai/voice-03-07.md](thai/voice-03-07.md), [thai/voice-08-12.md](thai/voice-08-12.md), [thai/voice-13-17.md](thai/voice-13-17.md), [thai/voice-18-27.md](thai/voice-18-27.md);
- [thai/script.md](thai/script.md).

Each slice doc has every finding with file:line and the proposed fix. This page is the summary and the one list for Athita.

## Verdict

- **The Thai is right.** All 1,638 Voice entries and all 205 Script entries are spelled correctly. Tones, vowel length, initials and finals follow the course's system, apart from the four errors below. The 14 sayings are real and correctly worded.
- **Four real errors**, each a wrong sound or tone a learner would learn. They are fixed on this branch, with aliases so saved progress carries over:
  1. ขโมย was kà-mooi. It is **kà-mǒoi**: ข leads ม, so the syllable is rising. Two cards and the Voice 14 intro.
  2. ทัน was than. It is **tan**: ท is t in this system, and "th" appeared nowhere else. Two cards.
  3. The Script level 2 title wrote ไม้โท as mâi too. It is **mái too**.
  4. The Script cards for เ แ โ showed short e, ε, o. A bare sign is long: **ee, εε, oo**.
- **One grading bug, also fixed:** หวัด (a cold, the illness) was glossed "cold", so from Voice 16 the grader accepted wàt for "I am cold". It is now "a cold".
- **The rest is English, about 45 glosses.** An English word with two meanings (too, right, cold, light, kind, which, fine, book, child) lets the grader accept another card's Thai as "Also right". Each slice doc lists them with a tested fix. They don't block launch, but they are the next content pass.
- **Rules stated too broadly in Script:** silent ห, a letter lending its class, silent ร after ส, and the finals of ศ ษ ธ. These are medium priority. Details in [thai/script.md](thai/script.md).

## Counts

| Slice | Entries | High | Medium | Low | For Athita |
|---|---|---|---|---|---|
| Demo, preview, Voice 0 to 2 (doc 01) | 235 plus 65 public cards | 0 | 0 | 2 | 6 |
| Voice 3 to 7 | 370 | 0 | 12 | 16 | 8 |
| Voice 8 to 12 | 275 | 0 | 8 | 13 | 9 |
| Voice 13 to 17 | 262 | 3 | 9 | 20 | 11 |
| Voice 18 to 27, idioms, sayings | 496 | 2 | 6 | 22 | 18 |
| Script, alphabet, intros | 205 plus 29 intros and 86 rows | 2 | 7 | 15 | 10 |
| **All** | **1,843** | **7** | **42** | **88** | **62** |

The 7 high findings come down to the 5 fixes above. ขโมย and ทัน each appear twice, and หวัด counts once.

## Fixes the validator should catch next time

- **An onset check.** Each syllable must start with an onset from `content/system.ts`. That would have caught "than", since the validator checks letters but not where syllables start.
- **A multi-part vowel check in Script.** ตั๋ว uses ◌ัว at level 16, but its card is at level 21. The tests split vowels into single signs, so they miss it.
- **Shared prompts.** `npm run validate` already lists the 64 English prompts that two Voice answers share. Most medium findings come from that list plus homonyms elsewhere in the gloss list.

## For Athita

About 60 yes or no questions came out of the six reviews. They are not equally urgent. This order puts what learners hear and what the grader enforces first. Each question links to its slice doc for the exact card and the change it would trigger.

### Before the first post (about 15 minutes, with the course open on Luis's account)

1. Play the clips of **ฉัน chǎn** (preview, Voice 1) and **เขา kǎo** (Voice 0). Do they say a rising tone, or the high tone of speech, chán and káo? If high, a listening card plays one tone and grades another. (01 §1)
2. Play **เท่าไร tâo-rài** and **เมื่อไร mʉ̂a-rài**. Does the last syllable sound like ไหร่, low? If not, those 13 clips get re-voiced from เท่าไหร่ and เมื่อไหร่. (voice-03-07 #1, voice-18-27 #18)
3. **ขโมย**: is it said kà-mǒoi, rising? (Fixed on this branch; this confirms it.) (voice-13-17 #1)
4. **ไม้โท**: is ไม้ high, mái too? (Fixed; confirm.) (script #1)
5. **น้ำ**: is it long, náam, in น้ำ, สีน้ำเงิน and สีน้ำตาล, and short in น้ำใจ? The course is inconsistent today. (voice-08-12 #1, voice-18-27 #17, script #7)
6. **เก้า** and **ก้าว**: do they sound the same? If yes, nine is gâao, not gâo. The same goes for เท้า, táao, and เปล่า, bplàao. (voice-03-07 #2, #3)
7. **คอมพิวเตอร์**: is the last syllable falling, dtə̂ə? If yes, check มอเตอร์ไซค์ and มิเตอร์ too. (voice-13-17 #1)
8. A quick read of the five lines in 01 §1: ตื่นสาย for "woke up late", จอดตรงนี้, ลงชื่อรอ, "Speak with Thainess", and ao … nɔ̀i.

### The first week (about 30 minutes)

- **Spoken forms**: ดิฉัน dì-chán; น่ะสิ and ผมน่ะ with a falling nâ; มาจ้ะ; อินเตอร์เน็ต. (voice-13-17 #2, #3; voice-18-27 #1 to #3)
- **Natural phrasing**: ยังไม่กิน; ไกลไหม; ทุกวันไปทำงาน; ทำไมคุณถึงเรียน; นอนบนเตียง; ตรงนี้ for pointing; ช้าๆ and เงียบๆ; คนแก่คนนี้; เอายา or ขอยา; มีเหตุฉุกเฉิน; ลมแรง and แดดแรง; เยอะ. (voice-03-07 #4 to #8, voice-08-12 #2 to #9, voice-13-17 #5 to #11)

### Later, with the next content pass

- The rest of voice-18-27 (#4 to #16): phrases that may need ไป, ก็ or แล้ว, the football words, and whether a saying is สวย.
- Script #2 to #10: ฯ against ฯลฯ, สรุป, พฤษภาคม, อนุญาต, ไปรษณีย์, ฤกษ์, the name of ์, and the space before ๆ.

## Also from the reviews

- **"pǒm" in a woman's voice:** 81 Voice phrases use pǒm, read by a female voice. Add the Voice 1 line from 01 §7 now. A male voice (Niwat) for those lines comes later.
- **Script audio:** Script cards have no clips of their own and fall back to the device's voice. 01 §7 proposes reusing Voice clips plus overrides.
- **Glosses:** the medium findings in each slice doc are ready to apply as one batch. Each proposed gloss was checked against `gradeEnglish` and the shared-prompt list, and old right answers still pass.
