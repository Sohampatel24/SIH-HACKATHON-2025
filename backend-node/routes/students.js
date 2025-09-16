const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const Student = require("../models/Student");

const upload = multer({ dest: "uploads/" });

router.get("/enroll", (req, res) => {
  res.render("enroll");
});

// Enroll form handler: saves student in DB and sends photos to python enroll API
router.post("/enroll", upload.array("photos", 5), async (req, res) => { // Changed to "photos" and added limit
  try {
    const { name, rollno, email } = req.body;
    if (!name) return res.status(400).send("Name required");

    // Save student to Mongo
    await Student.create({ name, rollno, email });

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("At least one photo is required");
    }

    // Forward photos to Python enroll API
    const form = new FormData();
    form.append("name", name);
    form.append("rollno", rollno || "");
    for (const f of req.files) {
      form.append("photos", fs.createReadStream(f.path), { filename: f.originalname });
    }

    await axios.post("http://localhost:5001/enroll", form, { 
      headers: form.getHeaders(), 
      maxContentLength: Infinity, 
      maxBodyLength: Infinity 
    });

    // Cleanup temp files
    for (const f of req.files) {
      try {
        fs.unlinkSync(f.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    res.redirect("/upload");
  } catch (err) {
    console.error(err);
    res.status(500).send("Enrollment failed: " + err.message);
  }
});

module.exports = router;