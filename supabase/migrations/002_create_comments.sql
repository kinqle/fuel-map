CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id  uuid NOT NULL,
  device_id   text NOT NULL,
  author_name text NOT NULL DEFAULT 'Аноним',
  category    text NOT NULL DEFAULT 'other',
  body        text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_station_idx ON comments(station_id, created_at DESC);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments"   ON comments FOR SELECT TO anon USING (true);
CREATE POLICY "insert comments" ON comments FOR INSERT TO anon WITH CHECK (true);

CREATE TABLE IF NOT EXISTS comment_reactions (
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  type       text NOT NULL CHECK (type IN ('like', 'report')),
  PRIMARY KEY (comment_id, device_id, type)
);
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reactions"   ON comment_reactions FOR SELECT TO anon USING (true);
CREATE POLICY "insert reactions" ON comment_reactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "delete reactions" ON comment_reactions FOR DELETE TO anon USING (true);
