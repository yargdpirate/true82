# Going live with `c-code-clean` (v58)

Two parts. Part 1 is yours (the database, one sitting, about ten minutes). Part 2 is one sentence to Claude.

## Where the database stands (checked 2026-09-27)

Everything through **0025** is already in the live database. Each migration from 0010 to 0025 was checked
against true82.net itself; 0025 is the 24 homepage polls from the accounts-test line. Three are left, in this
order:

| Order | File | What it is |
|---|---|---|
| 1 | `0026_scout_claims_v1.sql` | **Your player labels:** the 29,221 scout verdicts you generated in September (the file you downloaded as `0013_scout_claims.sql`, byte for byte, renumbered). 12,770 tags and 16,451 "?" marks across every drafted player-season. |
| 2 | `0027_hunted_trait_v1.sql` | The Hunted trait (one row). |
| 3 | `0028_accent_names_v1.sql` | The accent fix: 27 hand-written questions spell Jokić, Dončić, Ginóbili, Kukoč and Stojaković without accents, so their labels never reached their cards. |

All three are safe to run twice: nothing doubles and nothing breaks. The live site (v47) ignores all three until
the merge, so running them first changes nothing players see today.

## Part 1: the database

0026 is 7.6 MB, too big for the Cloudflare console. It goes through Cloudflare's own command-line tool,
**wrangler**. Open the Terminal app, then copy each line below, paste it, press Return, and wait for it to
finish before the next one.

1. Go to the project folder:
   ```bash
   cd ~/true82
   ```
2. Sign in to Cloudflare. A browser tab opens; click **Allow**, then come back to Terminal:
   ```bash
   npx --yes wrangler@4 login
   ```
3. List your databases. Note the name in the **name** column (the TRUE 82 one). Below, type that name
   where it says `DBNAME`:
   ```bash
   npx --yes wrangler@4 d1 list
   ```
4. Your player labels (takes up to a minute):
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --yes --file=migrations/0026_scout_claims_v1.sql
   ```
5. The Hunted trait:
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --yes --file=migrations/0027_hunted_trait_v1.sql
   ```
6. The accent fix:
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --yes --file=migrations/0028_accent_names_v1.sql
   ```
7. Check everything at once:
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --command "SELECT (SELECT COUNT(*) FROM trait_scout_v1 WHERE verdict='yes') AS scout_yes, (SELECT COUNT(*) FROM trait_scout_v1 WHERE verdict='unsure') AS scout_unsure, (SELECT COUNT(*) FROM traits_v1 WHERE id='hunted') AS hunted, (SELECT COUNT(*) FROM trait_questions_v1 WHERE player_name IN ('Nikola Jokic','Luka Doncic','Toni Kukoc','Manu Ginobili','Peja Stojakovic')) AS unaccented, (SELECT COUNT(*) FROM trait_question_meta_v1 WHERE homepage_eligible = 1) AS homepage"
   ```
   Expect **scout_yes 12770, scout_unsure 16451, hunted 1, unaccented 0, homepage 104**.
   - homepage **84** instead of 104 means one old July step (0014, the homepage poll flags) never landed.
     Run it, then run step 7 again:
     ```bash
     npx --yes wrangler@4 d1 execute DBNAME --remote --yes --file=migrations/0014_homepage_rotation_v1.sql
     ```
   - Any other number: send it to Claude before merging.

Nothing else needs the database: the Redrafted's real drafts and the new Dailies are part of the site itself.

## Part 2: the site

Tell Claude **"merge to main"**. `main` publishes to true82.net by itself within a few minutes.

- **Order:** the database first, then the merge.
- **Timing:** the new Dailies start **Monday, September 28** (Daily #79). Go live by the end of Sunday,
  September 27, or tell Claude before merging so the start date moves. Otherwise the archive would show the
  new board for days the live site played an old one.
- **Heads-up:** the branch preview and true82.net read the same database (confirmed 2026-09-27: identical
  vote tallies on both). Until previews get their own database (a Cloudflare setting, on the owner's "later"
  list), taps on the branch preview count as real votes and analytics.
