// src/App.js
import React, { useState, useEffect } from "react";
import Map from "./components/Map";
import "./App.css";

// 개발환경에서는 상대 경로, 프로덕션 환경에서는 설정된 API URL 사용
const isDevelopment = process.env.NODE_ENV === "development";

function App() {
  const [markerCount, setMarkerCount] = useState(0);

  // Poll marker count every 5 seconds
  useEffect(() => {
    const fetchCount = () => {
      // 상대 경로 사용
      fetch("/api/markers")
        .then((res) => res.json())
        .then((data) => setMarkerCount(data.length))
        .catch((err) => {
          console.error("Error fetching markers:", err);
        });
    };
    // Initial fetch
    fetchCount();
    // Poll interval
    const intervalId = setInterval(fetchCount, 5000);
    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="App">
      <div className="email-link-container">
        <a href="mailto:stra2003@gmail.com" className="email-link">
          stra2003@gmail.com
        </a>
        <div className="marker-count">총 현수막 수: {markerCount}</div>
      </div>

      <header>
        <h1 style={{ textAlign: "left" }}>현수막 설치 지도</h1>
      </header>

      <Map />
    </div>
  );
}

export default App;
