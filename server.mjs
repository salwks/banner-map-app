// server.mjs
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const markerSchema = new mongoose.Schema(
  {
    position: { type: [Number], required: true }, // [lat, lng]
    location: String,
    photo: String,
    status: String,
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
    comments: [String],
  },
  { timestamps: true }
);
const TrashMarker = mongoose.model("TrashMarker", trashSchema);

// 모든 마커 조회
app.get("/api/markers", async (_req, res) => {
  try {
    const markers = await Marker.find();
    res.json(markers);
  } catch (error) {
    console.error("Error fetching markers:", error);
    res.status(500).json({ error: "서버 오류" });
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
    res.status(500).json({ error: "서버 오류" });
  }
});

// 마커 수정
app.put("/api/markers/:id", async (req, res) => {
  try {
    const updated = await Marker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "마커를 찾을 수 없습니다" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating marker:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 마커 삭제: move to TrashMarker before deleting
app.delete("/api/markers/:id", async (req, res) => {
  try {
    // MongoDB ObjectId 형식이 아닌 UUID 형식인 경우 체크
    const id = req.params.id;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    // 임시 마커(ephemeral)의 경우 MongoDB에 없으므로 바로 성공 응답
    if (!isValidObjectId) {
      return res.sendStatus(204); // No Content - 성공적으로 삭제됨
    }

    const marker = await Marker.findById(id);

    if (!marker) {
      return res.status(404).json({ error: "마커를 찾을 수 없습니다" });
    }

    // Copy marker data to TrashMarker
    await TrashMarker.create({
      position: marker.position,
      location: marker.location,
      photo: marker.photo,
      status: marker.status,
      comments: marker.comments,
      createdAt: marker.createdAt,
      updatedAt: marker.updatedAt,
    });

    await Marker.findByIdAndDelete(id);
    res.sendStatus(204); // No Content - 성공적으로 삭제됨
  } catch (error) {
    console.error("Error deleting marker:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 전체 초기화: move all to TrashMarker before deleting
app.delete("/api/markers", async (_req, res) => {
  try {
    const markers = await Marker.find();
    if (markers.length > 0) {
      // Prepare data for TrashMarker
      const trashMarkers = markers.map((marker) => ({
        position: marker.position,
        location: marker.location,
        photo: marker.photo,
        status: marker.status,
        comments: marker.comments,
        createdAt: marker.createdAt,
        updatedAt: marker.updatedAt,
      }));
      await TrashMarker.insertMany(trashMarkers);
      await Marker.deleteMany();
    } else {
      await Marker.deleteMany();
    }
    res.sendStatus(204);
  } catch (error) {
    console.error("Error clearing markers:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 프로덕션 환경에서 React 앱 제공
if (process.env.NODE_ENV === "production") {
  // 정적 파일 제공
  app.use(express.static(path.join(__dirname, "build")));

  // API 경로가 아닌 모든 요청에 React 앱 제공
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// MongoDB 연결 (MongoDB Atlas 사용)
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/banner-map", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Handle unexpected errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
