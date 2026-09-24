# TRUE 82 · Tag Ballot handoff

Written 2026-09-05, updated 2026-09-24, for the Claude Code session that wires the new voting UI into true82.net AND restyles both screens. Read `AGENT_BRIEF.md` first; it says what is fixed and what you are free to change. Everything below was decided with the owner across a long design session. Two reference prototypes ship with this document and are the visual and behavioral spec:

- `tag_ballot.html`: the results-screen roster (five drafted players) with voting built in.
- `rater.html`: the standalone Player Bonuses page (replaces the one-question-at-a-time page).

Both are self-contained HTML written for artifact hosting (no doctype/head/body of their own; the styles and script are inline). They use dummy data. Nothing in them talks to the API.

House laws still apply: no em-dashes in shipping copy, never touch the game engine or site_data.json, SQL for D1 is pure statements with no comment lines.

## 1. What this replaces and where it lives

Current site has four voting surfaces: the one-question "Help balance the game" widget on the home page and near the bottom of results, the standalone `/bonuses/` page (five-question sessions), the featured home poll, and the per-chip vote strips on the results roster (v49.5 to 49.7).

New arrangement:

- **Results screen.** The roster cards under "Your five" become the ballot. Each card shows the player's tags; tapping a tag opens the question sheet; a "+" tag opens the add-a-tag picker. The "Vote: did we get it wrong?" widget at the bottom of results goes away (its markup and its five-diamond session are no longer needed there). The per-chip vote strips are replaced by this.
- **Standalone `/bonuses/` page.** Becomes "The Record": a feed of the same cards, ordered by controversy and by fame, with a search box to rate any drafted player and season. See section 7.
- **Home page.** Unchanged by this handoff. Owner's separate plan is a one-line "most disputed" ticker above the mode buttons; not part of this wiring.
- **Draft screen.** Untouched. Tags there stay read-only. (The red strikethrough "anti" chips are being retired everywhere; see section 4.)

Owner's engagement fact: only about half of finishers scroll to the roster. The roster's first card is above the fold on a normal phone, which is why the ballot lives there and not in a lower module.

## 2. The card (results and rater share one component)

Layout, top to bottom, locked by the owner after several rounds:

1. Header row, vertically centered: position badge + name on the left (`G Tyrese Haliburton`), then the season line under it in mono (`23-24 · Pacers`). On the right, the engine value alone, no label, in a display serif (DM Serif Display, 46px, gold). The value is the hero number of the card. No tier word, no meter, no "VALUE" caption, no games/minutes line.
2. Box score as one inline mono line: `20.1 PTS  3.9 REB  10.9 AST  1.2 STL  0.7 BLK  24.6 USG%`. Small caps labels. No TS% (not in site data; if it is ever added it goes in this line).
3. Tag row.

Card padding 10/12/9, cards 8px apart. Fonts in use on the site already: Barlow Condensed (tags, headings), Barlow (body), IBM Plex Mono (captions). DM Serif Display is the one new face, used only for the value.

## 3. Tags: the whole visual language

Three kinds of thing in a tag row, in this order:

- **Settled tags** (gold keycap; negative traits red keycap). Trait order is the ROSTER_TRAITS order. Keycap style: solid fill, 4px darker bottom edge, faint top highlight, presses down 3px on tap. This is the site's existing chip look made more physical so it reads as a button.
- **"?" tags** (same keycap, plus a badge on the top-right corner: dark circle, gold ring, gold "?"). One symbol, two sources: (a) the scout marked the trait unsure for this season, or (b) the trait is on the player but the crowd is split. Either way it means "unsettled, your vote counts here." "?" tags always come after the settled ones.
- **"+" tag** (dashed outline, dim, last). Opens the picker.

Not on the card, by decision: dashed outlines for absent traits, counts, tier meters, the scout persona, legends, instructions, and any red strikethrough "anti" chip.

Overturn state: if the user answers NO on a settled tag, the tag becomes hollow (2px gold outline, transparent fill) with a small ✕. It stays visible so the person sees their dispute recorded. A "?" tag the user answers NO to simply leaves the card and reappears in the picker under "Open questions."

"You weighed in" state: any tag the user has voted on gets a 2px blue ring 4px outside the tag (`--ring:#5B93E6`). Blue is used for nothing else.

Color has one meaning each: gold = the site's yes, red = a bad trait, blue = you, the "?" badge is neutral (dark with gold ring) so red never means "disputed." The NO button in the sheet is red because red means no there; it never appears on the card.

## 4. Traits

The 12 core traits stay as they are in `functions/api/traits.js` ROSTER_TRAITS. Chip labels used in the prototypes:

