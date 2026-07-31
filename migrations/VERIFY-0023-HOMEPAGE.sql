SELECT
  COUNT(*) AS selected_rows,
  SUM(CASE WHEN homepage_eligible = 1 THEN 1 ELSE 0 END) AS selected_homepage,
  MIN(q.editorial_priority) AS minimum_priority,
  (SELECT COUNT(*) FROM trait_question_meta_v1 WHERE homepage_eligible = 1) AS total_homepage
FROM trait_question_meta_v1 m
JOIN trait_questions_v1 q ON q.id = m.question_id
WHERE m.question_id IN (
  'stephen-curry-2016-championship-number-one',
  'kevin-durant-2017-championship-number-one',
  'kawhi-leonard-2014-championship-number-one',
  'andre-iguodala-2015-championship-number-one',
  'jaylen-brown-2024-championship-number-one',
  'scottie-pippen-1994-championship-number-one',
  'jimmy-butler-2020-championship-number-one',
  'damian-lillard-2020-championship-number-one',
  'paul-george-2019-championship-number-one',
  'dirk-nowitzki-2007-championship-number-one',
  'david-robinson-1995-championship-number-one',
  'giannis-antetokounmpo-2020-championship-number-one',
  'klay-thompson-2016-championship-number-one',
  'karl-malone-1997-clutch',
  'david-robinson-1995-clutch',
  'james-harden-2019-team-defender',
  'charles-barkley-1993-team-defender',
  'ben-simmons-2021-switchable-defender',
  'kevin-durant-2017-switchable-defender',
  'steve-nash-2006-super-three-point-shooter',
  'john-stockton-1995-three-point-shooter',
  'carmelo-anthony-2013-off-ball-scorer',
  'dwight-howard-2009-off-ball-scorer',
  'draymond-green-2016-playmaker',
  'kobe-bryant-2006-ball-pounder'
);
