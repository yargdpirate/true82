# TRUE 82 Leaderboard Lab — the design spec it was built from

Produced 2026-10-04 by a 33-agent research and audit fan-out (4 web-research lenses, 5 read-only
code audits, 23 adversarial verifications, 1 synthesis). Nothing here is shipped by being written
here: the owner picks from the lab, and a later version implements what he picks.

## The headline

On debut day the boards are empty and almost every player's run sits at rank 400, so the boards cannot be the hook. The hook is the number the game already computes and currently buries: /api/percentile returns a real crowd standing, works signed out, needs no account, and app.js already injects "Top 12%" as a trailing bullet on the results line. Promote that to the second-biggest thing on the results screen and hang the board link off it, then make every board open on the player's own neighbourhood instead of rank 1. Second thing, and it is the uncomfortable one: of his five boards, exactly one is honest. The Daily owns its own denominator (shared seed, one attempt, UNIQUE on (user_id, official)), so a percentile and a median there are true. The other four either reward grinding or freeze forever on the luckiest run in the game's history. The slate below keeps two of his five as written, changes two, cuts one, and adds two that do the job the cut one was meant to do.

## The board slate

### TODAY (the Daily)

**Ranks.** wins DESC, net DESC over runs WHERE verified = 1 AND user_id IS NOT NULL AND official = :localDayKey. This is the shipped BOARDS.daily SQL unchanged; only the day argument changes.

**Why.** The only board where rank is fair by construction: everyone drafted from the same five tickets, one attempt, and the server fixes mode, seed and challenge from the day key, so a different board posted as today's Daily stores officialRejected. Because each player contributes exactly one score, the percentile and the median above the list are literally true rather than contaminated by whoever played a thousand times. It is also the only board that is new every morning, which is the return reason that replaces a countdown.

**Segments.** No time segmentation at all: one attempt a day makes week and all-time meaningless here. Two views inside the tab, switched by a single text button in the list header, not a second control row: AROUND YOU (default when the field is 25 or more, a nine-row window centred on the player with the leader pinned as one line above it) and TOP (default below 25, and always one tap away). Above the list, one line of crowd context phrased as a fact about the board and never about the player: "Board #412. 4,412 GMs. Half the room finished under 70-12."

**New work.** Three pieces, no schema change. (1) accounts.js loadBoard() must send day: T82DAILY.dayKey(); lb.js:109 currently defaults to utcDay() while the stored key is local, so every US player after about 5pm Pacific gets a different day's board or none. Keep utcDay() as the no-JS fallback and keep DAY_RE validation server-side. (2) lb.js gains a rank-of-me query (COUNT of rows scoring better, same WHERE) returning {rank, score, outOf} so a player past row 82 gets a real rank instead of {rank: null}, plus a window query for the nine rows around them. (3) The median and the field count come free from the same pool /api/percentile already builds; suppress both below a sample floor rather than printing "Top 50%" out of four players.

**Keep or cut.** KEEP, and promote it from one of five tabs to the default tab. It is the strongest asset in the whole feature and it is currently fifth in the list.

### THIS MONTH (your ten best Dailies)

**Ranks.** Sum of your ten best Daily results this month. ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY wins DESC, net DESC) <= 10 over runs WHERE verified = 1 AND user_id IS NOT NULL AND official LIKE :monthPrefix, then SUM(wins) with SUM(net) as the tie-break. Divide by 10, not by the count of days played, so a three-day player ranks honestly low and the row reads "3 of 10 days".

**Why.** This is the board that does the job the 82-0 rate board was meant to do, and does it honestly. Every one of the ten samples is server-owned, so it cannot be gamed by abandoning a bad draft. A wrecked day is simply dropped, which is the single idea that keeps people playing a daily game after a bad morning. A player who arrives on 10/22 needs ten days, not a back catalogue, so the influencer's audience does not walk into a board already won. And because nobody can play more than one Daily a day, it rewards consistency without rewarding grinding, which no other cumulative board in the set manages.

**Segments.** This month only, as the default and only view. Last month is reachable from THE HALL, framed as a finished thing with a date on it, never as something expiring. No all-time version: an all-time sum is won by whoever started first and is a monument rather than a contest.

**New work.** One new entry in lb.js BOARDS and one row in accounts.js BOARDS. Zero schema change: it reads official, wins, net, verified and user_id, all in migration 0031, and D1's SQLite already runs window functions (the streak board uses ROW_NUMBER today). One honest caveat to state in the note: official is a local day key, so the month boundary is fuzzy by a day for players far from UTC.

**Keep or cut.** NEW. It is the replacement for the cut 82-0 rate board, and the one addition I would not ship the debut without.

### STREAK

**Ranks.** Longest island of consecutive official days. The shipped gaps-and-islands SQL, byte for byte: julianday(official) minus ROW_NUMBER() is constant inside a run, so grouping on it gives each island its length. Ordered score DESC, days DESC.

**Why.** It is a count, so it cannot be inflated by abandoning a draft, cannot be won by a lucky night, and cannot drift. It is the one board a player with no talent for the game can top by showing up, which is exactly the win state the research says a leaderboard usually fails to provide. And it is already written, already tested against out-of-order inserts, and already correct.

**Segments.** None. One list. Streaks cluster hard at small integers, so a neighbourhood window here is a wall of identical numbers; show the top and the player's own count and stop.

**New work.** Almost nothing. The current column uses date('now','-1 day'), which is the same UTC assumption as TODAY; it is invisible today because accounts.js renders only r.score, so either feed it the client's day or drop the column. The copy must stay a count with no consequence attached: the owner's standing rule is that the streak is a patch you earned, never a leash, and the board inherits that. A lapsed streak simply shows the new number with no comment and no screen anywhere mentions a streak the player no longer has.

**Keep or cut.** KEEP, unchanged.

### THE 82-0 CLUB (with Presti by cost inside it)

**Ranks.** Not a ranking. SELECT name, mode, budget_used, cap_left, created_ts FROM runs WHERE wins = 82 AND verified = 1 AND user_id IS NOT NULL ORDER BY created_ts DESC. Unlimited number ones. The inline second view is the shipped cheapest SQL plus AND r.official IS NULL, tie-broken created_ts ASC so the first GM to find the floor keeps it.

