-- Таблица заправок, заполняется через Overpass API импортёр
CREATE TABLE IF NOT EXISTS stations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id      bigint UNIQUE,
  name        text NOT NULL DEFAULT 'АЗС',
  brand       text,
  brand_id    text,
  short       text NOT NULL DEFAULT '?',
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  address     text,
  city        text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stations_city_idx  ON stations(city);
CREATE INDEX IF NOT EXISTS stations_brand_idx ON stations(brand_id);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stations"
  ON stations FOR SELECT TO anon USING (true);

CREATE POLICY "Anon insert stations"
  ON stations FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon update stations"
  ON stations FOR UPDATE TO anon USING (true);
