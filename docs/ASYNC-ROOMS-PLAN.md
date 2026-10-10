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
Redraft with friends. This is a different game: it needs turn order, it changes `rowDraftable`, every
player's board depends on every earlier pick, and a slow friend blocks four people. It is the more
interesting product and much the larger build.

**Recommendation: build (a) first, and build it as a private Daily.** It reuses the entire verified
lane — one seed, independent runs, `verified = 1`, the boards — and the only new concepts are a room
id and who is in it. It is days, not weeks. Then use the SAME room primitive to prototype (b), where
the real design questions live. If (b) is built first, (a) arrives free; but (b) first means nothing
ships for a month and the debut is 10/20.

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