**Why.** It converts the game's whole chase from a contest with one winner into a threshold with unlimited winners, which is the only repair for the measured failure of ranked lists: a full first-to-last ranking lifts the top few percent and flattens everyone else. A membership list has no low ranks to occupy. It is also immune to every statistical problem in the set, because there is no denominator, no maximum and no sample size: verified = 1 means the server replayed it, so a 82-0 either happened or it did not. At the owner's own 8% tuning it fills at a steady drip, which keeps the page alive with no reset machinery. And it is by far the easiest surface in the whole feature to make beautiful: every row is a win, so one card per entry can carry a real printed banner without competing with a column of numbers.

**Segments.** Two views behind one tab, switched by a text button in the header, not a second row: ALL (default, newest first, with a mode chip on each row) and PRESTI BY COST. Mode lives as a chip on the row rather than as a segment, which is how three modes stop costing a control row. Gate the cost view behind a stated bar ("opens when 10 GMs qualify") so emptiness reads as anticipation rather than neglect, and publish the best known floor beside it so the number means something: the handoff records $38M from the verification pass.

**New work.** One new BOARDS entry with no aggregation at all, plus three small edits to cheapest: the official filter, the created_ts tie-break, and rendering cap_left, which lb.js already selects as saved and accounts.js throws away ($38M, $12M left). No schema change for either. The challenge hole needs a column to close properly: today a market_crash Daily (PRICE_MULT 0, live in the POOL3 rotation) mints $1 players, so one such day sets Cheapest 82-0 at about $5M forever. AND r.official IS NULL removes the Daily case now; a ch_id TEXT column in migration 0032, written from the server's own board.ch.id, removes the challenge case.

**Keep or cut.** The 82-0 RATE board is CUT and the CHEAPEST board is KEPT, folded in here. The rate board is not fixable at MIN_RUNS = 10: at an 8% base rate the standard error of a ten-season rate is 8.6 points, wider than the entire plausible skill spread, and P(3 or more of 10) is about 4%, so one in every 25 players who stops at ten seasons shows 30% by luck and outranks every honest high-volume GM. Wilson's lower bound does not save it either (3/10 scores 0.108, 12/100 scores 0.070, the fluke still wins). And in launch week it is worse than wrong, it is embarrassing: with no qualifier yet perfect it renders as a column of 0.0% rows ordered by runs DESC, which is a most-seasons-played ranking labelled as a perfection rate.

### YOU

**Ranks.** Nothing is ranked. Your best record in each mode, your best Daily, your cheapest 82-0, your current and longest streak, and a riso-printed histogram of every win total you have ever finished. Five MAX/MIN aggregates in one query over runs WHERE user_id = :me AND verified = 1.

**Why.** It is the one competitive surface where the opponent is always exactly at the player's level, so the dead middle of a long list cannot happen, and it is the only one that survives a population of one. That matters twice: on the morning of 10/20 before anyone has played, and on every quiet Tuesday afterwards. It is also where the player lands when their rank is poor, which is the moment the whole feature either keeps them or loses them. Most of it is already built and has no screen: t82_daily1 holds up to 400 days of officials plus a separate archive of past-board replays, deliberately partitioned so a practice run can never claim a day, and the signed-out half needs no server at all.

**Segments.** None. One card, scrolled. At the bottom, two quiet text links out to the two boards that do not deserve a front tab: BEST NET and THE HALL. Pair the all-time personal best with a best-of-last-ten line, because a lucky early 81-1 can otherwise sit unbeatable for months and the line goes dead exactly when it is needed.

**New work.** A board=me branch in lb.js (or an extension to /api/me) returning the five aggregates in one query. The signed-out half reads t82_daily1 directly and needs nothing. The histogram is one canvas via T82RISO.kit(root, g). No schema change.

**Keep or cut.** NEW. Not on his list, and it is the floor under everything else on it.

### BEST NET (behind YOU, not a front tab)

**Ranks.** Average of a GM's best THREE net ratings in a mode over the trailing 30 days, three-run minimum. ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY net DESC) <= 3, then AVG(net), over runs WHERE verified = 1 AND user_id IS NOT NULL AND mode = ? AND official IS NULL AND created_ts >= :cut.

**Why.** As shipped this is a volume board wearing a skill board's clothes. The expected maximum of n draws grows roughly mu + sigma * inverse-normal(1 - 1/n): about +1.54 sigma at ten runs and +3.09 sigma at a thousand, so ten times the play buys about 0.8 sigma for free, and because a maximum never decreases the board freezes the moment one high-variance outlier lands. Averaging the best three cuts the sampling noise by root 3 and makes the GM produce three good seasons rather than one, and the 30-day window means a newcomer can top it. The single best number is not lost: it stays loud on the results screen, on the player's own card, and in THE HALL.

**Segments.** A mode select INSIDE this view (Classic, Presti, Pro). This is where the three-mode row belongs: it applies to one board, so it must not cost every board a second tab row the way lb-modes does today.

**New work.** Rewrite BOARDS.net to take ?mode= the way rate already does, window it, average the best three, and exclude Daily and challenge rows. No schema change. This also closes the gap where a Pro specialist's 79-3 at +24 net and a Presti 81-1 at $38M reach no board at all, because net is Classic-only and cheapest demands a perfect season.

**Keep or cut.** CHANGE, and demote. MAX(net) over all time on Classic only is the most volume-sensitive board in the set and the one most likely to look permanently settled to a new arrival.

### OUTDRAFTED (post-launch, the one board that needs a migration)

**Ranks.** net minus par_net, higher is better, where par is the five you get by taking the highest-value legal season on each ticket, greedily in ticket order, filling the 2G/2F/1C frame and respecting the Presti budget. Rank AVG(net - par_net) over a GM's best five such runs in 30 days, five-run minimum. A membership half comes free: the runs where the gap is zero or positive are the ones where nobody could have drafted those tickets better.

**Why.** Every board above rewards either volume or the tickets. Nothing rewards drafting well from bad tickets, which is the complaint the game will actually get and the only board shape where a player who plays once a week can beat a grinder. WordleBot is the proof of both the concept and the demand: NYT split the post-game into a skill score and a luck score precisely because the answer is partly a lottery, and TRUE 82's tickets are a literal lottery. The same number is also the honest consolation line on a bad day ("Cold tickets. You beat the obvious five by 1.4 anyway"), which is the one thing the post-game can say to a player who went 64-18 that is both kind and true. I considered and rejected the Immaculate Grid rarity score as the alternative skill axis: it needs per-day pick counts that do not exist, it reads lower-is-better against every other number in the game, and it quietly teaches players to avoid stars, which fights the art direction of stars only with neon for superstars.

