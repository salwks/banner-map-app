// src/components/Map.js
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { v4 as uuidv4 } from "uuid";
import InfoPopup from "./InfoPopup";
import AdminControls from "./AdminControls";
import blueMarker from "leaflet-color-markers/img/marker-icon-blue.png";
import blueMarker2x from "leaflet-color-markers/img/marker-icon-2x-blue.png";
import redMarker from "leaflet-color-markers/img/marker-icon-red.png";
import redMarker2x from "leaflet-color-markers/img/marker-icon-2x-red.png";
import markerShadow from "leaflet-color-markers/img/marker-shadow.png";
// Admin password from environment
const ADMIN_PWD = process.env.REACT_APP_ADMIN_PASSWORD;

// 커스텀 아이콘 투명도 설정
function createIcon(iconUrl, iconRetinaUrl, opacity = 1.0) {
  return new L.Icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: `custom-marker-icon opacity-${Math.floor(opacity * 100)}`,
  });
}

// 기본 마커 아이콘
const blueIcon = createIcon(blueMarker, blueMarker2x, 1.0);
const redIcon = createIcon(redMarker, redMarker2x, 1.0);

// 임시 마커 아이콘 (70% 투명도)
const blueIconTemp = createIcon(blueMarker, blueMarker2x, 0.7);
const redIconTemp = createIcon(redMarker, redMarker2x, 0.7);

// Fix default icon paths for React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
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

// CSS 스타일 컴포넌트 - 투명도 스타일을 동적으로 추가
function MarkerOpacityStyles() {
  useEffect(() => {
    // 이미 스타일이 있는지 확인
    if (!document.getElementById("marker-opacity-styles")) {
      const style = document.createElement("style");
      style.id = "marker-opacity-styles";
      style.innerHTML = `
        .opacity-70 {
          opacity: 0.7;
        }
        .opacity-100 {
          opacity: 1.0;
        }
      `;
      document.head.appendChild(style);
    }
    // 컴포넌트 언마운트 시 스타일 제거
    return () => {
      const style = document.getElementById("marker-opacity-styles");
      if (style) {
        style.remove();
      }
    };
  }, []);

  return null;
}

