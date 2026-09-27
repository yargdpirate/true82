# Going live with `c-code-clean` (v58)

Two parts. Part 1 is yours (the database, one time, about ten minutes). Part 2 is one sentence to Claude.

## Part 1: the database

The tag ballot (on the branch since v50) reads two database additions:

- **0026, the scout claims:** 29,221 AI scout verdicts that put a first set of tags on every drafted player.
- **0027, the Hunted trait:** one row.

The site works without them (the tags just show less), but the ballot is only complete with them. Both are
safe to run twice: nothing doubles and nothing breaks.

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
4. The scout claims (takes up to a minute):
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --yes --file=migrations/0026_scout_claims_v1.sql
   ```
5. The Hunted trait:
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --yes --file=migrations/0027_hunted_trait_v1.sql
   ```
6. Check. Expect two rows: **unsure 16451** and **yes 12770**:
   ```bash
   npx --yes wrangler@4 d1 execute DBNAME --remote --command "SELECT verdict, COUNT(*) AS n FROM trait_scout_v1 GROUP BY verdict"
   ```

If you would rather paste 0027 into the Cloudflare D1 console instead of step 5, this is the whole thing
(one statement, no comments):

```sql
INSERT OR IGNORE INTO traits_v1 (id, display_name, short_definition, category, definition_version, status, created_at, updated_at) VALUES ('hunted', 'Hunted', 'Opponents go at him on purpose: switch onto him, post him, run him off screens.', 'defense', 1, 'core', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);
```

Nothing else needs the database: the Redrafted's real drafts and the new Dailies are part of the site itself.

## Part 2: the site

Tell Claude **"merge to main"**. `main` publishes to true82.net by itself within a few minutes.

- **Order:** the database first, then the merge.
- **Timing:** the new Dailies start **Monday, September 28** (Daily #79). Go live by the end of Sunday,
  September 27, or tell Claude before merging so the start date moves. Otherwise the archive would show the
  new board for days the live site played an old one.
- **Heads-up:** preview deploys may share the live database (a Cloudflare setting, on the owner's "later" list).
  Until previews get their own database, taps on the branch preview count as real votes and analytics.
