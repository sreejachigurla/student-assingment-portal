const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true
  },
  answers: [{
    questionIndex: Number,
    selectedAnswer: Number,
    isCorrect: Boolean,
    pointsEarned: Number
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'in-progress'],
    default: 'completed'
  },
  startTime: Date,
  endTime: Date,
  timeSpent: Number, // in seconds
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
