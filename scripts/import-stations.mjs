#!/usr/bin/env node
/**
 * Импортёр АЗС из OpenStreetMap (Overpass API) → Supabase
 * Использование: node scripts/import-stations.mjs "Тверь"
 *                node scripts/import-stations.mjs "Москва"
 */

const SUPABASE_URL = "https://lsrxzgeiazkwzslvxpuu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzcnh6Z2VpYXprd3pzbHZ4cHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI3OTQsImV4cCI6MjA5Nzg4ODc5NH0.FxV3ibMmn70FPZ499G7CxYn8_-VaiNvYKaTd1MXmGdk";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const BRAND_MAP = {
  "лукойл":           { id: "lukoil",         name: "Лукойл",          short: "Л" },
  "lukoil":           { id: "lukoil",         name: "Лукойл",          short: "Л" },
  "роснефть":         { id: "rosneft",        name: "Роснефть",        short: "Р" },
  "rosneft":          { id: "rosneft",        name: "Роснефть",        short: "Р" },
  "газпромнефть":     { id: "gazprom",        name: "Газпромнефть",    short: "Г" },
  "газпром":          { id: "gazprom",        name: "Газпромнефть",    short: "Г" },
  "gazpromneft":      { id: "gazprom",        name: "Газпромнефть",    short: "Г" },
  "gazprom neft":     { id: "gazprom",        name: "Газпромнефть",    short: "Г" },
  "башнефть":         { id: "bashneft",       name: "Башнефть",        short: "Б" },
  "bashneft":         { id: "bashneft",       name: "Башнефть",        short: "Б" },
  "татнефть":         { id: "tatneft",        name: "Татнефть",        short: "Т" },
  "tatneft":          { id: "tatneft",        name: "Татнефть",        short: "Т" },
  "сургутнефтегаз":   { id: "surgutneftegas", name: "Сургутнефтегаз",  short: "С" },
  "surgutneftegas":   { id: "surgutneftegas", name: "Сургутнефтегаз",  short: "С" },
  "нефтьмагистраль":  { id: "neftmagistral",  name: "НефтьМагистраль", short: "Н" },
  "teboil":           { id: "teboil",         name: "Teboil",          short: "T" },
  "bp":               { id: "bp",             name: "BP",              short: "B" },
  "shell":            { id: "shell",          name: "Shell",           short: "S" },
  "neste":            { id: "neste",          name: "Neste",           short: "N" },
  "total":            { id: "total",          name: "Total",           short: "T" },
  "totalenergies":    { id: "total",          name: "Total",           short: "T" },
};

function normalizeBrand(tags) {
  const raw = (tags.brand || tags.operator || tags.name || "").toLowerCase().trim();
  if (BRAND_MAP[raw]) return BRAND_MAP[raw];
  // partial match
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (raw.includes(key)) return val;
  }
  return null;
}

function buildShort(tags, brand) {
  if (brand) return brand.short;
  const name = tags.brand || tags.operator || tags.name || "АЗС";
  return name.slice(0, 1).toUpperCase();
}

function buildAddress(tags) {
  const parts = [];
  if (tags["addr:street"])      parts.push(tags["addr:street"]);
  if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
  return parts.length > 0 ? parts.join(", ") : null;
}

function buildName(tags, brand) {
  if (brand)           return brand.name;
  if (tags.brand)      return tags.brand;
  if (tags.operator)   return tags.operator;
  if (tags.name)       return tags.name;
  // Use address as distinguisher for unnamed stations
  const street = tags["addr:street"];
  if (street) return `АЗС • ${street}`;
  return "Безымянная АЗС";
}

const HEADERS = {
  "User-Agent":    "FuelMapImporter/1.0 (https://github.com/fuel-map; tammygaluwe@onet.pl)",
  "Accept":        "application/json",
  "Accept-Language": "ru,en;q=0.9",
};

// Known city bounding boxes [south, west, north, east] to avoid Nominatim dependency
const KNOWN_BBOX = {
  "тверь":   [56.789, 35.841, 56.950, 36.117],
  "москва":  [55.489, 37.319, 55.957, 37.967],
  "москва":  [55.489, 37.319, 55.957, 37.967],
  "санкт-петербург": [59.774, 30.042, 60.091, 30.568],
  "новосибирск": [54.789, 82.789, 55.125, 83.124],
  "екатеринбург": [56.694, 60.487, 56.963, 60.881],
};

