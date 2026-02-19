// ====================
// Backend: server.js
// ====================

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 5000;

// ====================
// Middleware
// ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ====================
// Email Configuration (Using Gmail - enable "Less secure app access")
// ====================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
});

// Send Email Function
async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: to,
            subject: subject,
            html: html
        });
        return true;
    } catch (error) {
        console.log("Email Error:", error);
        return false;
    }
}

// ====================
// MongoDB Connection
// ====================
mongoose.connect("mongodb://127.0.0.1:27017/studentAssignmentDB")
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ====================
// Import Models
// ====================
const Admin = require("./models/admin");
const Faculty = require("./models/faculty");
const Student = require("./models/student");
const Assignment = require("./models/assingment");
const Quiz = require("./models/quiz");
const QuizAttempt = require("./models/quizAttempt");

// ====================
// Routes (after models are imported)
// ====================
const studentRoutes = require("../routes/student");
app.use("/api/student", studentRoutes);

// ====================
// Schemas & Models (For Submission - define separately)
// ====================
const submissionSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    submissionDate: { type: Date, default: Date.now },
    content: { type: String, required: true },
    status: { type: String, default: "submitted" }
});

const Submission = mongoose.model("Submission", submissionSchema);


// ====================
// Routes
// ====================

// ---- Student Registration ----
app.post("/register", async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        if (!name || !email || !password || !department) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await Student.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({
            name,
            email,
            password: hashedPassword,
            department
        });

        await newStudent.save();

        res.status(201).json({ message: "Registration successful" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


// ---- Student Login ----
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

       res.status(200).json({
    message: "Login successful",
    student: {
        id: student._id,
        name: student.name,
        email: student.email,
        department: student.department
    }
});


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// ---- Faculty: Add Assignment ----
app.post("/faculty/add-assignment", async (req, res) => {
    try {
        const { title, description, deadline, createdBy } = req.body;

        if (!title || !description || !deadline || !createdBy) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newAssignment = new Assignment({
            title,
            description,
            deadline,
            createdBy
        });

        await newAssignment.save();
        res.status(201).json({ message: "Assignment added successfully", newAssignment });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// ---- Faculty: View All Assignments ----
app.get("/faculty/assignments", async (req, res) => {
    try {
        const assignments = await Assignment.find();
        res.status(200).json(assignments);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// ---- Faculty: View Submissions for Assignment ----
app.get("/faculty/submissions/:assignmentId", async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const submissions = await Submission.find({ assignmentId })
            .populate("studentId", "name email department")
            .populate("assignmentId", "title description deadline");

        res.status(200).json(submissions);
    } catch (error) {
        console.log("FACULTY GET SUBMISSIONS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
});

// ---- Student: Submit Assignment ----
app.post("/student/submit-assignment", async (req, res) => {
    try {
        const { studentId, assignmentId, content } = req.body;

        if (!studentId || !assignmentId) {
            return res.status(400).json({ message: "Student ID and Assignment ID are required" });
        }

        const assignmentExists = await Assignment.findById(assignmentId);
        if (!assignmentExists) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        const submission = new Submission({
            studentId,
            assignmentId,
            content: content || "File submission"
        });

        await submission.save();
        res.status(201).json({ message: "Assignment submitted successfully", submissionId: submission._id });

    } catch (error) {
        console.log("SUBMIT ASSIGNMENT ERROR:", error);
        res.status(500).json({ message: error.message });
    }
});

// ---- Student: Get My Submissions ----
app.get("/student/submissions/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;

        const submissions = await Submission.find({ studentId })
            .populate("assignmentId", "title description deadline createdBy")
            .populate("studentId", "name email department");

        res.status(200).json(submissions);
    } catch (error) {
        console.log("GET STUDENT SUBMISSIONS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
});

// ---- Send Assignment Reminders (2 days before deadline) ----
app.post("/admin/send-reminders", async (req, res) => {
    try {
        const now = new Date();
        const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        // Find assignments with deadline in next 2 days
        const assignments = await Assignment.find({
            deadline: { $gte: now, $lte: twoDaysLater }
        });

        let emailsSent = 0;

        for (const assignment of assignments) {
            // Get all students
            const students = await Student.find();

            // Check which students haven't submitted
            for (const student of students) {
                const submitted = await Submission.findOne({
                    studentId: student._id,
                    assignmentId: assignment._id
                });

                if (!submitted) {
                    const emailSubject = `⏰ Reminder: ${assignment.title} Due in 2 Days!`;
                    const emailHtml = `
                        <h2>Assignment Deadline Reminder</h2>
                        <p>Dear ${student.name},</p>
                        <p>This is a reminder that the assignment <strong>${assignment.title}</strong> is due in <strong>2 days</strong>.</p>
                        <p><strong>Deadline:</strong> ${new Date(assignment.deadline).toLocaleString()}</p>
                        <p><strong>Description:</strong> ${assignment.description}</p>
                        <p>Please submit your assignment before the deadline to avoid late submission penalties.</p>
                        <hr>
                        <p><a href="http://localhost:5000/student.html" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
                        <p>Best regards,<br>Student Assignment System</p>
                    `;

                    const sent = await sendEmail(student.email, emailSubject, emailHtml);
                    if (sent) emailsSent++;
                }
            }
        }

        res.status(200).json({ 
            message: `Reminder emails sent to ${emailsSent} students`,
            emailsSent: emailsSent
        });

    } catch (error) {
        console.log("SEND REMINDERS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
});

// ---- Get Assignment Submission Statistics ----
app.get("/faculty/assignment-stats/:assignmentId", async (req, res) => {
    try {
        const { assignmentId } = req.params;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        const totalStudents = await Student.countDocuments();
        const totalSubmissions = await Submission.countDocuments({ assignmentId });
        const notSubmitted = totalStudents - totalSubmissions;

        const submissionDetails = await Submission.find({ assignmentId })
            .populate("studentId", "name email department");

        const submittedStudents = submissionDetails.map(s => s.studentId?.email);

        const notSubmittedStudents = await Student.find({
            email: { $nin: submittedStudents }
        }).select("name email department");

        res.status(200).json({
            assignmentTitle: assignment.title,
            totalStudents,
            totalSubmissions,
            notSubmitted,
            submissionPercentage: ((totalSubmissions / totalStudents) * 100).toFixed(2),
            submissions: submissionDetails,
            notSubmittedList: notSubmittedStudents
        });

    } catch (error) {
        console.log("ASSIGNMENT STATS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
});

//faculty model and registration route

// Faculty Register
app.post("/api/faculty/register", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newFaculty = new Faculty({
      name,
      email,
      password: hashedPassword,
      department
    });

    await newFaculty.save();

    res.status(201).json({ message: "Faculty registered successfully" });

  } catch (error) {
  console.log("FACULTY REGISTER ERROR:", error);
  res.status(500).json({ message: error.message });
}

});

// Faculty Login
app.post("/api/faculty/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      facultyId: faculty._id,
      name: faculty.name,
      department: faculty.department
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin Add Student
app.post("/admin/add-student", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = new Student({ name, email, password: hashedPassword, department });
    await newStudent.save();
    res.status(201).json({ message: "Student added successfully", student: newStudent });

  } catch (error) {
    console.log("ADMIN ADD STUDENT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Add Faculty
app.post("/admin/add-faculty", async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingFaculty = await Faculty.findOne({ email });
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newFaculty = new Faculty({ name, email, password: hashedPassword, department });
    await newFaculty.save();
    res.status(201).json({ message: "Faculty added successfully", faculty: newFaculty });

  } catch (error) {
    console.log("ADMIN ADD FACULTY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Get All Students
app.get("/admin/students", async (req, res) => {
  try {
    const students = await Student.find().select("-password");
    res.status(200).json(students);
  } catch (error) {
    console.log("ADMIN GET STUDENTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Get All Faculty
app.get("/admin/faculty", async (req, res) => {
  try {
    const faculty = await Faculty.find().select("-password");
    res.status(200).json(faculty);
  } catch (error) {
    console.log("ADMIN GET FACULTY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Delete Student
app.delete("/admin/student/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.log("ADMIN DELETE STUDENT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Delete Faculty
app.delete("/admin/faculty/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Faculty.findByIdAndDelete(id);
    res.status(200).json({ message: "Faculty deleted successfully" });
  } catch (error) {
    console.log("ADMIN DELETE FACULTY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin Register
app.post("/api/admin/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword
    });

    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });

  } catch (error) {
    console.log("ADMIN REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      adminId: admin._id,
      name: admin.name
    });

  } catch (error) {
    console.log("ADMIN LOGIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// ====================
// Quiz Routes
// ====================

// Admin: Create Quiz
app.post("/admin/create-quiz", async (req, res) => {
  try {
    const { title, description, questions, timeLimit, createdBy } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Title and questions required" });
    }

    let totalPoints = 0;
    questions.forEach(q => {
      totalPoints += q.points || 1;
    });

    const newQuiz = new Quiz({
      title,
      description,
      questions,
      createdBy,
      timeLimit: timeLimit || 30,
      totalPoints
    });

    await newQuiz.save();
    res.status(201).json({ message: "Quiz created successfully", quiz: newQuiz });

  } catch (error) {
    console.log("CREATE QUIZ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get All Quizzes
app.get("/quizzes", async (req, res) => {
  try {
    const quizzes = await Quiz.find().select("-questions");
    res.status(200).json(quizzes);
  } catch (error) {
    console.log("GET QUIZZES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get Quiz Details with Questions
app.get("/quiz/:quizId", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.log("GET QUIZ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Student: Submit Quiz Answers
app.post("/student/submit-quiz", async (req, res) => {
  try {
    const { studentId, quizId, answers } = req.body;

    if (!studentId || !quizId || !answers) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let totalScore = 0;
    const evaluatedAnswers = answers.map((answer, index) => {
      const question = quiz.questions[index];
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      const pointsEarned = isCorrect ? (question.points || 1) : 0;
      totalScore += pointsEarned;

      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        pointsEarned
      };
    });

    const percentage = (totalScore / quiz.totalPoints * 100).toFixed(2);

    const quizAttempt = new QuizAttempt({
      studentId,
      quizId,
      answers: evaluatedAnswers,
      totalScore,
      percentage,
      endTime: new Date()
    });

    await quizAttempt.save();

    res.status(201).json({
      message: "Quiz submitted successfully",
      score: totalScore,
      totalPoints: quiz.totalPoints,
      percentage: percentage,
      attemptId: quizAttempt._id
    });

  } catch (error) {
    console.log("SUBMIT QUIZ ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Student: Get Quiz Attempts
app.get("/student/quiz-attempts/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const attempts = await QuizAttempt.find({ studentId })
      .populate("quizId", "title totalPoints timeLimit");

    res.status(200).json(attempts);

  } catch (error) {
    console.log("GET QUIZ ATTEMPTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get Quiz Analytics
app.get("/admin/quiz-analytics/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const attempts = await QuizAttempt.find({ quizId })
      .populate("studentId", "name email department");

    const totalStudents = await Student.countDocuments();
    const attemptedStudents = attempts.length;
    const notAttempted = totalStudents - attemptedStudents;

    const scores = attempts.map(a => a.totalScore);
    const avgScore = attempts.length > 0 ? (scores.reduce((a, b) => a + b, 0) / attempts.length).toFixed(2) : 0;
    const maxScore = attempts.length > 0 ? Math.max(...scores) : 0;
    const minScore = attempts.length > 0 ? Math.min(...scores) : 0;

    res.status(200).json({
      quizTitle: quiz.title,
      totalStudents,
      attemptedStudents,
      notAttempted,
      successRate: ((attemptedStudents / totalStudents) * 100).toFixed(2),
      averageScore: avgScore,
      maxScore,
      minScore,
      totalPoints: quiz.totalPoints,
      attempts: attempts
    });

  } catch (error) {
    console.log("QUIZ ANALYTICS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// ====================
// Serve Frontend
// ====================
app.use(express.static(path.join(__dirname, "../frontend")));

// ====================
// Start Server
// ====================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
