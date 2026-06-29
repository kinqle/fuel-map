-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  lat        double precision NOT NULL,
  lng        double precision NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cities" ON cities FOR SELECT TO anon USING (true);

-- Seed existing cities
INSERT INTO cities (id, name, lat, lng, sort_order) VALUES
  ('tver',        'Тверь',           56.8587, 35.9176, 1),
  ('moscow',      'Москва',          55.7558, 37.6176, 2),
  ('spb',         'Санкт-Петербург', 59.9311, 30.3609, 3),
  ('ekb',         'Екатеринбург',    56.8389, 60.6057, 4),
  ('nsk',         'Новосибирск',     54.9885, 82.9207, 5),
  ('kazan',       'Казань',          55.8304, 49.0661, 6),
  ('krasnodar',   'Краснодар',       45.0355, 38.9753, 7),
  ('samara',      'Самара',          53.2001, 50.1500, 8),
  ('ufa',         'Уфа',            54.7388, 55.9721, 9),
  ('chelyabinsk', 'Челябинск',       55.1644, 61.4368, 10)
ON CONFLICT (id) DO NOTHING;

-- Votes indexes (speeds up filtering by station_id and deduplication)
CREATE INDEX IF NOT EXISTS votes_station_idx    ON votes(station_id);
CREATE INDEX IF NOT EXISTS votes_device_idx     ON votes(device_id);
CREATE INDEX IF NOT EXISTS votes_created_idx    ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS votes_station_fuel_device_idx ON votes(station_id, fuel, device_id);
