---
title: What is BPM in basketball?
---

# What is BPM in basketball?

BPM — Box Plus/Minus — is a box-score-based estimate of a player's contribution
per 100 possessions, relative to a league-average player. Zero is average, +5
or better is an All-NBA-caliber season, and around -2 is replacement level.
[Basketball Reference publishes BPM](https://www.basketball-reference.com/about/bpm2.html) back to the 1973-74 season, split into
offensive (OBPM) and defensive (DBPM) halves.

## What BPM tries to measure

BPM starts from a simple question: given only what's in the box score —
scoring, efficiency, rebounds, assists, steals, blocks, turnovers — how much
did this player help his team per 100 possessions? Because it's expressed
relative to league average, it travels across eras better than raw counting
stats: a +6 season means roughly the same thing in 1985 and 2025 even though
pace and scoring environments differ wildly. Its main limitation is honest and
well known: the box score can't see everything, and defense in particular is
only partially captured, which is why DBPM is treated as an estimate rather
than gospel.

## How TRUE 82 uses BPM-style value

In TRUE 82 (https://true82.net/), every player-season's core value is built
mostly from OBPM and DBPM, with some minor custom tweaks. That's also why the
player pool starts in 1974 — the steals, blocks, and turnovers those stats
depend on weren't tracked league-wide before then. One adjustment worth naming:
shooters from the low-3PT and pre-3PT eras get shooting credit based on
reputation, because the 1978 box score cannot tell you that a player would
happily launch eight threes a game today.

## Why BPM alone is not enough

Five high-BPM players are not automatically a great team — value overlaps.
That's why the TRUE 82 engine layers fit on top of value: it taxes lineups
where too many players need the ball, checks whether there's enough shooting to
keep the floor spaced, and penalizes a backcourt or wing rotation that can't
defend. BPM tells you how good a player was; the engine decides whether your
five would actually work together for 82 games.

BPM and its underlying data are the work of [Basketball Reference](https://www.basketball-reference.com/?utm_source=true82.net) / Sports
Reference LLC. TRUE 82 is an independent fan project and claims no endorsement
by or affiliation with Basketball Reference, Stathead, or Sports Reference LLC.
