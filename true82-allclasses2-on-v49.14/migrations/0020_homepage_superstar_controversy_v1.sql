-- TRUE82 0020: add 25 superstar controversy/meme questions to homepage rotation.
-- Data-only and idempotent. Does not touch votes, consensus, editorial rulings, or game logic.

UPDATE trait_question_meta_v1
SET homepage_eligible = 1,
    active = 1,
    public_question = CASE question_id
      WHEN 'russell-westbrook-2017-stat-padder' THEN 'Was 2017 Westbrook a stat padder?'
      WHEN 'russell-westbrook-2017-championship-number-one' THEN 'Could MVP Westbrook be the #1 on a title team?'
      WHEN 'allen-iverson-2001-championship-number-one' THEN 'Could 2001 Iverson be the #1 on a title team?'
      WHEN 'chris-paul-2008-championship-number-one' THEN 'Could 2008 CP3 be the #1 on a title team?'
      WHEN 'tracy-mcgrady-2003-championship-number-one' THEN 'Could 2003 T-Mac be the #1 on a title team?'
      WHEN 'james-harden-2019-championship-number-one' THEN 'Could 2019 Harden be the #1 on a title team?'
      WHEN 'joel-embiid-2023-championship-number-one' THEN 'Could MVP Embiid be the #1 on a title team?'
      WHEN 'jayson-tatum-2024-championship-number-one' THEN 'Could 2024 Tatum be the #1 on a title team?'
      WHEN 'anthony-edwards-2024-championship-number-one' THEN 'Could 2024 Ant be the #1 on a title team?'
      WHEN 'kobe-bryant-2006-ball-stopper' THEN 'Was 2006 Kobe a ball stopper?'
      WHEN 'allen-iverson-2001-ball-stopper' THEN 'Was 2001 Iverson a ball stopper?'
      WHEN 'carmelo-anthony-2013-ball-stopper' THEN 'Was 2013 Melo a ball stopper?'
      WHEN 'chris-paul-2008-ball-pounder' THEN 'Was peak CP3 a ball pounder?'
      WHEN 'luka-doncic-2024-ball-pounder' THEN 'Was 2024 Luka a ball pounder?'
      WHEN 'shai-gilgeous-alexander-2025-foul-merchant' THEN 'Was MVP Shai a foul merchant?'
      WHEN 'joel-embiid-2023-foul-merchant' THEN 'Was MVP Embiid a foul merchant?'
      WHEN 'stephen-curry-2016-playmaker' THEN 'Was 2016 Curry an elite playmaker?'
      WHEN 'stephen-curry-2016-team-defender' THEN 'Was 2016 Curry a good team defender?'
      WHEN 'magic-johnson-1987-iso-defender' THEN 'Could 1987 Magic guard stars one-on-one?'
      WHEN 'giannis-antetokounmpo-2021-switchable-defender' THEN 'Could 2021 Giannis really switch 1 through 5?'
      WHEN 'draymond-green-2016-rim-protector' THEN 'Was 2016 Draymond a real rim protector?'
      WHEN 'kyrie-irving-2016-off-ball-scorer' THEN 'Was 2016 Kyrie dangerous without the ball?'
      WHEN 'anthony-edwards-2024-super-three-point-shooter' THEN 'Did 2024 Ant have game-breaking shooting gravity?'
      WHEN 'dirk-nowitzki-2007-super-three-point-shooter' THEN 'Did MVP Dirk have game-breaking shooting gravity?'
      WHEN 'luka-doncic-2024-off-ball-scorer' THEN 'Was 2024 Luka useful without the ball?'
      ELSE public_question
    END,
    share_preview = CASE question_id
      WHEN 'russell-westbrook-2017-stat-padder' THEN '2017 WESTBROOK · STAT PADDER?'
      WHEN 'russell-westbrook-2017-championship-number-one' THEN 'MVP WESTBROOK · TITLE-TEAM #1?'
      WHEN 'allen-iverson-2001-championship-number-one' THEN '2001 IVERSON · TITLE-TEAM #1?'
      WHEN 'chris-paul-2008-championship-number-one' THEN '2008 CP3 · TITLE-TEAM #1?'
      WHEN 'tracy-mcgrady-2003-championship-number-one' THEN '2003 T-MAC · TITLE-TEAM #1?'
      WHEN 'james-harden-2019-championship-number-one' THEN '2019 HARDEN · TITLE-TEAM #1?'
      WHEN 'joel-embiid-2023-championship-number-one' THEN 'MVP EMBIID · TITLE-TEAM #1?'
      WHEN 'jayson-tatum-2024-championship-number-one' THEN '2024 TATUM · TITLE-TEAM #1?'
      WHEN 'anthony-edwards-2024-championship-number-one' THEN '2024 ANT · TITLE-TEAM #1?'
      WHEN 'kobe-bryant-2006-ball-stopper' THEN '2006 KOBE · BALL STOPPER?'
      WHEN 'allen-iverson-2001-ball-stopper' THEN '2001 IVERSON · BALL STOPPER?'
      WHEN 'carmelo-anthony-2013-ball-stopper' THEN '2013 MELO · BALL STOPPER?'
      WHEN 'chris-paul-2008-ball-pounder' THEN 'PEAK CP3 · BALL POUNDER?'
      WHEN 'luka-doncic-2024-ball-pounder' THEN '2024 LUKA · BALL POUNDER?'
      WHEN 'shai-gilgeous-alexander-2025-foul-merchant' THEN 'MVP SHAI · FOUL MERCHANT?'
      WHEN 'joel-embiid-2023-foul-merchant' THEN 'MVP EMBIID · FOUL MERCHANT?'
      WHEN 'stephen-curry-2016-playmaker' THEN '2016 CURRY · ELITE PLAYMAKER?'
      WHEN 'stephen-curry-2016-team-defender' THEN '2016 CURRY · GOOD TEAM DEFENDER?'
      WHEN 'magic-johnson-1987-iso-defender' THEN '1987 MAGIC · GUARD STARS ONE-ON-ONE?'
      WHEN 'giannis-antetokounmpo-2021-switchable-defender' THEN '2021 GIANNIS · SWITCH 1 THROUGH 5?'
      WHEN 'draymond-green-2016-rim-protector' THEN '2016 DRAYMOND · REAL RIM PROTECTOR?'
      WHEN 'kyrie-irving-2016-off-ball-scorer' THEN '2016 KYRIE · DANGEROUS OFF BALL?'
      WHEN 'anthony-edwards-2024-super-three-point-shooter' THEN '2024 ANT · GAME-BREAKING GRAVITY?'
      WHEN 'dirk-nowitzki-2007-super-three-point-shooter' THEN 'MVP DIRK · GAME-BREAKING GRAVITY?'
      WHEN 'luka-doncic-2024-off-ball-scorer' THEN '2024 LUKA · USEFUL OFF BALL?'
      ELSE share_preview
    END
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

UPDATE trait_questions_v1
SET editorial_priority = CASE WHEN editorial_priority < 96 THEN 96 ELSE editorial_priority END
WHERE id IN (
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
