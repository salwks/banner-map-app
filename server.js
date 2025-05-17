// server.js - CommonJS 버전
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// 환경 변수 로드
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 정적 파일 제공 (React 빌드)
app.use(express.static(path.join(__dirname, "build")));

const markerSchema = new mongoose.Schema(
  {
    position: { type: [Number], required: true }, // [lat, lng]
    location: String,
    photo: String,
    status: String,
    problem: { type: Boolean, default: false },
    comments: [String],
  },
  { timestamps: true }
);

const Marker = mongoose.model("Marker", markerSchema);

// TrashMarker schema/model for deleted markers
const trashSchema = new mongoose.Schema(
  {
    position: { type: [Number], required: true },
    location: String,
    photo: String,
    status: String,
    problem: { type: Boolean, default: false },
    comments: [String],
  },
  { timestamps: true }
);
const TrashMarker = mongoose.model("TrashMarker", trashSchema);

// 모든 마커 조회
app.get("/api/markers", async (req, res) => {
  try {
    const markers = await Marker.find();
    res.json(markers);
  } catch (error) {
    console.error("Error fetching markers:", error);
    res.status(500).json({ error: "Failed to fetch markers" });
  }
});

// 마커 생성
app.post("/api/markers", async (req, res) => {
  try {
    const marker = new Marker(req.body);
    await marker.save();
    res.status(201).json(marker);
  } catch (error) {
    console.error("Error creating marker:", error);
    res.status(500).json({ error: "Failed to create marker" });
  }
});

// 마커 수정
app.put("/api/markers/:markerId", async (req, res) => {
  try {
    const updated = await Marker.findByIdAndUpdate(
      req.params.markerId,
      req.body,
      {
        new: true,
      }
    );
    if (!updated) {
      return res.status(404).json({ error: "Marker not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating marker:", error);
    res.status(500).json({ error: "Failed to update marker" });
  }
});

// 마커 삭제: move to TrashMarker before deleting
app.delete("/api/markers/:markerId", async (req, res) => {
  try {
    const marker = await Marker.findById(req.params.markerId);
    if (!marker) {
      return res.status(404).json({ error: "Marker not found" });
    }

    // Copy marker data to TrashMarker
    await TrashMarker.create({
      position: marker.position,
      location: marker.location,
      photo: marker.photo,
      status: marker.status,
      problem: marker.problem,
      comments: marker.comments,
      createdAt: marker.createdAt,
      updatedAt: marker.updatedAt,
    });
    await Marker.findByIdAndDelete(req.params.markerId);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting marker:", error);
    res.status(500).json({ error: "Failed to delete marker" });
  }
});

// 전체 초기화: move all to TrashMarker before deleting
app.delete("/api/markers", async (req, res) => {
  try {
    const markers = await Marker.find();
    if (markers.length > 0) {
      // Prepare data for TrashMarker
      const trashMarkers = markers.map((marker) => ({
        position: marker.position,
        location: marker.location,
        photo: marker.photo,
        status: marker.status,
        problem: marker.problem,
        comments: marker.comments,
        createdAt: marker.createdAt,
        updatedAt: marker.updatedAt,
      }));
      await TrashMarker.insertMany(trashMarkers);
      await Marker.deleteMany({});
    } else {
      await Marker.deleteMany({});
    }
    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting all markers:", error);
    res.status(500).json({ error: "Failed to delete markers" });
  }
});

// API 상태 확인 엔드포인트
app.get("/api/status", (req, res) => {
  res.json({ status: "Server is running", time: new Date().toISOString() });
});

// 모든 다른 GET 요청은 React 앱으로 라우팅
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// MongoDB 연결 (Atlas 또는 로컬)
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/banner-map";
console.log("Connecting to MongoDB...");
console.log(
  "MongoDB URI:",
  MONGODB_URI.replace(
    /mongodb\+srv:\/\/([^:]+):[^@]+@/,
    "mongodb+srv://$1:****@"
  )
);

// MongoDB 연결 옵션 설정
const mongooseOptions = {};

// mongodb+srv:// 프로토콜을 사용하는 경우에만 SSL 옵션 추가
if (MONGODB_URI.startsWith("mongodb+srv://")) {
  // Atlas MongoDB 연결인 경우
  mongooseOptions.ssl = true;
  mongooseOptions.retryWrites = true;
  mongooseOptions.w = "majority";
} else {
  // 로컬 MongoDB 연결인 경우
  mongooseOptions.ssl = false;
}

mongoose
  .connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("MongoDB connected successfully");
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(
        `Server running in ${
          process.env.NODE_ENV || "development"
        } mode on http://localhost:${PORT}`
      );
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    if (MONGODB_URI.startsWith("mongodb+srv://")) {
      console.error(
        "Please check if your IP address is whitelisted in MongoDB Atlas."
      );
    } else {
      console.error("Please check if your local MongoDB server is running.");
    }
    process.exit(1);
  });

// Handle unexpected errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
