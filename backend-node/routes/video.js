// backend-node/routes/video.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Timetable = require("../models/Timetable");

const upload = multer({ dest: "uploads/" });

// helper
function getTodayInfo() {
  const today = new Date();
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateKey = today.toISOString().split("T")[0];
  return { today, weekday, dateKey };
}

/**
 * GET /status-today
 * Show today's attendance progress (which lectures done/pending)
 */
router.get("/status-today", async (req, res) => {
  try {
    const today = new Date();
    const dateKey = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const weekday = today.toLocaleDateString("en-US", { weekday: "long" });

    // 1. timetable se aaj ke subjects lao
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];

    // 2. attendance check karo
    const records = await Attendance.find({ date: dateKey }).lean();

    const progress = subjectsToday.map((subj, idx) => {
      const done = records.some(
        (rec) => rec.lectureNumber === idx + 1 && rec.subject === subj
      );
      return {
        lectureNumber: idx + 1,
        subject: subj,
        status: done ? "✅ Recorded" : "❌ Pending",
      };
    });

    res.render("statusToday", { progress });
  } catch (err) {
    console.error("Status today error:", err);
    res.status(500).send("Error loading status");
  }
});

/** GET /upload */
router.get("/upload", async (req, res) => {
  try {
    const { weekday, dateKey } = getTodayInfo();
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];

    const doneLectures = await Attendance.distinct("lectureNumber", { date: dateKey });
    const allDone = subjectsToday.length > 0 && doneLectures.length >= subjectsToday.length;

    res.render("upload", { subjectsToday, error: null, allDone });
  } catch (err) {
    console.error("Upload page error:", err);
    res.status(500).send("Error loading upload page");
  }
});

/** POST /upload */
router.post("/upload", upload.single("video"), async (req, res) => {
  let uploadedPath;
  try {
    if (!req.file) return res.status(400).send("No video uploaded");
    uploadedPath = req.file.path;

    const lectureNumber = parseInt(req.body.lectureNumber, 10);
    if (!lectureNumber || lectureNumber < 1 || lectureNumber > 4) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.status(400).send("Please select a valid lecture number (1-4)");
    }

    const { dateKey, weekday } = getTodayInfo();
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];
    const subject = subjectsToday[lectureNumber - 1] || "Unknown";

    const already = await Attendance.findOne({ date: dateKey, lectureNumber, subject });
    if (already) {
      if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
      return res.render("upload", {
        subjectsToday,
        error: "⚠ Attendance for this lecture is already recorded today.",
        allDone: false
      });
    }

    const form = new FormData();
    form.append("file", fs.createReadStream(uploadedPath), { filename: req.file.originalname });
    form.append("sample_fps", req.body.sample_fps || "1.0");
    form.append("min_confidence_frames", req.body.min_frames || "1");

    const pyRes = await axios.post("http://localhost:5002/video_recognize", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 120000
    });

    const result = pyRes.data;

    if (result && result.summary && result.summary.length > 0) {
      for (const s of result.summary) {
        await Attendance.create({
          studentId: s.user,
          subject,
          lectureNumber,
          date: dateKey
        });
      }
    }

    if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    res.render("results", { result, subject, lectureNumber });

  } catch (err) {
    console.error("Video upload error:", err);
    if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    res.status(500).send("Error processing video: " + err.message);
  }
});

/** GET /analysis/today */
router.get("/analysis/today", async (req, res) => {
  try {
    const { weekday, dateKey } = getTodayInfo();
    const todaySchedule = await Timetable.findOne({ day: weekday });
    const subjectsToday = todaySchedule ? todaySchedule.lectures : [];
    const totalLectures = subjectsToday.length;

    const students = await Student.find().lean();
    const attendanceRecords = await Attendance.find({ date: dateKey }).lean();

    const stats = students.map(stu => {
      const attended = attendanceRecords.filter(r => r.studentId === stu.name || r.studentId === stu.rollno);
      const attendedLectures = attended.map(a => ({ lectureNumber: a.lectureNumber, subject: a.subject }));
      const percentage = totalLectures > 0 ? Math.round((attendedLectures.length / totalLectures) * 100) : 0;
      return { student: stu, attendedLectures, percentage };
    });

    const high = stats.filter(s => s.percentage >= 90);
    const low = stats.filter(s => s.percentage < 50);

    res.render("analysis", { dateKey, subjectsToday, stats, high, low });

  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).send("Error loading analysis");
  }
});

/** GET /dashboard */
router.get("/dashboard", async (req, res) => {
  try {
    const { date, lectureNumber } = req.query;
    const query = {};
    if (date) query.date = date;
    if (lectureNumber) query.lectureNumber = parseInt(lectureNumber, 10);

    const records = await Attendance.find(query).sort({ timestamp: -1 }).limit(500).lean();
    res.render("dashboard", { records, filters: { date, lectureNumber } });
  } catch (err) {
    console.error("Dashboard error", err);
    res.status(500).send("Error loading dashboard");
  }
});

module.exports = router;