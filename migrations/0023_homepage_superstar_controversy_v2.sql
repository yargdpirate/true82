-- TRUE82 0023: add 25 more superstar controversy/meme questions to homepage rotation.
-- Data-only and idempotent. Does not touch votes, consensus, editorial rulings, or game logic.
-- Assumes 0019 and 0020 have already been applied.

UPDATE trait_question_meta_v1
SET homepage_eligible = 1,
    active = 1,
    public_question = CASE question_id
      WHEN 'stephen-curry-2016-championship-number-one' THEN 'After the 2016 Finals, was Curry still a championship #1?'
      WHEN 'kevin-durant-2017-championship-number-one' THEN 'Was 2017 KD the Warriors'' championship #1 over Curry?'
      WHEN 'kawhi-leonard-2014-championship-number-one' THEN 'Was 2014 Finals MVP Kawhi really a championship #1?'
      WHEN 'andre-iguodala-2015-championship-number-one' THEN 'Was 2015 Finals MVP Iguodala really a championship #1?'
      WHEN 'jaylen-brown-2024-championship-number-one' THEN 'Was 2024 Finals MVP Jaylen Brown the Celtics'' #1?'
      WHEN 'scottie-pippen-1994-championship-number-one' THEN 'Could 1994 Pippen be the #1 on a title team?'
      WHEN 'jimmy-butler-2020-championship-number-one' THEN 'Could Bubble Jimmy be the #1 on a title team?'
      WHEN 'damian-lillard-2020-championship-number-one' THEN 'Could peak Dame be the #1 on a title team?'
      WHEN 'paul-george-2019-championship-number-one' THEN 'Could 2019 Paul George be the #1 on a title team?'
      WHEN 'dirk-nowitzki-2007-championship-number-one' THEN 'Could MVP Dirk be a title-team #1 before 2011?'
      WHEN 'david-robinson-1995-championship-number-one' THEN 'Could MVP David Robinson be the #1 on a title team?'
      WHEN 'giannis-antetokounmpo-2020-championship-number-one' THEN 'Could pre-title MVP Giannis be the #1 on a title team?'
      WHEN 'klay-thompson-2016-championship-number-one' THEN 'Could peak Klay be the #1 on a title team?'
      WHEN 'karl-malone-1997-clutch' THEN 'Was MVP Karl Malone clutch when it mattered?'
      WHEN 'david-robinson-1995-clutch' THEN 'Was MVP David Robinson clutch when it mattered?'
      WHEN 'james-harden-2019-team-defender' THEN 'Did 2019 Harden actually play good team defense?'
      WHEN 'charles-barkley-1993-team-defender' THEN 'Was MVP Barkley a good team defender?'
      WHEN 'ben-simmons-2021-switchable-defender' THEN 'Could 2021 Ben Simmons really guard 1 through 5?'
      WHEN 'kevin-durant-2017-switchable-defender' THEN 'Was 2017 KD truly switchable on defense?'
      WHEN 'steve-nash-2006-super-three-point-shooter' THEN 'Did 2006 Nash have game-breaking shooting gravity?'
      WHEN 'john-stockton-1995-three-point-shooter' THEN 'Was 1995 Stockton a real three-point shooter?'
      WHEN 'carmelo-anthony-2013-off-ball-scorer' THEN 'Was 2013 Melo dangerous without the ball?'
      WHEN 'dwight-howard-2009-off-ball-scorer' THEN 'Was 2009 Dwight an elite off-ball scorer?'
      WHEN 'draymond-green-2016-playmaker' THEN 'Was 2016 Draymond an elite playmaker, or just passing to Steph?'
      WHEN 'kobe-bryant-2006-ball-pounder' THEN 'Was 2006 Kobe a ball pounder?'
      ELSE public_question
    END,
    share_preview = CASE question_id
      WHEN 'stephen-curry-2016-championship-number-one' THEN '2016 CURRY · STILL A CHAMPIONSHIP #1?'
      WHEN 'kevin-durant-2017-championship-number-one' THEN '2017 KD · WARRIORS'' CHAMPIONSHIP #1?'
      WHEN 'kawhi-leonard-2014-championship-number-one' THEN '2014 KAWHI · REALLY A CHAMPIONSHIP #1?'
      WHEN 'andre-iguodala-2015-championship-number-one' THEN '2015 IGUODALA · REALLY A CHAMPIONSHIP #1?'
      WHEN 'jaylen-brown-2024-championship-number-one' THEN '2024 JAYLEN · CELTICS'' #1?'
      WHEN 'scottie-pippen-1994-championship-number-one' THEN '1994 PIPPEN · TITLE-TEAM #1?'
      WHEN 'jimmy-butler-2020-championship-number-one' THEN 'BUBBLE JIMMY · TITLE-TEAM #1?'
      WHEN 'damian-lillard-2020-championship-number-one' THEN 'PEAK DAME · TITLE-TEAM #1?'
      WHEN 'paul-george-2019-championship-number-one' THEN '2019 PAUL GEORGE · TITLE-TEAM #1?'
      WHEN 'dirk-nowitzki-2007-championship-number-one' THEN 'MVP DIRK · TITLE-TEAM #1 BEFORE 2011?'
      WHEN 'david-robinson-1995-championship-number-one' THEN 'MVP ROBINSON · TITLE-TEAM #1?'
      WHEN 'giannis-antetokounmpo-2020-championship-number-one' THEN 'PRE-TITLE MVP GIANNIS · TITLE-TEAM #1?'
      WHEN 'klay-thompson-2016-championship-number-one' THEN 'PEAK KLAY · TITLE-TEAM #1?'
      WHEN 'karl-malone-1997-clutch' THEN 'MVP KARL MALONE · CLUTCH?'
      WHEN 'david-robinson-1995-clutch' THEN 'MVP DAVID ROBINSON · CLUTCH?'
      WHEN 'james-harden-2019-team-defender' THEN '2019 HARDEN · GOOD TEAM DEFENSE?'
      WHEN 'charles-barkley-1993-team-defender' THEN 'MVP BARKLEY · GOOD TEAM DEFENDER?'
      WHEN 'ben-simmons-2021-switchable-defender' THEN '2021 SIMMONS · REALLY GUARD 1 THROUGH 5?'
      WHEN 'kevin-durant-2017-switchable-defender' THEN '2017 KD · TRULY SWITCHABLE?'
      WHEN 'steve-nash-2006-super-three-point-shooter' THEN '2006 NASH · GAME-BREAKING GRAVITY?'
      WHEN 'john-stockton-1995-three-point-shooter' THEN '1995 STOCKTON · REAL THREE-POINT SHOOTER?'
      WHEN 'carmelo-anthony-2013-off-ball-scorer' THEN '2013 MELO · DANGEROUS OFF BALL?'
      WHEN 'dwight-howard-2009-off-ball-scorer' THEN '2009 DWIGHT · ELITE OFF-BALL SCORER?'
      WHEN 'draymond-green-2016-playmaker' THEN '2016 DRAYMOND · ELITE PLAYMAKER OR STEPH EFFECT?'
      WHEN 'kobe-bryant-2006-ball-pounder' THEN '2006 KOBE · BALL POUNDER?'
      ELSE share_preview
    END
WHERE question_id IN (
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

UPDATE trait_questions_v1
SET editorial_priority = CASE WHEN editorial_priority < 97 THEN 97 ELSE editorial_priority END
WHERE id IN (
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
