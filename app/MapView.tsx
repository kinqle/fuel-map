"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// фиксим иконки leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// тестовые АЗС (потом заменим на реальные)
const gasStations = [
  { id: "lukoil", name: "Лукойл", position: [56.8585, 35.9115] },
  { id: "rosneft", name: "Роснефть", position: [56.8466, 35.9034] },
  { id: "gazprom", name: "Газпромнефть", position: [56.8728, 35.9210] },
];

type FuelState = {
  ai92: "yes" | "no" | null;
  ai95: "yes" | "no" | null;
  ai98: "yes" | "no" | null;
  diesel: "yes" | "no" | null;
};

function FlyToUser({ position }: { position: [number, number] | null }) {
  const map = useMap();

  if (position) {
    map.flyTo(position, 15);
  }

  return null;
}

export default function MapView() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const [votes, setVotes] = useState<Record<string, FuelState>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("fuel-votes");
    return saved ? JSON.parse(saved) : {};
  });

  function saveVotes(newVotes: Record<string, FuelState>) {
    setVotes(newVotes);
    localStorage.setItem("fuel-votes", JSON.stringify(newVotes));
  }

  function findMe() {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords: [number, number] = [
        pos.coords.latitude,
        pos.coords.longitude,
      ];
      setUserPos(coords);
    });
  }

  function updateFuel(stationId: string, fuel: keyof FuelState, value: "yes" | "no") {
    const current = votes[stationId] || {
      ai92: null,
      ai95: null,
      ai98: null,
      diesel: null,
    };

    const updated = {
      ...votes,
      [stationId]: {
        ...current,
        [fuel]: value,
      },
    };

    saveVotes(updated);
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

        {gasStations.map((s) => {
          const state = votes[s.id] || {
            ai92: null,
            ai95: null,
            ai98: null,
            diesel: null,
          };

          return (
            <Marker key={s.id} position={s.position as [number, number]}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <b>{s.name}</b>

                  <hr />

                  {(["ai92", "ai95", "ai98", "diesel"] as const).map((fuel) => (
                    <div key={fuel} style={{ marginBottom: 8 }}>
                      <div>{fuel.toUpperCase()}</div>

                      <button
                        onClick={() => updateFuel(s.id, fuel, "yes")}
                        style={{
                          marginRight: 6,
                          background: state[fuel] === "yes" ? "green" : "#ddd",
                          color: state[fuel] === "yes" ? "white" : "black",
                          padding: "4px 8px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Есть
                      </button>

                      <button
                        onClick={() => updateFuel(s.id, fuel, "no")}
                        style={{
                          background: state[fuel] === "no" ? "red" : "#ddd",
                          color: state[fuel] === "no" ? "white" : "black",
                          padding: "4px 8px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Нет
                      </button>
                    </div>
                  ))}

                  <hr />

                  <button
                    onClick={() => console.log(s.name, state)}
                    style={{
                      width: "100%",
                      padding: "6px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Отправить
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

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