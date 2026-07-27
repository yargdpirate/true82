INSERT OR IGNORE INTO traits_v1 (id, display_name, short_definition, status, created_at, updated_at)
VALUES ('off-court-knucklehead', 'Off-Court Knucklehead', 'Constant risk to get into real trouble off the court.', 'core', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);
