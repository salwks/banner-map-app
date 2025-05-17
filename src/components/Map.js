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
const ADMIN_PWD =
  process.env.REACT_APP_ADMIN_PASSWORD || "dongtanleejunseok123";

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
  const [persistedMarkers, setPersistedMarkers] = useState([]);
  const [ephemeralMarkers, setEphemeralMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchText, setSearchText] = useState("");
  const mapRef = useRef(null);

  // 모든 마커를 계산 (임시 마커 + 저장된 마커)
  const allMarkers = [...ephemeralMarkers, ...persistedMarkers];

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
      fetch("/api/markers")
        .then((res) => res.json())
        .then((data) => {
          // 기존 ID 목록
          const existingIds = persistedMarkers.map((m) => m.id);

          // 백엔드에서 가져온 마커 매핑
          const fetchedMarkers = data.map((m) => ({
            id: m._id,
            position: m.position,
            location: m.location,
            comments: m.comments || [],
            ephemeral: false,
            problem: m.problem || false,
          }));

          // 기존 마커는 그대로 유지하고 새 마커만 추가하는 전략
          setPersistedMarkers((prev) => {
            // 기존 마커 업데이트
            const updatedMarkers = prev.map((existingMarker) => {
              const updatedMarker = fetchedMarkers.find(
                (m) => m.id === existingMarker.id
              );
              return updatedMarker || existingMarker;
            });

            // 새 마커 추가
            const newMarkers = fetchedMarkers.filter(
              (m) => !existingIds.includes(m.id)
            );

            return [...updatedMarkers, ...newMarkers];
          });
        })
        .catch((err) => {
          console.error("Error fetching markers:", err);
        });
    };

    fetchMarkers();
    const id = setInterval(fetchMarkers, 5000);
    return () => clearInterval(id);
  }, [persistedMarkers]); // persistedMarkers의 ID 목록을 사용하므로 의존성에 추가

  // Add ephemeral marker
  const handleAdd = ({ lat, lng }) => {
    const m = {
      id: uuidv4(), // 임시 ID 생성
      position: [lat, lng],
      location: "",
      comments: [],
      ephemeral: true,
      problem: false,
    };

    // 임시 마커 추가
    setEphemeralMarkers((prev) => [...prev, m]);
    setSelectedMarker(m);
  };

  // Create in DB
  const handleCreate = (id, { location }) => {
    // 해당 ID를 가진 임시 마커 찾기
    const m = ephemeralMarkers.find((x) => x.id === id);

    if (!m) {
      console.error("임시 마커를 찾을 수 없습니다:", id);
      return;
    }

    fetch("/api/markers", {
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
        // 응답에서 저장된 마커의 정보를 가져옴
        const updated = {
          id: saved._id,
          position: saved.position,
          location: saved.location,
          comments: saved.comments || [],
          ephemeral: false,
          problem: saved.problem ?? false,
        };

        // 임시 마커 제거
        setEphemeralMarkers((prev) => prev.filter((x) => x.id !== id));

        // 즉시 저장된 마커 목록에 추가 (중복 방지)
        setPersistedMarkers((prev) => {
          // 이미 동일한 ID의 마커가 있는지 확인
          const exists = prev.some((marker) => marker.id === updated.id);
          if (exists) {
            return prev.map((marker) =>
              marker.id === updated.id ? updated : marker
            );
          } else {
            return [...prev, updated];
          }
        });

        // 선택된 마커 업데이트
        setSelectedMarker(updated);
      })
      .catch((err) => {
        console.error("Error creating marker:", err);
      });
  };

  // Update in DB
  const handleUpdate = (id, data) => {
    fetch(`/api/markers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((u) => {
        const updated = {
          id: u._id,
          position: u.position,
          location: u.location,
          comments: u.comments || [],
          ephemeral: false,
          problem: u.problem ?? false,
        };

        // 로컬 상태 즉시 업데이트
        setPersistedMarkers((prev) =>
          prev.map((x) => (x.id === id ? updated : x))
        );

        // 선택된 마커 업데이트
        setSelectedMarker(updated);
      })
      .catch((err) => {
        console.error("Error updating marker:", err);
      });
  };

  // Remove marker
  const handleRemove = (id) => {
    // 먼저 삭제할 마커가 임시 마커인지 확인
    const isEphemeral = ephemeralMarkers.some((m) => m.id === id);

    if (isEphemeral) {
      // 임시 마커라면 로컬에서만 삭제
      setEphemeralMarkers((prev) => prev.filter((m) => m.id !== id));
      setSelectedMarker(null);
      return;
    }

    // 서버에 저장된 마커라면 API 호출
    fetch(`/api/markers/${id}`, { method: "DELETE" })
      .then((response) => {
        if (response.ok || response.status === 204) {
          // 성공적으로 삭제됨 - 즉시 UI에서 제거
          setPersistedMarkers((prev) => prev.filter((x) => x.id !== id));
          setSelectedMarker(null);
        } else {
          throw new Error(`서버 응답 오류: ${response.status}`);
        }
      })
      .catch((err) => {
        console.error("Error removing marker:", err);

        // 오류 알림
        alert("마커 삭제 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.");
      });
  };

  // Handle coordinate search
  const handleSearch = () => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      alert("검색어를 입력해주세요.");
      return;
    }

    // 모든 마커에서 검색
    const found = allMarkers.find(
      (m) => m.location && m.location.toLowerCase().includes(keyword)
    );

    if (found) {
      const [lat, lng] = found.position;
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    } else {
      alert(`위치명 에 "${searchText}"를 포함하는 마커가 없습니다.`);
    }
  };

  // 마커 드래그 이벤트 처리
  const handleMarkerDrag = (markerId, newPosition) => {
    setEphemeralMarkers((prev) =>
      prev.map((m) =>
        m.id === markerId
          ? { ...m, position: [newPosition.lat, newPosition.lng] }
          : m
      )
    );

    // 선택된 마커도 업데이트
    if (selectedMarker && selectedMarker.id === markerId) {
      setSelectedMarker((prev) => ({
        ...prev,
        position: [newPosition.lat, newPosition.lng],
      }));
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

        {/* 임시 마커 렌더링 */}
        {ephemeralMarkers.map((m) => (
          <Marker
            key={`ephemeral-${m.id}`}
            position={m.position}
            draggable={true}
            icon={m.problem ? redIcon : blueIcon}
            eventHandlers={{
              click: () => setSelectedMarker(m),
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                handleMarkerDrag(m.id, { lat, lng });
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
                  onRemove={handleRemove}
                />
              </Popup>
            )}
          </Marker>
        ))}

        {/* 저장된 마커 렌더링 */}
        {persistedMarkers.map((m) => (
          <Marker
            key={`persisted-${m.id}`}
            position={m.position}
            draggable={false}
            icon={m.problem ? redIcon : blueIcon}
            eventHandlers={{
              click: () => setSelectedMarker(m),
            }}
          >
            {selectedMarker?.id === m.id && (
              <Popup>
                <InfoPopup
                  marker={m}
                  onCreate={handleCreate}
                  onUpdate={handleUpdate}
                  onClose={() => setSelectedMarker(null)}
                  onRemove={isAdmin ? handleRemove : undefined}
                />
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
