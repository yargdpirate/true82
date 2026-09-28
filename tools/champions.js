#!/usr/bin/env node
/* TRUE 82: the starting fives of 32 NBA title teams, the '77 Blazers to the '25 Thunder (slots G G F F C; the season is
   the year it ended). The balance checks of v62 to v63.1 (AGENT-HANDOFF 00000s to 00000w) measured every tax against
   them ("does a real title team pay it?") next to the real drafts (tools/labels-balance.js). A benchmark, not a law:
   the game's fantasy is a five of apex seasons, and real champions were limited by money and shots (the owner's lesson,
   2026-09-28), so a rule also has to leave great fives that fit great.
     node tools/champions.js     prints each team's net, usage sum, one ball and size charges, and any tag rows
   require("./tools/champions.js").resolve(T, data) returns [{ label, season, team, names, rows, slots, miss }] for any
   script (the row: the team's own stint that season, else the player's most-minute stint). */
"use strict";
const TEAMS = [
  ["77 Blazers", 1977, "POR", ["Lionel Hollins", "Dave Twardzik", "Bob Gross", "Maurice Lucas", "Bill Walton"]],
  ["80 Lakers", 1980, "LAL", ["Magic Johnson", "Norm Nixon", "Jamaal Wilkes", "Jim Chones", "Kareem Abdul-Jabbar"]],
  ["81 Celtics", 1981, "BOS", ["Tiny Archibald", "Chris Ford", "Larry Bird", "Cedric Maxwell", "Robert Parish"]],
  ["83 76ers", 1983, "PHI", ["Maurice Cheeks", "Andrew Toney", "Julius Erving", "Marc Iavaroni", "Moses Malone"]],
  ["85 Lakers", 1985, "LAL", ["Magic Johnson", "Byron Scott", "James Worthy", "Kurt Rambis", "Kareem Abdul-Jabbar"]],
  ["86 Celtics", 1986, "BOS", ["Dennis Johnson", "Danny Ainge", "Larry Bird", "Kevin McHale", "Robert Parish"]],
  ["87 Lakers", 1987, "LAL", ["Magic Johnson", "Byron Scott", "James Worthy", "A.C. Green", "Kareem Abdul-Jabbar"]],
  ["89 Pistons", 1989, "DET", ["Isiah Thomas", "Joe Dumars", "Mark Aguirre", "Rick Mahorn", "Bill Laimbeer"]],
  ["91 Bulls", 1991, "CHI", ["John Paxson", "Michael Jordan", "Scottie Pippen", "Horace Grant", "Bill Cartwright"]],
  ["94 Rockets", 1994, "HOU", ["Kenny Smith", "Vernon Maxwell", "Robert Horry", "Otis Thorpe", "Hakeem Olajuwon"]],
  ["96 Bulls", 1996, "CHI", ["Ron Harper", "Michael Jordan", "Scottie Pippen", "Dennis Rodman", "Luc Longley"]],
  ["99 Spurs", 1999, "SAS", ["Avery Johnson", "Mario Elie", "Sean Elliott", "Tim Duncan", "David Robinson"]],
  ["01 Lakers", 2001, "LAL", ["Derek Fisher", "Kobe Bryant", "Rick Fox", "Horace Grant", "Shaquille O'Neal"]],
  ["03 Spurs", 2003, "SAS", ["Tony Parker", "Stephen Jackson", "Bruce Bowen", "Tim Duncan", "David Robinson"]],
  ["04 Pistons", 2004, "DET", ["Chauncey Billups", "Richard Hamilton", "Tayshaun Prince", "Rasheed Wallace", "Ben Wallace"]],
  ["05 Suns", 2005, "PHO", ["Steve Nash", "Quentin Richardson", "Joe Johnson", "Shawn Marion", "Amar'e Stoudemire"]],
  ["06 Heat", 2006, "MIA", ["Jason Williams", "Dwyane Wade", "Antoine Walker", "Udonis Haslem", "Shaquille O'Neal"]],
  ["08 Celtics", 2008, "BOS", ["Rajon Rondo", "Ray Allen", "Paul Pierce", "Kevin Garnett", "Kendrick Perkins"]],
  ["10 Lakers", 2010, "LAL", ["Derek Fisher", "Kobe Bryant", "Metta World Peace", "Pau Gasol", "Andrew Bynum"]],
  ["11 Mavericks", 2011, "DAL", ["Jason Kidd", "DeShawn Stevenson", "Shawn Marion", "Dirk Nowitzki", "Tyson Chandler"]],
  ["13 Heat", 2013, "MIA", ["Mario Chalmers", "Dwyane Wade", "LeBron James", "Udonis Haslem", "Chris Bosh"]],
  ["14 Spurs", 2014, "SAS", ["Tony Parker", "Danny Green", "Kawhi Leonard", "Tim Duncan", "Tiago Splitter"]],
  ["16 Warriors", 2016, "GSW", ["Stephen Curry", "Klay Thompson", "Harrison Barnes", "Draymond Green", "Andrew Bogut"]],
  ["16 Cavaliers", 2016, "CLE", ["Kyrie Irving", "J.R. Smith", "LeBron James", "Kevin Love", "Tristan Thompson"]],
  ["17 Warriors", 2017, "GSW", ["Stephen Curry", "Klay Thompson", "Kevin Durant", "Draymond Green", "Zaza Pachulia"]],
  ["19 Raptors", 2019, "TOR", ["Kyle Lowry", "Danny Green", "Kawhi Leonard", "Pascal Siakam", "Marc Gasol"]],
  ["20 Lakers", 2020, "LAL", ["Avery Bradley", "Kentavious Caldwell-Pope", "LeBron James", "Anthony Davis", "JaVale McGee"]],
  ["21 Bucks", 2021, "MIL", ["Jrue Holiday", "Donte DiVincenzo", "Khris Middleton", "Giannis Antetokounmpo", "Brook Lopez"]],
  ["22 Warriors", 2022, "GSW", ["Stephen Curry", "Klay Thompson", "Andrew Wiggins", "Draymond Green", "Kevon Looney"]],
  ["23 Nuggets", 2023, "DEN", ["Jamal Murray", "Kentavious Caldwell-Pope", "Michael Porter Jr.", "Aaron Gordon", "Nikola Jokić"]],
  ["24 Celtics", 2024, "BOS", ["Jrue Holiday", "Derrick White", "Jaylen Brown", "Jayson Tatum", "Kristaps Porziņģis"]],
  ["25 Thunder", 2025, "OKC", ["Shai Gilgeous-Alexander", "Luguentz Dort", "Jalen Williams", "Chet Holmgren", "Isaiah Hartenstein"]]
];
function resolve(T, data) {
  const IDX = {}; data.meta.cols.forEach((c, i) => (IDX[c] = i));
  const fold = (s) => T.foldName(s).replace(/[^a-z]/g, "");
  const by = new Map();
  data.players.forEach((r) => { const k = fold(r[IDX.name]) + "|" + r[IDX.season]; if (!by.has(k)) by.set(k, []); by.get(k).push(r); });
  return TEAMS.map(([label, season, team, names]) => {
    const rows = names.map((n) => {
      const all = by.get(fold(n) + "|" + season) || [], own = all.filter((r) => r[IDX.team] === team);
      return (own.length ? own : all).slice().sort((a, b) => b[IDX.mp] - a[IDX.mp])[0] || null;
    });
    return { label, season, team, names, rows, slots: ["G", "G", "F", "F", "C"], miss: names.filter((n, i) => !rows[i]) };
  });
}
module.exports = { TEAMS, resolve };

if (require.main === module) {
  const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "..");
  const T = require(path.join(ROOT, "sim-core.js")), data = JSON.parse(fs.readFileSync(path.join(ROOT, "site_data.json"), "utf8"));
  T.initData(data);
  T.setLabels(JSON.parse(fs.readFileSync(path.join(ROOT, "labels.json"), "utf8")));
  resolve(T, data).forEach((c) => {
    if (c.miss.length) { console.log(c.label.padEnd(13), "MISSING", c.miss.join(", ")); return; }
    const e = T.engine({ ch: null }, c.rows, c.slots);
    console.log(`${c.label.padEnd(13)} net ${e.net.toFixed(1).padStart(5)}  usage ${e.sumUsage.toFixed(0).padStart(3)}  one ball ${e.usageTax.toFixed(1)}  size ${e.sizeTax}` +
      (e.labelRows.length ? "  tags " + e.labelRows.map((r) => r.id + (r.amt > 0 ? "-" : "+") + Math.abs(r.amt)).join(" ") : ""));
  });
}
