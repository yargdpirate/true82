/* ---------- TRUE 82 Reprint Lab: the screens ----------
   Each view is a place in the game; each state is one real snapshot.
   The Tribune is retired, so it has no view. */
(function () {
  window.LAB.VIEWS = [
    { id: "masthead", name: "Masthead", states: [], caption: "The masthead at full size, in the site header, as the app icon and as the link card." },
    { id: "kit", name: "Every piece", states: [{ snap: "kit", name: "The kit" }], caption: "One of every basic element the site uses, on one page." },
    { id: "home", name: "Home", caption: "The homepage.", states: [
      { snap: "home-intro", name: "At rest" }, { snap: "home-intro-fresh", name: "First visit" }, { snap: "home-poll-voted", name: "Poll answered" },
      { snap: "home-poll-done", name: "Poll finished" }, { snap: "home-poll-share-copied", name: "Vote link copied" }, { snap: "home-daily-challenge", name: "Challenge a friend" },
      { snap: "home-daily-link-gate", name: "Arrived from a friend's link" }, { snap: "home-poll-idk-pressed", name: "Poll: I don't know" }, { snap: "home-legal-open", y: 1032, name: "Footer and legal" } ] },
    { id: "draft", name: "Draft", caption: "A Classic draft, round by round.", states: [
      { snap: "classic-round1", name: "Round 1" }, { snap: "classic-pick-selected", name: "Player picked" }, { snap: "classic-pick-single", name: "One open slot" },
      { snap: "classic-deal-spin", name: "Dealing the next ticket" }, { snap: "classic-sort", name: "Sorted" }, { snap: "classic-search-empty", name: "Search, no match" },
      { snap: "classic-chip-expanded", name: "Trait chip opened" }, { snap: "classic-legend-open", name: "Label legend" }, { snap: "classic-skip-used", name: "Skip used" },
      { snap: "classic-round3", name: "Round 3" }, { snap: "classic-round5", name: "Round 5" }, { snap: "classic-row-denied", name: "Player won't fit" },
      { snap: "classic-lineup-move", name: "Moving a player" }, { snap: "classic-rules-sheet", name: "How to play" } ] },
    { id: "presti", name: "Presti", caption: "Presti Mode: the salary cap draft.", states: [
      { snap: "presti-round1", name: "Round 1" }, { snap: "presti-pick-selected", name: "Player picked" }, { snap: "presti-pick-selected-multi", name: "Two positions" },
      { snap: "presti-skip", name: "Paying to skip" }, { snap: "presti-skip-refund", name: "Refund" }, { snap: "presti-skip-firesale", name: "Fire sale" },
      { snap: "presti-bank-mid", name: "Money running low" }, { snap: "presti-bank-low", name: "Almost broke" }, { snap: "presti-swap", name: "Swapping" }, { snap: "presti-rules-sheet", name: "How to play" } ] },
    { id: "daily", name: "The Daily", caption: "The Daily: the gate, the draft, the results, the challenge.", states: [
      { snap: "daily-gate", name: "The gate" }, { snap: "daily-shot", name: "Dunking in" }, { snap: "home-daily-gate-info", name: "Gate, rules open" },
      { snap: "daily-round1", name: "Draft" }, { snap: "daily-pick-selected", name: "Player picked" }, { snap: "daily-rules-sheet", name: "How to play" },
      { snap: "daily-results-top", name: "Results" }, { snap: "daily-share-copied", name: "Shared" }, { snap: "daily-plaque-played", name: "Plaque after playing" },
      { snap: "daily-practice-round1", name: "Practice draft" }, { snap: "daily-practice-results", name: "Practice results" },
      { snap: "daily-challenge", name: "A friend's challenge" }, { snap: "daily-challenge-round1", name: "Challenge draft" }, { snap: "daily-challenge-results", name: "Challenge results" },
      { snap: "home-daily-share-reveal", name: "Share fallback" }, { snap: "home-daily-stale-link", name: "Old link" } ] },
    { id: "reel", name: "Season reel", caption: "The season prints game by game.", states: [
      { snap: "reel-mid", name: "First loss" }, { snap: "reel-win-streak", name: "On a streak" }, { snap: "reel-streak-dies", name: "Streak dies" }, { snap: "reel-final", name: "Finale" },
      { snap: "presti-reel", name: "Presti, resumed" }, { snap: "presti-reel-final", name: "Presti finale" } ] },
    { id: "heat", name: "Heat Check", caption: "The Mid-Season Heat Check.", states: [
      { snap: "heat-check", name: "The offer" }, { snap: "heat-wheel", name: "Name spinning" }, { snap: "heat-pull", name: "Pulling" }, { snap: "heat-ignite", name: "Ignited" },
      { snap: "heat-shot", name: "The shot" }, { snap: "heat-result-saved", name: "Saved" }, { snap: "heat-result-miss", name: "Missed" }, { snap: "heat-result-supernova", name: "Supernova" },
      { snap: "hot-check", name: "82-0 shot: offer" }, { snap: "hot-wheel", name: "82-0 shot: spinning" }, { snap: "hot-shot", name: "82-0 shot: in the air" },
      { snap: "hot-climb", name: "82-0 shot: climbing" }, { snap: "hot-result-miss", name: "82-0 shot: short" } ] },
    { id: "results", name: "Results", caption: "The results page and the tag ballot.", states: [
      { snap: "results-top", name: "Top" }, { snap: "results-lower", y: 1380, name: "Further down" }, { snap: "results-top-alt", name: "A 57-25 year" }, { snap: "results-print-mid", name: "80-2" },
      { snap: "presti-results-top", name: "Presti results" }, { snap: "results-toast", name: "Not saved toast" } ] },
    { id: "ballot", name: "Ballot sheets", caption: "The tag ballot's sheets.", states: [
      { snap: "sheet-tag", name: "A tag's question" }, { snap: "sheet-tag-voted", name: "After voting" }, { snap: "sheet-tag-neg", name: "A bad trait" }, { snap: "sheet-add-picker", name: "Add a tag" } ] },
    { id: "bonuses", name: "Bonuses", caption: "The Player Bonuses page.", states: [
      { snap: "bonus-question", name: "A question" }, { snap: "bonus-answered", name: "Answered" }, { snap: "bonus-answered-no", name: "Answered NO" },
      { snap: "bonus-change-vote", name: "Changing a vote" }, { snap: "bonus-complete", name: "Five done" }, { snap: "bonus-loading", name: "Loading" },
      { snap: "bonus-vote-failed", name: "Vote failed" }, { snap: "bonus-feed-error", name: "Feed error" }, { snap: "bonus-share-copied", name: "Link copied" } ] },
    { id: "info", name: "Info pages", caption: "The four explainer pages.", states: [
      { snap: "info-how-it-works", name: "How it works" }, { snap: "info-faq", name: "FAQ" }, { snap: "info-can-you-go", name: "82-0 explainer" }, { snap: "info-what-is-bpm", name: "BPM explained" } ] },
    { id: "e404", name: "404", caption: "The missing-page page.", states: [{ snap: "e404-page", name: "404" }] }
  ];
})();
