import {
  voteWeight,
  calcFuelConfidence,
  getFuelVerdict,
  getStationStatus,
  nearestStation,
  calcRecommended,
  velocityBoost,
  confirmatoryBoost,
  isStationUnstable,
  experienceMultiplier,
} from "../votes";
import type { FuelVotes, Station } from "../types";

const NOW = 1_700_000_000_000; // fixed timestamp for tests

function mkFuel(overrides: Partial<FuelVotes> = {}): FuelVotes {
  return {
    yes: 0, no: 0, yesW: 0, noW: 0,
    myVote: null, lastAt: null,
    ...overrides,
  };
}

function isoAgo(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

// ─── voteWeight ───────────────────────────────────────────────────────────────

describe("voteWeight", () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it("fresh vote (age 0) has weight ~1", () => {
    const w = voteWeight(new Date(NOW).toISOString());
    expect(w).toBeCloseTo(1.0, 2);
  });

  it("vote at decay constant (3h) has weight ~1/e ≈ 0.368", () => {
    const w = voteWeight(isoAgo(3 * 3600 * 1000));
    expect(w).toBeCloseTo(1 / Math.E, 2);
  });

  it("vote at ln(2)*3h has weight exactly 0.5 (true halflife)", () => {
    const w = voteWeight(isoAgo(Math.LN2 * 3 * 3600 * 1000));
    expect(w).toBeCloseTo(0.5, 2);
  });

  it("very old vote (24h) has near-zero weight", () => {
    const w = voteWeight(isoAgo(24 * 3600 * 1000));
    expect(w).toBeLessThan(0.01);
  });
});

// ─── getFuelVerdict ───────────────────────────────────────────────────────────

describe("getFuelVerdict", () => {
  it('returns "Нет данных" when no votes', () => {
    const v = getFuelVerdict(mkFuel());
    expect(v.label).toBe("Нет данных");
    expect(v.kind).toBe("neutral");
  });

  it('returns "Информация устарела" when weight < 0.25', () => {
    const v = getFuelVerdict(mkFuel({ yes: 1, yesW: 0.1 }));
    expect(v.label).toBe("Информация устарела");
  });

  it('returns "Мало подтверждений" when only 1 vote with enough weight', () => {
    const v = getFuelVerdict(mkFuel({ yes: 1, yesW: 0.8 }));
    expect(v.label).toBe("Мало подтверждений");
  });

  it('returns "Мнения разделились" when split ≥35/65', () => {
    const v = getFuelVerdict(mkFuel({ yes: 2, no: 2, yesW: 1.0, noW: 1.0 }));
    expect(v.label).toBe("Мнения разделились");
    expect(v.kind).toBe("neutral");
  });

  it('returns "Скорее всего есть" when majority yes', () => {
    const v = getFuelVerdict(mkFuel({ yes: 4, no: 1, yesW: 3.5, noW: 0.5 }));
    expect(v.label).toBe("Скорее всего есть");
    expect(v.kind).toBe("yes");
  });

  it('returns "Скорее всего нет" when majority no', () => {
    const v = getFuelVerdict(mkFuel({ yes: 1, no: 4, yesW: 0.5, noW: 3.5 }));
    expect(v.label).toBe("Скорее всего нет");
    expect(v.kind).toBe("no");
  });
});

// ─── calcFuelConfidence ───────────────────────────────────────────────────────

describe("calcFuelConfidence", () => {
  it("returns 0 when no votes", () => {
    expect(calcFuelConfidence(mkFuel())).toBe(0);
  });

  it("returns 100 when all yes and no weight", () => {
    expect(calcFuelConfidence(mkFuel({ yes: 3, yesW: 3 }))).toBe(100);
  });

  it("returns 75 for 3:1 yes/no weighted ratio", () => {
    expect(calcFuelConfidence(mkFuel({ yes: 3, no: 1, yesW: 3, noW: 1 }))).toBe(75);
  });

  it("returns 80 for 4:1 ratio", () => {
    expect(calcFuelConfidence(mkFuel({ yes: 4, no: 1, yesW: 4, noW: 1 }))).toBe(80);
  });
});

// ─── getStationStatus ─────────────────────────────────────────────────────────