**Segments.** One mode select inside it, same shape as Best net. No other control.

**New work.** THE ONLY BOARD HERE THAT NEEDS A SCHEMA CHANGE. Migration 0032 adds par_net REAL (and par_hit INTEGER if the club half ships), written in run.js in the same replay pass that already produces wins and net: five pool scans plus one engine call per submission. Nothing is trusted from the client, because replay() already re-derives the board from (mode, seed, challenge). The CPU cost per submission is the one unknown in this whole spec and it must be measured against the deployment rather than reasoned about, which is this lane's standing lesson. Ship it AFTER 10/20: because replay is deterministic from (mode, seed, official), par_net backfills offline for every existing row, so the delay costs nothing. Name it in plain words on the board itself ("how far your five beat the obvious five from the same tickets"); the phrase luck-adjusted net rating above expectation fails the house style outright.

## Segment architecture

FIVE TABS, ONE ROW, NO SECOND ROW EVER: TODAY, MONTH, STREAK, 82-0, YOU. Default TODAY. Five is exactly Apple's stated ceiling for an iPhone segmented control, and at 12.5px uppercase Big Shoulders with 0.06em tracking those five labels total roughly 285px of glyph plus padding plus gaps, which fits the sheet's 292px of content at 320px on one line. Set flex-wrap: nowrap and make the lab prove it at 320 before anything else is judged. Today's control stack is 5 board tabs plus a second row of 3 mode tabs, both flex-wrap: wrap, which at 320px reaches three lines before a single rank is visible; that is the clutter the owner is worried about and it is measurable, not a matter of taste.

TAB HEIGHT 44px, not the current 32px. WCAG 2.2 only asks 24px and 32px passes it, but Apple asks 44 and Material 48, and on a row of five adjacent controls on a phone 32px with a 6px gap is where mis-taps live. Raising them is 12px once, which is affordable only because there is one row instead of two.

NO SEGMENTED CONTROL ANYWHERE BELOW THE TABS. The two boards that need a second dimension get a single right-aligned text button in the list's own header line, opposite the field count, so the whole switch costs no row at all: TODAY reads "4,412 GMs | Top of the board", 82-0 reads "41 perfect seasons | Presti by cost". One tap toggles, the label states where it goes rather than what is selected. Three modes, which today cost every board a whole second tab row for one board's benefit, become a <select> inside BEST NET and OUTDRAFTED only, plus a mode chip on each 82-0 Club row.

TWO BOARDS COME OFF THE FRONT ENTIRELY and are reached by text links at the bottom of YOU: BEST NET and THE HALL. The argument to give the owner is that both measure a single best night, which belongs next to a player's own records rather than at the front door, and that moving them is what buys the 44px tabs and the one-row rule.

PRIORITY OF SCORES ON A ROW, in order: the record (wins-losses) is the game's currency and is always the score column; net is the tie-break and is printed after a middle dot only where it discriminates; nothing else goes on a row. On the Daily, wins tie constantly (nine rows all reading 81-1 is the normal case, not an edge case), so the net tie-break is load-bearing and the layout must survive a long run of identical scores. The rank integer is never the hero number anywhere: past the visible page it is replaced by a percentile phrased only as a ceiling, never as a floor, and never as "bottom X%". Below a field of about 30 the percentile is suppressed and the raw count shows instead ("2nd of 31"), because "Top 3%" of 31 players is one person dressed as precision.

DEFAULT VIEW WITHIN TODAY: AROUND YOU above a field of 25, TOP below it. Below 25 the window and the top are the same thing, and opening on yourself at 4th of 9 reads as broken rather than personal.

## Start-screen link variants

### Quiet word
"Boards" alone in the empty centre of .hm-top, absolutely centred (position: relative on the row, left: 50%, translateX(-50%)), in 600 14px Rubik at rgb(var(--t-text-rgb) / .8), no icon, no rule, no box. It matches .hm-howto's weight and colour exactly, so the top bar reads as two equal utilities flanking nothing and the title art keeps every bit of the visual budget.

*Risk.* The safest and the quietest. It may be so quiet that the debut's audience never taps it, which is the whole reason to test it against the louder variants rather than assume.

### Hairline tab
"BOARDS" in 12.5px uppercase var(--t-mono) at var(--t-label), sitting on a 1px var(--t-rule) hairline that runs the full width of the row behind it, with the word knocked out of the rule by a var(--t-ground) background. Reads as a filed tab under the top bar. The rule's quiet second job is to give the title art a baseline to sit on rather than a word to compete with.

*Risk.* A full-width rule is a new horizontal line directly above the logo, which is the one place the owner asked for nothing new. If it reads as a divider rather than a tab, it steals more from the logo than the word does.

### Riso pip
A 10px three-dot halftone pip in var(--t-metal), drawn in CSS with radial-gradient and no canvas, immediately left of "Boards" in var(--t-text-2). The pip is the only ornament on the screen besides the logo, and it borrows the reel's dot language at the smallest size it survives.

*Risk.* An ornament 60px from the logo is an ornament competing with the logo. It is also the variant most likely to look like a loading dot or a bullet rather than a mark.

### Live standing
The link's label is a fact when there is one and a noun when there is not: "Top 12% today" after the player has a Daily result, falling back to "Boards". Reads as information the player consults rather than an invitation, which is the autonomy-supporting framing, and it is the only variant that pulls without a badge or a count. The number comes from /api/percentile, which already works signed out.

*Risk.* Two risks, both real. It puts a second number on the one screen whose star is a number, and it costs one extra request on the home screen, so it must fail soft to "Boards" in silence. It also cannot be shown before the player has ever played, so its first impression is the fallback.

### The rail
No word in the row at all: a 28px wide, 2px tall var(--t-metal) rule centred in .hm-top, with "BOARDS" set beneath it in var(--t-label) at 10.5px mono, the quietest type on the page. The centre of the top bar becomes a mark, and the label is the footnote to it.

*Risk.* The most restrained option and the most likely to be missed entirely on a phone at outdoor brightness. A 2px rule plus 10.5px type is also the hardest thing here to give a 44px tap target without the target overlapping "How to play".

### Chip
<span class="t-chip" data-size="sm" data-tone="plain"> as a button reading BOARDS: a shipped component, zero new CSS, outline rather than filled so it does not read as a primary action.

