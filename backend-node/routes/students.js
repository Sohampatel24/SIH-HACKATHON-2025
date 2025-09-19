const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const Student = require("../models/Student");

const upload = multer({ dest: "uploads/" });

// ---------------- ENROLL ----------------
router.get("/enroll", (req, res) => {
  res.render("enroll");
});

router.post("/enroll", upload.array("photos", 5), async (req, res) => {
  try {
    const { name, rollno, email } = req.body;
    if (!name) return res.status(400).send("Name required");

    // Save student to MongoDB
    await Student.create({ name, rollno, email });

    // Forward photos to Python enroll API
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("At least one photo is required");
    }

    const form = new FormData();
    form.append("name", name);
    form.append("rollno", rollno || "");
    for (const f of req.files) {
      form.append("photos", fs.createReadStream(f.path), {
        filename: f.originalname,
      });
    }

    await axios.post("http://localhost:5001/enroll", form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Cleanup temp files
    for (const f of req.files) {
      try {
        fs.unlinkSync(f.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    res.redirect("/students");
  } catch (err) {
    console.error(err);
    res.status(500).send("Enrollment failed: " + err.message);
  }
});

// ---------------- LIST STUDENTS ----------------
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).lean();
    res.render("students", { students });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading students");
  }
});

// ---------------- DELETE STUDENT ----------------
router.post("/:id/delete", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).send("Student not found");

    // 1. Delete student from DB
    await Student.findByIdAndDelete(req.params.id);

    // 2. Delete embeddings file
    const embPath = path.join(
      __dirname,
      "../../ml-service-python/embeddings",
      `${student.name}.npy`
    );
    if (fs.existsSync(embPath)) fs.unlinkSync(embPath);

    // 3. Delete images folder
    const imgFolder = path.join(
      __dirname,
      "../../ml-service-python/images",
      student.name
    );
    if (fs.existsSync(imgFolder)) {
      fs.rmSync(imgFolder, { recursive: true, force: true });
    }

    res.redirect("/students");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting student: " + err.message);
  }
});

module.exports = router;
