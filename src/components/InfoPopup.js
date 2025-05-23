// src/components/InfoPopup.js
import React, { useState, useEffect } from "react";

export default function InfoPopup({
  marker = {},
  onCreate,
  onUpdate,
  onClose,
  onRemove,
}) {
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState("");
  const isEditable = Boolean(marker.ephemeral);

  useEffect(() => {
    setText(marker.location || "");
    setCommentText("");
  }, [marker]);

  if (!marker.id) return null;

  const handleConfirm = () => {
    if (!text.trim()) {
      alert("위치명을 입력해주세요.");
      return;
    }
    if (isEditable) onCreate(marker.id, { location: text });
    else onUpdate(marker.id, { location: text });
    onClose();
  };

  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    const comments = marker.comments || [];
    onUpdate(marker.id, { comments: [...comments, commentText] });
    setCommentText("");
  };

  return (
    <div style={{ minWidth: 240, padding: 10 }}>
      {isEditable ? (
        <div>
          <label htmlFor="marker-text">위치명:</label>
          <input
            id="marker-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%" }}
          />
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
            {/* 입력박스 우측 글리프 */}
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
