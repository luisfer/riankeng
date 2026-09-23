# The comic. How the panels were drawn, and how to draw more.

The landing draws one woman through one day of speaking Thai. Every panel is a
1024² PNG in `art/scenes`. The style is fixed. New panels are graded against the
shipped ones before they touch the page. This file is the recipe.

## Where the drawings came from

All fifty shipped panels were generated on 22 and 23 Sep 2026 with the
Cursor image tool. The sources sit in `~/Downloads/cursor-generated-assets`.
What shipped:

| stem | source file | series |
| --- | --- | --- |
| door | riankeng-b1-door.png | b, 11:51 |
| bike | riankeng-b2-bike.png | b |
| stall | riankeng-b3-stall.png | b |
| night | riankeng-b6-night.png | b |
| laugh | riankeng-panel-laugh.png | panel, 14:35 |
| coffee | riankeng-extra-coffee.png | extra, 14:41 |
| jasmine | riankeng-extra-jasmine.png | extra |
| mango | riankeng-extra-mango.png | extra |
| passenger | riankeng-extra-passenger.png | extra |
| stairs | riankeng-extra-stairs.png | extra |
| tea | riankeng-extra-tea.png | extra |
| umbrella | riankeng-extra-umbrella.png | extra |
| thanks | thanks-1790095951.png | d, 22 Sep 23:51 |
| sorry | sorry-1790096118.png | d |
| bill | bill-1790096118.png | d |
| nospicy | nospicy-1790096118.png | d |
| howmuch | howmuch-1790096118.png | d |
| toilet | toilet-1790096118.png | d |
| water | water-1790099682.png | d, 23 Sep 00:00 |
| help | help-1790099682.png | d |
| pharmacy | pharmacy.png | d |
| well | well-1790099682.png | d |
| hungry | hungry-1790099682.png | d |
| left | left-1790099682.png | d |
| pricey | pricey-1790099682.png | d |
| tired | tired-1790099682.png | d |
| hotel | hotel-1790099682.png | d |
| heat | heat-1790099682.png | d |
| table | table-1790099682.png | d |
| stop | stop-1790099682.png | d |
| tooth | tooth.png | d |
| train | train.png | q, 23 Sep 09:03 |
| pier | pier.png | q, 09:10 |
| canal | canal.png | q |
| park | park.png | q |
| shrine | shrine.png | q |
| ferry | ferry.png | q |
| temple | temple.png | q, 09:12 |
| soi | soi.png | q |
| krathong | krathong.png | q, 09:37 |
| from | from.png | e, 09:43 |
| praise | praise.png | e |
| slowly | slowly.png | e |
| eaten | eaten.png | e |
| name | name.png | e |
| tasty | tasty.png | e |
| scan | scan2.png | e, 10:07 |
| cash | cash2.png | e |
| rain | rain2.png | q, 10:07 |
| alms | alms3.png | q, 10:09 |

Rejected by Luis: b4-stools, b5-rain, the whole c series, extra-boat,
extra-taxi, extra-stallnight, and d-clock, which nearly repeats coffee. The
first quiet set (pier, temple, canal, park, shrine, soi, ferry) went back for
bare cream paper where a sky or a wall should be. See "Quiet panels".
Rejected on sight: the 22 panels made the same evening (thanks, sorry, well,
bill, nospicy, howmuch, hungry, left, right, stop, toilet, clock, pricey, tired,
heat, help, water, hotel, market, clinic, bath, table). See "What a fail looks
like". The d series redrew those scenes from the recovered prompts. Redrawn
before Luis saw them: hotel and heat (a busy street in perspective), help (two
women who looked alike), water and pharmacy (under the occupied floor), tooth
(the tail on the dentist), stop (read as go ahead). In the q series: train
(under the occupied floor), ferry (an R on the life ring), temple (the older
woman's shawl read as a sari, not Thai dress) and soi (a cat sitting on the
laundry line).

