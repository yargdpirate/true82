SELECT q.id, q.player_name, q.season, t.display_name AS trait,
  COALESCE(c.eligible_votes, 0) AS eligible,
  COALESCE(c.yes_count, 0) AS yes,
  COALESCE(c.no_count, 0) AS no,
  COALESCE(c.status, 'unresolved') AS status,
  ROUND(COALESCE(c.yes_share, 0.5) * 100) AS yes_pct
FROM trait_questions_v1 q
JOIN traits_v1 t ON t.id = q.trait_id
LEFT JOIN trait_consensus_v1 c ON c.question_id = q.id
LEFT JOIN trait_question_meta_v1 m ON m.question_id = q.id
WHERE q.status = 'active' AND m.question_id IS NULL
ORDER BY COALESCE(c.eligible_votes, 0) DESC, ABS(COALESCE(c.yes_share, 0.5) - 0.5) ASC
LIMIT 40;
