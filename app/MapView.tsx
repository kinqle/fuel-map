"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const gasStations = [
  {
    name: "Лукойл",
    position: [56.8585, 35.9115],
    fuel: {
      ai92: true,
      ai95: true,
      diesel: true,
    },
    updated: "22.06.2026 22:40",
  },
  {
    name: "Роснефть",
    position: [56.8466, 35.9034],
    fuel: {
      ai92: true,
      ai95: false,
      diesel: true,
    },
    updated: "22.06.2026 22:35",
  },
  {
    name: "Газпромнефть",
    position: [56.8728, 35.9210],
    fuel: {
      ai92: true,
      ai95: true,
      diesel: false,
    },
    updated: "22.06.2026 22:31",
  },
];

function FlyToUser({
  position,
}: {
  position: [number, number] | null;
}) {
  const map = useMap();

  if (position) {
    map.flyTo(position, 15);
  }

  return null;
}

export default function MapView() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  function findMe() {
    navigator.geolocation.getCurrentPosition((pos) => {
      console.log(
        "lat:",
        pos.coords.latitude,
        "lng:",
        pos.coords.longitude,
        "accuracy:",
        pos.coords.accuracy
      );

      const coords: [number, number] = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];

      setUserPos(coords);
    });
  }

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <button
        onClick={findMe}
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 70,
          left: 10,
          padding: "10px 14px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          background: "#2563eb",
          color: "white",
          fontWeight: "bold",
        }}
      >
        📍 Найти меня
      </button>

      <MapContainer
        center={[56.8587, 35.9176]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {gasStations.map((s, i) => (
          <Marker
            key={i}
            position={s.position as [number, number]}
          >
            <Popup>
              <div>
                <b>{s.name}</b>

                <br />
                <br />

                АИ-92: {s.fuel.ai92 ? "✅ Есть" : "❌ Нет"}

                <br />

                АИ-95: {s.fuel.ai95 ? "✅ Есть" : "❌ Нет"}

                <br />

                ДТ: {s.fuel.diesel ? "✅ Есть" : "❌ Нет"}

                <br />
                <br />

                Обновлено:
                <br />
                {s.updated}

                <br />
                <br />

                <button
                  style={{
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  Подтвердить наличие
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {userPos && (
          <Marker position={userPos}>
            <Popup>Ты здесь</Popup>
          </Marker>
        )}

        <FlyToUser position={userPos} />
      </MapContainer>
    </div>
  );
}