The e series is lettered panels painted to every edge, like the quiet ones:
a wall in a named colour up to the top edge, and "No bare paper anywhere
else" after the balloon. The tail line names the speaker, who is often not
her. Redrawn before shipping: scan (the pay stand printed PAY 2063 and the
snack packets carried fake letters; the redraw asks for "a small stand
showing a black and white square QR pattern" and "snack packets in plain
colours with a simple fruit picture, no writing") and cash (the tail went to
the cashier, a young woman with a ponytail who looked like her; the redraw
has the young male cashier of scan and puts the balloon above her head). In
the second quiet set: rain (a busy street in perspective, speckled wet
asphalt and a vendor drawn past the house style) and alms, twice (first the
monks carried no bowls and the bowl sat on the ground, then two boy novices
with one shoulder bare, where a Thai monk on an alms round covers both). The
one that shipped has one grown monk.

## The prompts, as recovered

The page that set the style, `art/refs/page-strip.png`:

> One newspaper comic page drawn with extreme economy: a single ground line in
> each panel, huge areas of empty paper, figures built from a few sure strokes,
> dot eyes, short mouths, flat color, no shading, no gradients, no background
> clutter. Original adult people only. No child with a round head and a zigzag
> shirt, no beagle, no small yellow bird, no famous comic characters, no copied
> costumes.
>
> Strict grid of 2 columns and 3 rows, six equal panels, thin borders, cream
> gutters. The same woman every time: hair in a simple bun, gold hoop as a tiny
> circle, plain light shirt, dark trousers. Same dot eyes and same height in
> every panel.
>
> Balloons in the first five panels are empty, blank inside, tail toward her.
> No letters, no numbers, no logos.

The revision that fixed the floating ground line and the white backgrounds:

> A spare newspaper comic page, flat color, dot eyes, few strokes, no shading,
> no gradients, no texture. Original adults only. No famous characters, no
> beagle, no zigzag shirt. Same woman in every panel: bun, tiny gold hoop, cream
> shirt, dark trousers.
>
> 2 columns, 3 rows, six equal panels, thin borders, cream gutters between
> panels. Do not draw one floating ground line across empty white space. Each
> panel has a real floor and a real background so the place is obvious.

Every single scene (mango, tea, coffee, the ride, jasmine, the stairs, the
umbrella) started with this prefix, with the current strip passed in as the
reference image, then one sentence of scene, then the balloon:

> One comic panel, exact flat spare style of the reference: thin even black
> contour, flat unshaded color, no gradients, no texture. Same woman: black hair
> in a low bun, small gold hoop, cream short-sleeve shirt, dark trousers. Dot
> eyes. Original people only.

## The character sheet, read off the drawings

- The woman: black hair in a low bun, one small gold hoop, cream short-sleeve
  shirt, dark navy trousers, flat shoes. Dot eyes, a short mouth, a nose line
  and an ear when she is in profile. Same height in every panel.
- The second person is a real person, drawn with the same care: grey hair, an
  apron, a cap, a helmet and orange vest. Never a placeholder.
- A real place: a counter, a cart, a lamp, a door frame, stools, a stairway,
  rain. Three to five props. A floor that meets the figures. Never one floating
  ground line on empty paper.
- Thin even black contour, about 3px at 1024. Flat fills. No shading, no
  gradients, no texture, no drop shadows.
