const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

const upload = multer({ dest: "uploads/" });

router.get("/upload", async (req, res) => {
  const students = await Student.find().lean();
  res.render("upload", { students });
});

// POST video file -> send to Python video_recognize API -> save attendance entries
router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No video uploaded");
    const { sample_fps, min_frames } = req.body;

    // Prepare form-data to Python
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), { filename: req.file.originalname });
    form.append("sample_fps", sample_fps || "1.0");
    form.append("min_confidence_frames", min_frames || "1");

    const pyRes = await axios.post("http://localhost:5002/video_recognize", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000
    });

    const result = pyRes.data;

    // result.summary -> [{user, count, times}]
    if (result.summary && result.summary.length > 0) {
      for (const s of result.summary) {
        // Save one attendance per detected user (could save more metadata if desired)
        await Attendance.create({ studentId: s.user });
      }
    }

    // cleanup uploaded file
    fs.unlinkSync(req.file.path);

    // show results to user
    res.render("results", { result });
  } catch (err) {
    console.error("Video upload error:", err.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).send("Error processing video: " + err.message);
  }
});

router.get("/dashboard", async (req, res) => {
  const records = await Attendance.find().sort({ timestamp: -1 }).limit(500).lean();
  res.render("dashboard", { records });
});

module.exports = router;