// Handle map clicks to add markers, ignore popups/buttons
function MapClicker({ onAdd, isPopupOpen, addMarkerEnabled, onMapClick }) {
  useMapEvents({
    click(e) {
      const tgt = e.originalEvent.target;

      // 팝업 내부 클릭은 무시
      if (tgt.closest(".leaflet-popup")) {
        return;
      }

      // 팝업이 열려있으면 먼저 닫기
      if (isPopupOpen) {
        onMapClick(); // 팝업 닫기
        return;
      }

      // 마커 추가가 비활성화되어 있으면 새 마커를 추가하지 않음
      if (!addMarkerEnabled) {
        return;
      }

      // 버튼 클릭은 무시
      if (tgt.closest("button")) return;

      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function Map() {
  const [mapCenter, setMapCenter] = useState([37.4979, 127.0276]);
  const [dbMarkers, setDbMarkers] = useState([]); // DB에서 가져온 마커들
  const [tempMarkers, setTempMarkers] = useState([]); // 임시 마커들
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [addMarkerEnabled, setAddMarkerEnabled] = useState(true);

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

  // selectedMarker가 변경될 때 팝업 상태 업데이트
  useEffect(() => {
    setIsPopupOpen(selectedMarker !== null);
  }, [selectedMarker]);

  // 마커 데이터 가져오기
  const fetchMarkers = () => {
    fetch("/api/markers")
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
        setDbMarkers(persisted);
      })
      .catch((err) => console.error("Error fetching markers:", err));
  };

  // 초기 마커 데이터 로드
  useEffect(() => {
    fetchMarkers();

    // 5초마다 마커 데이터 갱신
    const intervalId = setInterval(fetchMarkers, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // 임시 마커 추가
  const handleAddMarker = ({ lat, lng }) => {
    const newMarker = {
      id: uuidv4(),
      position: [lat, lng],
      location: "",
      comments: [],
      ephemeral: true,
      problem: false,
    };

    setTempMarkers((prev) => [...prev, newMarker]);
    setSelectedMarker(newMarker);
    setAddMarkerEnabled(false); // 팝업이 열리면 마커 추가 비활성화
  };

  // DB에 마커 생성
  const handleCreateMarker = (id, { location, problem = false }) => {
    const marker = tempMarkers.find((m) => m.id === id);
    if (!marker) return;

    fetch("/api/markers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position: marker.position,
        location,
        comments: marker.comments || [],
        problem,
      }),
    })
      .then((r) => r.json())
      .then((saved) => {
        // 임시 마커에서 제거
        setTempMarkers((prev) => prev.filter((m) => m.id !== id));

        // 새 DB 마커 생성하지 않고 바로 fetchMarkers 호출
        fetchMarkers();

        // 선택된 마커 제거 (팝업 닫기)
        setSelectedMarker(null);
      })
      .catch((err) => {
        console.error("Error creating marker:", err);
        alert("마커 생성 중 오류가 발생했습니다.");
      });
  };

  // DB 마커 업데이트
  const handleUpdateMarker = (id, data) => {
    fetch(`/api/markers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((updated) => {
        // 업데이트된 마커를 바로 반영하지 않고 fetchMarkers 호출
        fetchMarkers();
      })
      .catch((err) => {
        console.error("Error updating marker:", err);
        alert("마커 업데이트 중 오류가 발생했습니다.");
      });
  };

  // 마커 삭제
  const handleRemoveMarker = (id) => {
    // 임시 마커인 경우
    const tempMarker = tempMarkers.find((m) => m.id === id);
    if (tempMarker) {
      setTempMarkers((prev) => prev.filter((m) => m.id !== id));
      setSelectedMarker(null);
      setAddMarkerEnabled(true);
      return;
    }

    // DB 마커인 경우
    fetch(`/api/markers/${id}`, { method: "DELETE" })
      .then(() => {
        // 삭제된 마커를 바로 반영하지 않고 fetchMarkers 호출
        fetchMarkers();
        setSelectedMarker(null);
        setAddMarkerEnabled(true);
      })
      .catch((err) => {
        console.error("Error removing marker:", err);
        alert("마커 삭제 중 오류가 발생했습니다.");
      });
  };

  // 임시 마커의 problem 상태 변경 처리 (색상만 변경)
  const handleProblemChange = (id, isProblem) => {
    // 임시 마커인지 확인
    const tempMarkerIndex = tempMarkers.findIndex((m) => m.id === id);
    if (tempMarkerIndex >= 0) {
      // 임시 마커일 경우 색상 변경용으로만 problem 값 변경
      const updatedTempMarkers = [...tempMarkers];
      updatedTempMarkers[tempMarkerIndex] = {
        ...updatedTempMarkers[tempMarkerIndex],
        problem: isProblem,
      };

      setTempMarkers(updatedTempMarkers);

      // 선택된 마커도 업데이트 (InfoPopup이 리렌더링되지 않도록 할 필요는 없음)
      if (selectedMarker && selectedMarker.id === id) {
        setSelectedMarker((prev) => ({
          ...prev,
          problem: isProblem,
        }));
      }

      return;
    }

    // DB 마커인 경우 API 호출
    handleUpdateMarker(id, { problem: isProblem });
  };

  // 위치명 검색
  const handleSearch = () => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      alert("검색어를 입력해주세요.");
      return;
    }

    // 모든 마커에서 검색
    const allMarkers = [...tempMarkers, ...dbMarkers];
    const found = allMarkers.find(
      (m) => m.location && m.location.toLowerCase().includes(keyword)
    );

    if (found) {
      const [lat, lng] = found.position;
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      }
    } else {
      alert(`위치명 에 "${searchText}"를 포함하는 마커가 없습니다.`);
    }
  };

  // 팝업 닫기 처리
  const handlePopupClose = () => {
    setSelectedMarker(null);
    setIsPopupOpen(false);
    setAddMarkerEnabled(true); // 팝업이 닫히면 마커 추가 다시 활성화
  };

  // 관리자 모드 토글 처리
  const handleAdminToggle = () => {
    if (!isAdmin) {
      const pwd = window.prompt("관리자 비밀번호를 입력하세요:");
      if (pwd === ADMIN_PWD) setIsAdmin(true);
      else alert("비밀번호가 올바르지 않습니다.");
    } else {
      setIsAdmin(false);
    }
  };

  // 마커 아이콘 선택 함수
  const getMarkerIcon = (marker) => {
    if (marker.ephemeral) {
      // 임시 마커는 70% 투명도
      return marker.problem ? redIconTemp : blueIconTemp;
    } else {
      // 일반 마커는 100% 불투명
      return marker.problem ? redIcon : blueIcon;
    }
  };

  // 모든 마커 (임시 + DB)
  const allMarkers = [...tempMarkers, ...dbMarkers];

  return (
    <>
      {/* 투명도 스타일 적용 */}
      <MarkerOpacityStyles />

      {/* Admin Controls */}
      <AdminControls
        isAdmin={isAdmin}
        searchText={searchText}
        setSearchText={setSearchText}
        onAdminToggle={handleAdminToggle}
        onSearch={handleSearch}
      />
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomleft" />
        <FitToRadius center={mapCenter} />
        <MapClicker
          onAdd={handleAddMarker}
          isPopupOpen={isPopupOpen}
          addMarkerEnabled={addMarkerEnabled}
          onMapClick={handlePopupClose}
        />

        {allMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            draggable={marker.ephemeral}
            icon={getMarkerIcon(marker)}
            opacity={marker.ephemeral ? 0.7 : 1.0} // 임시 마커는 70% 투명도
            eventHandlers={{
              click: () => {
                setSelectedMarker(marker);
                setAddMarkerEnabled(false);
              },
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                if (marker.ephemeral) {
                  setTempMarkers((prev) =>
                    prev.map((m) =>
                      m.id === marker.id ? { ...m, position: [lat, lng] } : m
                    )
                  );

                  if (selectedMarker && selectedMarker.id === marker.id) {
                    setSelectedMarker((prev) => ({
                      ...prev,
                      position: [lat, lng],
                    }));
                  }
                }
              },
            }}
          >
            {selectedMarker?.id === marker.id && (
              <Popup onClose={handlePopupClose}>
                <InfoPopup
                  marker={marker}
                  onCreate={handleCreateMarker}
                  onUpdate={handleUpdateMarker}
                  onClose={handlePopupClose}
                  onRemove={
                    marker.ephemeral || isAdmin ? handleRemoveMarker : undefined
                  }
                  onProblemChange={handleProblemChange}
                />
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