*Risk.* Probably a cut, and included so the owner rejects it with his eyes. A chip means "a tag" on every other screen of the site, and one meaning per component is the same law as one meaning per colour. It is also the heaviest of the six in a screenshot.

## Post-game prompt variants

### The percentile promoted
No new block anywhere. .res-comp keeps its comp phrase, and the percentile moves out of its trailing bullet onto its own line directly beneath, at var(--t-fs-head) in var(--t-hot), reading "Top 12% of today's 4,412 GMs", with "See the board" as a t-btn data-kind="text" on the same line. The percentile raises the question and the board answers it, which is the whole architecture of the hook in one line of type.

*Trigger.* Whenever /api/percentile returns a pct and the field clears the sample floor. Silent below it, and silent in Kaman. This is the baseline every other variant is measured against.

*Risk.* It is still small type on a page of big type, and when the board is thin the line suppresses itself and the hook disappears on exactly the day it is needed most. Mitigation: on a thin board fall back to the all-dailies pool, which percentile.js already does, and say "of all GMs who play the Daily" rather than "today".

### The replay fork
One sibling button in .actions beside "Run it back", reading "See the board". .actions is already a flex row that lays out two buttons and already does on an archive run, so this is markup and no CSS. Two equal choices at the natural end of the page, where the player has already decided whether to play again.

*Trigger.* Always, when the lane is on. No condition, no number, no animation.

*Risk.* It sits below the roster, the GOAT climb and the scoring card, so most players never scroll to it. And giving it equal weight to Run it back competes with the one button that already produces the replays this feature exists to cause.

### The mini board
Three rows under the record, using the real .lb-row markup so it is literally the same component as the board: the leader as one line, the GM one place above the player, and the player's own row, with the true gap stated ("2 wins"). Tapping any row opens the board.

*Trigger.* Only when the field is 25 or more and the player's true rank is known. Silent otherwise.

*Risk.* The heaviest of the six and the most likely to read as clutter beside the banner print. It also needs the rank-of-me query before it can exist at all, and a false or inflated "you are close" is worse than no number, so the gap must be the real one and must be hidden when it is not reachable.

### The named rung
One line that names the tier the record reached and the tier one win up, using HISTORY_COMPS and shareCompFor, which already give every realized win total exactly one name. The board link sits under it. Spelling Bee's whole retention engine is that you can see Genius from Amazing, and the game already has the ladder and simply never names the next step.

*Trigger.* On 80, 81, or a Daily that beat the room's median. Silent on everything else, which is what makes it mean something when it fires.

*Risk.* This is the variant closest to the line the owner drew, and it is one word from a tease. It must never say missed, so close, or almost. Give him two drafts and let him choose: (a) "81-1. That is the Shaqobe Core tier. Almost nobody gets there." (b) "81-1. One win is the Greatest of all GOATs." (a) is safe, (b) pulls harder and sits nearer the line.

### The quiet confirmation
Nothing on the board card changes. #runStatus at the very bottom, which is already centred, already has reserved height, is already in index.html's live-hide manifest and is written to by nothing, gets one plain line as a link: "Verified. 78-4 is on today's board." The entire pull is the percentile line above it.

*Trigger.* After a verified submission. On a verified = 0 reply it says so plainly instead, which is a real gap today: the verdict is stored and returned and no surface reads it, so a player whose run failed verification is told nothing and cannot retry.

*Risk.* Deliberately the weakest pull in the set. It is the control arm, and it is worth building so the owner can see with his own eyes what no prompt costs before he pays for a louder one.

### The sheet, once
A .t-sheet slides up over the results once per session: two lines, one button, a grab handle, dismissible, and it never returns that session. The highest conversion of the six and the only one that interrupts.

*Trigger.* Once per session, after a verified run, and never again that session even across further games.

*Risk.* It interrupts the one screen the player came for, which is precisely the imposed-rather-than-entered framing that the field evidence says reverses the sign of the whole feature: in the one controlled workplace study, players who consented gained and players who did not lose both affect and performance from the identical game. Build it so he can reject it with his eyes rather than on my word.

## Art looks

### BOX SCORE
The newspaper agate column. No ornament whatsoever. The entire look is typographic hierarchy: 12px rank, 14px name, 13px score, a 1px hairline under every row, score right-aligned on the ones place, name ellipsised between them. The top three rise to 15px and change ink; nothing below rank 3 is decorated at all. This is the control arm and the fallback, and it is the most legible leaderboard anyone will build.

*Tokens and engines.* var(--t-mono) throughout, var(--t-text-2) for the rank, var(--t-text) for the name, var(--t-hot-hi) for the top three only, 1px solid rgb(var(--t-rule-rgb) / .5) rules. No engine.

*Legibility.* The highest of the ten. font-variant-numeric: lining-nums tabular-nums on rank and score so digits share one advance width and a column of scores is scannable without reading each value; width: 3.5ch on the rank gutter so four digits fit and the names column never jogs between 99 and 100.

### HALFTONE LADDER
The list is printed on the theme's own riso stock. T82PRINT.paper(root) returns that stock as a tileable data URL, already cached and one call per theme, and the rows sit on it under var(--t-print-blend). The top ten ranks print as halftone-screened numerals through T82RISO.kit(root, g) into one small canvas each; rank 11 and down are plain mono, so the ink stops where the achievement does.

*Tokens and engines.* T82PRINT.paper for the stock, var(--t-print-paper) and var(--t-print-key) for the screened numerals, var(--t-print-blend) as the composite, var(--t-text) for names.

*Legibility.* The stock is low-contrast by construction, so names stay var(--t-text) on it and nothing smaller than 12px is ever screened. The one thing to check in the lab is the rank column against the paper at 320px, because a screened numeral at 12px is the first thing to lose.

### TICKET STUB
Every row is a perforated ticket, which is the object the game already deals. A var(--t-ground-2) face, a 2px dashed var(--t-rule) left edge as the perforation, the rank in the stub's own narrow gutter, the score punched into an inset var(--t-ground-3) well, and a 3px var(--t-metal) top edge on the top three only. No canvas at all.

*Tokens and engines.* var(--t-ground-2), var(--t-ground-3), var(--t-rule), var(--t-metal), var(--t-label) for the gutter rank, var(--t-r-card) for the corners.

*Legibility.* Very high: every number is type on a solid field, and the well gives the score its own contrast ground. The dashed edge is the only thing that could read as noise at 320px, so cap it at 2px and keep it off the right side.

