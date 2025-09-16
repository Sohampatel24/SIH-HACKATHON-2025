const mongoose = require("mongoose");
const attendanceSchema = new mongoose.Schema({
  studentId: String,
  timestamp: { type: Date, default: Date.now },
  source: { type: String, default: "video_upload" }
});
module.exports = mongoose.model("Attendance", attendanceSchema);