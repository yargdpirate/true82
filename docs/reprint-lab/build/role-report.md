# Role report

Generated 2026-09-25 05:20 from build-css.js (styles.css), tokenize.html (style blocks and SVG attributes inside the snapshots) and dev/verify.html (what shows on screen).

Verify: 99 snapshots, identity mismatches 0, missed colors 0, fixed on purpose 15 groups, literals left outside a role 1.

Examples marked not live are the duel, arena and league screens, hidden on the public site. The Tribune is left out (see the end).

Colors are today's values (the fallback inside each var()). "@ 0.3" is an alpha the tokenizer keeps. Declarations counts literals in the CSS; on screen counts element and property pairs across all snapshots.

| role | meaning | colors today | declarations | on screen |
|---|---|---|---:|---:|
| ground | page background of the dark site | `#101418` `#101418 @0` `#101418 @0.88` `#0B0F13` | 5 | 3208 |
| ground-2 | recessed or secondary panels on dark | `#161D26` `#11161D` `#141A21` `#1A2027` `#1C1A16` `#151B21` +5 | 14 | 2112 |
| ground-3 | tertiary fills, hovers, wells on dark | `#1A2129` `#232B34` `#3A352A` `#1A222C` `#212B36` | 6 | 91 |
| overlay | scrims behind sheets and overlays | `#1E1608 @0.93` `#050608 @0.97` `#1E1608` `#050608` `#06080B @0.87` `#0A0C10 @0.94` +1 | 7 | 53 |
| paper | cream paper slips and cards | `#F4ECDD` `#FFFFFF` | 8 | 2151 |
| paper-2 | tinted or darker paper | `#CFC2A6` | 1 | 64 |
| line | borders and rules on dark | `#6A5A3A` `#6E5530` `#4A4434` `#808080 @0.25` `#2A3540` `#F2EDE4 @0.02` +6 | 23 + 20 routed | 19201 |
| line-paper | rules and hairlines on paper | `#232A4E @0.35` `#232A4E @0.3` `#232A4E @0.24` `#232A4E @0.5` `#232A4E @0.55` `#232A4E @0.14` +4 | 11 | 850 |
| text | primary text on dark | `#E8E4D8` `#F2EDE4` `#F3EAD8` `#C9D2DA` `#D9D5CE` | 7 + 1 routed | 3272 |
| text-2 | secondary or dim text on dark | `#8B98A5` `#9AA0A6` `#555C63` `#6C6048` `#F4ECDD @0.62` `#A8B0B8` +4 | 15 | 1960 |
| ink | primary text and ink on paper | `#232A4E` `#232A4E @0.08` `#232A4E @0.12` | 26 | 2213 |
| ink-2 | secondary text on paper | `#5B5E73` `#4A4E66` | 13 | 1859 |
| accent | the primary brand and action color | `#FFB52E` `#F2A81F` `#FFB52E @0.32` `#FFB52E @0.55` `#FFB52E @0.35` `#FFB52E @0.18` +24 | 79 | 6702 |
| accent-hi | lighter highlight of the accent | `#FFC957` `#F8B647` `#FFE79D @0.72` `#FFE9B0` `#F8B647 @0.09` `#FFD683 @0.95` +15 | 34 | 1299 |
| accent-edge | darker edge and extrusion of accent keycaps | `#9A6A12` `#9E5A0F` `#E89A1C @0.24` `#74500D` | 20 + 2 routed | 1046 |
| accent-ink | text and icons printed on an accent fill | `#1C1608` `#2A1A05` `#131313` `#1A1206` `#082A1A` `#2A1A05 @0.16` +2 | 23 + 18 routed | 1506 |
| metal | bronze ornament lines, frames, pips | `#B98A4F` `#B98A4F @0.14` `#9E5A0F` `#B98A4F @0.3` `#B98A4F @0.55` `#E89A1C @0.22` +2 | 14 | 6056 |
| bad | negative, loss, NO | `#F65058` `#FF5A4A` `#FF4133` `#FF8A77` `#F06A54` `#D9422D` +17 | 45 | 250 |
| bad-edge | darker edge of a bad fill | `#B8323B` `#8C2317` `#7E1D14` `#A33A32` `#C92F3B` | 15 | 28 |
| bad-ink | deep bad text, or text on a bad fill | `#B42A36` `#2B0D09` `#C92F3B` `#2A0703` `#D63A45` `#FFFFFF` | 13 | 85 |
| good | positive, win, success | `#7AE08D` `#8FB99B` `#2FA866` `#4FC487` `#1B6E40` `#00875A` +2 | 9 | 80 |
| you | the riso blue 'you' marker | `#3FAE5A` `#0078BF` `#3FAE5A @0.18` `#0078BF @0.22` | 8 | 80 |
| offset | fluorescent pink offsets and pink ink | `#C8217A` `#FF48B0` `#FF48B0 @0.7` `#E0348E` `#FF48B0 @0.5` `#D6208A` +4 | 20 | 498 |
| sun | sunflower ink on paper, the paper world's yes | `#FFB511` `#FFB511 @0.9` `#FFB511 @0.95` `#FFB511 @0` `#FFB511 @0.35` `#FFB511 @0.3` | 12 | 996 |
| sun-edge | sunflower keycap edge | `#C7870A` `#E0981A` | 8 | 369 |
| sun-ink | deep sunflower text on paper | `#8A5D00` | 2 | 1 |
| shadow | black-alpha shadows | `#000000 @0.6` `#000000 @0.5` `#000000 @0.45` `#000000 @0.55` `#000000 @0.75` `#000000 @0.7` +7 | 49 | 3164 |
| light | white-alpha highlights and sheens | `#FFFFFF @0.35` `#FFFFFF` `#FFFFFF @0.45` `#FFFFFF @0.25` `#FFFFFF @0.2` `#FFFFFF @0.7` +13 | 45 | 1847 |
| fixed | never changes with the theme | `#000000` `#000000 @0` `#E0531A` `#FF8A1E` `#FFD54A` `#FFFFFF` +8 | 27 | 0 |

## Site variables routed by use (role-fixes.json)

A site variable that does two jobs keeps one role where it is defined, and the uses below are sent to a better role as var(--t-role, var(--site-var)), so today's look is unchanged.