async function tryOverpassGET(endpoint, query) {
  const url = `${endpoint}?data=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);
  return res.json();
}

async function tryOverpassPOST(endpoint, query) {
  const body = new URLSearchParams({ data: query });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);
  return res.json();
}

async function fetchFromOverpass(query) {
  const errors = [];
  // Try each endpoint, both GET and POST
  for (const ep of OVERPASS_ENDPOINTS) {
    for (const method of ["POST", "GET"]) {
      try {
        console.log(`  → ${method} ${ep}`);
        const json = method === "POST"
          ? await tryOverpassPOST(ep, query)
          : await tryOverpassGET(ep, query);
        if (json?.elements) {
          console.log(`  ✓ Успешно (${json.elements.length} объектов)`);
          return json.elements;
        }
        errors.push(`${method} ${ep}: empty response`);
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
        errors.push(e.message);
      }
    }
  }
  throw new Error(`Все Overpass-зеркала недоступны:\n${errors.join("\n")}`);
}

// Get bounding box — tries KNOWN_BBOX first, then Nominatim
async function getCityBbox(city) {
  const key = city.toLowerCase().trim();
  if (KNOWN_BBOX[key]) {
    const [south, west, north, east] = KNOWN_BBOX[key];
    return { south, west, north, east };
  }
  // Try Nominatim
  await new Promise(r => setTimeout(r, 1000)); // Nominatim policy: 1 req/sec
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)},Russia&format=json&limit=3&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  const place = data.find(d => d.boundingbox) ?? data[0];
  if (!place?.boundingbox) throw new Error(`Nominatim: город "${city}" не найден`);
  const bb = place.boundingbox; // [minLat, maxLat, minLon, maxLon]
  return { south: parseFloat(bb[0]), north: parseFloat(bb[1]), west: parseFloat(bb[2]), east: parseFloat(bb[3]) };
}

async function fetchStationsForCity(city) {
  console.log(`\n🗺  Запрос Overpass API для города: ${city}`);

  // Method 1: area-based query
  console.log(`   Метод 1: поиск по названию области`);
  const areaQuery = `[out:json][timeout:60];
area["name"="${city}"]["boundary"="administrative"]->.s;
(
  node["amenity"="fuel"](area.s);
  way["amenity"="fuel"](area.s);
);
out center tags;`;
  try {
    const elements = await fetchFromOverpass(areaQuery);
    if (elements.length > 0) return elements;
    console.log(`   Метод 1 вернул 0 результатов, пробуем bbox...`);
  } catch (e1) {
    console.log(`   Метод 1 не удался: ${e1.message}`);
  }

  // Method 2: Nominatim bbox
  console.log(`   Метод 2: поиск по bbox через Nominatim`);
  const bbox = await getCityBbox(city);
  console.log(`   Bbox: ${bbox.south},${bbox.west},${bbox.north},${bbox.east}`);
  const bboxQuery = `[out:json][timeout:60];
(
  node["amenity"="fuel"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["amenity"="fuel"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center tags;`;
  return await fetchFromOverpass(bboxQuery);
}

function elementToStation(el, city) {
  const tags = el.tags ?? {};
  const lat  = el.type === "way" ? el.center?.lat : el.lat;
  const lng  = el.type === "way" ? el.center?.lon : el.lon;
  if (!lat || !lng) return null;

  const brand   = normalizeBrand(tags);
  const name    = buildName(tags, brand);
  const short   = buildShort(tags, brand);
  const address = buildAddress(tags);

  return {
    osm_id:   el.id,
    name,
    brand:    brand?.name ?? null,
    brand_id: brand?.id  ?? null,
    short,
    lat,
    lng,
    address,
    city,
  };
}

async function upsertStations(stations) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stations?on_conflict=osm_id`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer":        "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(stations),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert failed: ${res.status} ${err}`);
  }
}

async function main() {
  const city = process.argv[2];
  if (!city) {
    console.error("Использование: node scripts/import-stations.mjs <Город>");
    console.error('Пример: node scripts/import-stations.mjs "Тверь"');
    process.exit(1);
  }

  const elements = await fetchStationsForCity(city);
  console.log(`\n📍 Найдено объектов в OSM: ${elements.length}`);

  const stations = elements.map(el => elementToStation(el, city)).filter(Boolean);
  console.log(`✅ Подготовлено к импорту: ${stations.length} АЗС`);

  if (stations.length === 0) {
    console.log("Ничего не найдено. Попробуйте другое название города.");
    return;
  }

  const BATCH = 100;
  for (let i = 0; i < stations.length; i += BATCH) {
    const batch = stations.slice(i, i + BATCH);
    await upsertStations(batch);
    console.log(`  Загружено ${Math.min(i + BATCH, stations.length)} / ${stations.length}`);
  }

  console.log(`\n🎉 Импорт завершён! ${stations.length} АЗС в городе "${city}" добавлены в Supabase.`);

  const brands = {};
  for (const s of stations) {
    const key = s.brand ?? "Без бренда";
    brands[key] = (brands[key] ?? 0) + 1;
  }
  console.log("\nБренды:");
  for (const [brand, count] of Object.entries(brands).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${brand}: ${count}`);
  }
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
