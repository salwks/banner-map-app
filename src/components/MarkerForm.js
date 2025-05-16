// src/components/MarkerForm.js
import React, { useState } from "react";

const MarkerForm = ({ addMarker }) => {
  const [lng, setLng] = useState("");
  const [lat, setLat] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState(null);
  const [uploader, setUploader] = useState("");
  const [status, setStatus] = useState("정상");

  const handleSubmit = (e) => {
    e.preventDefault();
    addMarker(parseFloat(lng), parseFloat(lat), {
      location,
      photo,
      uploader,
      status,
    });

    setLng("");
    setLat("");
    setLocation("");
    setPhoto(null);
    setUploader("");
    setStatus("정상");
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
      <div>
        <label>위치명: </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

      <div>
        <label>경도: </label>
        <input value={lng} onChange={(e) => setLng(e.target.value)} required />
      </div>

      <div>
        <label>위도: </label>
        <input value={lat} onChange={(e) => setLat(e.target.value)} required />
      </div>

      <div>
        <label>사진: </label>
        <input
          type="file"
          onChange={(e) => setPhoto(e.target.files[0])}
          required
        />
      </div>

      <div>
        <label>게시자: </label>
        <input value={uploader} onChange={(e) => setUploader(e.target.value)} />
      </div>

      <div>
        <label>상태: </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="정상">정상</option>
          <option value="보수필요">보수필요</option>
        </select>
      </div>

      <button type="submit">마커 추가</button>
    </form>
  );
};

export default MarkerForm;