| id | chip | question in the sheet | one-liner shown? |
|---|---|---|---|
| three-point-shooter | 3PT | Was 2024 Haliburton a 3PT shooter? | no |
| super-three-point-shooter | GRAVITY | ... a gravity shooter? | yes: "So feared from deep that he warps the whole defense." |
| rim-pressurer | RIM+ | ... a rim pressurer? | yes: "Lives at the rim and the foul line." |
| off-ball-scorer | OFF-B | ... an off-ball scorer? | yes: "Scores without the ball in his hands: cuts, screens, relocations." |
| tough-shot-maker | TSHOT | ... a tough shot maker? | no |
| playmaker | PLAY | ... a playmaker? | no |
| iso-defender | ISO-D | ... an iso defender? | no |
| team-defender | TEAM-D | ... a team defender? | no |
| switchable-defender | SWITCH | ... switchable on defense? | yes: "Guards guards and bigs alike." |
| rim-protector | RIM-P | ... a rim protector? | no |
| clutch | CLUTCH | ... clutch? | no |
| off-court-knucklehead | KNUCK | ... an off-court knucklehead? | no |

Gravity implies 3PT: when GRAVITY is on, do not also show 3PT on the card (site already does this).

Question copy rule: the headline asks the trait's own bar, never a raised one. "Was 2022 DeRozan the best clutch scorer in the league?" is wrong; "Was 2022 DeRozan clutch?" is right. Year in the question is the season end year, matching the existing widget ("2024 Tyrese Haliburton").

**Negative traits (new, owner-approved direction, ids to be created):** the red strikethrough "anti" system is retired. Absence of a positive is not a negative. Instead, bad things are their own traits, voted yes/no like everything else, shown as red keycaps:

- `hunted` chip HUNTED, question "Was he hunted on defense?", one-liner "Opponents go at him on purpose: switch onto him, post him, run him off screens." (Name is a placeholder the owner may rename.)
- `ball-stopper` chip BALL-STOP, "Was he a ball stopper?", one-liner "The ball goes in and does not come out."
- `stat-padder` chip STAT-PAD, "Was he a stat padder?" (exists today as a polling question; would become a core trait.)
- `off-court-knucklehead` already core.

Owner's ceiling is four negatives, probably three. Anti flags: the engine does nothing with `anti` today, so stop emitting and rendering them; no score change results.

Rim protection must be label-driven (owner ruling: box stats never capture it).

## 5. Interactions

- Tap a tag (settled or "?") → bottom sheet: player line, the question in big condensed caps, optional one-liner, three buttons: YES (gold), NO (red), NOT SURE (dashed, quieter). After answering: the tally as words ("812 people have voted · 54% say yes · you said no"), a bar, a pill ("Ruling stands" or "Disputed · flips at 60%"), Change vote, Done. Same control the site's existing widget uses, so nothing new to learn.
- Tap "+" → sheet titled "Add a tag" with "<name>, <season>. What else was he?", then a grid of tiles grouped Offense / Defense / Reputation, each tile the chip name plus the one-liner for the six non-obvious traits. If the user has said NO to a "?" tag, an "Open questions" group appears first with those. Tapping a tile opens the question sheet for that trait. A YES puts the tag on the card with the blue ring. Footer link to the Player Traits page for full definitions.
- Card order of tags after a vote: settled first, then "?", then "+". A newly added tag joins the settled group.
- Toasts: "3PT added to Haliburton" / "Noted: not clutch" / "Noted".
- First-visit hint: about 0.7s after fonts load, a white glove flies in, taps the first settled tag on the first card twice (the tag presses), moves to the "+" and taps it once, fades. About 3.4s total. Plays once per browser (`localStorage` key `tb-hint`), stops instantly on any tap, honors reduce-motion by skipping the fly-in but still showing the taps. Pure CSS + ~30 lines of script, pointer-events none. The "Replay the tap hint" link in the prototypes is demo-only.

Krug rules the owner wants applied when in doubt: every tap a mindless unambiguous choice (tap count is not a consideration); no legends, no instructions; one meaning per color; conventions over invention; grandpa test.

## 6. Data and API wiring

Read side, per drafted player-season, from `op=labels` (traits.js v49.9, patched in the previous handoff):

- `labels[key]` hits with `s:1` and `anti:false` → settled tags. Precedence already applied server-side: community consensus > editorial desk > scout yes.
- `open[key][traitName] = qid` → "?" tags (scout unsure). Also mark a settled tag "?" when the community tally is inside the disputed band (see threshold).
- `qids` → the question id for each tag, `slug(name)-<end year>-<trait-id>`, needed to vote.

Vote side: one `op=vote` per answer with the existing qid, source tag `card` (results) or `record` (rater). YES / NO / IDK map to the existing values. NOT SURE is IDK. "Change vote" re-submits. Existing rate limits (1200ms spacing, 40 per 10 minutes) are fine for one-tap-at-a-time; there is no batch "seal" any more.

