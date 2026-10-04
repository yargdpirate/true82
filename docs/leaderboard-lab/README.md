# TRUE 82 Leaderboard Lab

A toggle lab for the leaderboard: where the link to it lives on the start screen, what pulls a player
toward it after a game, how the boards themselves are organised, and what they look like. Built
2026-10-04. **Nothing here is live.** You pick, and a later version implements what you picked.

## Open it

On the branch preview, on your phone:

```
https://c-code-clean.true82.pages.dev/docs/leaderboard-lab/
```

Locally, with the site running (`.claude/launch.json` entry `site-boards`):

```
http://127.0.0.1:8793/docs/leaderboard-lab/
```

It has to be served from the site itself, not opened as a file, because the phone in the middle is the
**real site** loaded from the same origin.

## How to use it

1. Three tabs at the top: **Start screen**, **After a game**, **The boards**. They are the three places
   a leaderboard touches the game.
2. Flip anything in the console. The phone redraws immediately.
3. Switch the phone between **320 / 375 / 390px**. 320 is the floor and the one that catches problems.
4. **Star this look** on anything you like. **Copy all star codes** and paste them to me. Each code
   starts `T82-` and carries the whole screen, so I can reproduce exactly what you starred.
5. **Compare with today** flips the board back to the five that are built right now, with no art
   direction on them, so you can see what actually changes.

## What is real and what is not

| tab | how real |
|---|---|
| Start screen | **The real home screen.** Real title art, real doors, real CSS. Only the link is added. |
| The boards | **Real components and real colours** (the same sheet, tabs and rows the game ships), filled with **invented names and numbers**. The layout is honest; the people are not. |
| After a game | A **close rebuild** of the results card from its real class names, because a real one cannot be captured without playing a season. Every section you scroll past is at its real depth, so "how far down is this" is honest. The hook itself is built exactly as it would ship. |

The lab says this on screen too, under the phone, so you never have to remember which is which.

## The two things worth knowing before you judge

**The boards will be empty on 10/20.** That is not a bug in the lab. On debut day nobody has a streak,
nobody is in the 82-0 club, and almost every player sits a long way down. So the lab lets you set
**your rank** and **how many GMs are on the board** and see the same design at launch and at scale.
Set your rank to 0 and the field to 0 to see opening night honestly.

**The most important screen in here is signed out.** Turn **Signed in** off and leave **Has finished a
season** on: that is somebody who just played, is not registered, and can see exactly where they would
have landed. That is the single honest reason to make an account, and it is the screen to get right.

## One thing the lab will show you that is worth knowing

On a Daily with thousands of players, **the top of the board is a wall of ties.** The game's own
tuning puts somewhere between 3 and 12 percent of a field on a perfect season, so four thousand GMs
means hundreds of rows all reading 82-0, separated only by net rating. Drag the shuffle slider and you
will see easy days where the top five are all perfect and hard days where nobody is.

That is not a bug in the fake data, it is the real shape of a shared board, and it is the argument for
two things the lab defaults to: showing the net beside the record, and opening on **your**
neighbourhood rather than on rank 1. Rank 1 of a wall of ties tells a player almost nothing.

## The files

| file | what |
|---|---|
| `SPEC.md` | the design spec the lab was built from: the board slate, the segment architecture, the variants, the art directions, and the list of defects that must be fixed before any board can be trusted |
| `CONTRACT.md` | the mechanical contract between the lab's own files |
| `index.html` | the shell |
| `lab.js` | the console, the recipe, the `T82-` codes, the phone |
| `lab.css` | the lab's own furniture (deliberately plain, so it is never mistaken for a design) |
| `data.js` | the fake rows |
| `boards.js` | the board slate, the segments, the board markup |
| `looks.js` | the art directions |
| `surfaces.js` | the start-screen links and the post-game hooks |

In the lab's browser console: `LAB.recipe()` prints the current screen, `LAB.decode("T82-...")` prints
what a code means, `LAB.apply("T82-...")` loads one back.
