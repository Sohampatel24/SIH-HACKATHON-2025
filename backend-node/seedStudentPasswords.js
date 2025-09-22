const mongoose = require("mongoose");
const Student = require("./models/Student");

const addPasswordsToExistingStudents = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/attendance", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Get all existing students
    const students = await Student.find({});
    console.log(`Found ${students.length} students`);

    // Add default password to each student
    for (const student of students) {
      if (!student.password) {
        student.password = "student123"; // ⚠️ Plaintext password (better: hash with bcrypt)
        await student.save();
        console.log(`Added password to student: ${student.name}`);
      }
    }

    console.log("Password seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

addPasswordsToExistingStudents();