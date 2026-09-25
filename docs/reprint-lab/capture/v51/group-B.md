- classic-round1  (lab view draft, label "Round 1", old url /)
    Classic run, round 1 (pick 1 of 5) settled after the deal: mode panel (CLASSIC MODE + HOW TO PLAY), ticket (90s Bucks, crest, SKIP TEAM/SKIP ERA), sort chips (MIN active), search, player pool with MORE PLAYERS cue, empty G G F F C lineup rail tray. body.drafting
- classic-pick-selected  (lab view draft, label "Player picked", old url /)
    Round 1 after tapping Ray Allen in the pool: row gets selected outline, tray grows with "Assign Ray Allen 98-99 to:" and GUARD / FORWARD confirm buttons; MORE PLAYERS cue still up. body.drafting.has-pick
- classic-pick-single  (lab view draft, label "One open slot", old url /)
    Round 3, tapped George McGinnis (F-only): single-slot confirm variant: tray shows the lineup rail (Allen G, Leonard F with SWAP badges) plus one wide DRAFT YOUR PLAYER button (no confirm-label, no position choice). body.drafting.has-pick
- classic-deal-spin  (lab view draft, label "Dealing the next ticket", old url /)
    Mid-animation (~380ms) right after drafting Ray Allen at GUARD: round 2 deal in flight: ticket-roll.reeling slot reels flipping decade/franchise decoys, crest reel cycling logos, pool.scrambling years roulette; lineup rail shows Allen filled in a G slot. body.drafting
- classic-sort  (lab view draft, label "Sorted", old url /)
    Round 1 after tapping the OBPM sort chip (sort chips are plain toggles, no dropdown/open state): OBPM chip active, pool re-sorted by offensive BPM with metric years (Ricky Pierce, Dell Curry with a fixed-year face, Ray Allen still selected). Tray GUARD/FORWARD up. body.drafting.has-pick
- classic-search-empty  (lab view draft, label "Search, no match", old url /)
    Round 1, focused the search box and typed "zzq" (zero matches): search field focused with clear X, pool empty with NO empty-state message, (i) legend button hidden, but the MORE PLAYERS cue still floats over the blank pool (UX gap). Ray Allen still selected so tray shows GUARD/FORWARD. body.drafting.has-pick. Search value mirrored into the value attribute for the snapshot
- classic-chip-expanded  (lab view draft, label "Trait chip opened", old url /)
    Round 1, Ray Allen selected; tapped his GRAVITY trait chip in the pool: chip expands in place to its full name ELITE GUNNER (.tchip.expanded, aria-pressed=true). Tray GUARD/FORWARD still up. body.drafting.has-pick
- classic-legend-open  (lab view draft, label "Label legend", old url /)
    Round 1, Ray Allen selected, tapped the gold (i) beside search: PLAYER LABELS legend panel expanded between the pool head and the pool (RIM+, TSHOT, PLAY, ISO-D, TEAM-D, RIM-D, OFF-B, GRAVITY, 3PT + footnote); (i) turns into an X; tray with GUARD/FORWARD still up. body.drafting.has-pick
- classic-skip-used  (lab view draft, label "Skip used", old url /)
    Round 4 after tapping SKIP TEAM (re-dealt to 00s Hawks): SKIP TEAM button now disabled "0 LEFT" (disabled skip-btn style) beside the live SKIP ERA; pool has an off row (Toni Kukoc "F · full"); rail Allen G, Leonard F, McGinnis F. body.drafting
- classic-round3  (lab view draft, label "Round 3", old url /)
    Round 3 (pick 3 of 5) settled: 70s Pacers (INA/IND) ticket, OBPM sort still active, pool (McGinnis, Dantley, Knight, English); lineup rail partly filled: Ray Allen (RA, G) and Kawhi Leonard (KL, F) tokens with gold SWAP badges, open G / F / C slots. No pick selected. body.drafting
- classic-round5  (lab view draft, label "Round 5", old url /)
    Round 5 (pick 5 of 5, final pick) settled: 20s Hornets ticket, both skip buttons disabled (SKIP TEAM 0 LEFT; SKIP ERA shows 1 LEFT but disabled since no era target), most pool rows dimmed "G · full"/"G/F · full" (.off), only C-eligible Mark Williams live; lineup rail 4/5 filled: Allen G, Terry G, Leonard F, McGinnis F, open C. body.drafting
