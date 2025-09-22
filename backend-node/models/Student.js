const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  rollno: String,
  email: String,
  password: { type: String, required: true }, // 🔑 new field
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);