describe("getStationStatus", () => {
  it('returns "neutral" when no votes at all', () => {
    expect(getStationStatus({})).toBe("neutral");
  });

  it('returns "neutral" when all fuels have near-zero weight', () => {
    const low = mkFuel({ yes: 1, yesW: 0.1 });
    expect(getStationStatus({ ai92: low, ai95: low })).toBe("neutral");
  });

  it('returns "green" when majority fuels are yes', () => {
    const yes = mkFuel({ yes: 3, yesW: 2.5, noW: 0.3 });
    expect(getStationStatus({ ai92: yes, ai95: yes, diesel: yes })).toBe("green");
  });

  it('returns "red" when majority fuels are no', () => {
    const no = mkFuel({ no: 3, noW: 2.5, yesW: 0.3 });
    expect(getStationStatus({ ai92: no, ai95: no, diesel: no })).toBe("red");
  });

  it('returns "yellow" when fuels are split', () => {
    const yes = mkFuel({ yes: 3, yesW: 2.5 });
    const no  = mkFuel({ no: 3, noW: 2.5 });
    expect(getStationStatus({ ai92: yes, ai95: no, diesel: no })).toBe("yellow");
  });
});

// ─── nearestStation ───────────────────────────────────────────────────────────

const mkStation = (id: string, lat: number, lng: number): Station => ({
  id, name: id, short: id, brand: "test", brand_id: null,
  position: [lat, lng],
});

describe("nearestStation", () => {
  it("returns empty string for empty list", () => {
    expect(nearestStation([56.0, 37.0], [])).toBe("");
  });

  it("returns the single station when list has one item", () => {
    expect(nearestStation([56.0, 37.0], [mkStation("a", 56.0, 37.0)])).toBe("a");
  });

  it("returns the closest station", () => {
    const stations = [
      mkStation("far",  57.0, 38.0),  // ~130 km away
      mkStation("near", 56.1, 37.0),  // ~11 km away
      mkStation("mid",  56.5, 37.0),  // ~55 km away
    ];
    expect(nearestStation([56.0, 37.0], stations)).toBe("near");
  });
});

// ─── calcRecommended ─────────────────────────────────────────────────────────

describe("calcRecommended", () => {
  it("returns null for empty station list", () => {
    expect(calcRecommended([56.0, 37.0], [], {})).toBeNull();
  });

  it("prefers green station over neutral even if slightly farther", () => {
    const center: [number, number] = [56.0, 37.0];
    const close   = mkStation("close",   56.01, 37.0);  // very close, neutral
    const farGood = mkStation("farGood", 56.05, 37.0);  // farther, green

    const votes = {
      close:   {},
      farGood: { ai92: mkFuel({ yes: 4, no: 0, yesW: 3.5, noW: 0 }) },
    };

    const result = calcRecommended(center, [close, farGood], votes);
    expect(result).toBe("farGood");
  });

  it("excludes unstable stations from recommendation", () => {
    const center: [number, number] = [56.0, 37.0];
    const good     = mkStation("good",     56.01, 37.0);
    const unstable = mkStation("unstable", 56.02, 37.0);

    const votes = {
      good:     { ai92: mkFuel({ yes: 4, yesW: 3.5 }) },
      unstable: { ai92: mkFuel({ yes: 4, yesW: 3.5 }) },
    };

    const unstableIds = new Set(["unstable"]);
    expect(calcRecommended(center, [good, unstable], votes, unstableIds)).toBe("good");
  });
});

// ─── velocityBoost ────────────────────────────────────────────────────────────

function tsAgo(minAgo: number): string {
  return new Date(Date.now() - minAgo * 60 * 1000).toISOString();
}

describe("velocityBoost", () => {
  it("returns 1.0 for fewer than 3 votes", () => {
    expect(velocityBoost([tsAgo(5), tsAgo(1)])).toBe(1.0);
  });

  it("returns 1.6 for 3 votes within 20 minutes", () => {
    expect(velocityBoost([tsAgo(15), tsAgo(8), tsAgo(1)])).toBe(1.6);
  });

  it("returns 1.3 for 3 votes within 45 minutes", () => {
    expect(velocityBoost([tsAgo(40), tsAgo(20), tsAgo(5)])).toBe(1.3);
  });

  it("returns 1.15 for 3 votes within 90 minutes", () => {
    expect(velocityBoost([tsAgo(80), tsAgo(50), tsAgo(10)])).toBe(1.15);
  });

  it("returns 1.0 for votes spread over many hours", () => {
    expect(velocityBoost([tsAgo(300), tsAgo(200), tsAgo(100)])).toBe(1.0);
  });

  it("uses only last 5 votes for span calculation", () => {
    // 6 votes: первый очень старый, последние 5 — быстрые
    const ts = [tsAgo(500), tsAgo(15), tsAgo(10), tsAgo(5), tsAgo(3), tsAgo(1)];
    expect(velocityBoost(ts)).toBe(1.6);
  });
});

// ─── confirmatoryBoost ────────────────────────────────────────────────────────

