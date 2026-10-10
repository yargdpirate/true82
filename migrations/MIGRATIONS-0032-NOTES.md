# 0032: the draft room (v70)

Three tables, and the whole concurrency design is one of the indexes.

`rooms` — one row per room. **`board` is the frozen pool**, JSON, written once when
the room opens and never again: the host's browser builds it with the same
`sdBuildPool()` the single-player Redraft uses, and the server stores the result
so every seat is drafting from the same list and the server can judge a pick
without owning the pool builder. `order_json` is the snake order (which seat
picks at each of the fifteen turns), fixed at creation for the same reason.

`room_members` — who is in which seat. TWO unique indexes, both load-bearing:
`(room_id, user_id)` stops one person taking two seats, and `(room_id, seat)`
stops two people taking one.

`room_moves` — the append-only pick log. **`UNIQUE(room_id, seq)` IS the
concurrency control.** A move is accepted only if it claims the next sequence
number; two seats submitting at the same instant means one INSERT wins and the
other gets a UNIQUE error, which the endpoint reads as "you are behind, here is
the log" rather than as a server error. No locks, no transactions held across
requests, no Durable Object. It is the same trick `UNIQUE(user_id, official)`
already plays for the Daily's one-attempt-a-day.

**Nothing derived is stored.** Whose turn it is, who has been taken, and each
seat's roster are all recomputed from `(order_json, moves)` on every read. A
`current_seat` column would be a second source of truth and would drift — the
same reasoning that made the streak board compute gaps-and-islands from the rows
instead of keeping a counter.

**Row writes:** a full three-seat draft is 1 room + 3 members + 15 moves = 19
rows. D1's free plan fails past 100,000 writes a day, so that is about 5,000
complete drafts a day before this lane is the problem. Polling is reads only.

**Still not done here**, both asked for by the v69.2 audit and both needing an
ALTER (which is not repeat-safe, so they want their own careful migration): the
`host TEXT` column on `runs` that would make a test-row purge exact, and `ch_id`
so a weekly or challenge run can be told from a Daily.
