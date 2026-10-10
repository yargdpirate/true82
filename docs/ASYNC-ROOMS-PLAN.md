# Asynchronous play: the plan (2026-10-10, nothing built)

His rough idea, verbatim: *"maybe a mode where you're competing against friends in the same draft
instead of just trying to get a high score 'against the field', or doing the 'redraft' with friends
instead of bots … some sort of quick and dirty test mode where you can send and receive arbitrary
asynchronous choices that affects the central game and all the players see it. Just backend test
before we actually do anything frontend with it."*

This is the plan, with the parts I think he actually needs separated from the parts he described.

---

## 0. The thing worth knowing first

**The hard part is already built.** TRUE 82 does not store scores; it stores `(mode, seed, actions)`
and the server REPLAYS them with the same engine the browser runs (`_lib/sim.js`, `api/run.js`). A
shared game is therefore not a new kind of object. It is **one seed and one ordered list of actions
with an owner on each line**.

Everything below is that sentence, made safe.

## 1. Two different games are hiding in the idea

They look alike and are not, and conflating them is the main risk to the schedule.

**(a) The shared board.** Everyone in the room drafts from the SAME ticket stream, independently, and
the room reveals the results. Nobody's pick changes anybody else's options. This is **the Daily with
a guest list** — it needs a room, a membership, and a reveal rule, and NOTHING in the draft loop
changes. The "crowd" model in `tools/daily-crowd.js` already tells us what it feels like: on a tuned
roll about 6-10% of players land the same five, which is exactly the "we all got dealt this, what did
you do with it" conversation he is describing.

**(b) The contested draft.** A snake draft where taking Jokić MEANS nobody else can have him — the
Redraft with friends.

