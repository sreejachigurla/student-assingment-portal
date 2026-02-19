const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Student = require("../backend/models/student");

// ====================
// Register Student
// POST /api/student/register
// ====================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, course } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      name,
      email,
      password: hashedPassword,
      course
    });

    await newStudent.save();
    res.status(201).json({ message: "Student registered successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ====================
// Get All Students
// GET /api/student/all
// ====================
router.get("/all", async (req, res) => {
  try {
    const students = await Student.find().select("-password");
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ====================
// Delete Student
// DELETE /api/student/:id
// ====================
router.delete("/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