| variable | in | role | why |
|---|---|---|---|
| `var(--ink)` | color | accent-ink | --ink is the page ground, but all 17 `color: var(--ink)` uses are dark labels on amber or maple fills (.confirm-btn, .btn-primary, .startover-btn, .slot-badge, .slot.filled, .ls-token, .ls-pos, .ls-swap.is-moving/.is-here, .tab.on, .cap-info, .rs-got, .rs-close:active, .reel-done, .reel-day.w, .content-page a.btn-block). Tokenized as var(--t-accent-ink, var(--ink)) so a light-ground theme keeps these labels dark. |
| `var(--tunnel)` | color | accent-ink | .sort-chip.active prints its label in --tunnel on an amber fill: that is the accent-ink job, not ground-2. |
| `var(--tunnel-2)` | border | line | --tunnel-2 is ground-3 (wells, hovers) but 20 of its uses are borders and rules (player-row, pick-card, slot, ledger-row, board-cell, skip-btn, site-foot, reel-head, reel-act, rs-foot). Matches border, border-top, border-color and the other border-* properties. Fills, the rail stroke and the rs-ref-btn extrusion stay ground-3. |
| `var(--maple)` | box-shadow | accent-edge | The only two box-shadow uses of --maple are the 2px bottom extrusion under amber slabs (.rules-overlay .rs-got, .reel-done): the accent keycap edge, so they follow accent-edge, not the bronze ornament color. |
| `var(--rr-c)` | `.rr .rr-eyebrow` color | text | The results-page section eyebrows (YOUR FIVE, THE ROOM SAYS...) sit on the dark table, not on a paper slip, but print in --rr-c (paper). Paper-colored text on the ground vanishes when a theme makes the ground light, so this use follows text (the same call the audit made for .rr .bref-credit, text-2). |

## ground

Page background of the dark site.

- `#101418` x2: `:root {--ink}`, `:root {--ink} [snapshot style]`
- `#101418 @0` x1: `.pool-fade {background}`
- `#101418 @0.88` x1: `.pool-cue {background}`
- `#0B0F13` x1: `body {background} [snapshot style]`
- on screen (3208): `span.cap-cost {background-color}`, `span.cap-season {background-color}`, `span.year-face {background-color}`, `i.ls-pos {border-top-color}`, `i.ls-pos {border-right-color}`, `i.ls-pos {border-bottom-color}`, `i.ls-pos {border-left-color}`, `div.tray {background-color}`

## ground-2

Recessed or secondary panels on dark.

- `#161D26` x2: `.card {background} [snapshot style]`, `.skel {background} [snapshot style]`
- `#11161D` x2: `.card {background} [snapshot style]`, `.skel {background} [snapshot style]`
- `#141A21` x2: `.traits-module {background} [snapshot style]`, `.traits-prompt {background} [snapshot style]`
- `#1A2027` x1: `:root {--tunnel}`
- `#1C1A16` x1: `.duel-toast {background} [not live]`
- `#151B21` x1: `:root {--panel} [snapshot style]`
- `#131920` x1: `:root {--card} [snapshot style]`
- `#0E1319` x1: `.controls {background} [snapshot style]`
- `#131A21` x1: `.v-unsure {background} [snapshot style]`
- `#0D1217` x1: `.bar {background} [snapshot style]`
- `#11171D` x1: `.trait-legend {background} [snapshot style]`
- on screen (2112): `div.player-row.cap-row {background-color}`, `div.player-row {background-color}`, `div.player-row.cap-row.off {background-color}`, `div.player-row.off {background-color}`, `div.mpb-meter::after {background-image}`, `div#modePanel.mode-panel.plq-frame.plq-slim {background-color}`, `section.ticket {background-color}`, `input#poolSearch.pool-search {background-color}`

## ground-3

Tertiary fills, hovers, wells on dark.

- `#1A2129` x2: `.traits-module {background} [snapshot style]`, `.traits-prompt {background} [snapshot style]`
- `#232B34` x1: `:root {--tunnel-2}`
- `#3A352A` x1: `button.presti-spin:disabled, button.more-modes:disabled {background}`
- `#1A222C` x1: `.skel .sk {background} [snapshot style]`
- `#212B36` x1: `.skel .sk {background} [snapshot style]`
- on screen (91): `div.sk {background-image}`, `div.player-row.cap-row.sel {background-color}`, `button#skipTeam.skip-btn.presti-spin {background-color}`, `div.player-row.sel {background-color}`, `button#skipEra.skip-btn.presti-spin {background-color}`, `section#traitsModule.traits-module {background-image}`, `button#rerollYears.skip-btn.presti-spin {background-color}`, `a.rs-got.rs-ref-btn {box-shadow}`

## overlay

Scrims behind sheets and overlays.

- `#1E1608 @0.93` x1: `.hh-overlay {background}`
- `#050608 @0.97` x1: `.hh-overlay {background}`
- `#1E1608` x1: `.hh-overlay.hh-reveal {background}`
- `#050608` x1: `.hh-overlay.hh-reveal {background}`
- `#06080B @0.87` x1: `.rules-overlay {background}`
- `#0A0C10 @0.94` x1: `.reel-overlay {background}`
- `#090B12 @0.58` x1: `.bt-backdrop {background}`
- on screen (53): `div.hh-overlay.in.hh-mid {background-image}`, `div.reel-overlay.riso {background-color}`, `div.hh-overlay.in.lit {background-image}`, `div#btBackdrop.bt-backdrop.on {background-color}`, `div#btBackdrop.bt-backdrop {background-color}`, `div#rulesOverlay.rules-overlay {background-color}`, `div.hh-overlay.in {background-image}`

## paper

Cream paper slips and cards.

- `#F4ECDD` x7: `.reel-overlay.riso .reel-card {background-color}`, `.reel-overlay.riso .reel-done {color}`, `.rr {--rr-c}`, `.bt-tag.q::before {color}`, `.bt-sheet {background-color}`, `.bt-done {color}`
- `#FFFFFF` x1: `svg-attr {fill} [app.js SVG]`
- on screen (2151): `span.climb-pin {border-top-color}`, `span.climb-pin {border-right-color}`, `span.climb-pin {border-bottom-color}`, `span.climb-pin {border-left-color}`, `button.bt-tag.q::before {color}`, `span.slot-badge {color}`, `div.pick-card.bt-card {background-color}`, `div#climbSummit.climb-summit-cap {text-shadow}`

## paper-2

Tinted or darker paper.

- `#CFC2A6` x1: `.reel-overlay.riso .reel-card {border-color}`
- on screen (64): `div.reel-card {border-top-color}`, `div.reel-card {border-right-color}`, `div.reel-card {border-bottom-color}`, `div.reel-card {border-left-color}`

## line

Borders and rules on dark.

- `#6A5A3A` x12: `.daily-strip {border}`, `.duel-banner {border} [not live]`, `.duel-pool {border-top} [not live]`, `.duel-prow {border-bottom} [not live]`, `.duel-slot {border} [not live]`, `.duel-qchip {border} [not live]`
- `#6E5530` x1: `:root {--maple-line}`
- `#4A4434` x1: `button.presti-spin:disabled, button.more-modes:disabled {box-shadow}`
- `#808080 @0.25` x1: `.duel-rrow {border-bottom} [not live]`
- `#2A3540` x1: `:root {--line} [snapshot style]`
- `#F2EDE4 @0.02` x1: `body {background} [snapshot style]`
- `#232D37` x1: `.controls {border} [snapshot style]`
- `#303B47` x1: `.v-unsure {border} [snapshot style]`
- `#4D5A67` x1: `.traits-module .tm-vb.idk {border} [snapshot style]`
- `#2C343D` x1: `.traits-module .tm-sharebar {border} [snapshot style]`
- `#4A5560` x1: `.traits-module .tm-dot {border} [snapshot style]`
- `#46515C` x1: `.trait-legend {border} [snapshot style]`
- routed: `.site-foot {border-top}` via var(--tunnel-2), `.skip-btn {border}` via var(--tunnel-2), `.skip-btn:disabled {border-color}` via var(--tunnel-2), `.player-row {border}` via var(--tunnel-2), `.player-row {border-left}` via var(--tunnel-2), `.slot {border}` via var(--tunnel-2), `.ls-token.is-open {border}` via var(--tunnel-2), `.board-cell {border}` via var(--tunnel-2), `.pick-card {border}` via var(--tunnel-2), `.ledger {border}` via var(--tunnel-2), `.ledger-row {border-bottom}` via var(--tunnel-2), `.twoway {border}` via var(--tunnel-2), and 8 more
- on screen (19201): `span.cap-season {border-top-color}`, `span.cap-season {border-right-color}`, `span.cap-season {border-bottom-color}`, `span.cap-season {border-left-color}`, `span.cap-cost {border-top-color}`, `span.cap-cost {border-right-color}`, `span.cap-cost {border-bottom-color}`, `span.cap-cost {border-left-color}`

