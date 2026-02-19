const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    points: Number
  }],
  totalPoints: {
    type: Number,
    default: 0
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Quiz", quizSchema);
