# The Daily, third rotation (POOL3)

POOL3 is the Daily's third schedule: 200 new boards, one a day from Monday
2026-09-28 (Daily #79) through Thursday 2027-04-15 (#278). After that the list
loops from the top (day index modulo 200), so the weekday texture below holds
for the first pass only. Days before `START3` never change: #1 to #77 are
pinned by test.js, and #78 (2026-09-27) is still POOL2.

- **Where it lives.** Each board is a new manifest entry in `challenges.js`
  (appended after `small_ball_five`, append-only like everything above it).
  `daily-core.js` holds the order (`POOL3`, `START3`) and each board's copy
  in `DAILY_COPY`: `s` is the draft panel's status line, `g` the gate and
  HOW TO PLAY brief. `boardFor` checks OVERRIDES, then POOL3 from `START3`
  on, then POOL2, then the legacy POOL.
- **The bar.** Every board changes which player is the right pick, not just
  who is on the board. The mix is 73 Presti, 98 Classic and 29 Pro (about
  POOL2's). Weekday texture: Monday engine rules, Tuesday sequence puzzles,
  Wednesday eras and wildcards, Thursday Pro (blind), Friday a positive twist,
  Saturday franchise flavor, Sunday Presti economy. The same base mode never
  runs three days in a row (the wrap from #278 to #79 included), boards from
  one mechanic family sit at least 6 days apart, and mirror pairs at least 35.
- **Certified.** `node tools/daily-audit.js 300 pool3` plays 300 bot drafts
  on every board: zero dead runs, a median round-one pool of 8 or more, centers
  on the board (supC and minC above zero), and a spread of records that is
  neither all 82-0 nor hopeless. All 200 pass. `node test.js` pins the
  rotation's shape and copy and runs 20 quick drafts on every board.

## How to swap a board safely

1. Only a board whose date has not arrived may change. Past boards replay
   from the archive and from beat links, so changing one rewrites history.
2. Replace the id in place in `POOL3`. Never insert or delete: the rotation
   is modulo its length, so one insert moves every later day.
3. Add the new board to `challenges.js` as a new entry (never edit a shipped
   entry: past runs replay through it) and give it `DAILY_COPY` s and g.
   No em dashes, money as $14M, heights as 6'4".
4. Run `node tools/daily-audit.js 300 pool3` (every id must PASS) and
   `node test.js` (zero FAIL).
5. Bump the cache keys in `index.html` for every shared file you touched
   (`challenges.js`, `daily-core.js`, `sim-core.js`).

## New engine surface

- **`price(row, t)`**, an optional hook: a Presti price multiplier for that
  season, applied in `sim-core`'s `assignCapPool` before the usual gems and
  rip-offs, so the app and the engine agree. Absent means exactly 1: every
  board without it prices and draws exactly as before (checked on 1,263 full
  bot games against the old sim-core, and pinned in test.js). Draft side only.
  Six boards use it: Shooter Premium, Big Man Sale, Nostalgia Sale, Rookie
  Discount, Ring Tax and Bird Rights.
- **cfg keys opened** (the engine already read them through `C()`; no
  default changed): `RIM_TOP20`, `RIM_D_TAX`, `GLASS_LOW`, `GLASS_DIRE`,
  `GLASS_TAX_LOW`, `GLASS_TAX_DIRE`, `CREATOR_PCT`, `CREATOR_TAX`,
  `AGE_VET_YEAR`, `AGE_VET_FREE`, `AGE_TAX`. A negative tax is a bonus.
- **The results ledger** (fixed in v58.4). `resultsLedgerHtml(e)` in app.js
  shows one row per term of the engine's score: a negative tax is a credit
  row (Five-Out, Board Money, Win Now), The Mid-Range's per-shooter charge
  has its own row, and every target it quotes is the board's own (`runCfg`).
  test.js checks the rows add up on every kind of board. A board that adds
  a new kind of term needs a row there too.

## The run

**Week 1**

- #79 · Mon Sep 28 · Paint Police · No +2.5 defender up front costs 5 net. _(Presti)_
- #80 · Tue Sep 29 · Scoring Relay · Each pick scores within 4 points of the one before. _(Classic)_
- #81 · Wed Sep 30 · Rookie Scale · Every pick in his first three seasons. _(Classic)_
- #82 · Thu Oct 1 · The Spectrum · Five picks, five position tags: G, G/F, F, F/C, C. _(Pro)_
- #83 · Fri Oct 2 · Gunslingers · Usage tax off. You need five shooters, 2.5 each. _(Presti)_
- #84 · Sat Oct 3 · League Leaders · Every pick: top 15 in the league in a box-score stat. _(Classic)_
- #85 · Sun Oct 4 · Minimum Guards · Both guards must cost $3M or less. _(Presti)_

**Week 2**

- #86 · Mon Oct 5 · The Stat Sheet · Every pick: 10 points, 4 boards and 2 assists. _(Classic)_
- #87 · Tue Oct 6 · The Midpoint · Pick one is the middle season: two before, two after. _(Presti)_
- #88 · Wed Oct 7 · Upside Down · A guard must lead your five in rebounds. _(Classic)_
- #89 · Thu Oct 8 · Millennium Men · 1990s and 2000s boards. Careers that crossed into 2000. _(Pro)_
- #90 · Fri Oct 9 · The Screen Setter · Center-eligible picks must use 15% of plays or less. _(Classic)_
- #91 · Sat Oct 10 · Journeymen · Every pick played for five or more franchises. _(Presti)_
- #92 · Sun Oct 11 · Name Twins · Two of your five must share a surname. _(Presti)_

**Week 3**

- #93 · Mon Oct 12 · The Scoring Cap · Your five may total 70 points a game, no more. _(Classic)_
- #94 · Tue Oct 13 · Double Dip · Picks 1 and 2 share a board, and so do picks 3 and 4. _(Presti)_
- #95 · Wed Oct 14 · Late Bloomers · Guards and forwards who first scored 15 in year 4+. _(Classic)_
- #96 · Thu Oct 15 · Frontcourt Giants · Both forwards must also be able to play center. _(Pro)_
- #97 · Fri Oct 16 · Shootout · Defense fines off. Five shooters wanted, 2.5 each. _(Classic)_
- #98 · Sat Oct 17 · MVP Club · Two of your five must be MVP winners. _(Presti)_
- #99 · Sun Oct 18 · The Price Ladder · One player from each of five price bands. _(Presti)_

**Week 4**

- #100 · Mon Oct 19 · Board Meeting · Your five must total 45 rebounds a game. _(Classic)_
- #101 · Tue Oct 20 · Backcourt Mates · Your two guards must have been teammates once. _(Presti)_
- #102 · Wed Oct 21 · The Worst Year · Every pick in his lowest-scoring full season. _(Classic)_
- #103 · Thu Oct 22 · Pass It On · Each pick played for the previous pick's franchise. _(Pro)_
- #104 · Fri Oct 23 · Bird Rights · Players on the team they started with are half price. _(Presti)_
- #105 · Sat Oct 24 · Finishers · Both forwards average 1.5 assists or fewer. _(Classic)_
- #106 · Sun Oct 25 · Vintage · Your five seasons must average 1990 or earlier. _(Presti)_

**Week 5**

- #107 · Mon Oct 26 · Two-Way Alphas · Usage tax off. Defense fines double. _(Presti)_
- #108 · Tue Oct 27 · Earn It · No 20-point scorer until two under-10 scorers are in. _(Classic)_
- #109 · Wed Oct 28 · Rookie Center · Your center must be in his first or second season. _(Classic)_
- #110 · Thu Oct 29 · Play Big · Everyone plays the biggest position he ever played. _(Pro)_
- #111 · Fri Oct 30 · 3-and-D · Both forwards: 3PT shooters with a steal a game. _(Classic)_
- #112 · Sat Oct 31 · Finesse Forwards · Neither forward may average more than 5 rebounds. _(Classic)_
- #113 · Sun Nov 1 · Last Call · Pick five must cost at least half your money left. _(Presti)_

**Week 6**

- #114 · Mon Nov 2 · Five Tools · A scorer, rebounder, passer, thief and shot blocker. _(Classic)_
- #115 · Tue Nov 3 · Six Degrees · Everyone must have played with someone you drafted. _(Presti)_
- #116 · Wed Nov 4 · The Off Year · Nobody in his career-high scoring season. _(Classic)_
- #117 · Thu Nov 5 · Overlap · All five careers must share at least one season. _(Pro)_
- #118 · Fri Nov 6 · Hub Center · Your center must lead your five in assists. _(Classic)_
- #119 · Sat Nov 7 · Frequent Flyers · Your five must have worn 22+ franchises combined. _(Presti)_
- #120 · Sun Nov 8 · Nostalgia Sale · Every season before 1990 is half price. _(Presti)_

**Week 7**

- #121 · Mon Nov 9 · Balanced Attack · Top and bottom scorer within 8 points. _(Classic)_
- #122 · Tue Nov 10 · Nellie Ball · Every pick must be able to play forward. _(Presti)_
- #123 · Wed Nov 11 · Young Legs · Both forwards must be in their first or second season. _(Classic)_
- #124 · Thu Nov 12 · Word Chain · Each first name starts with the last surname's last letter. _(Pro)_
- #125 · Fri Nov 13 · Inside-Outside · One forward shoots threes, the other grabs 8 boards. _(Classic)_
- #126 · Sat Nov 14 · Lottery Stars · Every pick from a bottom-third team that season. _(Presti)_
- #127 · Sun Nov 15 · Stars and Scrubs · Only two players may cost more than $2M. _(Presti)_

**Week 8**

- #128 · Mon Nov 16 · Job Description · Each pick needs 3PT, 8 reb, 6 ast, 2 stl or 2 blk. _(Classic)_
- #129 · Tue Nov 17 · Pick and Roll · Your center must have played with one of your guards. _(Presti)_
- #130 · Wed Nov 18 · The Leap · Every pick in a season his scoring jumped 3+ points. _(Classic)_
- #131 · Thu Nov 19 · Last Stop · Every pick wears the jersey he retired in. _(Pro)_
- #132 · Fri Nov 20 · Two Point Guards · Both guards must average 6 assists. _(Classic)_
- #133 · Sat Nov 21 · Unsung · Nobody who finished top 50 in scoring that season. _(Classic)_
- #134 · Sun Nov 22 · Big Man Sale · Anyone who can play center is half price. _(Presti)_

**Week 9**

- #135 · Mon Nov 23 · Trust the Process · Three players in year 5 or later costs 5 net. _(Presti)_
- #136 · Tue Nov 24 · Anniversary · Every season ends in the same digit as your first. _(Classic)_
- #137 · Wed Nov 25 · Glass Season · Every pick in his career-high rebounding season. _(Classic)_
- #138 · Thu Nov 26 · Outside In · Guards first, then forwards, then the center. _(Pro)_
- #139 · Fri Nov 27 · Five-Out · No +2 rim protector up front earns 3 net. _(Presti)_
- #140 · Sat Nov 28 · Starters Only · Every pick ranked top three in team minutes. _(Classic)_
- #141 · Sun Nov 29 · Rising Ceiling · Pick one costs $4M or less, pick two $8M, up to $20M. _(Presti)_

**Week 10**

- #142 · Mon Nov 30 · Wing Stoppers · One forward above +1.5 DBPM, or pay 4 to 7 net. _(Presti)_
- #143 · Tue Dec 1 · Feed the Star · After a 22-point scorer, the next pick scores under 8. _(Classic)_
- #144 · Wed Dec 2 · Share Evenly · All five within 3 assists of each other. _(Classic)_
- #145 · Thu Dec 3 · Second Act · Nobody wearing the jersey of the team he started with. _(Pro)_
- #146 · Fri Dec 4 · Unicorn Hunt · Modern boards. Four shooters and a +2 rim protector. _(Classic)_
- #147 · Sat Dec 5 · New Threads · Every pick in his first season with a new team. _(Classic)_
- #148 · Sun Dec 6 · Ring Tax · Anyone on that season's title team costs double. _(Presti)_

**Week 11**

- #149 · Mon Dec 7 · Height Cap · Your five may stand 32'6" combined, no more. _(Presti)_
- #150 · Tue Dec 8 · Peer Group · Everyone within one career year of your first pick. _(Classic)_
- #151 · Wed Dec 9 · By the Book · One PG, one SG, one SF, one PF and one C. _(Classic)_
- #152 · Thu Dec 10 · Spell the Team · Each surname starts with a letter in the team's name. _(Pro)_
- #153 · Fri Dec 11 · Big Guards · Both guards must average 5.5 rebounds. _(Classic)_
- #154 · Sat Dec 12 · The Hangover · Every pick from last season's champion. _(Classic)_
- #155 · Sun Dec 13 · Minimum Center · Your center costs $2M or less. _(Presti)_

**Week 12**

- #156 · Mon Dec 14 · Point God · No elite passer on your five costs 6 net. _(Presti)_
- #157 · Tue Dec 15 · The Post · Draft your center first. Nobody may outscore him. _(Classic)_
- #158 · Wed Dec 16 · Old Guard · Guards from before 1995, forwards from 2005 on. _(Classic)_
- #159 · Thu Dec 17 · Franchise Pillars · Only players with 5+ seasons for that franchise. _(Pro)_
- #160 · Fri Dec 18 · Ball Hawks · Both forwards must average 1.4 steals. _(Classic)_
- #161 · Sat Dec 19 · No MVPs · Nobody who ever won an MVP. _(Presti)_
- #162 · Sun Dec 20 · Rookie Discount · Players in their first three seasons are half price. _(Presti)_

**Week 13**

- #163 · Mon Dec 21 · Punt the Boards · Your five may total 24 rebounds a game, at most. _(Classic)_
- #164 · Tue Dec 22 · Strangers · No two picks ever played for the same franchise. _(Presti)_
- #165 · Wed Dec 23 · Career Year · Every pick in his highest-scoring season. _(Classic)_
- #166 · Thu Dec 24 · Longevity · Your five careers must total 70 seasons or more. _(Pro)_
- #167 · Fri Dec 25 · Tax Holiday · Every fit rule is off. Pure talent. _(Presti)_
- #168 · Sat Dec 26 · The Treadmill · Every pick from a middle-third team that season. _(Classic)_
- #169 · Sun Dec 27 · Fair Market · No $1M gems and no rip-offs in the mid-tier. _(Presti)_

**Week 14**

- #170 · Mon Dec 28 · The Pyramid · One 26% usage star, two from 19 to 26, two under 19. _(Classic)_
- #171 · Tue Dec 29 · Spread Out · No two of your seasons within six years of each other. _(Presti)_
- #172 · Wed Dec 30 · Old Man at Center · Your center must be in his tenth season or later. _(Classic)_
- #173 · Thu Dec 31 · Alphabet Split · Guards' surnames A to M. Everyone else N to Z. _(Pro)_
- #174 · Fri Jan 1 · Scorer and Setter · One guard scores 18 a game, the other dishes 6 assists. _(Classic)_
- #175 · Sat Jan 2 · Jewelry · Guards and forwards must own a ring. Center is free. _(Presti)_
- #176 · Sun Jan 3 · Guards Get Paid · Your two guards must be your two priciest players. _(Presti)_

**Week 15**

- #177 · Mon Jan 4 · Stocks · Your five need 13 steals plus blocks a game. _(Classic)_
- #178 · Tue Jan 5 · Frontcourt Mates · Your two forwards must have been teammates once. _(Presti)_
- #179 · Wed Jan 6 · The Prequel · Every pick in the season before his best scoring year. _(Classic)_
- #180 · Thu Jan 7 · Homegrown · Every pick wears the jersey of the team he started with. _(Pro)_
- #181 · Fri Jan 8 · Board Money · Elite team rebounding earns 3 net today. _(Presti)_
- #182 · Sat Jan 9 · So Close · Every pick from the team that lost the Finals. _(Classic)_
- #183 · Sun Jan 10 · Long Names · Your five surnames must total 36 letters or more. _(Presti)_

**Week 16**

- #184 · Mon Jan 11 · Shooter Premium · Every floor spacer costs 50 percent more. _(Presti)_
- #185 · Tue Jan 12 · By the Numbers · Pick one's season ends in 1, pick two's in 2, and so on. _(Classic)_
- #186 · Wed Jan 13 · Dime Season · Every pick in his career-high assists season. _(Classic)_
- #187 · Thu Jan 14 · Draft Class · Everyone debuted within a season of your first pick. _(Pro)_
- #188 · Fri Jan 15 · Splash Backcourt · Both guards must be floor spacers. _(Classic)_
- #189 · Sat Jan 16 · Headline Acts · Every pick: top 80 in the league in scoring that season. _(Classic)_
- #190 · Sun Jan 17 · Matching Contracts · Guards share a price band, and so do forwards. _(Presti)_

**Week 17**

- #191 · Mon Jan 18 · Bad Boys · Defense fines double. Shooting counts for nothing. _(Presti)_
- #192 · Tue Jan 19 · The Career Arc · Each pick is one season deeper into his career. _(Classic)_
- #193 · Wed Jan 20 · The Decline · Guards and forwards in a season their scoring fell 3+. _(Classic)_
- #194 · Thu Jan 21 · Inside Out · Center first, then both forwards, then both guards. _(Pro)_
- #195 · Fri Jan 22 · Point Forwards · Both forwards must average 3.5 assists. _(Classic)_
- #196 · Sat Jan 23 · East Meets West · Guards from the East, forwards from the West. _(Presti)_
- #197 · Sun Jan 24 · Payday · Spend at most $8M per pick, running total. _(Presti)_

**Week 18**

- #198 · Mon Jan 25 · Blue Collar · Every pick: one rebound for every two points. _(Classic)_
- #199 · Tue Jan 26 · Contemporaries · Every season within four years of your first pick's. _(Presti)_
- #200 · Wed Jan 27 · The Middle Man · Pick one is your median scorer: two above, two below. _(Classic)_
- #201 · Thu Jan 28 · The Relay · No two of your five were ever in the league together. _(Pro)_
- #202 · Fri Jan 29 · Stretch Five · Modern boards. Every center-eligible pick must shoot. _(Classic)_
- #203 · Sat Jan 30 · Robin · Nobody who led his team in scoring that season. _(Presti)_
- #204 · Sun Jan 31 · Max Center · Draft your center first. Nobody may cost more than him. _(Presti)_

**Week 19**

- #205 · Mon Feb 1 · Point of Attack · One guard above +1.5 DBPM, or pay 4 to 7 net. _(Classic)_
- #206 · Tue Feb 2 · Alumni Night · Everyone must have played for your first pick's team. _(Presti)_
- #207 · Wed Feb 3 · Graybeards · Your five's career years must total 45 or more. _(Classic)_
- #208 · Thu Feb 4 · One of a Kind · Only surnames no other player has ever worn. _(Pro)_
- #209 · Fri Feb 5 · Point Center · Every center-eligible pick must average 2 assists. _(Classic)_
- #210 · Sat Feb 6 · Parting Shot · Every pick in his last season with a team before moving on. _(Classic)_
- #211 · Sun Feb 7 · No Headliners · The priciest player on every board is off limits. _(Presti)_

**Week 20**

- #212 · Mon Feb 8 · Long Ball · Everyone 6'7" or taller. Missing shooters cost 3. _(Presti)_
- #213 · Tue Feb 9 · Full House · Three picks from one season, two from another. _(Classic)_
- #214 · Wed Feb 10 · Scoring Tiers · One 22-point scorer, two at 12 to 22, two under 12. _(Classic)_
- #215 · Thu Feb 11 · The Chain · Each pick was a teammate of the pick before him. _(Pro)_
- #216 · Fri Feb 12 · Help Defense · Both forwards must block 1.2 shots a game. _(Classic)_
- #217 · Sat Feb 13 · Ring Chasers · Every pick from that season's NBA champion. _(Classic)_
- #218 · Sun Feb 14 · Market Crash · Stars cost $1M. Pricey players are rip-offs. _(Presti)_

**Week 21**

- #219 · Mon Feb 15 · Punt Assists · Your five may total 10 assists a game, at most. _(Classic)_
- #220 · Tue Feb 16 · Crossover · Each pick played for a franchise already on your card. _(Presti)_
- #221 · Wed Feb 17 · Rookie Backcourt · Both guards must be in their first or second season. _(Classic)_
- #222 · Thu Feb 18 · Ringless · Nobody who ever won a title. _(Pro)_
- #223 · Fri Feb 19 · Bucket Getters · Both guards must average 18 points. _(Classic)_
- #224 · Sat Feb 20 · Deadline Deals · Guards and forwards traded during that season. _(Classic)_
- #225 · Sun Feb 21 · Pay Scale · Pick one: $10M or less. Everyone within $5M of him. _(Presti)_

**Week 22**

- #226 · Mon Feb 22 · The Early Arc · The 1980s. Each missing shooter costs 3 net. _(Presti)_
- #227 · Tue Feb 23 · The Straight · Five seasons in a row, any order. Like a poker straight. _(Classic)_
- #228 · Wed Feb 24 · Early Bloomers · Guards and forwards who scored 15 a game by year two. _(Classic)_
- #229 · Thu Feb 25 · First-Name Basis · Two of your five must share a first name. _(Pro)_
- #230 · Fri Feb 26 · Unselfish · Every pick: one assist for every five points. _(Classic)_
- #231 · Sat Feb 27 · The Duo · Two of your five must be real teammates, same season. _(Classic)_
- #232 · Sun Feb 28 · Opening Steal · Your first pick must cost $1M. _(Presti)_

**Week 23**

- #233 · Mon Mar 1 · Defense First · Your five's DBPM must add up to at least their OBPM. _(Classic)_
- #234 · Tue Mar 2 · Give and Go · Picks alternate between a shooter and a non-shooter. _(Presti)_
- #235 · Wed Mar 3 · Pecking Order · No two picks may score within 3 points of each other. _(Classic)_
- #236 · Thu Mar 4 · All Wings · Both forwards must also be able to play guard. _(Pro)_
- #237 · Fri Mar 5 · Win Now · Three players in year 10 or later earn 4 net. _(Presti)_
- #238 · Sat Mar 6 · Power Forwards · Both forwards must average 8 rebounds. _(Classic)_
- #239 · Sun Mar 7 · Splurge and Save · After an $8M+ pick, the next costs $2M or less. _(Presti)_

**Week 24**

- #240 · Mon Mar 8 · Punt Defense · Your five may total 5 steals plus blocks, at most. _(Classic)_
- #241 · Tue Mar 9 · Era Pairs · Guards from one decade, forwards from another. _(Presti)_
- #242 · Wed Mar 10 · Swat Season · Every pick in his career-high blocks season. _(Classic)_
- #243 · Thu Mar 11 · Name Tags · Your five surnames may total 30 letters at most. _(Pro)_
- #244 · Fri Mar 12 · Ball Hogs · Your five's usage must total 125 or more. _(Classic)_
- #245 · Sat Mar 13 · Bench Mob · Every pick ranked 6th or lower in team minutes. _(Classic)_
- #246 · Sun Mar 14 · Pay by Size · Guards cost least, forwards more, the center most. _(Presti)_

**Week 25**

- #247 · Mon Mar 15 · Stretch Fours · Both forwards must be floor spacers. _(Presti)_
- #248 · Tue Mar 16 · The Point · Pick one: a 4-assist guard. Nobody after may assist more. _(Classic)_
- #249 · Wed Mar 17 · Kids' Table · Your five's career years may total 18 at most. _(Classic)_
- #250 · Thu Mar 18 · Lifers · Guards and forwards spent their whole career on one team. _(Pro)_
- #251 · Fri Mar 19 · Role Forwards · Both forwards must use 16% of plays or fewer. _(Classic)_
- #252 · Sat Mar 20 · Shaq's Rolodex · Every pick was once a teammate of Shaquille O'Neal. _(Presti)_
- #253 · Sun Mar 21 · Price Check · No two of your five may cost the same. _(Presti)_

**Week 26**

- #254 · Mon Mar 22 · The Extra Pass · Your five must total 26 assists a game. _(Classic)_
- #255 · Tue Mar 23 · Season Relay · Each season within three years of the pick before. _(Presti)_
- #256 · Wed Mar 24 · Swan Song · Every pick in one of his last two seasons. _(Classic)_
- #257 · Thu Mar 25 · Zigzag · Big, guard, big, guard, big. Start with a big. _(Pro)_
- #258 · Fri Mar 26 · Forward Firepower · Both forwards must average 18 points. _(Classic)_
- #259 · Sat Mar 27 · Old-School Backcourt · Neither guard may be a floor spacer. _(Classic)_
- #260 · Sun Mar 28 · High-Low · One guard costs $10M or more, the other $2M or less. _(Presti)_

**Week 27**

- #261 · Mon Mar 29 · Crash the Glass · Rebounding fines run 4 to 7 net and start sooner. _(Presti)_
- #262 · Tue Mar 30 · The Mentor · Pick one: a 10-year vet. The rest: first five seasons. _(Classic)_
- #263 · Wed Mar 31 · New Guard · Guards from 2010 on, forwards from before 2000. _(Classic)_
- #264 · Thu Apr 1 · Play Small · Everyone plays the smallest position he ever played. _(Pro)_
- #265 · Fri Apr 2 · Glue Guards · Both guards must score 10 points or fewer. _(Classic)_
- #266 · Sat Apr 3 · No Point Guard · Neither guard may average more than 3 assists. _(Classic)_
- #267 · Sun Apr 4 · Top Shelf · Two of your first four picks must cost $12M or more. _(Presti)_

**Week 28**

- #268 · Mon Apr 5 · The Mid-Range · One shooter is ideal. Each extra shooter costs 1.5. _(Presti)_
- #269 · Tue Apr 6 · Mentorship · Each guard and forward pair: a rookie and a veteran. _(Classic)_
- #270 · Wed Apr 7 · The Encore · Every pick in the season after his best scoring year. _(Classic)_
- #271 · Thu Apr 8 · Rentals · Only players who spent one season with that team. _(Pro)_
- #272 · Fri Apr 9 · The Hundred Club · Your five must total 110 points a game. _(Classic)_
- #273 · Sat Apr 10 · Contenders · Every pick from a top-third team that season. _(Presti)_
- #274 · Sun Apr 11 · Barbell · Every price is $3M or less, or $12M or more. _(Presti)_

**Week 29**

- #275 · Mon Apr 12 · Tax Season · Every fine in the engine doubles. _(Classic)_
- #276 · Tue Apr 13 · Then and Now · Each pair: one from before 1995, one from 2005 on. _(Presti)_
- #277 · Wed Apr 14 · Veteran Backcourt · Both guards in their tenth season or later. _(Classic)_
- #278 · Thu Apr 15 · Common Names · Only surnames shared by five or more players. _(Pro)_

## Design map

The 200 by mechanic family, one family per board (the scheduler keeps a
family's boards at least 6 days apart). Shooter Premium is a spacing rule
listed under the market, and Rookie Discount rides the price hook but is
listed under age.

- **Rim protection (engine knobs RIM_TOP20, RIM_D_TAX)** (2): Paint Police, Five-Out
- **Rebounding (engine glass knobs, team totals, slot gates)** (10): Crash the Glass, Board Money, Board Meeting, Punt the Boards, Big Guards, Power Forwards, Finesse Forwards, Blue Collar, Glass Season, Upside Down
- **Passing (creator knob, team totals, slot gates, spreads)** (14): Point God, The Extra Pass, Punt Assists, Point Forwards, Two Point Guards, No Point Guard, Point Center, Hub Center, The Point, Unselfish, Dime Season, Share Evenly, Finishers, Scorer and Setter
- **Career stage and age (mileage knob, slot and team rules, price)** (17): Trust the Process, Win Now, Kids' Table, Graybeards, Mentorship, The Mentor, Peer Group, The Career Arc, Rookie Scale, Rookie Backcourt, Rookie Center, Young Legs, Veteran Backcourt, Old Man at Center, Early Bloomers, Late Bloomers, Rookie Discount
- **Shooting and spacing (spacing knobs, slot rules, price)** (13): The Mid-Range, Gunslingers, Shootout, Give and Go, Splash Backcourt, Old-School Backcourt, Stretch Five, Stretch Fours, 3-and-D, Long Ball, The Early Arc, Unicorn Hunt, Inside-Outside
- **Defense (pair and rim knobs, stocks, slot gates)** (10): Point of Attack, Defense First, Wing Stoppers, Bad Boys, Two-Way Alphas, Stocks, Punt Defense, Help Defense, Ball Hawks, The Screen Setter
- **Every fine at once** (2): Tax Season, Tax Holiday
- **Scoring and usage (totals, tiers, spreads, order)** (18): The Scoring Cap, The Hundred Club, Balanced Attack, Pecking Order, Scoring Tiers, Scoring Relay, Feed the Star, Earn It, The Post, Bucket Getters, Glue Guards, Forward Firepower, Headline Acts, Unsung, The Middle Man, Ball Hogs, The Pyramid, Role Forwards
- **Stat gates** (3): The Stat Sheet, Job Description, Five Tools
- **Positions and draft order by position** (10): Nellie Ball, All Wings, Frontcourt Giants, Play Big, Play Small, The Spectrum, By the Book, Outside In, Inside Out, Zigzag
- **Presti money rules** (21): Fair Market, Market Crash, Stars and Scrubs, Minimum Guards, Payday, Last Call, The Price Ladder, Splurge and Save, No Headliners, Max Center, Pay by Size, Price Check, Rising Ceiling, Pay Scale, Top Shelf, Minimum Center, High-Low, Opening Steal, Barbell, Matching Contracts, Guards Get Paid
- **The market (the new price hook)** (5): Shooter Premium, Big Man Sale, Nostalgia Sale, Ring Tax, Bird Rights
- **Where the season sits in a career** (12): The Off Year, The Worst Year, The Leap, The Encore, The Prequel, Career Year, Swat Season, New Threads, Parting Shot, Deadline Deals, The Decline, Swan Song
- **Team and league context** (10): Ring Chasers, So Close, The Hangover, Lottery Stars, Contenders, The Treadmill, Robin, Bench Mob, Starters Only, League Leaders
- **The calendar** (13): Contemporaries, Anniversary, The Midpoint, By the Numbers, The Straight, Full House, Spread Out, Season Relay, Vintage, Then and Now, Old Guard, New Guard, Era Pairs
- **Teammates** (8): Six Degrees, Strangers, The Duo, Backcourt Mates, Pick and Roll, Frontcourt Mates, Shaq's Rolodex, The Chain
- **Franchise history and tenure** (12): Alumni Night, Pass It On, Crossover, Frequent Flyers, Journeymen, Homegrown, Last Stop, Second Act, Rentals, Franchise Pillars, Lifers, East Meets West
- **Career timelines** (5): Longevity, The Relay, Overlap, Millennium Men, Draft Class
- **Titles and MVPs** (4): Ringless, Jewelry, No MVPs, MVP Club
- **Names** (9): Word Chain, Spell the Team, Name Tags, Long Names, First-Name Basis, Name Twins, Common Names, One of a Kind, Alphabet Split
- **Board repeats (deal hook)** (1): Double Dip
- **Height** (1): Height Cap

## Mirrors and cousins

Mirror and cousin pairs the scheduler keeps at least 35 days apart: Paint Police / Five-Out; Tax Season / Tax Holiday; Crash the Glass / Board Money; Trust the Process / Win Now; The Scoring Cap / The Hundred Club; Punt the Boards / Board Meeting; Punt Assists / The Extra Pass; Punt Defense / Stocks; Bucket Getters / Glue Guards; Splash Backcourt / Old-School Backcourt; Power Forwards / Finesse Forwards; Two Point Guards / No Point Guard; Point Forwards / Finishers; Rookie Backcourt / Veteran Backcourt; Rookie Center / Old Man at Center; Kids' Table / Graybeards; Rookie Scale / Swan Song; The Off Year / Career Year; The Leap / The Decline; The Encore / The Prequel; Lottery Stars / Contenders; Bench Mob / Starters Only; Unsung / Headline Acts; Ringless / Jewelry; Six Degrees / Strangers; The Relay / Overlap; Outside In / Inside Out; Play Big / Play Small; Name Tags / Long Names; Common Names / One of a Kind; First-Name Basis / Name Twins; Homegrown / Second Act; Rentals / Franchise Pillars; Old Guard / New Guard; The Post / Max Center; Balanced Attack / Pecking Order; The Pyramid / Scoring Tiers; Stretch Five / Stretch Fours; Point of Attack / Wing Stoppers; Minimum Guards / Minimum Center; Stars and Scrubs / Top Shelf; No MVPs / MVP Club; Early Bloomers / Late Bloomers; Pay by Size / Guards Get Paid; High-Low / Matching Contracts; Homegrown / Bird Rights; Ring Chasers / Ring Tax; Rookie Scale / Rookie Discount; Glass Season / Dime Season; The Point / Hub Center.

Cousins, same shape aimed at a different player, worth knowing before a swap:
career-best seasons (Career Year, Glass Season, Dime Season, Swat Season);
youth by slot (Rookie Backcourt, Young Legs, Rookie Center) and everywhere
(Rookie Scale, Kids' Table, Trust the Process); veterans by slot (Veteran
Backcourt, Old Man at Center); teammates by slot pair (Backcourt Mates,
Frontcourt Mates, Pick and Roll); team strength by third (Lottery Stars, The
Treadmill, Contenders); title-team seasons (Ring Chasers, So Close, The
Hangover); anchor-first caps (The Post, The Point, Max Center); franchise
links (Alumni Night, Crossover, Pass It On); rising money ceilings (Payday,
Rising Ceiling); barbell pricing (Stars and Scrubs, Barbell, Top Shelf);
tiers (The Pyramid, Scoring Tiers); season digits (Anniversary, By the
Numbers). Five engine boards combine two knobs an older board used alone:
Gunslingers, Shootout, Bad Boys, Two-Way Alphas and Unicorn Hunt. The Early
Arc follows Hand-Check Rules' decade-plus-tax template, and Long Ball is a
height filter plus a tax like Twin Towers.

A duplicate check before shipping replaced seven boards that repeated an
older board or each other (Catch and Shoot, The Beautiful Game, Return Trip,
Big Lineup, Deep Bench, Twin Seasons, Homegrown Center) with Defense First,
Matching Contracts, Guards Get Paid, Bird Rights, MVP Club, Late Bloomers and
Draft Class.