## line-paper

Rules and hairlines on paper.

- `#232A4E @0.35` x2: `.rr .bt-name .pr-bref {text-decoration-color}`, `.rr .bt-ssn .pr-team {text-decoration-color}`
- `#232A4E @0.3` x1: `.reel-overlay.riso .reel-act {border-bottom}`
- `#232A4E @0.24` x1: `.rr {--rr-rule}`
- `#232A4E @0.5` x1: `.bt-tag.add {box-shadow}`
- `#232A4E @0.55` x1: `.bt-tag.add {border}`
- `#232A4E @0.14` x1: `.rr .rail-path {stroke}`
- `#232A4E @0.18` x1: `.rr .climb-pin.comp {box-shadow}`
- `#232A4E @0.25` x1: `.bt-grab {background}`
- `#232A4E @0.45` x1: `.bt-big.idk {border}`
- `#232A4E @0.28` x1: `.bt-tile {border}`
- on screen (850): `button.bt-tag.add {border-top-color}`, `button.bt-tag.add {border-right-color}`, `button.bt-tag.add {border-bottom-color}`, `button.bt-tag.add {border-left-color}`, `a.pr-bref {text-decoration-color}`, `a.pr-team {text-decoration-color}`, `div.ledger-row {border-bottom-color}`, `div.reel-act {border-bottom-color}`

## text

Primary text on dark.

- `#E8E4D8` x2: `:root {--chalk}`, `.tchip:focus-visible {outline} [snapshot style]`
- `#F2EDE4` x2: `:root {--chalk} [snapshot style]`, `.traits-module .tm-head:not([hidden]) {color} [snapshot style]`
- `#F3EAD8` x1: `.duel-toast {color} [not live]`
- `#C9D2DA` x1: `.traits-module .tm-shlead {color} [snapshot style]`
- `#D9D5CE` x1: `.trait-legend-row {color} [snapshot style]`
- routed: `.rr .rr-eyebrow {color}` via var(--rr-c)
- on screen (3272): `span.pr-name {color}`, `a {color}`, `div.hh-name {color}`, `span.ls-name {color}`, `li {color}`, `p.kit-cap {color}`, `p.eyebrow.rr-eyebrow {color}`, `p {color}`

## text-2

Secondary or dim text on dark.

- `#8B98A5` x6: `.traits-module .tm-call {color} [snapshot style]`, `.traits-module .tm-def {color} [snapshot style]`, `.traits-module .tm-sharebar {color} [snapshot style]`, `.traits-module .tm-count {color} [snapshot style]`, `.traits-module .tm-open {color} [snapshot style]`, `.traits-module .tm-done .td-l {color} [snapshot style]`
- `#9AA0A6` x1: `:root {--chalk-dim}`
- `#555C63` x1: `.skip-btn:disabled {color}`
- `#6C6048` x1: `button.presti-spin:disabled, button.more-modes:disabled {color}`
- `#F4ECDD @0.62` x1: `.rr .bref-credit {color}`
- `#A8B0B8` x1: `:root {--chalk-dim} [snapshot style]`
- `#C6CED6` x1: `.v-unsure {color} [snapshot style]`
- `#9FABB7` x1: `.traits-module .tm-vb.idk {color} [snapshot style]`
- `#68737E` x1: `.traits-module .tm-why:not([hidden]) {color} [snapshot style]`
- `#7F8B96` x1: `.trait-legend-note {color} [snapshot style]`
- on screen (1960): `span.pr-sub.pr-stats {color}`, `span.year-face.year-fixed {color}`, `span.ls-token.is-open {color}`, `button.sort-chip {color}`, `p {color}`, `span#drPickCount.du-count.mono {color}`, `div.mp-row2.mono {color}`, `p.ticket-sub {color}`

## ink

Primary text and ink on paper.

- `#232A4E` x24: `.reel-overlay.riso .reel-head {border-bottom}`, `.reel-overlay.riso .reel-eyebrow {color}`, `.reel-overlay.riso .reel-run {color}`, `.reel-overlay.riso .reel-skip {color}`, `.reel-overlay.riso .reel-skip {border-color}`, `.reel-overlay.riso .reel-mo {color}`
- `#232A4E @0.08` x1: `.bt-tag.add:active, .bt-tag.add.pressed {background}`
- `#232A4E @0.12` x1: `.rr .tw-track {background}`
- on screen (2213): `b {color}`, `button.bt-tag {color}`, `button.bt-tag.q {color}`, `button.bt-tag.q::before {background-color}`, `button.bt-tag.add {color}`, `div.pr-v.bt-val {color}`, `span.slot-badge {background-color}`, `a.pr-bref {color}`

## ink-2

Secondary text on paper.

- `#5B5E73` x7: `.reel-overlay.riso .reel-mo-rec {color}`, `.rr {--rr-navy2}`, `.bt-who {color}`, `.bt-counting {color}`, `.bt-grp {color}`, `.bt-tile small {color}`
- `#4A4E66` x6: `.reel-overlay.riso .reel-note {color}`, `.bt-def {color}`, `.bt-big.idk {color}`, `.bt-you {color}`, `.bt-change {color}`, `.bt-sub {color}`
- on screen (1859): `small {color}`, `span.climb-pin {background-color}`, `a.cl-link {color}`, `span.pr-yr {color}`, `span.pr-yr::after {color}`, `a.pr-team {color}`, `span.why {color}`, `span.reel-mo-rec.mono {color}`

## accent

The primary brand and action color.

