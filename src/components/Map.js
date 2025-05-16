// src/components/Map.js
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { v4 as uuidv4 } from "uuid";
import InfoPopup from "./InfoPopup";
import blueMarker from "leaflet-color-markers/img/marker-icon-blue.png";
import blueMarker2x from "leaflet-color-markers/img/marker-icon-2x-blue.png";
import redMarker from "leaflet-color-markers/img/marker-icon-red.png";
import redMarker2x from "leaflet-color-markers/img/marker-icon-2x-red.png";
import markerShadow from "leaflet-color-markers/img/marker-shadow.png";
// Admin password from environment
const ADMIN_PWD = process.env.REACT_APP_ADMIN_PASSWORD;

// Fix default icon paths for React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const blueIcon = new L.Icon({
  iconUrl: blueMarker,
  iconRetinaUrl: blueMarker2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const redIcon = new L.Icon({
  iconUrl: redMarker,
  iconRetinaUrl: redMarker2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fit map view to a 1km radius
function FitToRadius({ center }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(center[0], center[1]).toBounds(1000);
    map.fitBounds(bounds);
  }, [map, center]);
  return null;
}

// Handle map clicks to add markers, ignore popups/buttons
function AddMarker({ onAdd }) {
  useMapEvents({
    click(e) {
      const tgt = e.originalEvent.target;
      if (tgt.closest(".leaflet-popup") || tgt.closest("button")) return;
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function Map() {
  const [mapCenter, setMapCenter] = useState([37.4979, 127.0276]);
  const [markers, setMarkers] = useState([]);
  const [ephemeralMarkers, setEphemeralMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchText, setSearchText] = useState("");
  const mapRef = useRef(null);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  // Poll persisted markers every 5 seconds
  useEffect(() => {
    const fetchMarkers = () => {
      fetch("http://localhost:4000/api/markers")
        .then((res) => res.json())
        .then((data) => {
          const persisted = data.map((m) => ({
            id: m._id,
            position: m.position,
            location: m.location,
            comments: m.comments || [],
            ephemeral: false,
            problem: m.problem || false,
          }));
          setMarkers([...ephemeralMarkers, ...persisted]);
        });
    };
    fetchMarkers();
    const id = setInterval(fetchMarkers, 5000);
    return () => clearInterval(id);
  }, [ephemeralMarkers]);

  // Add ephemeral marker
  const handleAdd = ({ lat, lng }) => {
    const m = {
      id: uuidv4(),
      position: [lat, lng],
      location: "",
      comments: [],
      ephemeral: true,
      problem: false,
    };
    setEphemeralMarkers((prev) => [...prev, m]);
    setSelectedMarker(m);
  };

  // Create in DB
  const handleCreate = (id, { location }) => {
    const m =
      markers.find((x) => x.id === id) ||
      ephemeralMarkers.find((x) => x.id === id);
    fetch("http://localhost:4000/api/markers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position: m.position,
        location,
        comments: m.comments,
      }),
    })
      .then((r) => r.json())
      .then((saved) => {
        const updated = {
          id: saved._id,
          ...saved,
          ephemeral: false,
          problem: saved.problem ?? false,
        };
        setEphemeralMarkers((prev) => prev.filter((x) => x.id !== id));
        setMarkers((prev) => [...prev, updated]);
        setSelectedMarker(updated);
      });
  };

  // Update in DB
  const handleUpdate = (id, data) => {
    fetch(`http://localhost:4000/api/markers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((u) => {
        const updated = {
          id: u._id,
          ...u,
          ephemeral: false,
          problem: u.problem ?? false,
        };
        setMarkers((prev) => prev.map((x) => (x.id === id ? updated : x)));
        setSelectedMarker(updated);
      });
  };

  // Remove marker
  const handleRemove = (id) => {
    fetch(`http://localhost:4000/api/markers/${id}`, { method: "DELETE" }).then(
      () => {
        setMarkers((prev) => prev.filter((x) => x.id !== id));
        setSelectedMarker(null);
      }
    );
  };

  // Handle coordinate search
  const handleSearch = () => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      alert("검색어를 입력해주세요.");
      return;
    }
    const found = markers.find(
      (m) => m.location && m.location.toLowerCase().includes(keyword)
    );
    if (found) {
      const [lat, lng] = found.position;
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    } else {
      alert(`위치명 에 "${searchText}"를 포함하는 마커가 없습니다.`);
    }
  };

  return (
    <>
      {/* Admin Mode Toggle and Search */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          padding: "8px",
          borderRadius: "4px",
        }}
      >
        <button
          onClick={() => {
            if (!isAdmin) {
              const pwd = window.prompt("관리자 비밀번호를 입력하세요:");
              if (pwd === ADMIN_PWD) setIsAdmin(true);
              else alert("비밀번호가 올바르지 않습니다.");
            } else {
              setIsAdmin(false);
            }
          }}
          title={isAdmin ? "관리자 모드 활성" : "관리자 모드 비활성"}
        >
          <span role="img" aria-label="settings">
            ⚙️
          </span>
        </button>
        {isAdmin && (
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder="위치명 검색"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: "120px", marginRight: 4 }}
            />
            <button onClick={handleSearch}>이동</button>
          </div>
        )}
      </div>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitToRadius center={mapCenter} />
        <AddMarker onAdd={handleAdd} />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={m.position}
            draggable={m.ephemeral}
            icon={m.problem ? redIcon : blueIcon}
            eventHandlers={{
              click: () => setSelectedMarker(m),
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                if (m.ephemeral) {
                  setMarkers((prev) =>
                    prev.map((x) =>
                      x.id === m.id ? { ...x, position: [lat, lng] } : x
                    )
                  );
                  setSelectedMarker((prev) =>
                    prev && prev.id === m.id
                      ? { ...prev, position: [lat, lng] }
                      : prev
                  );
                }
              },
            }}
          >
            {selectedMarker?.id === m.id && (
              <Popup>
                <InfoPopup
                  marker={m}
                  onCreate={handleCreate}
                  onUpdate={handleUpdate}
                  onClose={() => setSelectedMarker(null)}
                  onRemove={m.ephemeral || isAdmin ? handleRemove : undefined}
                />
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