### SEASON STRIP
Each of the top ten rows, plus the player's own, carries a 64px riso month strip from T82RISO.strip({ games, cssW: 64, d: 2 }) beside the record: wins as coins, losses as rings, printed settled. The shape of a season sits next to its number, which is the game's own visual language doing the work a sparkline would do.

*Tokens and engines.* T82RISO.strip, which reads var(--t-win), var(--t-loss), var(--t-print-paper) and the screen angles off the theme itself. No new token.

*Legibility.* The strip is pure ornament and never carries a number, so legibility is untouched by it. Two hard limits: cap it at eleven rows (82 dots times forty rows is far past the canvas budget), and at launch it must be wins-proportional rather than true game order, because the per-night string is not stored. A games TEXT column in a later migration makes it exact, and it is backfillable from (mode, seed) because replay is deterministic.

### NIGHT MARQUEE
The arena scoreboard. Deep var(--t-ground), each score in var(--t-disp) 800 at var(--t-fs-head) in var(--t-offset) with a soft rgb(var(--t-offset-rgb) / .35) text-shadow, rank in var(--t-metal), name in var(--t-text). The leader alone takes var(--t-hot) and a 2px var(--t-hot) left bar. One glow, one meaning, and nothing else on the page lights up.

*Tokens and engines.* var(--t-offset) and var(--t-offset-rgb) for the glow, var(--t-hot) for the leader, var(--t-metal) for ranks, var(--t-ground) for the field.

*Legibility.* Glow on small type is the failure mode. Keep the shadow off anything under 15px and off the name entirely; the glow belongs to the score column alone, where the type is largest.

### BRASS PLAQUE
The .plq-frame component the boards sheet already wears, applied per row to the top three only: the radial accent wash, the four rivet dots, the var(--t-metal) border. From rank 4 down every row is unframed agate, so the frame is the trophy and the list is the record.

*Tokens and engines.* The shipped .plq-frame recipe: var(--t-accent-edge), rgb(var(--t-accent-rgb) / .09), rgb(var(--t-accent-face-rgb) / .22), var(--t-ground-2).

*Legibility.* Good on the three framed rows and untouched elsewhere. One trap the lab must show both ways: under the shipped look (data-card="outline") .plq-frame becomes a white-outlined box with a hard 4px offset shadow and its rivets are display: none, so the brass version only exists if data-card is overridden deliberately. Judge both, because the shipped one is what would actually ship.

### SPLIT FOUNTAIN
One continuous two-ink gradient down the whole list, var(--t-print-key) at the top bleeding to var(--t-print-night) at the bottom, behind the rows at low alpha, so depth reads as position without a single number changing weight. Every rank and score stays the same size and colour from row 1 to row 82. The player's own row cuts a clean band straight across the gradient.

*Tokens and engines.* rgb(var(--t-print-key-rgb) / .14) to rgb(var(--t-print-night-rgb) / .14) as a linear-gradient on the list, var(--t-text-2) and var(--t-text) for all type, rgb(var(--t-you-rgb) / .14) for your band.

*Legibility.* The gradient must stay at or under 0.14 alpha and the lab should assert the rank's contrast at BOTH ends of it, not just the top. This is the look most likely to pass a glance and fail a measurement, which is exactly why a contrast assertion belongs in test.js beside the existing style law.

### WOOD TYPE
Hierarchy inverted. The rank is the ornament: var(--t-disp) 900 at 20px, flush left, oversized, with the name dropped to 13px var(--t-body) and the score to 12px mono. A 1px rgb(var(--t-light-rgb) / .12) highlight along each row's top edge gives the letterpress bite. The position is the loudest thing on the screen.

*Tokens and engines.* var(--t-disp) at 900 (loaded), var(--t-text) for the rank, var(--t-text-2) for the name and score, rgb(var(--t-light-rgb) / .12) for the highlight.

*Legibility.* Excellent, and the only look here that makes an 82-row list scannable by position alone. It needs the widest rank gutter of the ten, so set it in ch with tabular figures and check that a 20-character display name still ellipsises cleanly at 320px.

### CLUB CARD
For the 82-0 Club only, because that board is a list of achievements rather than a ranking. Each entry is a .t-card data-tone="feature": the GM's name at var(--t-fs-name), the date in var(--t-fs-label) mono, the mode as a .t-chip data-size="sm", and on the newest card (or on a tap) a real season banner from T82PRINT.print(spec, { width: 320 }), which is the game's own landscape, printed synchronously in one call with no mounting and no animation. One perfect season, one printed picture.

*Tokens and engines.* T82PRINT.print, which reads the whole --t-print-* family and throws if any is missing, plus var(--t-metal) for the feature card's top edge and var(--t-accent-ink) on the mode chip.

*Legibility.* The card is type on a solid field, and the print sits behind nothing. The budget is the constraint rather than the contrast: one banner bake measured about 151ms on a throttled phone, so print one card eagerly and the rest on tap, never a list of forty.

### YOUR SEASONS HISTOGRAM
For the YOU card. One riso-screened bar chart of every win total the player has ever finished, printed once into a single canvas through T82RISO.kit(root, g): var(--t-print-key) bars on the theme's stock, with the 82 column in var(--t-hot) if they have ever been there. No ranks and no other players anywhere on it.

*Tokens and engines.* T82RISO.kit for the screening, var(--t-print-key) for the bars, var(--t-hot) for the 82 column, T82PRINT.paper for the ground.

*Legibility.* Axis labels in var(--t-mono) at var(--t-fs-label) and nothing smaller; label only the ends and the 82. It also teaches the thing the statistics say, that one season is a draw from a distribution, which makes the chase read as fair rather than rigged.

### RANSOM NOTE (the restrained version)
Borrowed from the art library's loss/ransom look and dialled almost all the way down. Every row is uniform agate except the leader, whose rank and score are set in mismatched display weights (900 next to 700) at two sizes on a var(--t-hot) slab, as though one line were pasted in from another print. Exactly one row on the whole board breaks the grid.

*Tokens and engines.* var(--t-disp) 700 and 900, var(--t-hot) and var(--t-accent-ink) for the slab, var(--t-text) and var(--t-mono) for the other eighty-one rows.

*Legibility.* High precisely because it is scarce: a single broken row on a uniform list is legible in a way a page of broken rows is not. The slab must carry var(--t-accent-ink) rather than white, and the mismatch must stay inside the display face so no fourth weight is requested that the page has not loaded.