- `#FFB52E` x18: `:root {--amber}`, `:root {--amber} [snapshot style]`, `.traits-module {border} [snapshot style]`, `.traits-module .tm-eyebrow {color} [snapshot style]`, `.traits-module .tm-q:active {color} [snapshot style]`, `.traits-module .tm-vb.idk:active,.traits-module .tm-vb.idk.pressed {color} [snapshot style]`
- `#F2A81F` x8: `.q-tag {background} [snapshot style]`, `.v-yes {background} [snapshot style]`, `.traits-module .tm-vb {background} [snapshot style]`, `.traits-module .tm-tag {background} [snapshot style]`, `.traits-module .tm-again {background} [snapshot style]`, `.traits-prompt .tp-cta {background} [snapshot style]`
- `#FFB52E @0.32` x5: `@keyframes swapBreathe {box-shadow}`, `@keyframes elite-result-glow {box-shadow}`, `.hh-payline {border-top}`, `.hh-payline {border-bottom}`, `.cy-dot {box-shadow}`
- `#FFB52E @0.55` x4: `@keyframes swapPulse {box-shadow}`, `#shareTeamBtn.elite-result {box-shadow}`, `.hh-heatlabel.lvl2 {text-shadow}`, `.mp-bank {border}`
- `#FFB52E @0.35` x3: `.lineup-slot.moving .ls-token {box-shadow}`, `.mpb-meter {border}`, `.cy-label {text-shadow}`
- `#FFB52E @0.18` x3: `@keyframes elite-result-glow {box-shadow}`, `.traits-prompt {box-shadow} [snapshot style]`, `@keyframes traitInfoPulse {box-shadow} [snapshot style]`
- `#FFB52E @0.5` x3: `.cy-arrow {text-shadow}`, `.hh-eyebrow {text-shadow}`, `.hh-btn.hh-bref {border}`
- `#FFB52E @0.7` x3: `.hh-name.hot {text-shadow}`, `.hh-seg.fill.lvl2 {background}`, `.hh-fill {background}`
- `#FFB52E @0.6` x3: `.cy-dot {box-shadow}`, `.cy-label {text-shadow}`, `.hh-charity {border}`
- `#E89A1C` x2: `button.presti-spin, button.more-modes, a.btn {--spin-face}`, `.donate-btn {--spin-face}`
- `#FFB52E @0` x2: `@keyframes swapBreathe {box-shadow}`, `@keyframes traitInfoPulse {box-shadow} [snapshot style]`
- `#FFB52E @0.25` x2: `.climb-pin.comp {box-shadow}`, `.traits-module {box-shadow} [snapshot style]`
- `#FFB52E @0.22` x2: `.cy-dot {box-shadow}`, `.btn-dark {box-shadow}`
- `#FFB52E @0.45` x2: `.hh-lever-hint {text-shadow}`, `#app .cap-mode-panel .mpb-lab {border}`
- `#FFB52E @0.95` x2: `.hh-name.hot {text-shadow}`, `.cy-label {text-shadow}`
- `#3FAE5A` x2: `.lg-fmt.on, .lg-rnd.on {border-color} [not live]`, `.lg-fmt.on, .lg-rnd.on {color} [not live]`
- `#FFB52E @0.4` x2: `.gate-tipoff .gate-pull {text-shadow}`, `.cy-dot {box-shadow}`
- `#FFB52E @0.12` x1: `@keyframes swapPulse {box-shadow}`
- `#FFB52E @0.24` x1: `#shareTeamBtn.elite-result {box-shadow}`
- `#FFB52E @0.42` x1: `@keyframes elite-result-glow {box-shadow}`
- `#FFB52E @0.72` x1: `@keyframes elite-result-glow {box-shadow}`
- `#FFB52E @0.58` x1: `#shareTeamBtn.elite-result:not(:disabled):active {box-shadow}`
- `#FFB52E @0.75` x1: `.hh-seg.lit {box-shadow}`
- `#FFB52E @0.78` x1: `.mpb-lab {color}`
- `#E6B33D @0.55` x1: `.pr-bref {text-decoration-color}`
- `#E6B33D @0.4` x1: `.pr-team {text-decoration-color}`
- `#E6B33D @0.45` x1: `.res-comp .cl-link {text-decoration-color}`
- `#FFB52E @0.05` x1: `body {background} [snapshot style]`
- `#FFB52E @0.16` x1: `.traits-module {box-shadow} [snapshot style]`
- `#FFB52E @0.1` x1: `.traits-prompt {box-shadow} [snapshot style]`
- on screen (6702): `span.m-lite {color}`, `span.cc-amt {color}`, `div#modePanel.mode-panel.plq-frame.plq-slim::after {background-image}`, `b.yf-caret {color}`, `button.tchip {background-image}`, `button.tchip.eng {background-image}`, `span.ls-token {border-top-color}`, `span.ls-token {border-right-color}`

## accent-hi

Lighter highlight of the accent.

- `#FFC957` x8: `.q-tag {background} [snapshot style]`, `.v-yes {background} [snapshot style]`, `.traits-module .tm-vb {background} [snapshot style]`, `.traits-module .tm-tag {background} [snapshot style]`, `.traits-module .tm-again {background} [snapshot style]`, `.traits-prompt .tp-cta {background} [snapshot style]`
- `#F8B647` x2: `button.presti-spin, button.more-modes, a.btn {--spin-top}`, `.donate-btn {--spin-top}`
- `#FFE79D @0.72` x2: `@keyframes elite-result-glow {box-shadow}`, `#shareTeamBtn.elite-result:not(:disabled):active {box-shadow}`
- `#FFE9B0` x2: `.hh-seg.fill.lvl4 {background}`, `.hh-fill {background}`
- `#F8B647 @0.09` x2: `.plq-frame {background}`, `#app button.daily-tile {background}`
- `#FFD683 @0.95` x2: `.gate-play-btn:focus-visible {outline}`, `#app .mp-rules-btn:focus-visible {outline}`
- `#FFF3D6` x2: `svg-attr {fill} [app.js SVG]`, `svg-attr path {fill} [snapshot SVG]`
- `#FFF0B8 @0.78` x1: `#shareTeamBtn.elite-result {outline}`
- `#FFD36A @0.48` x1: `#shareTeamBtn.elite-result {box-shadow}`
- `#FFF0B8 @0.68` x1: `@keyframes elite-result-glow {outline-color}`
- `#FFD36A @0.42` x1: `@keyframes elite-result-glow {box-shadow}`
- `#FFF7D3 @0.98` x1: `@keyframes elite-result-glow {outline-color}`
- `#FFC85A @0.9` x1: `.hh-seg.fill.lvl3 {background}`
- `#FFE9B0 @0.95` x1: `.hh-seg.result {box-shadow}`
- `#FFD778` x1: `.hh-heatlabel.lvl3 {color}`
- `#FFC85A @0.8` x1: `.hh-heatlabel.lvl3 {text-shadow}`
- `#FFD278 @0.9` x1: `.hh-heatlabel.lvl4 {text-shadow}`
- `#FFD278 @0.95` x1: `.hh-net.over {text-shadow}`
- `#FFD278 @0.7` x1: `.hh-stamp {text-shadow}`
- `#F8B647 @0.7` x1: `#app .daily-tile:hover::before {border-color}`
- `#FFD98A` x1: `.sk-chip {color}`
- on screen (1299): `button.tchip {background-image}`, `button.tchip.eng {background-image}`, `path {fill}`, `span.sk-chip {color}`, `span.m-lite {color}`, `button#rulesBtn.mp-rules-btn.presti-spin {background-image}`, `div#modePanel.mode-panel.plq-frame.plq-slim {background-image}`, `button.confirm-btn.presti-spin {background-image}`

