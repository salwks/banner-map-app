// src/components/InfoPopup.js
import React, { useState, useEffect } from "react";

export default function InfoPopup({
  marker = {},
  onCreate,
  onUpdate,
  onClose,
  onRemove,
  onProblemChange,
}) {
  // 로컬 상태 관리
  const [localLocation, setLocalLocation] = useState("");
  const [commentText, setCommentText] = useState("");
  const [localProblem, setLocalProblem] = useState(false);

  const isEditable = Boolean(marker.ephemeral);

  // 마커가 변경될 때만 상태 초기화
  useEffect(() => {
    console.log("마커 변경됨: ", marker);
    setLocalLocation(marker.location || "");
    setCommentText("");
    setLocalProblem(marker.problem || false);
  }, [marker.id]); // marker.id가 변경될 때만 실행 (다른 마커로 변경될 때만)

  // 마커 ID가 없으면 렌더링하지 않음
  if (!marker.id) return null;

  // 확인 버튼 클릭 핸들러
  const handleConfirm = () => {
    if (!localLocation.trim()) {
      alert("위치명을 입력해주세요.");
      return;
    }

    const updatedData = {
      location: localLocation,
      problem: localProblem,
    };

    if (isEditable) {
      onCreate(marker.id, updatedData);
    } else {
      onUpdate(marker.id, updatedData);
    }

    onClose();
  };

  // 댓글 등록 핸들러
  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    const comments = marker.comments || [];
    onUpdate(marker.id, { comments: [...comments, commentText] });
    setCommentText("");
  };

  // 문제 상태 변경 핸들러
  const handleProblemChange = (e) => {
    const newProblemValue = e.target.checked;

    // 내부 상태만 업데이트
    setLocalProblem(newProblemValue);

    // 색상 변경을 위해 부모에게 알림
    if (onProblemChange) {
      onProblemChange(marker.id, newProblemValue);
    }
  };

  return (
    <div style={{ minWidth: 240, padding: 10 }}>
      {isEditable ? (
        <div>
          <label htmlFor="marker-text">위치명:</label>
          <input
            id="marker-text"
            value={localLocation}
            onChange={(e) => setLocalLocation(e.target.value)}
            style={{ width: "100%", marginBottom: "8px" }}
          />

          <div style={{ marginBottom: "8px" }}>
            <label>
              <input
                type="checkbox"
                checked={localProblem}
                onChange={handleProblemChange}
              />
              문제 있음
            </label>
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            {onRemove && (
              <button
                onClick={() => onRemove(marker.id)}
                style={{ marginRight: 8 }}
              >
                삭제
              </button>
            )}
            <button onClick={handleConfirm}>확인</button>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ margin: 0 }}>
            <span>{marker.location}</span>
            <span style={{ color: "gray", fontSize: "8pt", marginLeft: 4 }}>
              ({marker.position[0].toFixed(3)}, {marker.position[1].toFixed(3)})
            </span>
          </p>

          <div style={{ marginTop: "4px" }}>
            <label>
              <input
                type="checkbox"
                checked={localProblem}
                onChange={handleProblemChange}
              />
              문제 있음
            </label>
          </div>

          {onRemove && (
            <button
              onClick={() => onRemove(marker.id)}
              style={{ marginTop: 8 }}
            >
              삭제
            </button>
          )}
        </div>
      )}
      <div style={{ marginTop: 12, width: "100%", boxSizing: "border-box" }}>
        {(marker.comments || []).map((c, i) => (
          <p
            key={i}
            style={{
              background: "#f0f0f0",
              padding: "4px",
              borderRadius: "4px",
            }}
          >
            {c}
          </p>
        ))}
        {!isEditable && (
          <div
            style={{
              position: "relative",
              marginTop: 8,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => {
                if (e.charCode === 13) {
                  e.preventDefault();
                  handleCommentSubmit();
                }
              }}
              placeholder="댓글을 입력하세요"
              style={{
                width: "100%",
                paddingRight: "24px",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              title="댓글 등록"
            >
              ⏎
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
