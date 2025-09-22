const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");

const studentsRoute = require("./routes/students");
const studentAuthRoute = require("./routes/studentAuth");
const professorsRoute = require("./routes/professors");  // ✅ new
const videoRoute = require("./routes/video");
const mentorsRoute = require("./routes/mentors");
const profAuthRoute = require("./routes/profAuth");

const app = express();

// EJS setup
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// Session middleware
app.use(session({
  secret: 'your-secret-key-here-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Make session available to all views
app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "100mb" }));

// MongoDB connect
mongoose
  .connect("mongodb://localhost:27017/attendance", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error", err));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.mentorId) {
    return next();
  } else {
    res.redirect('/mentors/login');
  }
};

// Routes
app.use("/professors", profAuthRoute);
app.use("/students", studentAuthRoute);   
app.use("/students", requireAuth, studentsRoute);
app.use("/professors", requireAuth, professorsRoute);  // ✅ Professors route
app.use("/mentors", mentorsRoute);
app.use("/", requireAuth, videoRoute);

// Root redirect
app.get("/", (req, res) => {
  if (req.session.mentorId) {
    res.redirect("/upload");
  } else if (req.session.studentId) {
    res.redirect("/students/dashboard");
  } else {
    res.redirect("/mentors/login");
  }
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
