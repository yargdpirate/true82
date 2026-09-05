# RETURN HANDOFF - EVERY CLASS DERIVED (ported onto v49.14)

The class derivation pass, ported onto the live tree. All five port
adaptations are in: cohort buckets key on sdRowBuckets (primary position),
the pool cache keeps its id+"|"+diff key, all copy says THE REDRAFTED,
derived classes carry no picks map so the board falls to the undrafted
peakMp rule. Derived classes now ALSO emit a data-derived PRO deep tier:
the rest of the eligible cohort beyond the compact PICKUP board, capped by
SD_PRO_CAP (50), riding the existing deep merge in sdBuildPool unchanged.
The 785 floor is the performance bar, the same one the authored deep tiers
used, so no authoring is needed for any derived year.
Curated deep-tier names are excluded from auto cohorts along with the
short boards. Nothing outside the Redrafted block changed; v49.14 share
labels, difficulty, blind boards, and storage are untouched.

MECHANICS: sdDeriveClasses runs once per load at the gate (and at sdStart
for deep launches). One POOL_YEARS walk computes each name's RAW first
season (a 300-minute rookie year still marks entry), best eligible value,
and primary-position buckets. class = minSeason - SD_ENTRY_OFFSET (1;
seasons as end-years - smoke test documented at the constant). The floor
cohort is dropped. SD_REDSHIRTS refiles draft-and-stash cases; diacritic
names are keyed under both spellings; a name mapped into a curated year is
dropped unless that curated list names him. sdCohortPick takes the top 21
by best season and GROWS (never swaps, max 4 adds) until sdHall passes,
else the class never materializes - under the primary position rule the
growth engages more often, which is the design absorbing v49.9, not a bug.
SD_SPECIAL marks 1976 (cue + blurb). Auto blurbs read "Headlined by A, B,
and C." Deep links ?redraft=YEAR are consumed at gate render so derived
years work even when the data arrives after boot; pre-data the gate shows
the curated nine plus a note, and refreshes itself once the data lands,
only if still on screen.

VALIDATION: run6 port suite, 40 checks in real Chromium over the faithful
T82 stub against the ported tree and again against the extracted package -
derivation, floor drop, redshirt cycles, cohort growth, curated and DEEP
exclusion, decade picker DOM with the difficulty pill preserved, pre-data
gate, PICKUP/PRO parity on derived classes plus deep still working on
curated ones, a full AI draft on a derived class settling three teams
under the right label, em-dash law, key parity. Visuals at 320/360/390/430
under the real v49.14 styles.css and fonts WITH decorate3dButtons run
(the v49.11 lesson), so the shots show the live gold-key chips. A byte
diff against pristine v49.14 confirms every changed hunk sits inside the
Redrafted block.