- classic-row-denied  (lab view draft, label "Player won't fit", old url /)
    Second classic run (Run it back), round 5 (only F open): pool scrolled (#pool scrollTop 330); tapped Steve Francis, a dimmed "G · full" row: .player-row.off.deny mid-shake (520ms deny animation, title "No open slot fits him.") captured ~140ms after the tap; neighbours Hedo Turkoglu / Juwan Howard live, Darrell Armstrong also off. Lineup rail Beal G, Johnson G (SWAP badges), Abdur-Rahim F, open F, Abdul-Jabbar C. body.drafting
- classic-lineup-move  (lab view draft, label "Moving a player", old url /)
    Round 3, tapped Ray Allen token in the lineup rail: lineup move/swap mode: Allen token .moving with MOVING badge; legal destinations light up as .swap-target with HERE badges and pulsing dashed ring (Leonard F token = swap, open F slot = move). Pool unchanged, no pick selected. body.drafting
- classic-rules-sheet  (lab view draft, label "How to play", old url /)
    Round 1 with Ray Allen selected, then tapped HOW TO PLAY: rules sheet (dialog) open over dimmed draft: GAME BASICS, HOW TO PLAY THIS MODE (CLASSIC) bullets, NEED A REFRESHER callout, sticky footer STATS REFRESHER link + GOT IT button, close X. body.rules-open; sheet scrolls internally
- presti-round1  (lab view presti, label "Round 1", old url /?midhot=1)
    Presti Mode draft, pick 1 of 5, $50M bank scoreboard + meter, team card with SKIP TEAM/ERA/YRS cost chips, $ sort chips, player list with price tags, empty position dock. Reached via homepage PRESTI MODE button on /?midhot=1
- presti-pick-selected  (lab view presti, label "Player picked", old url /?midhot=1)
    Presti pick 1, single-position player (Thomas Bryant C, $12M) tapped: row gold-outlined, price tag lit, body.has-pick, fixed bottom dock shows "Thomas Bryant 19-20 · $12M · leaves $38M" + DRAFT YOUR PLAYER button
- presti-pick-selected-multi  (lab view presti, label "Two positions", old url /?midhot=1)
    Presti pick 1, dual-position player (Porzingis F/C, $5M) tapped: row highlighted gold, body.has-pick, bottom dock shows "Assign ... $5M · leaves $45M to:" with FORWARD / CENTER confirm buttons
- presti-skip  (lab view presti, label "Paying to skip", old url /?midhot=1)
    Presti pick 2 of 5 (Stockton drafted, $36M bank) ~280ms after pressing SKIP TEAM: bank box .bank-down counting $36M->$35M with transient red deduction chip (#bankDed.show.neg "−$1M"), ticket decade/franchise slot reels and pool prices mid-scramble, SKIP TEAM/ERA/YRS cost chips visible
- presti-skip-refund  (lab view presti, label "Refund", old url /?midhot=1)
    Presti pick 1 after SKIP TEAM landed the rare REFUND perk (7.5%): all three cost buttons flash green (.skip-btn.refunded, text REFUND!) for 2.5s with a money-emoji spray; bank stays $50M; new Jazz team card. (Flash re-fired via flashRefund() so the snapshot lands inside the 2.5s window; a live skip rolled REFUND first)
- presti-skip-firesale  (lab view presti, label "Fire sale", old url /?midhot=1)
    Presti pick 3 of 5 ($13M bank) right after SKIP YRS rolled the rare FIRE SALE perk: all three cost buttons flash red (.skip-btn.firesale, text FIRE SALE) with down-arrow spray; every pool price shows base struck through in red with the -$2 price in green (G.fireSale active for this board)
- presti-bank-mid  (lab view presti, label "Money running low", old url /?midhot=1)
    Presti pick 4 of 5, bank $4M (.mp-bank.bank-mid, meter nearly empty): unaffordable rows dimmed with "over" tag + greyed price, affordable rows normal; dock shows Stockton G, Hayward F (SWAP badge), O'Neal C filled, G and F open
- presti-bank-low  (lab view presti, label "Almost broke", old url /?midhot=1)
    Presti pick 5 of 5, bank $1M (.mp-bank.bank-low: red amount + sliver meter), all three SKIP buttons disabled (cannot reroll with $1 per open slot), pool rows dimmed with "full" (position filled) or "over" (unaffordable) tags; dock has 4 filled coins (two SWAP badges) and one open F slot
- presti-swap  (lab view presti, label "Swapping", old url /?midhot=1)
    Presti pick 4, $4M bank-mid: tapped Hayward's SWAP badge in the lineup dock -> his coin lifts with a MOVING tag (.lineup-slot.movable.moving) and the open G slot pulses as a HERE target (.lineup-slot.open.swap-target)
- presti-rules-sheet  (lab view presti, label "How to play", old url /?midhot=1)
    Presti draft pick 1, HOW TO PLAY rules overlay open (fixed .rules-overlay > .rules-sheet.plq-frame, body.rules-open + drafting); GAME BASICS + PRESTI mode rules, refresher callout, STATS REFRESHER / GOT IT footer. Opened via #rulesBtn
