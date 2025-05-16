// src/App.js
import React, { useState, useEffect } from "react";
import Map from "./components/Map";
import "./App.css";

function App() {
  const [markerCount, setMarkerCount] = useState(0);

  // Poll marker count every 5 seconds
  useEffect(() => {
    const fetchCount = () => {
      fetch("http://localhost:4000/api/markers")
        .then((res) => res.json())
        .then((data) => setMarkerCount(data.length))
        .catch(() => {});
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
        {/* Mail link 바로 아래, 제목과 분리된 마커 카운트 */}
      </div>

      <header>
        <h1 style={{ textAlign: "left" }}>현수막 설치 지도</h1>
      </header>

      <Map />
    </div>
  );
}

export default App;