- Flat grounds. Cream paper (near #f5efe2) most of the time; navy at night
  (tea, night); a pale sky (jasmine), peach (laugh), rain grey (umbrella).
  A panel without a balloon is never on bare paper. See "Quiet panels".
- One thin drawn frame, 9 to 16px in from the edge. The crop removes it.
- One white oval balloon in the upper band, thin ink outline, tail to the
  speaker, empty. No letters anywhere. The Thai is lettered in CSS, in Mali,
  from `src/landing/demo.ts`.

## What a fail looks like

The 22 panels of 22 Sep at 22:30 were prompted with "extremely simple geometric
people, oval heads, no nose, no visible ears, sausage limbs, lots of empty cream
space." That prose contradicted the reference and the model followed the prose.
The result: bald oval heads, one figure alone on an empty ground, a bare table
as the whole place, a woman who was not our woman. Later panels used earlier
fails as references and drifted further. Nothing in the pipeline refused them.

Rules that follow from it:

1. Describe the scene, not the style. The style is the reference. Every
   sentence about style is a chance to contradict the drawing.
2. References are fixed: `art/refs/page-strip.png`, `art/scenes/tea.png`,
   `art/scenes/coffee.png`, plus one shipped panel of the same kind of place.
   Never a candidate as a reference.
3. A handful at a time, every one from the same fixed references. Look at each
   beside tea before drawing the next batch.
4. Nothing goes into `art/scenes` without passing the gate and Luis.

## Drawing a new panel

1. Pick a real Voice entry with a shipped clip: `getEntry(id)` and
   `hasShippedClip(id)` must both hold. Tests enforce this.
2. Prompt, in this order, and nothing else:
   the prefix above, verbatim.
   One sentence of scene: who she is with, where, what they hold, what the
   floor and the background are. End it with "all seen straight on" ("seen
   from the side" for a ride). A street in deep perspective comes back busy and
   over-detailed; a flat wall with a door, a plant or a lamp reads like the
   shipped panels.
   "One white oval speech balloon in the upper part of the panel, tail toward
   her, empty inside. No letters, no numbers, no logos anywhere."
   Aspect 1:1. References as listed.
3. Save the PNG as `art/candidates/<stem>.png`. Short stem, one word. The image
   tool moves its output to `~/Downloads/cursor-generated-assets` within
   seconds, renamed `<stem>-<epoch>.png`. Copy the newest by modified time right
   after each batch.
4. `python3 scripts/gen-scenes.py --candidates`. It crops, finds the balloon,
   measures the drawing against the shipped panels and writes
   `art/candidates/sheet.png`: each candidate between tea and coffee at the
   same size, with its numbers and PASS or FAIL. Read the sheet. A pass is a
   floor, not approval.
5. Luis says yes or no per panel.
6. `python3 scripts/gen-scenes.py --approve <stem>` moves it into
   `art/scenes` and prints its `SEEDS` line. Add the line, run
   `npm run scenes`, add the `DEMO` row in `src/landing/demo.ts` with the
   balloon lines and the Mali `em` width, run `npm test`.

## Quiet panels

A quiet panel has no balloon. The course home opens on one, picked at random
from `QUIET` in `src/landing/demo.ts`; each stem is also in `NO_BALLOON` in
`gen-scenes.py`. In a lettered panel the cream paper holds the balloon. With no
balloon, bare paper reads as a drawing left unfinished. So a quiet panel is
painted to every edge: a wall, a sky, water, a floor.

- References: `night`, `train`, `jasmine`, `tea`. All four paint their ground.
  Not coffee or the page: they teach empty cream paper, and the first quiet set
  followed them.
- The scene sentence names every surface with its colour and says it reaches
  the top edge: "a terracotta wall that fills the whole back up to the top
  edge", "a flat peach evening sky above it up to the top edge".
- End with "No bare paper anywhere. No speech balloon. No letters, no numbers,
  no logos anywhere."
- The gate adds a third number, paper, below.

## The gate, in numbers

`gen-scenes.py` measures each panel outside its balloon:

- contour: the share of pixels on a strong edge. How much is drawn.
- occupied: the share of pixels that are not the ground colour. How much of
  the panel the place and the people take.
- paper, quiet panels only: the share of pixels left as bare cream or white.
  Night shows 0.04 and train 0.15; the seven quiet panels Luis sent back showed
  0.28 to 0.48, and their redraws 0.00 to 0.06. The ceiling is 0.20. Quiet
  panels are held to contour and paper, not occupied: a painted wall is the
  ground colour, so occupied reads a full-bleed panel as empty (night: 0.16).

A candidate's balloon is found without a hand seed: the largest white blob that
stays inside the panel (a white coat runs off the edge, a balloon never does)
and is centred in the upper half. Creamier whites are tried only when no pure
white one turns up. On the eleven panels hand-seeded before it existed it lands
in the same balloon every time. The sheet draws the found box in red.

The shipped panels set the floor: tea is the sparsest in contour (0.027), bike
in occupied (0.19). The thresholds sit just under them. Run against the 33
fails of 22 Sep, the gate stops 25. The eight it lets through have a whole
motorbike or a whole stall drawn around the wrong woman. So: a candidate that
fails either number is an empty panel, whatever the prompt said. A candidate
that passes still has to be our woman, in our line, in a real place. That part
is a pair of eyes, and it is not optional.
