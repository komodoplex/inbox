-- 0002_seed_sources.sql
-- Initial venture and source registry seeds

INSERT OR IGNORE INTO ventures (id, slug, name, enabled, created_at, updated_at) VALUES
('vtr_komodoplex', 'komodoplex', 'Komodoplex', 1, 1774000000000, 1774000000000),
('vtr_reputask', 'reputask', 'Reputask', 1, 1774000000000, 1774000000000);

INSERT OR IGNORE INTO sources (id, venture_id, slug, channel, domain, enabled, created_at, updated_at) VALUES
('src_komodoplex_talk', 'vtr_komodoplex', 'komodoplex-studio-talk', 'talk', 'komodoplex.com', 1, 1774000000000, 1774000000000),
('src_komodoplex_hello', 'vtr_komodoplex', 'komodoplex-hello', 'hello', 'komodoplex.com', 1, 1774000000000, 1774000000000),
('src_komodoplex_support', 'vtr_komodoplex', 'komodoplex-support', 'support', 'komodoplex.com', 1, 1774000000000, 1774000000000),
('src_reputask_contact', 'vtr_reputask', 'reputask-contact', 'contact', 'reputask.xyz', 1, 1774000000000, 1774000000000),
('src_reputask_feeds', 'vtr_reputask', 'reputask-feeds', 'feeds', 'reputask.xyz', 1, 1774000000000, 1774000000000);
