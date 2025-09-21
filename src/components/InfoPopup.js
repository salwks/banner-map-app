// src/components/InfoPopup.js
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

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
  const handleProblemChange = (checked) => {
    // 내부 상태만 업데이트
    setLocalProblem(checked);

    // 색상 변경을 위해 부모에게 알림
    if (onProblemChange) {
      onProblemChange(marker.id, checked);
    }
  };

  return (
    <div className="min-w-60 p-4 space-y-4">
      {isEditable ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="marker-text">위치명:</Label>
            <Input
              id="marker-text"
              value={localLocation}
              onChange={(e) => setLocalLocation(e.target.value)}
              placeholder="위치명을 입력하세요"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="problem-checkbox"
              checked={localProblem}
              onCheckedChange={handleProblemChange}
            />
            <Label htmlFor="problem-checkbox">문제 있음</Label>
          </div>

          <div className="flex justify-end space-x-2">
            {onRemove && (
              <Button
                onClick={() => onRemove(marker.id)}
                variant="destructive"
                size="sm"
              >
                삭제
              </Button>
            )}
            <Button onClick={handleConfirm} size="sm">
              확인
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg">{marker.location}</h3>
            <p className="text-gray-500 text-xs">
              ({marker.position[0].toFixed(3)}, {marker.position[1].toFixed(3)})
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="problem-checkbox-view"
              checked={localProblem}
              onCheckedChange={handleProblemChange}
            />
            <Label htmlFor="problem-checkbox-view">문제 있음</Label>
          </div>

          {onRemove && (
            <Button
              onClick={() => onRemove(marker.id)}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              삭제
            </Button>
          )}
        </div>
      )}
      <div className="mt-4 space-y-3">
        {(marker.comments || []).length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">댓글</Label>
            {(marker.comments || []).map((c, i) => (
              <div
                key={i}
                className="bg-gray-100 p-3 rounded-md text-sm"
              >
                {c}
              </div>
            ))}
          </div>
        )}
        {!isEditable && (
          <div className="relative">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => {
                if (e.charCode === 13) {
                  e.preventDefault();
                  handleCommentSubmit();
                }
              }}
              placeholder="댓글을 입력하세요"
              className="pr-12"
            />
            <Button
              size="sm"
              className="absolute right-1 top-1 h-8 px-2"
              onClick={handleCommentSubmit}
            >
              +
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
