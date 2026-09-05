SELECT
  (SELECT COUNT(*) FROM traits_v1) AS traits,
  (SELECT COUNT(*) FROM traits_v1 WHERE status='core') AS core,
  (SELECT COUNT(*) FROM traits_v1 WHERE status='retired') AS retired,
  (SELECT COUNT(*) FROM trait_questions_v1) AS questions,
  (SELECT COUNT(*) FROM trait_questions_v1 WHERE status='active') AS active_questions,
  (SELECT COUNT(*) FROM trait_rules_v1) AS rules,
  (SELECT COUNT(*) FROM trait_editorial_v1) AS editorial,
  (SELECT COUNT(*) FROM trait_question_meta_v1) AS meta,
  (SELECT COUNT(*) FROM trait_question_meta_v1 WHERE homepage_eligible = 1) AS homepage,
  (SELECT COUNT(*) FROM trait_votes_v1) AS votes;
