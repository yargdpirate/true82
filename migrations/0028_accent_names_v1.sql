UPDATE trait_questions_v1 SET player_name = 'Nikola Joki' || char(263), updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE player_name = 'Nikola Jokic';
UPDATE trait_questions_v1 SET player_name = 'Luka Don' || char(269) || 'i' || char(263), updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE player_name = 'Luka Doncic';
UPDATE trait_questions_v1 SET player_name = 'Toni Kuko' || char(269), updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE player_name = 'Toni Kukoc';
UPDATE trait_questions_v1 SET player_name = 'Manu Gin' || char(243) || 'bili', updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE player_name = 'Manu Ginobili';
UPDATE trait_questions_v1 SET player_name = 'Peja Stojakovi' || char(263), updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE player_name = 'Peja Stojakovic';