Add-a-tag on a trait with no question row yet: the qid is deterministic, so the client can vote on it; the server should INSERT OR IGNORE the trait_questions_v1 row on first vote if it does not exist (the scout migration only created rows for yes/unsure claims). Check how `op=vote` handles an unknown qid before wiring; if it rejects, add the create-on-first-vote path.

Threshold: a tag is "?" when the yes share is under 60% or the vote count is under the minimum (owner to set; 60% and a small floor like 10 votes is the working assumption). A "?" from a scout close call becomes settled when yes crosses 60% with the floor met; a settled tag drops off the card and back to the picker if yes falls under 40% (hysteresis, so tags do not flicker). The sheet's "flips at 60%" line is where the rule is stated to users.

Engine question the owner has not settled: whether a "?" tag that started as a scout yes still counts toward the score while disputed. Working assumption: count it if it started as yes, do not count it if it started as a close call. Do not touch the engine for this handoff; only the display and votes.

Negative trait ids (`hunted`, `ball-stopper`, `stat-padder` as core) need: ROSTER_TRAITS entries, QID_RE-safe ids, and scout claims if the owner wants the backfill re-run for them (it was not run for these; they will start as "no report" until voted or re-scouted).

## 7. The standalone rater (`rater.html`, final version)

Not the results card repeated in a list. The results card is compact because it sits under a score; the standalone page has the whole screen, and the owner's repeated feedback on it was "too cluttered, the eye does not know where to land." The final prototype is deliberately bare. Reproduce that restraint even if the styling changes.

Page structure, top to bottom:

- One dim line top left: feed name and position ("Most disputed · 1 of 6"). Top right: a small outlined "Find a player" button that reveals the search field only when tapped. No page title, no eyebrow, no always-open search box.
- Search: typing two or more characters lists matches from the drafted-player pool (use `op=roster` or the pick export, never the whole site_data). Tapping a name shows that player's pool seasons; tapping a season loads it as "Your pick" at the front of the feed. A season with nothing on file shows "Nothing on him yet. Tap anything below to start."
- The player: name in large condensed caps (44px), season and team and position in mono under it, box score as one dim mono line. No engine value on this page (owner's call: "certainly does not need the value").
- The tags that are on him, as full-word keycaps, large (50px tall), with nothing around them: no panel, no heading, no caption. "?" badge on unsettled ones, ordered settled first.
- A small dim label "Not on him", then every other trait as a ghost pill: dark tonal fill, no border, muted text, negatives in a faint red tint. Ordered offense, defense, reputation, with no group headings.
- Tap any tag, lit or ghost, and a single panel opens directly under that cluster: the question in big caps ("Was 2024 Haliburton clutch?", trait word in gold or red), the one-line meaning (always shown on this page, there is room), the tally line and bar if votes exist, and YES / NO / NOT SURE. The tapped tag gets a white outline. One panel open at a time. Answering closes the panel, moves the tag between the two clusters, and shows a toast with Undo. Tapping the same tag again closes the panel.
- Fixed bottom bar: a small previous button and a big "Next player ›" that wraps to the top of the feed.
- Feed order: "Most disputed" first (closeness to the threshold weighted by vote count; needs a small read endpoint, suggested `op=disputed`, returning top N qids with tallies), then "Biggest names" (most-drafted player-seasons this week from the pick counts).
- First-visit glove hint: one tap on the first lit tag, about two seconds, once per browser.

Full-word tag labels for this page (results keeps the abbreviations): 3PT shooter, Gravity, Rim pressure, Off-ball scorer, Tough shots, Playmaker, Iso defender, Team defender, Switchable, Rim protector, Clutch, Hunted, Ball stopper, Stat padder, Knucklehead.

The scout persona does not appear on either page. It lives on the record page and home ticker (future), where "the scout says X and 2,000 fans disagree" is the fight.

## 8. Things deliberately not built yet

- Record page per claim (`/record/<slug>/<trait>`), the URL a fanbase gets sent to. Owner's after-vote screen on the current `/bonuses/` page is the template.
- Home ticker.
- Scoring card rework (Talent / Fit / Reputation, every line naming its labels) and the label tax itself. Waits on the tax going live.
- Narrated losses on the season screen.

## 9. Files

- `tag_ballot.html`: results roster prototype (spec).
- `rater.html`: standalone page prototype (spec).
- `verdict_mockups.html`: static mockups of home, results, scoring card, season, record page from earlier in the session; superseded on the roster card by `tag_ballot.html` but still the reference for the scoring card and record page ideas.
- Previous handoff: `0013_scout_claims.sql` + patched `traits.js` v49.9 (`op=labels` with scout layer and `open` map). Must be applied before this UI has anything to read.