## The lab build plan

FORM: a new lab at docs/leaderboard-lab/, three files, no build step, in the exact shape of docs/art-lab/. index.html + lab.css + lab.js, served straight off the branch preview at /docs/leaderboard-lab/. Do NOT extend docs/reprint-lab/: its build.js needs a 93-file snapshot directory, the output it hands the owner is an 8.4MB single file on a phone, and adding one page means expressing it as a view with snapshot states, which a live board is not. (The snapshots are recoverable from reprint-lab.html's inlined window.LAB_SNAPS if anyone ever needs them, so that door is not closed, just not this door.)

WHAT IT BORROWS, four lifts, about 150 lines total. From docs/reprint-lab/src/app/console.js: encode() and decode() verbatim, with the prefix changed to T82LB- so a masthead code pasted into the wrong lab fails loudly instead of half-decoding; and the CONTROLS / buildConsole / buildRow / binders / sync registry, so every knob is one line of data and the recipe is the single source of truth (controls are never read from the DOM). From docs/reprint-lab/src/app/pages.js: the srcdoc phone frame plus fitPhone, and the Compare-with-today toggle. From docs/art-lab/lab.js: gameKeys / loadEngines / KEYS0, which read the ?v= cache keys out of the live index.html and rewrite the lab's own links (mandatory, because _headers serves /styles.css immutable for a year); mulberry32; and marks() / picksCode(), the hearts-X-asterisk-with-notes machinery.

FILES THE LAB LOADS BY RELATIVE PATH, with data-lab-key so the keys get rewritten: ../../styles.css, ../../look.css, ../../tools/theme-core.js (plain ES5, runs in the browser, exposes T82THEME.today() and T82THEME.vars()), ../../reel-riso.js, ../../results-riso.js. A look is defined as about a dozen role hex overrides fed through T82THEME.vars() and applied as inline --t-* properties on the board's wrapper, never as hand-written CSS, so a look the owner picks ships by copying its roles into ROLES in tools/theme-core.js and running node tools/theme.js. Keep the lab OUT of tools/style-law.js's CSS_FILES / GRAFT_CSS / JS_FILES / HTML_FILES lists, exactly as docs/reprint-lab is, so look variants may carry literal role hexes; note that docs/art-lab IS in those lists, so copying its files wholesale and then adding literals turns node test.js red.

THREE VIEWS, one seg control: BOARD, START SCREEN, POST-GAME. The board renders directly in the lab page (not in a frame) so looks apply instantly as inline tokens. The other two render the real pages inside the phone frame: fetch("/index.html", { cache: "no-cache" }), strip the analytics.js and retention-client.js script tags (app.js is already safe without both), insert <base href="/"> as the first child of head, then assign iframe.srcdoc. Never iframe src: _headers sets X-Frame-Options: DENY under /*, which blocks framing even same-origin, and srcdoc carries no HTTP response so it is unaffected. Keep pages.js's baked fallback for when contentDocument comes back null. Because the lab is same-origin on the preview, fetch works; if it is ever published as an Artifact it must ship captured copies instead, since _headers sends no CORS header.

CONTROLS, all data in one CONTROLS array: seg board (Today / Month / Streak / 82-0 / You); seg view (Around you / Top); seg width (320 / 375 / 390); select look (the twelve art looks); slider rows stepped 0, 1, 3, 12, 40, 82; slider youRank stepped 1, 2, 7, 23, 81, off-board; slider field stepped 9, 40, 400, 4412 (this is what decides whether the percentile, the "of N" line and the median appear at all); toggles adds (medals / season strip / tag beside name / gap to next / the room line / sticky your-row); seg linkStyle (the six start-screen variants); seg hookStyle (the six post-game variants); a Compare-with-today button. Row count 0 and row count 1 are first-class states, not edge cases: an empty board and a board of one is what the influencer's first thousand viewers meet at 9am on 10/20, and if those two are never designed the feature ships broken on the day it matters.

FAKE DATA, seeded so a look change re-renders the identical board and only the look moves. fakeBoard(board, n, youRank, seed) returns the real /api/lb reply shape ({ ok, board, title, note, rows: [{ rank, name, tag, score, ...extras }], you }), fed through a copy of accounts.js's BOARDS[].fmt table so the formatters cannot drift from the shipped ones. Distributions measured off this repo's own tools, not invented: Daily wins p10/p50/p90 = 66/75/80 with about 4.7% perfect (so a 40-row board carries one or two 82-0s, a cluster at 78 to 81, a tail to the mid 60s, and long ties at every value, because the shipped order is wins DESC then net DESC); Classic net p10/p50/p90 = 14.6/20.1/27.5 with human numbers about 3 lower than bot numbers; cheapest Presti 82-0 clustering $29M to $40M; streaks a mass at 1 to 4 with a few at 8 to 12. Names: two thirds handles obeying the real filter /^[A-Za-z0-9 _.\\-']{3,20}$/ including 20-character and 3-character worst cases, one with a space, one with an apostrophe, two identical ("Gray" twice, so the duplicate-name problem is visible); one third the server's own GM-<tag> default, because on day one that is what most signed-in players are called.

HOW CODES WORK: two codes, one COPY button, separated by a blank line. First the T82LB- recipe code, which is base64url of the JSON of only the keys differing from DEFAULT, so it stays short and old codes still decode after new knobs are added. Second the art-lab marks block: a header line with the lab version and the date, then one line per kind reading "kind: love a b c | cut d e", then a "yes, but" section of "* kind/id: the note", then a closing line stating that anything unmarked is kept and how many options were in the lab. That last line is load-bearing because it tells the agent reading the code what the owner did not see. The recipe code reproduces one exact combination; the marks block is how he keeps three of eleven score-column treatments and cuts two with a reason. He needs both, because this lab asks two different questions at once.

Expose window.T82LBLAB = { board: fakeBoard, code: picksCode, set: set } the way art-lab exposes window.T82LAB, so a later agent can drive any state for a screenshot without clicking.

## Must fix before any board can be trusted

1. ALREADY WRITTEN, UNCOMMITTED, NEEDS TESTS: the adoption fix is in the working tree. functions/api/run.js now stamps `official: claimedDay` unconditionally (it used to be `userId && claimedDay`, which destroyed the only record of which Daily an anonymous run belonged to), and functions/api/claim.js gains adoptRuns(), which links the device's verified anonymous runs to the first account ever to claim that sid, adopts the earliest attempt per day rather than the best, and never touches a day the account already holds. Both are correct and both are the difference between a post-game sign-in prompt that works and one that answers "too late, come back tomorrow". Pin them in test.js before committing: one account per device, earliest-not-best, nothing unverified, and no UNIQUE violation.

2. THE BOARD TABS ARE NOT TABS. `.lb-tab` is missing from BTN3D_EXCLUDE (app.js:780), so the document-wide MutationObserver adds `.presti-spin` to every tab the moment openBoards() appends the overlay, and look.css's `button.presti-spin` rule is specificity-boosted with `#lab-k#lab-k` so it beats `.lb-tab` AND `.lb-tab.on`. All five tabs render as identical neon plates, the selected tab loses its accent border and text so the only remaining signal is aria-selected, and presti-spin's `padding: 10px 6px 11px` pushes them to about 43px tall and squeezes them horizontally. Fix: add tm-flat to the tab class in accounts.js boardsHtml (one file, the documented opt-out, what .acct-btn and .hm-howto already use), or add :not(.lb-tab) to BTN3D_EXCLUDE AND to look.css's exclusion list, which means re-shipping look.css from the Reprint Lab and never hand-editing it. Nothing in the lab can judge a tab until this lands.

3. TODAY ASKS FOR THE UTC DAY. lb.js:109 defaults the daily board's day to utcDay(), but the key stored in runs.official comes from daily-core.js dayKey(), which is built from local date parts. Every player whose local date differs from UTC at the moment they tap Boards gets the wrong day: most of the Americas every evening (an LA player at 6:30pm on 10/20 is asked for 2026-10-21) and most of Asia and Oceania every morning. The result is either "Nobody has made this board yet" or, worse, a ranked list from a different puzzle with the player's own score absent. That is the 10/20 to 10/22 window exactly. Fix on the read side, because the stored keys are local by design: accounts.js loadBoard() sends { day: T82DAILY.dayKey() } for the daily board, utcDay() stays as the no-JS fallback, DAY_RE validation stays server-side.

4. THE RUN IS SUBMITTED BEFORE THE HEAT CHECK RESOLVES. finishRunTail calls renderResults (which only builds the Heat Check overlay) and then gameFinishedPings at app.js:8087, which freezes (G.actions||[]).slice() into the payload. The player's refusal pushes "hx" later, so the server replays the spin as taken. On a lucky Presti 81-1 (a five projecting 79 or fewer that realized 81) the row stores 82 about 25% of the time: a perfect season the player explicitly refused, appearing on the 82-0 Club and Cheapest 82-0. A COLD spin can store 80 against the 81-1 he just shared. Worst on a cap-mode Daily or challenge, where official is set and the UNIQUE index makes it unrepeatable, so the one board the debut is built around can show a record the player refused. Note net never diverges (res.net is untouched; only res.netFinal moves), so Best net is clean. Fix: do not submit from gameFinishedPings when clutchPending was true; submit from the Heat Check's exit paths (pull, skip after the pull, charity, Esc) once G.actions is final.

5. "YOU'RE NOT ON THIS BOARD YET" IS SHOWN TO PLAYERS WHO ARE ON IT. lb.js:137 resolves `you` with out.rows.find() over the 82 fetched rows, so rank 83 and lower get { rank: null } and accounts.js:311 prints the not-in-the-set copy. On a Daily board after the debut that is most of the audience being told they do not exist, directly under a season they were proud of. One extra bound query per board (COUNT of rows scoring better, same WHERE) returning { rank, score, outOf } fixes it, plus a third render case for ranked-but-off-page distinct from genuinely-not-in-the-set (which is honest on the rate board for a two-run player and dishonest everywhere else). This same query is what the Around-you window and the post-game mini board both need, so it is one fix for three features.

6. THE DEDUP KEY LOSES RUNS. accounts.js:225 keys SUBMITTED on `mode|seed|actions.length` and sets it BEFORE the POST, and nothing clears it on sign-out. Three consequences: a Daily rematch at the same board with the same action count is silently never sent (and "Run it back - practice" restarts the SAME board by design, so the collision is the common case, not an edge one); a network failure loses the run forever with no retry and no persisted payload; and the early return leaves LAST_SUBMIT holding the previous run's { ok: true }, so a diagnostic reading lastSubmit() gets a stale pass rather than going quiet. Fix: mint a run id in newGame() and key on that plus the signed-in id, set the flag only after a confirmed { ok: true }, persist one pending payload to localStorage and flush it on boot and on auth change. The server is already idempotent: runs.id is the primary key and a UNIQUE clash answers dedup rather than failing.

7. ONE BROWSER, ONE OFFICIAL DAILY. The official gate is T82DAILY.officialFor() over the shared localStorage key t82_daily1, and it is read on the home screen at app.js:3488 and branched on at 3671, before startDailyRun is even reached. So the second account on a browser can never post an official Daily, is shown the first account's record and five as its own, and (via a shared beat link) is given the full official gate and then silently filed as practice. That breaks the owner's own seven-email test before it tests anything, and it breaks every shared phone and iPad on launch day. Fix: stamp the owning account into the official entry in daily-core.js recordOfficial and compare it in officialFor; let the server's UNIQUE (user_id, official) be the real gate, since a false negative there costs nothing (it answers alreadyToday and drops the row).

8. PLAYER A'S DAILY HISTORY IS CLAIMED BY PLAYER B. localDaily() reads the raw shared t82_daily1 blob, and the `claimed` guard resets on every sign-out, so the next account to sign in posts the same blob; claim.js merges it into THAT user's local_claims row and /api/me reads it back as "Keeping 23 days of your Dailies and a 23-day streak" to an account that never played them. There is no un-claim, and functions/_lib/acct.js deliberately exempts this lane from the mockDb rule, so preview and localhost testing writes these rows into the production true82 database. AGENT-HANDOFF.md:256-258 still says previews write nothing; that line is stale and actively dangerous, and correcting it matters as much as the code. Fix: stamp the claiming account into the blob and refuse to post it to a different one, leaving the unstamped-blob-adopted-by-the-first-account path intact, because that is the feature.

9. BOARDS COUNT DAILY AND CHALLENGE ROWS. cheapest and net filter only on mode. challenges.js market_crash (cfg PRICE_MULT 0) is live in the POOL3 Daily rotation and capCost floors at 1, so every player on that board costs $1 and an all-time five costs $5M: the day it runs, Cheapest 82-0 reads about $5M forever and standard Presti (a $26 ceiling per player) can never approach it. The 0.5x price boards halve it the same way. Fix now, no migration: AND r.official IS NULL on cheapest and net, and his call on rate. Fix properly: a ch_id TEXT column in migration 0032 written from the server's own board.ch.id, then AND r.ch_id IS NULL.

10. THE RANK COLUMN IS STYLED AS DISABLED TEXT. .lb-rank uses var(--t-text-3) (#635F74), which the theme documents as "the dimmest text: disabled": 2.96:1 on the night ground and 2.49:1 on ground-2, against WCAG 1.4.3's 4.5:1 at 12px. The one thing a ranked list is for is its least legible element. .acct-fine has the same problem and carries the qualification copy a confused player most needs to read. And .lb-you's 10%-accent wash computes 1.12:1 against the surrounding ground, so in practice colour alone marks the player's row, which is WCAG 1.4.1's exact failure case. Fix: var(--t-text-2) (7.30:1) for the rank and for .acct-fine, buying the hierarchy back with size and weight rather than contrast; a 3px var(--t-you) left bar plus rgb(var(--t-you-rgb) / .14) for your row (the theme ships --t-you for exactly this meaning and the board currently spends --t-accent, which is also --t-loss and also the active tab, breaking one-meaning-per-colour twice in one sheet); font-variant-numeric: lining-nums tabular-nums and width: 3.5ch on the rank. Put a contrast assertion in test.js beside the existing style law so the art looks cannot silently regress it.

11. CLEAR THE PREVIEW'S TEST ROWS, AND KNOW THAT created_ts IS THE ONLY DISCRIMINATOR. SECURITY.md:32's one-liner leaves every anonymous run, orphans local_claims and sid_links, misses the deliberate probe row, and deletes the owner's own pre-launch account and Daily history along with the test ones. It also omits the runs table from the privacy-deletion SQL at :131, which v69.1 added, so a deletion request today removes the identity and leaves every run behind under a dangling user_id. The clean moment is immediately after the Clerk production-instance swap, which reissues every user id and makes every pre-swap users row unauthenticable and therefore test data by definition. Better: a host TEXT column in 0032 from new URL(request.url).hostname, which makes every future purge exact. Also worth writing down before the merge: /api/lb is public and unauthenticated from the moment v69-boards lands, independent of ACCT_LIVE, so the flip is a UI gate and not an API gate.

## Decisions only the owner can make

1. THE 82-0 RATE BOARD: replace it with the 82-0 CLUB? RECOMMEND YES. At the game's own 8% tuning, one in every 25 players who stops at exactly ten seasons shows 30% by luck and outranks every honest high-volume GM, and MIN_RUNS cannot be dialled to fix that (Wilson's lower bound still puts 3/10 above 12/100). In launch week it is worse than wrong: with no qualifier yet perfect it renders as a column of 0.0% rows ordered by who ground the most, labelled as a perfection rate. The Club has no denominator to lie with, no qualifying bar, unlimited winners, fills from the first perfect season, and is the best art surface in the feature. The chase he liked about the rate board moves to THIS MONTH, which measures the same thing honestly.

2. THE STREAK: strict, or one forgiven day? RECOMMEND STRICT AT LAUNCH. Every daily game that has run a streak at scale has had to soften it, and chess.com's 48-hour window is a one-day grace by construction, so he will probably want one eventually. But there are two streak definitions in this codebase, the local t82_daily1 counter and the board's island SQL, and a grace rule that makes them disagree about whether yesterday counted reads to the player as the site losing their streak, which is strictly worse than a strict streak. Ship one rule derived in one place, then change the island definition after the debut if he wants grace. Grace must never be purchasable or earned, or the patch he earned becomes the leash he banned.

3. THE 81-1 CEREMONY: ship it, and which draft? RECOMMEND SHIP IT. The game already has the near-miss ceremony (v68.2 set the Heat Check save line so a hot 81 becomes 82-0 about 25% of the time) and the post-game simply never names what happened. This is the mechanic closest to the line he drew, so he picks the words, not me: (a) "81-1. That is the Shaqobe Core tier. Almost nobody gets there." or (b) "81-1. One win is the Greatest of all GOATs." (a) is celebratory and safe, (b) pulls harder and sits nearer the edge. Neither may ever say missed, so close, or almost.

4. SEEDING DAY ONE: the boards go live empty on 10/20. Seed them with his own verified runs, or open honestly empty? RECOMMEND HONESTLY EMPTY. A board the audience suspects is padded is worth less than no board, and the architecture's rarest asset is that every row was re-derived by the server. The honest answer to a thin launch is content, not fabrication: TODAY and THE 82-0 CLUB fill fastest, the empty-state copy already names the reason, and the percentile line carries the hook for everyone including signed-out players on hour one. Nothing synthetic, ever, including a ghost rival placed just above the player.

5. THE GM TAG ON A BOARD ROW: show it? RECOMMEND YES, on the player's own row always and on any name appearing twice. The data is already on the wire (lb.js selects u.tag and accounts.js throws it away). Two players who both pick "Gray" are indistinguishable to everyone except themselves, and because auth.js stores display_name as the literal "GM-" + tag there is no derived-versus-chosen distinction left for the UI to lean on, so a player can set their name to another player's default byte for byte. Separately, reject a chosen name matching /^gm-/i unless it is that user's own tag.

6. OUTDRAFTED: before or after 10/20? RECOMMEND AFTER. It is the one board that needs a migration (par_net REAL in 0032) and the one whose cost per submission is unknown, and this lane's standing lesson is to ask the deployed thing rather than reason about it. Because replay() is deterministic from (mode, seed, official), par_net backfills offline for every row written before the column exists, so the delay costs nothing and the board arrives with history already in it. Build the post-game consolation line from the same number at the same time.

7. THE ICE EMOJI AT THE BOTTOM SHARE BAND: keep it? RECOMMEND KEEP, but it is his call and he should know the tension. It is the one decorated marker for a bad result in a system whose stated law is that the median band is deliberately empty because scarcity is the signal, and it sits awkwardly beside a standing no-guilt rule. The defence is that the band directly above it is empty, so the ornament is scarce in both directions, and the file's own comment says emojis are tone rather than data. Mentioned because it is shipped and a silent change would be the wrong way to resolve it.
