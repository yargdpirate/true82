# TRUE 82 — Player-Facing Mode Blurbs (copy drafts)

STATUS: copy only — no UI has been built for this yet.

**The UI question, resolved by code inspection (2026-07-03):** no mode-info popup
exists today. What exists in `renderIntro` is one-line subtitles baked into the
four mode buttons ("Classic · full stats", "Pro · pick the best seasons from
memory", "Presti Mode · Salary Cap & Random", "Kaman Mode · KAMAN") plus two
generic Draft/Winning paragraphs. So this is net-new UI.

**Recommendation:** one combined expandable "How the modes differ" `<details>`
block under the mode buttons — the footer already uses this exact pattern
(`<details class="legal">`), so it's zero new UI paradigm, zero JS, one tap,
and doesn't lengthen the intro for players who don't care. Rejected: four
separate ⓘ popups (more taps, more chrome, four things to maintain).

**Hard constraint carried into all copy:** never reveal or hint at the exact-81
Hot Hand trigger, the odds, or any pricing internals. The surprise is the
product.

---

## The copy

**Classic** 🏀
Full stat lines and badges for every player, and you choose which season of his
career to draft. The teaching mode — see exactly what you're picking and why.

**Pro** 🏆
Same pools, no stats, and each player is locked to one mystery season. You're
drafting purely from memory of who was great, and when. For people who already
know their hoops history.

**Presti Mode** 🐐
Every player has a price and you've got $50 for five guys. Prices lie — there
are steals, rip-offs, and $1 gems — and rerolling the board costs a buck. Read
the market, build a contender, and watch for surprises. The deepest mode.

**Kaman Mode** 🦴
Five Chris Kamans. Only Chris Kamans. You cannot lose. A tribute.

---

## Placement notes for the implementer

- Keep each blurb ≤40 words (all four above comply).
- "watch for surprises" in Presti is the maximum allowed tease for the reroll
  bonuses and Hot Hand — do not sharpen it.
- If the combined-details approach is used, title it "How the modes differ" and
  keep the existing button subtitles as-is; the blurbs supplement, not replace.
- Tone target: the site's existing voice — confident, dry, a little reverent
  about the history.
