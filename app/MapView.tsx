"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// test gas stations
const gasStations = [
  { name: "АЗС Роснефть", position: [56.8587, 35.9176] },
  { name: "АЗС Лукойл", position: [56.8502, 35.9301] },
  { name: "АЗС Газпромнефть", position: [56.8703, 35.8899] },
];

// move map to user
function FlyToUser({ pos }: { pos: [number, number] | null }) {
  const map = useMap();

  if (pos) {
    map.flyTo(pos, 15);
  }

  return null;
}

export default function MapView() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  function findMe() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.log(err);
        alert("геолокация не работает");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {/* button */}
      <button
        onClick={findMe}
        style={{
          position: "absolute",
          zIndex: 999,
          top: 75,
          left: 10,
          padding: "10px 12px",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: "14px",
        }}
      >
        📍 Найти меня
      </button>

      {/* map */}
      <MapContainer
        center={[56.8587, 35.9176]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* gas stations */}
        {gasStations.map((s, i) => (
          <Marker key={i} position={s.position as [number, number]}>
            <Popup>{s.name}</Popup>
          </Marker>
        ))}

        {/* user */}
        {userPos && (
          <Marker position={userPos}>
            <Popup>ты здесь</Popup>
          </Marker>
        )}

        {/* move map */}
        <FlyToUser pos={userPos} />
      </MapContainer>
    </div>
  );
}