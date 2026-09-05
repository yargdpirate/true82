SELECT
  COUNT(*) AS selected_rows,
  SUM(CASE WHEN homepage_eligible = 1 THEN 1 ELSE 0 END) AS selected_homepage,
  (SELECT COUNT(*) FROM trait_question_meta_v1 WHERE homepage_eligible = 1) AS total_homepage
FROM trait_question_meta_v1
WHERE question_id IN (
  'russell-westbrook-2017-stat-padder',
  'russell-westbrook-2017-championship-number-one',
  'allen-iverson-2001-championship-number-one',
  'chris-paul-2008-championship-number-one',
  'tracy-mcgrady-2003-championship-number-one',
  'james-harden-2019-championship-number-one',
  'joel-embiid-2023-championship-number-one',
  'jayson-tatum-2024-championship-number-one',
  'anthony-edwards-2024-championship-number-one',
  'kobe-bryant-2006-ball-stopper',
  'allen-iverson-2001-ball-stopper',
  'carmelo-anthony-2013-ball-stopper',
  'chris-paul-2008-ball-pounder',
  'luka-doncic-2024-ball-pounder',
  'shai-gilgeous-alexander-2025-foul-merchant',
  'joel-embiid-2023-foul-merchant',
  'stephen-curry-2016-playmaker',
  'stephen-curry-2016-team-defender',
  'magic-johnson-1987-iso-defender',
  'giannis-antetokounmpo-2021-switchable-defender',
  'draymond-green-2016-rim-protector',
  'kyrie-irving-2016-off-ball-scorer',
  'anthony-edwards-2024-super-three-point-shooter',
  'dirk-nowitzki-2007-super-three-point-shooter',
  'luka-doncic-2024-off-ball-scorer'
);