describe("confirmatoryBoost", () => {
  it("returns 1.0 when no previous votes", () => {
    const vote = { value: "yes", device_id: "B", created_at: tsAgo(0) };
    expect(confirmatoryBoost([], vote)).toBe(1.0);
  });

  it("returns 1.0 when previous vote is same direction", () => {
    const prev = { value: "yes", device_id: "A", created_at: tsAgo(30) };
    const cur  = { value: "yes", device_id: "B", created_at: tsAgo(0)  };
    expect(confirmatoryBoost([prev], cur)).toBe(1.0);
  });

  it("returns 1.5 when opposite vote from different device within 2h", () => {
    const prev = { value: "no",  device_id: "A", created_at: tsAgo(60) };
    const cur  = { value: "yes", device_id: "B", created_at: tsAgo(0)  };
    expect(confirmatoryBoost([prev], cur)).toBe(1.5);
  });

  it("returns 1.0 when opposite vote is older than 2h", () => {
    const prev = { value: "no",  device_id: "A", created_at: tsAgo(150) };
    const cur  = { value: "yes", device_id: "B", created_at: tsAgo(0)   };
    expect(confirmatoryBoost([prev], cur)).toBe(1.0);
  });

  it("returns 1.0 when opposite vote is from the same device", () => {
    const prev = { value: "no",  device_id: "A", created_at: tsAgo(30) };
    const cur  = { value: "yes", device_id: "A", created_at: tsAgo(0)  };
    expect(confirmatoryBoost([prev], cur)).toBe(1.0);
  });

  it("returns 1.0 when opposite vote comes AFTER current vote", () => {
    const future = { value: "no",  device_id: "A", created_at: tsAgo(0)  };
    const cur    = { value: "yes", device_id: "B", created_at: tsAgo(30) };
    expect(confirmatoryBoost([future], cur)).toBe(1.0);
  });
});

// ─── isStationUnstable ────────────────────────────────────────────────────────

describe("isStationUnstable", () => {
  it("returns false for empty vote lists", () => {
    expect(isStationUnstable([])).toBe(false);
  });

  it("returns false when fewer than 3 recent votes", () => {
    const votes = [
      { value: "yes", created_at: tsAgo(10) },
      { value: "no",  created_at: tsAgo(5)  },
    ];
    expect(isStationUnstable([votes])).toBe(false);
  });

  it("returns false when fewer than 3 flips", () => {
    const votes = [
      { value: "yes", created_at: tsAgo(50) },
      { value: "yes", created_at: tsAgo(30) },
      { value: "no",  created_at: tsAgo(10) },
      { value: "yes", created_at: tsAgo(5)  },
    ]; // 2 flips — не нестабильно
    expect(isStationUnstable([votes])).toBe(false);
  });

  it("returns true when 3+ flips within window", () => {
    const votes = [
      { value: "yes", created_at: tsAgo(90) },
      { value: "no",  created_at: tsAgo(70) },
      { value: "yes", created_at: tsAgo(50) },
      { value: "no",  created_at: tsAgo(30) },
      { value: "yes", created_at: tsAgo(10) },
    ]; // 4 флипа
    expect(isStationUnstable([votes])).toBe(true);
  });

  it("returns false when flips are outside the time window", () => {
    const votes = [
      { value: "yes", created_at: tsAgo(600) },
      { value: "no",  created_at: tsAgo(500) },
      { value: "yes", created_at: tsAgo(400) },
      { value: "no",  created_at: tsAgo(300) },
    ]; // 3 флипа но все старше 3 часов
    expect(isStationUnstable([votes])).toBe(false);
  });

  it("triggers on any fuel type being unstable", () => {
    const stable   = [{ value: "yes", created_at: tsAgo(10) }];
    const unstable = [
      { value: "yes", created_at: tsAgo(90) },
      { value: "no",  created_at: tsAgo(70) },
      { value: "yes", created_at: tsAgo(50) },
      { value: "no",  created_at: tsAgo(30) },
      { value: "yes", created_at: tsAgo(10) },
    ];
    expect(isStationUnstable([stable, unstable])).toBe(true);
  });
});

// ─── experienceMultiplier ─────────────────────────────────────────────────────

describe("experienceMultiplier", () => {
  it("returns 0.8 for new device (< 3 votes)", () => {
    expect(experienceMultiplier(0)).toBe(0.8);
    expect(experienceMultiplier(1)).toBe(0.8);
    expect(experienceMultiplier(2)).toBe(0.8);
  });

  it("returns 1.0 for regular user (3–9 votes)", () => {
    expect(experienceMultiplier(3)).toBe(1.0);
    expect(experienceMultiplier(9)).toBe(1.0);
  });

  it("returns 1.2 for experienced user (10+ votes)", () => {
    expect(experienceMultiplier(10)).toBe(1.2);
    expect(experienceMultiplier(50)).toBe(1.2);
  });
});
