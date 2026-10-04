# Owner decisions, as made. These are settled; build to them.

## 1. Standings copy: rank always, percentile only when the sample earns it

**His call (2026-10-04):** "if it's below n=139 just say their rank eg #4 today".

**Why it is right, and why it generalises.** A percentile is an ESTIMATE and carries a confidence
interval. A rank is a COUNT and carries none: "#4 of 37" is exactly true on a board where "Top 11%"
is a guess. Derived from the binomial standard error on the share-better, `sqrt(p(1-p)/n)`, a printed
granularity is only honest when its step is wider than the 95% interval. At the "Top 10%" claim:

| printed as | honest from |
|---|---|
| nearest 10% | n >= 139 |
| nearest 5% | n >= 554 |
| 1% precision | n >= 13,830 |

The shipped `MIN_N = 10` in `functions/api/percentile.js` is far under all three: at n = 10 a printed
"Top 10%" is really somewhere between Top 0% and Top 29%, and the player screenshots it and believes
it.

**THE RULE, one line everywhere a standing is shown:**

```
always the rank, with the field size.
add the percentile only when n >= 139 AND the player is in the top half.
```

so:

```
  #4 of 37                          a small board: exact, and it reads better than "Top 11%"
  #12 of 1,402 . Top 5%             earned the percentile, and in the top half
  #812 of 1,402                     the rank alone. Never "Top 60%", which is a floor
                                    wearing a ceiling's words
```

Granularity when the percentile IS shown: nearest 10 below n = 554, nearest 5 below n = 13,830, and
1% only above it, which in practice means almost never. Do not print a precision the sample has not
bought.

**Never show a bare rank with no field size.** "#4" on a six-player board is flattering nonsense, and
the first person to notice stops trusting every other number on the page.

**Where this has to land:** `functions/api/percentile.js` (the `MIN_N` dial and the reply shape, which
must start returning the rank and the field size, not only `pct`), `functions/api/lb.js` (`ceilingPct`
and the `you` object, which needs `{rank, score, outOf}`), `app.js` (`scheduleSharePct` and the
`.comp-pct` line), and in the lab: `data.js`, `boards.js` and `surfaces.js`, which all three compute a
standing today and must not disagree.

**One dial, named and in one place**, the way `MIN_RUNS` is in lb.js: `PCT_MIN_N = 139`.

## 2. The Daily adopts a signed-out run (shipped in v69.2)

He reversed the strict rule mid-session: a player who goes 79-3 signed out and then signs in keeps it.
Unfarmable by three rules in SQL: one account per device ever, the EARLIEST attempt at a day rather
than the best, and never over a day the account already holds. See `functions/api/claim.js`
`adoptRuns()`.

## 3. The inherited leaderboard is a placeholder

"what was provided going in is just a placeholder, not my absolute favourite thing. actually i don't
like it much at all tbh... make what's good first and foremost from a UI/UX/fun/artistic
showoff/addictiveness perspective, unshackle yourself from what you inherited." The shipped `.lb-*`
list, its sheet and its tabs are not to be preserved. See CONTRACT.md's top section.

## 4. The GOAT Climb artwork is not to be touched

"it's beautiful the way it is." Nothing is removed from the results card, no step is added before Run
It Back, and the hook is not a link bolted beside the art. The Climb is itself a ranking picture (a
rail, twenty legend pins, your marker) and its rail is already drawn in `--t-offset` #41C6EA, the
second ink. A board that speaks its language is the likeliest answer.

## 5. The brief, in his words

"functional art (matching the general design language of the rest of the app), not a reskinned
spreadsheet." Functional means the art carries the data: rank, gap, ties, field size, where you sit.
Decoration behind a table is still a table.
