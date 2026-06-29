export type Theme = "dark" | "light";
export type FuelId = "ai92" | "ai95" | "diesel";
export type VoteValue = "yes" | "no";
export type MarkerStatus = "green" | "yellow" | "red" | "neutral";

export interface Station {
  id:       string;
  name:     string;
  short:    string;
  brand:    string;
  position: [number, number];
  city?:    string;
  address?: string;
}

export interface StationRow {
  id:       string;
  name:     string;
  brand:    string | null;
  brand_id: string | null;
  short:    string;
  lat:      number;
  lng:      number;
  address:  string | null;
  city:     string;
}

export interface City {
  id:       string;
  name:     string;
  position: [number, number];
}

export interface FuelVotes {
  yes:    number;
  no:     number;
  yesW:   number;
  noW:    number;
  myVote: VoteValue | null;
  lastAt: string | null;
}

export type VotesMap = Record<string, Partial<Record<FuelId, FuelVotes>>>;

export interface VoteRow {
  station_id: string;
  fuel:       string;
  value:      string;
  device_id:  string;
  created_at: string;
}

export interface RecentVote {
  fuel:  FuelId;
  value: VoteValue;
  at:    string;
  mine:  boolean;
}

export type RecentMap = Record<string, RecentVote[]>;

export interface Filters {
  fuels:       Set<FuelId>;
  brands:      Set<string>;
  nearbyOnly:  boolean;
  inStockOnly: boolean;
}

export interface Comment {
  id:          string;
  station_id:  string;
  device_id:   string;
  author_name: string;
  category:    string;
  body:        string | null;
  created_at:  string;
  likes:       number;
  reports:     number;
  myLike:      boolean;
  myReport:    boolean;
}