**CORRECTION (2026-10-10, measured): this is NOT a new game. It is already built.** The first version
of this plan called it one, and that was wrong. THE REDRAFTED (app.js, v55, "Class of 2016. Three
GMs. One board.") is a real snake draft already: three seats, one exhaustible pool, every pick
exclusive, snake order with the turn double, a strand guard that refuses a pick which would leave a
roster unfillable, and a podium over all three projected seasons. It ships today against two bots.

`tools/redraft-sim.js` drives all three seats as PEOPLE, headless, through the same legality path the
screen uses. Measured: 2016, 2003, 1984, 2021, 1996 and 1976, both difficulties, dozens of drafts
each, zero illegal picks and zero short rosters.

**What actually blocks three live humans, measured rather than guessed — it is four things, and three
of them are one line:**

1. `sdShuffle` picks the seat order with `Math.random()`. A room's order must come from a seed.
2. A player's default season (`app.js:7115`) is also `Math.random()`. It only matters if a pick is
   ever committed without an explicit season, but a room cannot have "only matters sometimes".
3. The bots' jitter band (`app.js:7238`) is `Math.random()`. This matters the moment an abandoned
   seat is auto-picked, which §4 says it must be.
4. **The draft logic lives in app.js and the Worker cannot see it.** It needs extracting into a
   shared module the way `daily-core.js` already is — the same refactor, with a precedent that
   worked. This is the real work; the other three are seeds.

**What does NOT need changing, and was worth checking:** the scoring. `sdFinish` seeds its projection
with `Date.now()`, which looks alarming and is harmless — the Redraft projects straight from net with
no per-game realization (the owner's 2026-08-05 ruling), so the same roster scores identically at any
seed. Verified directly across four seeds.

**Recommendation, unchanged in order but not in cost:** still do (a) first, because it is the Daily
with a guest list and needs no draft-loop work at all. But (b) is now a fortnight's work on a lane
that already exists, not a month on a new game.

### A fairness finding that changes the design

With all three seats playing the SAME strategy, the draft is fully deterministic — and therefore ONE
SLOT WINS EVERY TIME, decided entirely by the class. Measured over 40 drafts each: 2016 is won by the
first slot 40/40, 2003 by the second 40/40, **1984 by the THIRD 40/40** — the back-to-back picks 3
and 4 beat taking Jordan first.

That is a tautology of determinism, and it is still the thing to design around: **slot is worth more
than it looks, and which slot is worth most is a property of the class nobody can read off the
board.** With three DIFFERENT strategies it loosens (13 / 17 / 0 of 30, with the plain
best-available policy taking 21 of 30 — strategy beat slot), but it never vanishes.

Three honest answers, and the owner picks one: randomise the slot and call it the lottery, as the
real NBA does; pre-screen classes for slot balance with this simulator; or let the room's host pick
the class and let the guests pick slots in reverse. Doing nothing is also a choice, and it means the
first-named friend quietly wins a lot of 1984s.

## 2. The shape: a room is an append-only log

```
rooms   id TEXT PK (short code)  host_user_id  mode  seed  challenge  kind
        created_ts  closes_ts  state
members room_id  user_id  joined_ts  seat          UNIQUE(room_id, user_id)
moves   room_id  seq INTEGER  user_id  payload TEXT  created_ts
                                                     UNIQUE(room_id, seq)
```

**`UNIQUE(room_id, seq)` is the whole concurrency design.** A move is accepted only if it claims the
next sequence number; two players racing means one INSERT wins and the other gets a UNIQUE error the
endpoint reads as "you are behind, here is the log, try again". This is the same trick
`UNIQUE(user_id, official)` already plays for the Daily's one-attempt-a-day, and it needs no locks,
no transactions across requests, and no new runtime.

**Three rules carried over from the lane that works, and they are not optional:**

1. **Derive, never store, the game state.** The room's board, whose turn it is and who has what are
   all recomputed from `(seed, moves)` by the same `sim-core.js` the browser runs. A `current_player`
   column would be a second source of truth and would drift — the same argument that made the streak
   board compute gaps-and-islands from the rows instead of keeping a counter (v69.1).
2. **Nothing the client sends is trusted beyond the choice itself.** A move's payload is "I take this
   player at this season into this slot", validated against the derived state. Never a score, never a
   board.
3. **One row per move, and count the writes.** D1's free plan fails queries past 100,000 row writes a
   day, and this project has already had one schema rejected over that (migration 0030's notes). A
   five-round draft for four players is 20 writes; 1,000 rooms a day is 20,000. Fine — but a design
   that wrote a row per POLL would not be, which is why polling must be reads only.

## 3. Reading it back: polling, not sockets

`GET /api/room?id=XXXX&since=<seq>` returns the moves after `seq` and the derived state. Clients poll
on a few seconds. No WebSockets and **no Durable Objects to begin with**:

- The whole stack is D1 already, and the append-only log plus `UNIQUE(room_id, seq)` gives
  single-writer semantics without a single-writer object.
- A Durable Object per room is the textbook fit and the right answer LATER — when a turn timer has to
  fire without anyone polling, or when (b) makes per-move latency matter. Adopting it now would add a
  runtime, a billing question and a deploy story to a feature that has no users yet.

Reads are cheap and edge-cacheable for a second or two; the Daily's `/api/day` already does exactly
this.

## 4. The two things async play needs that nobody remembers until it is live

- **Someone will not come back.** Every async game dies of this. A room needs `closes_ts` and an
  answer for the abandoned seat: auto-pick with the value bot (`tools/daily-audit.js` `makeBot`
  already plays a competent draft), or close the room and score who finished. This must be designed
  in, not bolted on — it is the difference between a feature and a graveyard of half-played rooms.
- **A room is an invitation, which is a moderation surface.** A room code is shareable, display names
  are user-set, and `cleanName` exists for exactly this reason. A room should be joinable only by
  code, never listed, and the host should be able to remove a seat.

## 5. The test mode he asked for, which is the first thing to build

`tools/room-live.js`, the sibling of `tools/boards-live.js`: drives N real Clerk identities through a
whole room against a deployment, with no UI anywhere.

```
node tools/room-live.js --clerk --url <preview> --secret <TEST_AUTH_SECRET> --seats 4
```

It should prove, in this order:
1. A room is created, four accounts join, a fifth is refused.
2. Each seat's move lands at the next `seq`, and a move out of turn is refused with the log.
3. **Two seats submitting at once: exactly one wins and the loser is told it is behind.** This is the
   check the whole design exists to pass, and a harness is the only way to provoke it reliably.
4. The derived state after N moves equals the state the client would compute from the same log.
5. An abandoned seat hits `closes_ts` and the room resolves.
6. The finished runs verify and reach the boards exactly like any other run.

The five Clerk test identities already exist and `tools/boards-live.js` already knows how to mint
tokens for them, so this harness starts from a working multi-account driver rather than from zero.
And `tools/redraft-sim.js` already drives three seats through a complete legal draft offline, so the
room harness only has to add the network and the turn-taking, not the game.

## 6. What it depends on

- **Accounts must be live.** A room is a list of people; there is no anonymous version. This is gated
  behind the `ACCT_LIVE` flip either way.
- **Nothing before the debut.** 10/20-10/22 is the whole near-term bet and none of this helps it.
- **Migration 0032**, whenever it happens, should carry the `host TEXT` column the v69.2 audit asked
  for and the `ch_id` column the mode boards want, so this lane does not need a migration of its own
  for housekeeping it could have inherited.

## 7. The one-line version

Build a room as an append-only move log over a shared seed, derive everything from it, poll it, and
write the harness before the screen. Start with the shared board, because it is the Daily with a
guest list; keep the contested draft behind the same primitive, because it is a new game.
