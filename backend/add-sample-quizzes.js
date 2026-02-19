require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('./models/quiz');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/student-assignment';

const sampleQuizzes = [
    {
        title: "JavaScript Fundamentals",
        description: "Test your knowledge of JavaScript basics including variables, data types, and functions",
        timeLimit: 20,
        createdBy: "admin@example.com",
        questions: [
            {
                question: "What is the correct way to declare a JavaScript variable?",
                options: ["var x = 5;", "variable x = 5;", "v x = 5;", "declare x = 5;"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "Which method returns the length of a string?",
                options: [".length", ".size", ".count", ".getLength()"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "What is the output of typeof 42?",
                options: ["number", "integer", "float", "numeric"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "How do you create a function in JavaScript?",
                options: ["function myFunc() {}", "function: myFunc() {}", "def myFunc() {}", "func myFunc() {}"],
                correctAnswer: 0,
                points: 5
            }
        ]
    },
    {
        title: "Web Development Basics",
        description: "Learn about HTML, CSS, and web development fundamentals",
        timeLimit: 25,
        createdBy: "admin@example.com",
        questions: [
            {
                question: "What does HTML stand for?",
                options: ["HyperText Markup Language", "High Text Markup Language", "Home Tool Markup Language", "Home Text Markup Language"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "CSS is primarily used for?",
                options: ["Styling web pages", "Creating databases", "Server-side logic", "Mobile development"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "Which tag is used for the largest heading in HTML?",
                options: ["<h1>", "<h6>", "<heading>", "<head1>"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "What is the correct syntax for an external CSS file?",
                options: ["<link rel=\"stylesheet\" href=\"style.css\">", "<style src=\"style.css\">", "<css href=\"style.css\">", "<link css=\"style.css\">"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "Which property is used to change the text color in CSS?",
                options: ["color", "text-color", "font-color", "foreground"],
                correctAnswer: 0,
                points: 5
            }
        ]
    },
    {
        title: "Database & MongoDB",
        description: "Test your knowledge of MongoDB and database concepts",
        timeLimit: 20,
        createdBy: "admin@example.com",
        questions: [
            {
                question: "What is MongoDB?",
                options: ["NoSQL document database", "SQL relational database", "Graph database", "Time-series database"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "In MongoDB, a document is similar to what in SQL?",
                options: ["a row", "a table", "a database", "a schema"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "What is the MongoDB equivalent of a table?",
                options: ["collection", "document", "record", "field"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "Which method is used to insert a document in MongoDB?",
                options: ["insertOne()", "insert()", "add()", "create()"],
                correctAnswer: 0,
                points: 5
            }
        ]
    },
    {
        title: "Node.js & Express",
        description: "Assess your understanding of Node.js and Express framework",
        timeLimit: 20,
        createdBy: "admin@example.com",
        questions: [
            {
                question: "What is Node.js?",
                options: ["JavaScript runtime environment", "A frontend framework", "A database", "A styling library"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "Express.js is a?",
                options: ["Web application framework", "Database tools", "Frontend library", "Mobile framework"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "What does 'npm' stand for?",
                options: ["Node Package Manager", "Node Project Manager", "Network Package Manager", "Node Port Manager"],
                correctAnswer: 0,
                points: 5
            },
            {
                question: "How do you create a simple server in Express?",
                options: ["app.listen(3000)", "server.run(3000)", "app.start(3000)", "express.serve(3000)"],
                correctAnswer: 0,
                points: 5
            }
        ]
    }
];

async function addQuizzes() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('✅ Connected to MongoDB');

        // Clear existing quizzes (optional)
        // await Quiz.deleteMany({});

        let createdCount = 0;
        for (let quiz of sampleQuizzes) {
            // Calculate total points
            quiz.totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 5), 0);

            const newQuiz = new Quiz(quiz);
            await newQuiz.save();
            createdCount++;
            console.log(`✅ Created: "${quiz.title}" (${quiz.totalPoints} points)`);
        }

        console.log(`\n✨ Successfully added ${createdCount} quizzes!`);

        // Show all quizzes
        const allQuizzes = await Quiz.find().select('title totalPoints questions');
        console.log('\n📋 All Quizzes:');
        allQuizzes.forEach((q, idx) => {
            console.log(`${idx + 1}. ${q.title} - ${q.questions.length} questions, ${q.totalPoints} points`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Database connection closed');
    }
}

addQuizzes();
