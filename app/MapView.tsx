"use client";

import { useState, useEffect } from "react";
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
  { id: "lukoil", name: "Лукойл", position: [56.8585, 35.9115] },
  { id: "rosneft", name: "Роснефть", position: [56.8466, 35.9034] },
  { id: "gazprom", name: "Газпромнефть", position: [56.8728, 35.9210] },
];

type FuelState = {
  ai92: "yes" | "no" | null;
  ai95: "yes" | "no" | null;
  diesel: "yes" | "no" | null;
};

function FlyToUser({ position }: { position: [number, number] | null }) {
  const map = useMap();

  if (position) map.flyTo(position, 15);

  return null;
}

const defaultFuel = (): FuelState => ({
  ai92: null,
  ai95: null,
  diesel: null,
});

export default function MapView() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const [votes, setVotes] = useState<Record<string, FuelState>>({});

  const [status, setStatus] = useState<string | null>(null);

  // загрузка из localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fuel-votes");
    if (saved) setVotes(JSON.parse(saved));
  }, []);

  function saveVotes(newVotes: Record<string, FuelState>) {
    setVotes(newVotes);
    localStorage.setItem("fuel-votes", JSON.stringify(newVotes));
  }

  function findMe() {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserPos([pos.coords.latitude, pos.coords.longitude]);
    });
  }

  function updateFuel(
    stationId: string,
    fuel: keyof FuelState,
    value: "yes" | "no"
  ) {
    const current = votes[stationId] || defaultFuel();

    const updated = {
      ...votes,
      [stationId]: {
        ...current,
        [fuel]: value,
      },
    };

    saveVotes(updated);
  }

  function submitVote(name: string, state: FuelState) {
    console.log("SEND:", name, state);

    setStatus(`✔ ${name}: сохранено`);

    setTimeout(() => setStatus(null), 2000);
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
          const state = votes[s.id] || defaultFuel();

          return (
            <Marker key={s.id} position={s.position as [number, number]}>
              <Popup>
                <div style={{ minWidth: 220, fontFamily: "Arial" }}>
                  <b>{s.name}</b>

                  <hr />

                  {/* топливо */}
                  {[
                    ["ai92", "АИ-92"],
                    ["ai95", "АИ-95"],
                    ["diesel", "ДТ"],
                  ].map(([key, label]) => (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600 }}>{label}</div>

                      <button
                        onClick={() =>
                          updateFuel(s.id, key as keyof FuelState, "yes")
                        }
                        style={{
                          marginRight: 6,
                          background: state[key as keyof FuelState] === "yes"
                            ? "green"
                            : "#ddd",
                          color:
                            state[key as keyof FuelState] === "yes"
                              ? "white"
                              : "black",
                          border: "none",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Есть
                      </button>

                      <button
                        onClick={() =>
                          updateFuel(s.id, key as keyof FuelState, "no")
                        }
                        style={{
                          background:
                            state[key as keyof FuelState] === "no"
                              ? "red"
                              : "#ddd",
                          color:
                            state[key as keyof FuelState] === "no"
                              ? "white"
                              : "black",
                          border: "none",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Нет
                      </button>
                    </div>
                  ))}

                  <hr />

                  <button
                    onClick={() => submitVote(s.name, state)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Отправить
                  </button>

                  {status && (
                    <div style={{ marginTop: 8, color: "green" }}>
                      {status}
                    </div>
                  )}
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