## accent-edge

Darker edge and extrusion of accent keycaps.

- `#9A6A12` x14: `.q-tag {border} [snapshot style]`, `.qx-btn.qx-play {border-color} [snapshot style]`, `.qx-btn.qx-play:active,.qx-btn.qx-play.flashed {border-color} [snapshot style]`, `.v-yes {box-shadow} [snapshot style]`, `.v-yes:active,.v-yes.pressed {box-shadow} [snapshot style]`, `.traits-module .tm-vb {box-shadow} [snapshot style]`
- `#9E5A0F` x4: `button.presti-spin, button.more-modes, a.btn {--spin-side}`, `.donate-btn {--spin-side}`, `.daily-strap .strap-info {box-shadow}`, `.daily-strap .strap-info:active {box-shadow}`
- `#E89A1C @0.24` x1: `.gate-target {border-top}`
- `#74500D` x1: `@keyframes traitInfoPulse {box-shadow} [snapshot style]`
- routed: `.rules-overlay .rs-got {box-shadow}` via var(--maple), `.reel-done {box-shadow}` via var(--maple)
- on screen (1046): `button.tchip {box-shadow}`, `button.tchip.eng {box-shadow}`, `button#rulesBtn.mp-rules-btn.presti-spin {box-shadow}`, `button.confirm-btn.presti-spin {box-shadow}`, `button#skipEra.skip-btn.presti-spin {box-shadow}`, `button#skipTeam.skip-btn.presti-spin {box-shadow}`, `a#donateBtn.donate-btn {box-shadow}`, `button#poolTraitInfoBtn.trait-info-btn.pool-trait-info {box-shadow}`

## accent-ink

Text and icons printed on an accent fill.

- `#1C1608` x8: `.q-tag {color} [snapshot style]`, `.vbtn {color} [snapshot style]`, `.traits-module .tm-vb {color} [snapshot style]`, `.traits-module .tm-tag {color} [snapshot style]`, `.traits-module .tm-again {color} [snapshot style]`, `.traits-prompt .tp-cta {color} [snapshot style]`
- `#2A1A05` x6: `button.presti-spin, button.more-modes, a.btn {--spin-ink}`, `.donate-btn {--spin-ink}`, `svg-attr {fill} [app.js SVG]`, `svg-attr {stroke} [app.js SVG]`, `svg-attr path {fill} [snapshot SVG]`, `svg-attr path {stroke} [snapshot SVG]`
- `#131313` x3: `.qx-btn.qx-play {color} [snapshot style]`, `.qx-btn.qx-play:active,.qx-btn.qx-play.flashed {color} [snapshot style]`, `.act-next {color} [snapshot style]`
- `#1A1206` x2: `.dt-act-share {color}`, `.ds-pill.ds-off {color}`
- `#082A1A` x1: `.skip-btn.presti-spin.refunded {color}`
- `#2A1A05 @0.16` x1: `#app .mp-rules-btn .mp-book-wrap {background}`
- `#2A1A05 @0.22` x1: `#app .mp-rules-btn .mp-book-wrap {box-shadow}`
- `#150D03 @0.82` x1: `.sk-chip {background}`
- routed: `.sort-chip.active {color}` via var(--tunnel), `.slot-badge {color}` via var(--ink), `.slot.filled b {color}` via var(--ink), `.slot.filled {color}` via var(--ink), `.ls-token {color}` via var(--ink), `.ls-pos {color}` via var(--ink), `.ls-swap.is-moving {color}` via var(--ink), `.ls-swap.is-here {color}` via var(--ink), `.confirm-btn {color}` via var(--ink), `.startover-btn {color}` via var(--ink), `.btn-primary {color}` via var(--ink), `.tab.on {color}` via var(--ink), and 6 more
- on screen (1506): `button.tchip {color}`, `button.tchip.eng {color}`, `span.ls-token {color}`, `i.ls-pos {color}`, `span.sk-chip {background-color}`, `span.sk-lab {color}`, `span.mp-book-wrap {background-color}`, `span.mp-book-wrap {box-shadow}`

## metal

Bronze ornament lines, frames, pips.

- `#B98A4F` x5: `:root {--maple}`, `svg-attr {fill} [app.js SVG]`, `svg-attr {stroke} [app.js SVG]`, `svg-attr rect {fill} [snapshot SVG]`, `svg-attr path {stroke} [snapshot SVG]`
- `#B98A4F @0.14` x2: `.hh-seg {background}`, `.hh-bar {background}`
- `#9E5A0F` x2: `.plq-frame {border}`, `.plq-slim {--plq-deep}`
- `#B98A4F @0.3` x1: `.hh-seg.fill.lvl0 {background}`
- `#B98A4F @0.55` x1: `.hh-seg.fill.lvl1 {background}`
- `#E89A1C @0.22` x1: `.plq-frame {box-shadow}`
- `#E89A1C @0.4` x1: `.plq-frame::before {border}`
- `#E89A1C @0.28` x1: `.daily-stamp {border-top}`
- on screen (6056): `span.pr-pos {color}`, `span.cap-season {color}`, `span.year-face {color}`, `select.year-sel {color}`, `span {border-top-color}`, `span {border-right-color}`, `span {border-bottom-color}`, `span {border-left-color}`

## bad

Negative, loss, NO.

- `#F65058` x6: `.reel-overlay.riso .reel-day.l {background}`, `.reel-overlay.riso .riso-flash {background}`, `.rr {--rr-scar}`, `.bt-tag.neg {background-color}`, `.bt-big.no {background}`, `.bt-bar {background}`
- `#FF5A4A` x4: `.board .big-label .net-bonus {color}`, `.hot-pick .pr-name {color}`, `.hot-pick .pr-v .hot-bonus {color}`, `.hot-pick .slot-badge {color}`
- `#FF4133` x4: `.pick-card.hot-pick {border-color}`, `.pick-card.hot-pick {box-shadow}`, `.hot-pick .slot-badge {border}`, `.hh-fill-bonus {background}`
- `#FF8A77` x3: `.mpb-delta.neg {color}`, `.mp-bank.bank-down .mpb-amt {color}`, `.mp-bank.bank-down .mpb-fill {background}`
- `#F06A54` x3: `.v-no {background} [snapshot style]`, `.traits-module .tm-vb.no {background} [snapshot style]`, `.tchip.anti {background} [snapshot style]`
- `#D9422D` x3: `.v-no {background} [snapshot style]`, `.traits-module .tm-vb.no {background} [snapshot style]`, `.tchip.anti {background} [snapshot style]`
- `#FF4133 @0.55` x2: `.board .big-label .net-bonus {text-shadow}`, `.pick-card.hot-pick {box-shadow}`
- `#FF4133 @0.6` x2: `.hot-pick .pr-v .hot-bonus {text-shadow}`, `.hot-pick .slot-badge {text-shadow}`
- `#FFA043` x2: `.mp-bank.bank-mid .mpb-amt {color}`, `.mp-bank.bank-mid .mpb-fill {background}`
- `#F65058 @0.75` x2: `.bt-q mark.neg {background}`
- `#E5533C` x2: `:root {--ember} [snapshot style]`, `.traits-module .tm-res .neg {color} [snapshot style]`
- `#E2654E` x1: `:root {--whistle}`
- `#D63B2F` x1: `.skip-btn.presti-spin.firesale {--spin-face}`
- `#F06A55` x1: `.skip-btn.presti-spin.firesale {--spin-top}`
- `#FF4133 @0.12` x1: `.pick-card.hot-pick {box-shadow}`
- `#FF4133 @0.5` x1: `.hot-pick .slot-badge {box-shadow}`
- `#FF7A5C` x1: `.hh-fill-bonus {background}`
- `#FF4D33 @0.9` x1: `.hh-fill-bonus {box-shadow}`
- `#E5533D` x1: `.duel-fire {color} [not live]`
- `#E0523C @0.5` x1: `.mp-bank.bank-low .mpb-lab {border-color}`
- `#E0523C @0.55` x1: `.mp-bank.bank-low {border-color}`
- `#E0523C @0.4` x1: `.mp-bank.bank-low .mpb-meter {border-color}`
- `#7E2A24` x1: `.reel-day.l {background}`
- on screen (250): `span.m-lite {color}`, `button#tmNo.tm-vb.no.presti-spin {background-image}`, `s.cost-old {color}`, `b#bankAmt.mpb-amt {color}`, `i#bankFill.mpb-fill {background-color}`, `div.riso-flash {background-color}`, `button.vbtn.v-no {background-image}`, `span#hhFillBonus.hh-fill-bonus {background-image}`

