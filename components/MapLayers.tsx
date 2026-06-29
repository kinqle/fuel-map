"use client";
import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import type { Station, VotesMap, City } from "../lib/types";
import { BRAND_COLORS, STATUS_COLORS } from "../lib/constants";
import { getStationStatus, getFuelStatusColor } from "../lib/votes";
import { createStationIcon, createClusterIcon, createUserIcon } from "../lib/mapIcons";

export function MapRefCapture({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap();
  const cb  = useRef(onMap); cb.current = onMap;
  useEffect(() => { cb.current(map); }, [map]);
  return null;
}

export function MarkersLayer({
  stations, selectedId, recommendedId, hoveredId, onSelect, userPos, votes,
}: {
  stations:      Station[];
  selectedId:    string | null;
  recommendedId: string | null;
  hoveredId:     string | null;
  onSelect:      (id: string | null) => void;
  userPos:       [number, number] | null;
  votes:         VotesMap;
}) {
  const map         = useMap();
  const clusterRef  = useRef<L.MarkerClusterGroup | null>(null);
  const stationRefs = useRef<Record<string, L.Marker>>({});
  const userRef     = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius:   80,
      animate:            true,
      animateAddingMarkers: false,
      showCoverageOnHover:  false,
      zoomToBoundsOnClick:  true,
      spiderfyOnMaxZoom:    true,
    });

    stations.forEach((s) => {
      const marker = L.marker(s.position, { icon: createStationIcon(s.short, "neutral", false, false) });
      marker.on("click", (e) => { L.DomEvent.stopPropagation(e); onSelectRef.current(s.id); });
      cluster.addLayer(marker);
      stationRefs.current[s.id] = marker;
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
      stationRefs.current = {};
    };
  }, [map, stations]);

  useEffect(() => {
    stations.forEach((s) => {
      const marker = stationRefs.current[s.id];
      if (!marker) return;
      const sv = votes[s.id] ?? {};
      const status = getStationStatus(sv);
      const fuelColors: [string, string, string] = [
        getFuelStatusColor(sv.ai92),
        getFuelStatusColor(sv.ai95),
        getFuelStatusColor(sv.diesel),
      ];
      const pinColor = BRAND_COLORS[s.brand] ?? STATUS_COLORS[status].bg;
      marker.setIcon(createStationIcon(
        s.short, status,
        s.id === selectedId, s.id === recommendedId, s.id === hoveredId,
        fuelColors, pinColor,
      ));
    });
    clusterRef.current?.refreshClusters();
  }, [map, selectedId, recommendedId, hoveredId, stations, votes]);

  useEffect(() => {
    userRef.current?.remove();
    userRef.current = null;
    if (userPos) {
      const m = L.marker(userPos, { icon: createUserIcon(), zIndexOffset: 1000 });
      m.addTo(map);
      userRef.current = m;
      map.flyTo(userPos, 15, { animate: true, duration: 1 });
    }
    return () => { userRef.current?.remove(); };
  }, [map, userPos]);

  return null;
}

export function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  const map = useMap();
  const cb  = useRef(onMapClick); cb.current = onMapClick;
  useEffect(() => {
    const h = () => cb.current();
    map.on("click", h);
    return () => { map.off("click", h); };
  }, [map]);
  return null;
}

export function CityFlyTo({ city }: { city: City }) {
  const map  = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    if (prev.current === city.id) return;
    prev.current = city.id;
    map.flyTo(city.position, 12, { animate: true, duration: 1.2 });
  }, [city, map]);
  return null;
}

export function MapMoveHandler({ onMove }: { onMove: (c: [number, number]) => void }) {
  const map = useMapEvents({
    moveend: () => { const c = map.getCenter(); onMove([c.lat, c.lng]); },
    zoomend: () => { const c = map.getCenter(); onMove([c.lat, c.lng]); },
  });
  return null;
}
