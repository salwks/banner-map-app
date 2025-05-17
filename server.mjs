// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

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
app.get("/api/markers", async (_req, res) => {
  const markers = await Marker.find();
  res.json(markers);
});

// 마커 생성
app.post("/api/markers", async (req, res) => {
  const marker = new Marker(req.body);
  await marker.save();
  res.status(201).json(marker);
});

// 마커 수정
app.put("/api/markers/:id", async (req, res) => {
  const updated = await Marker.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(updated);
});

// 마커 삭제: move to TrashMarker before deleting
app.delete("/api/markers/:id", async (req, res) => {
  const marker = await Marker.findById(req.params.id);
  if (marker) {
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
    await Marker.findByIdAndDelete(req.params.id);
  }
  res.sendStatus(204);
});

// 전체 초기화: move all to TrashMarker before deleting
app.delete("/api/markers", async (_req, res) => {
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
    await Marker.deleteMany();
  } else {
    await Marker.deleteMany();
  }
  res.sendStatus(204);
});

// MongoDB 연결 (필요에 따라 Atlas URI로 변경하세요)
mongoose
  .connect("mongodb://localhost:27017/banner-map", {
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