## bad-edge

Darker edge of a bad fill.

- `#B8323B` x6: `.rr {--rr-scar-edge}`, `.bt-tag.neg {box-shadow}`, `.bt-tag.neg:active, .bt-tag.neg.pressed {box-shadow}`, `.bt-tag.off.neg {box-shadow}`, `.bt-big.no {box-shadow}`, `.bt-big.no:active {box-shadow}`
- `#8C2317` x6: `.v-no {box-shadow} [snapshot style]`, `.v-no:active,.v-no.pressed {box-shadow} [snapshot style]`, `.traits-module .tm-vb.no {box-shadow} [snapshot style]`, `.traits-module .tm-vb.no:active,.traits-module .tm-vb.no.pressed {box-shadow} [snapshot style]`, `.tchip.anti {box-shadow} [snapshot style]`, `.tchip.anti:active,.tchip.anti.expanded {box-shadow} [snapshot style]`
- `#7E1D14` x1: `.skip-btn.presti-spin.firesale {--spin-side}`
- `#A33A32` x1: `.reel-day.l {border-color}`
- `#C92F3B` x1: `.reel-overlay.riso .reel-day.l {border-color}`
- on screen (28): `button#tmNo.tm-vb.no.presti-spin {box-shadow}`, `button.bt-tag.neg.q {box-shadow}`, `button.vbtn.v-no {box-shadow}`, `button.bt-big.no {box-shadow}`, `button#skipTeam.skip-btn.presti-spin.firesale {box-shadow}`, `button#skipEra.skip-btn.presti-spin.firesale {box-shadow}`, `button#rerollYears.skip-btn.presti-spin.firesale {box-shadow}`

## bad-ink

Deep bad text, or text on a bad fill.

- `#B42A36` x4: `.rr {--rr-scar-deep}`, `.bt-tag.off.neg {color}`, `.bt-pct.no {color}`, `.bt-tile.neg b {color}`
- `#2B0D09` x4: `.v-no {color} [snapshot style]`, `.traits-module .tm-vb.no {color} [snapshot style]`, `.tchip.anti {color} [snapshot style]`, `.tchip.anti::after {background} [snapshot style]`
- `#C92F3B` x2: `.reel-overlay.riso .riso-streak.dead {color}`, `.reel-overlay.riso .riso-streak.cold {color}`
- `#2A0703` x1: `.skip-btn.presti-spin.firesale {color}`
- `#D63A45` x1: `.reel-overlay.riso .reel-run i, .reel-overlay.riso .reel-final-rec i {color}`
- `#FFFFFF` x1: `.reel-overlay.riso .reel-day.l {color}`
- on screen (85): `span.ledger-amt.tax {color}`, `i {color}`, `button#tmNo.tm-vb.no.presti-spin {color}`, `button.vbtn.v-no {color}`, `b {color}`, `span.tw-tier.tier-weak {color}`, `a.pr-bref {color}`, `a.pr-bref::after {color}`

## good

Positive, win, success.

- `#7AE08D` x2: `.mp-bank.bank-up .mpb-amt {color}`, `.mp-bank.bank-up .mpb-fill {background}`
- `#8FB99B` x1: `:root {--ok}`
- `#2FA866` x1: `.skip-btn.presti-spin.refunded {--spin-face}`
- `#4FC487` x1: `.skip-btn.presti-spin.refunded {--spin-top}`
- `#1B6E40` x1: `.skip-btn.presti-spin.refunded {--spin-side}`
- `#00875A` x1: `.rr {--rr-green}`
- `#9FE870` x1: `.traits-module .tm-new {color} [snapshot style]`
- `#4D7A35` x1: `.traits-module .tm-new {border} [snapshot style]`
- on screen (80): `b.cost-new {color}`, `span.m-lite {color}`, `span.ledger-amt.good {color}`, `span.dt-result {color}`, `span.ledger-amt.zero {color}`, `button#skipTeam.skip-btn.presti-spin.refunded {background-image}`, `button#skipEra.skip-btn.presti-spin.refunded {background-image}`, `button#rerollYears.skip-btn.presti-spin.refunded {background-image}`

## you

The riso blue 'you' marker.

- `#3FAE5A` x4: `.duel-banner.you {border-color} [not live]`, `.duel-banner.you {color} [not live]`, `.arena-merank {color} [not live]`, `.lg-me {color} [not live]`
- `#0078BF` x2: `.rr {--rr-blue}`, `.bt-tag.mine::after {border}`
- `#3FAE5A @0.18` x1: `@keyframes duelPulse {box-shadow} [not live]`
- `#0078BF @0.22` x1: `.rr .cy-dot {box-shadow}`
- on screen (80): `span.cy-label {color}`, `path.fill-path {stroke}`, `span.cy-dot {background-color}`, `span.cy-dot {box-shadow}`, `span.cy-arrow {color}`, `button.bt-tag.q.mine::after {border-top-color}`, `button.bt-tag.q.mine::after {border-right-color}`, `button.bt-tag.q.mine::after {border-bottom-color}`

## offset

Fluorescent pink offsets and pink ink.

- `#C8217A` x5: `.reel-overlay.riso .riso-streak {color}`, `.reel-overlay.riso .reel-skip:active {color}`, `.reel-overlay.riso .reel-skip:active {border-color}`, `.reel-overlay.riso .reel-done:active {background}`, `.reel-overlay.riso .reel-done:active {border-color}`
- `#FF48B0` x4: `.reel-overlay.riso .reel-done {box-shadow}`, `.rr {--rr-pink}`, `.bt-done {box-shadow}`, `.bt-toast {box-shadow}`
- `#FF48B0 @0.7` x2: `.reel-overlay.riso .reel-run {text-shadow}`, `.reel-overlay.riso .reel-final-rec {text-shadow}`
- `#E0348E` x2: `.reel-overlay.riso .riso-swept {border}`, `.reel-overlay.riso .riso-swept {color}`
- `#FF48B0 @0.5` x2: `.rr .rr-print .big {text-shadow}`, `.rr .tw-fill.tw-off, .rr .tw-fill.tw-def {box-shadow}`
- `#D6208A` x1: `.reel-overlay.riso .riso-streak.hot {color}`
- `#0078BF @0.35` x1: `.reel-overlay.riso .riso-swept {text-shadow}`
- `#FF48B0 @0.55` x1: `.rr .rr-eyebrow {text-shadow}`
- `#FF48B0 @0.45` x1: `.rr .bt-val {text-shadow}`
- `#FF48B0 @0.35` x1: `.bt-pct {text-shadow}`
- on screen (498): `div.pr-v.bt-val {text-shadow}`, `p.eyebrow.rr-eyebrow {text-shadow}`, `span.riso-swept.mono {color}`, `span.riso-swept.mono {border-top-color}`, `span.riso-swept.mono {border-right-color}`, `span.riso-swept.mono {border-bottom-color}`, `span.riso-swept.mono {border-left-color}`, `span.riso-swept.mono {text-shadow}`

## sun

Sunflower ink on paper, the paper world's yes.

- `#FFB511` x6: `.reel-overlay.riso .reel-day.w {background}`, `.rr {--rr-sun}`, `.bt-tag {background-color}`, `.bt-tag.q::before {border}`, `.bt-big.yes {background}`, `.bt-bar i {background}`
- `#FFB511 @0.9` x2: `.bt-q mark {background}`
- `#FFB511 @0.95` x1: `.reel-overlay.riso .riso-streak.hot {text-shadow}`
- `#FFB511 @0` x1: `@keyframes rr-elite {box-shadow}`
- `#FFB511 @0.35` x1: `@keyframes rr-elite {box-shadow}`
- `#FFB511 @0.3` x1: `.bt-tile:active {background}`
- on screen (996): `button.bt-tag {background-color}`, `button.bt-tag.q {background-color}`, `button.bt-tag.q::before {border-top-color}`, `button.bt-tag.q::before {border-right-color}`, `button.bt-tag.q::before {border-bottom-color}`, `button.bt-tag.q::before {border-left-color}`, `mark {background-image}`, `span.riso-streak.mono.hot {text-shadow}`

## sun-edge

Sunflower keycap edge.

- `#C7870A` x7: `.rr {--rr-sun-edge}`, `.bt-tag {box-shadow}`, `.bt-tag:active, .bt-tag.pressed {box-shadow}`, `.bt-tag.off {box-shadow}`, `.bt-tag.off:active, .bt-tag.off.pressed {box-shadow}`, `.bt-big.yes {box-shadow}`
- `#E0981A` x1: `.reel-overlay.riso .reel-day.w {border-color}`
- on screen (369): `button.bt-tag {box-shadow}`, `button.bt-tag.q {box-shadow}`, `button.bt-big.yes {box-shadow}`, `button.bt-tag.q.mine {box-shadow}`, `button.bt-tag.off {box-shadow}`

## sun-ink

Deep sunflower text on paper.

- `#8A5D00` x2: `.rr {--rr-sun-deep}`, `.bt-tag.off {color}`
- on screen (1): `button.bt-tag.off {color}`

## shadow

Black-alpha shadows.

- `#000000 @0.6` x10: `.gate-title {text-shadow}`, `.reel-overlay.riso .reel-card {box-shadow}`, `.v-yes {box-shadow} [snapshot style]`, `.v-no {box-shadow} [snapshot style]`, `.v-yes:active,.v-yes.pressed {box-shadow} [snapshot style]`, `.v-no:active,.v-no.pressed {box-shadow} [snapshot style]`
- `#000000 @0.5` x9: `button.presti-spin, button.more-modes, a.btn {box-shadow}`, `.donate-btn {box-shadow}`, `.daily-strap .strap-info {box-shadow}`, `.hh-ball {filter}`, `.mpb-amt {text-shadow}`, `#app .cap-mode-panel .mpb-amt {text-shadow}`
- `#000000 @0.45` x5: `button.presti-spin:not(:disabled):active, button.more-modes:not(:disab {box-shadow}`, `.donate-btn:active {box-shadow}`, `.mp-bank {box-shadow}`, `#app .cap-mode-panel .mp-bank {box-shadow}`, `.sk-chip {border}`
- `#000000 @0.55` x5: `.goat-particle {filter}`, `.hh-hoop {filter}`, `.plq-frame {box-shadow}`, `.reel-card {box-shadow}`
- `#000000 @0.75` x3: `.ls-swap {box-shadow}`, `@keyframes swapBreathe {box-shadow}`
- `#000000 @0.7` x3: `.ls-swap.is-moving {box-shadow}`, `.daily-tile .dt-title {text-shadow}`, `.traits-module {box-shadow} [snapshot style]`
- `#000000` x3: `.tchip {box-shadow} [snapshot style]`, `.tchip.anti {box-shadow} [snapshot style]`, `.trait-info-btn {box-shadow} [snapshot style]`
- `#000000 @0.65` x2: `.lineup-slot.moving .ls-token {box-shadow}`, `.card {box-shadow} [snapshot style]`
- `#000000 @0.35` x2: `.cap-info {box-shadow}`, `.rr .rr-board, .rr .bt-card, .rr .twoway, .rr .rr-climb .climb, .rr .l {box-shadow}`
- `#000000 @0.22` x2: `.mp-bank {box-shadow}`, `#app .cap-mode-panel .mp-bank {box-shadow}`
- `#000000 @0.4` x2: `.cap-row .cap-cost {box-shadow}`, `.player-row:not(.off):active .cap-cost {box-shadow}`
- `#000000 @0.85` x2: `.rr .rr-board, .rr .bt-card, .rr .twoway, .rr .rr-climb .climb, .rr .l {box-shadow}`, `.rr .bt-card.hot-pick {box-shadow}`
- `#000000 @0.38` x1: `.mpb-meter {background}`
- on screen (3164): `span.cap-cost {box-shadow}`, `button.tchip {box-shadow}`, `button.tchip.eng {box-shadow}`, `div.pick-card.bt-card {box-shadow}`, `div#modePanel.mode-panel.plq-frame.plq-slim {box-shadow}`, `span.sk-chip {border-top-color}`, `span.sk-chip {border-right-color}`, `span.sk-chip {border-bottom-color}`

## light

White-alpha highlights and sheens.

- `#FFFFFF @0.35` x9: `button.presti-spin:not(:disabled):active, button.more-modes:not(:disab {box-shadow}`, `.donate-btn:active {box-shadow}`, `.bt-tag:active, .bt-tag.pressed {box-shadow}`, `.bt-tag.neg {box-shadow}`, `.bt-tile {background}`, `.v-yes {box-shadow} [snapshot style]`
- `#FFFFFF` x7: `.skip-btn.presti-spin.refunded::before, .skip-btn.presti-spin.refunded {background}`, `.hh-name.hot {color}`, `.hh-heatlabel.lvl4 {color}`, `.hh-heatlabel.lvl4 {text-shadow}`, `.hh-net.over {color}`, `.hh-net.over {text-shadow}`
- `#FFFFFF @0.45` x4: `button.presti-spin, button.more-modes, a.btn {box-shadow}`, `#shareTeamBtn.elite-result:not(:disabled):active {box-shadow}`, `.donate-btn {box-shadow}`, `.bt-tag {box-shadow}`
- `#FFFFFF @0.25` x4: `.bt-tag.neg:active, .bt-tag.neg.pressed {box-shadow}`, `.v-yes:active,.v-yes.pressed {box-shadow} [snapshot style]`, `.traits-module .tm-vb:active,.traits-module .tm-vb.pressed {box-shadow} [snapshot style]`, `.trait-info-btn:active,.trait-info-btn[aria-expanded=true] {box-shadow} [snapshot style]`
- `#FFFFFF @0.2` x3: `.bt-tag {background-image}`, `.v-no:active,.v-no.pressed {box-shadow} [snapshot style]`, `.traits-module .tm-vb.no:active,.traits-module .tm-vb.no.pressed {box-shadow} [snapshot style]`
- `#FFFFFF @0.7` x2: `.skip-btn.presti-spin.refunded::before, .skip-btn.presti-spin.refunded {filter}`, `@keyframes elite-result-glow {box-shadow}`
- `#FFFFFF @0.28` x2: `.v-no {box-shadow} [snapshot style]`, `.traits-module .tm-vb.no {box-shadow} [snapshot style]`
- `#FFFFFF @0.4` x2: `.tchip {box-shadow} [snapshot style]`, `.trait-info-btn {box-shadow} [snapshot style]`
- `#FFFFFF @0.3` x2: `.tchip:active,.tchip.expanded {box-shadow} [snapshot style]`, `.tchip.anti {box-shadow} [snapshot style]`
- `#FFFFFF @0` x1: `.skip-btn.presti-spin.refunded::before, .skip-btn.presti-spin.refunded {background}`
- `#FFFFFF @0.62` x1: `#shareTeamBtn.elite-result {box-shadow}`
- `#FFFFFF @0.58` x1: `@keyframes elite-result-glow {box-shadow}`
- `#FFFFFF @0.9` x1: `.hh-thresh {box-shadow}`
- `#FFFFFF @0.18` x1: `#app .mp-rules-btn .mp-book-wrap {box-shadow}`
- `#F2EDE4 @0.13` x1: `.card {border-top-color} [snapshot style]`
- `#FFFFFF @0.22` x1: `.tchip.anti:active,.tchip.anti.expanded {box-shadow} [snapshot style]`
- `#FFFFFF @0.04` x1: `.trait-legend {box-shadow} [snapshot style]`
- `#FFFFFF @0.12` x1: `@keyframes traitInfoPulse {box-shadow} [snapshot style]`
- `#FFFFFF @0.16` x1: `@keyframes traitInfoPulse {box-shadow} [snapshot style]`
- on screen (1847): `button.tchip {box-shadow}`, `button.tchip.eng {box-shadow}`, `button.bt-tag {background-image}`, `button.bt-tag {box-shadow}`, `button.bt-tag.q {background-image}`, `button.bt-tag.q {box-shadow}`, `button#rulesBtn.mp-rules-btn.presti-spin {box-shadow}`, `span.mp-book-wrap {box-shadow}`

## fixed

Never changes with the theme.

- `#000000` x8: `.skip-btn.presti-spin.refunded::before, .skip-btn.presti-spin.refunded {-webkit-mask}`, `.skip-btn.presti-spin.refunded::before, .skip-btn.presti-spin.refunded {mask}`, `.hh-window {-webkit-mask}`, `.hh-window {mask}`
- `#000000 @0` x6: `.plq-frame {background}`, `.plq-frame::after {background-image}`, `#app button.daily-tile {background}`
- `#E0531A` x2: `.hh-fire i {background}`, `svg-attr ellipse {stroke} [snapshot SVG]`
- `#FF8A1E` x1: `.hh-lever.ignited .hh-ball {filter}`
- `#FFD54A` x1: `.hh-lever.ignited .hh-ball {filter}`
- `#FFFFFF` x1: `.hh-fire i {background}`
- `#FFE07A` x1: `.hh-fire i {background}`
- `#FF9A24` x1: `.hh-fire i {background}`
- `#E0531A @0` x1: `.hh-fire i {background}`
- `#FFCB84` x1: `svg-attr stop {stop-color} [snapshot SVG]`
- `#E8802A` x1: `svg-attr stop {stop-color} [snapshot SVG]`
- `#A64E10` x1: `svg-attr stop {stop-color} [snapshot SVG]`
- `#6E3208` x1: `svg-attr circle {stroke} [snapshot SVG]`
- `#E6E0D2` x1: `svg-attr g {stroke} [snapshot SVG]`

## The Tribune (being removed, left out above)

overlay 4, ink 19, paper 9, paper-2 4, shadow 24, ink-2 7, line-paper 8, accent 6, accent-hi 4, accent-edge 1, accent-ink 1, light 12, offset 5, metal 9 literals in .np-* rules. They are tokenized like everything else but no snapshot shows them.

## Left outside a role

- `#B98A4F` in site.tok.css (inside an SVG data URI) `.year-sel`

## Fixed on screen

- `#e6e0d2` stroke in `g [stroke]` (140x in 20 snapshots)
- `#ffcb84` stop-color in `stop [stop-color]` (20x in 20 snapshots)
- `#e8802a` stop-color in `stop [stop-color]` (20x in 20 snapshots)
- `#a64e10` stop-color in `stop [stop-color]` (20x in 20 snapshots)
- `#6e3208` stroke in `circle [stroke]` (20x in 20 snapshots)
- `#6e3208` stroke in `path [stroke]` (20x in 20 snapshots)
- `#e0531a` stroke in `ellipse [stroke]` (20x in 20 snapshots)
- `rgb(255, 255, 255)` background-image in `.hh-fire i` (30x in 10 snapshots)
- `rgb(255, 224, 122)` background-image in `.hh-fire i` (30x in 10 snapshots)
- `rgb(255, 154, 36)` background-image in `.hh-fire i` (30x in 10 snapshots)
- `rgb(224, 83, 26)` background-image in `.hh-fire i` (30x in 10 snapshots)
- `rgb(0, 0, 0)` mask-image in `.hh-window` (20x in 10 snapshots)
- `rgb(0, 0, 0)` mask-image in `.skip-btn.presti-spin.refunded::before, .skip-btn.presti-spin.refunded::after, .` (64x in 3 snapshots)
- `rgb(255, 138, 30)` filter in `.hh-lever.ignited .hh-ball` (2x in 2 snapshots)
- `rgb(255, 213, 74)` filter in `.hh-lever.ignited .hh-ball` (2x in 2 snapshots)
