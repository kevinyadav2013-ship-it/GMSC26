```javascript
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_KEY =
    process.env.ADMIN_KEY || "GMSC_ADMIN_2026";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));


/* =====================================================
   IN-MEMORY DATA
   ===================================================== */

let registrations = [];
let results = [];
let questions = [
    {
        id: "q1",
        question: "What is 2 + 2?",
        options: [
            "3",
            "4",
            "5",
            "6"
        ],
        correctAnswer: 1,
        marks: 1
    }
];

let securityEvents = [];


/* =====================================================
   ADMIN AUTHENTICATION
   ===================================================== */

function requireAdmin(req, res, next) {

    const key = req.headers["x-admin-key"];

    if (!key || key !== ADMIN_KEY) {

        return res.status(401).json({
            message: "Invalid administrator key."
        });

    }

    next();
}


/* =====================================================
   HOME
   ===================================================== */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});


/* =====================================================
   REGISTRATION
   ===================================================== */

app.post("/api/register", (req, res) => {

    const {
        name,
        studentId,
        email
    } = req.body;

    if (
        !name ||
        !studentId ||
        !email
    ) {

        return res.status(400).json({
            message:
                "Name, Student ID and email are required."
        });

    }


    const existing =
        registrations.find(
            person =>
                person.email.toLowerCase() ===
                String(email).toLowerCase()
        );


    if (existing) {

        return res.status(409).json({
            message:
                "This email is already registered."
        });

    }


    const registration = {

        registrationId:
            "GMSC-" +
            crypto.randomBytes(4)
                .toString("hex")
                .toUpperCase(),

        name:
            String(name).trim(),

        studentId:
            String(studentId).trim(),

        email:
            String(email).trim(),

        registeredAt:
            new Date().toISOString()

    };


    registrations.push(
        registration
    );


    res.status(201).json({

        message:
            "Registration successful.",

        registration

    });

});


/* =====================================================
   ADMIN STATUS / LOGIN CHECK
   ===================================================== */

app.get(
    "/api/admin/status",
    requireAdmin,
    (req, res) => {

        res.json({

            server:
                "GMSC Examination Server",

            status:
                "ONLINE",

            registrationOpen:
                true,

            examOpen:
                false,

            activeSessions:
                0,

            registeredParticipants:
                registrations.length,

            storedResults:
                results.length,

            timestamp:
                new Date().toISOString()

        });

    }
);


/* =====================================================
   ADMIN REGISTRATIONS
   ===================================================== */

app.get(
    "/api/admin/registrations",
    requireAdmin,
    (req, res) => {

        res.json({

            registrations

        });

    }
);


/* =====================================================
   ADMIN RESULTS
   ===================================================== */

app.get(
    "/api/admin/results",
    requireAdmin,
    (req, res) => {

        res.json({

            results

        });

    }
);


/* =====================================================
   QUESTIONS
   ===================================================== */

app.get(
    "/api/questions",
    requireAdmin,
    (req, res) => {

        res.json({

            questions

        });

    }
);


/* =====================================================
   ADD QUESTION
   ===================================================== */

app.post(
    "/api/admin/questions",
    requireAdmin,
    (req, res) => {

        const {
            question,
            options,
            correctAnswer,
            marks
        } = req.body;


        if (
            !question ||
            !Array.isArray(options) ||
            options.length !== 4
        ) {

            return res.status(400).json({

                message:
                    "Question and exactly four options are required."

            });

        }


        if (
            options.some(
                option =>
                    !String(option).trim()
            )
        ) {

            return res.status(400).json({

                message:
                    "All four options are required."

            });

        }


        const numericCorrectAnswer =
            Number(correctAnswer);

        const numericMarks =
            Number(marks);


        if (
            !Number.isInteger(
                numericCorrectAnswer
            ) ||
            numericCorrectAnswer < 0 ||
            numericCorrectAnswer > 3
        ) {

            return res.status(400).json({

                message:
                    "Correct answer must be between 0 and 3."

            });

        }


        if (
            !Number.isFinite(
                numericMarks
            ) ||
            numericMarks < 1
        ) {

            return res.status(400).json({

                message:
                    "Marks must be at least 1."

            });

        }


        const newQuestion = {

            id:
                "q-" +
                crypto.randomBytes(6)
                    .toString("hex"),

            question:
                String(question).trim(),

            options:
                options.map(
                    option =>
                        String(option).trim()
                ),

            correctAnswer:
                numericCorrectAnswer,

            marks:
                numericMarks

        };


        questions.push(
            newQuestion
        );


        res.status(201).json({

            message:
                "Question added successfully.",

            question:
                newQuestion

        });

    }
);


/* =====================================================
   REMOVE QUESTION
   ===================================================== */

app.delete(
    "/api/admin/questions/:id",
    requireAdmin,
    (req, res) => {

        const questionId =
            req.params.id;


        const index =
            questions.findIndex(
                question =>
                    question.id ===
                    questionId
            );


        if (index === -1) {

            return res.status(404).json({

                message:
                    "Question not found."

            });

        }


        questions.splice(
            index,
            1
        );


        res.json({

            message:
                "Question removed successfully."

        });

    }
);


/* =====================================================
   SECURITY EVENTS
   ===================================================== */

app.get(
    "/api/admin/events",
    requireAdmin,
    (req, res) => {

        res.json({

            events:
                securityEvents

        });

    }
);


/* =====================================================
   RECORD SECURITY EVENT
   ===================================================== */

app.post(
    "/api/events",
    (req, res) => {

        const {
            studentId,
            type,
            details
        } = req.body;


        securityEvents.push({

            timestamp:
                new Date().toISOString(),

            studentId:
                studentId || "",

            type:
                type || "UNKNOWN",

            details:
                details || ""

        });


        res.json({

            message:
                "Event recorded."

        });

    }
);


/* =====================================================
   EXAM QUESTIONS FOR STUDENTS
   ===================================================== */

app.get(
    "/api/exam/questions",
    (req, res) => {

        const publicQuestions =
            questions.map(
                question => ({

                    id:
                        question.id,

                    question:
                        question.question,

                    options:
                        question.options,

                    marks:
                        question.marks

                })
            );


        res.json({

            questions:
                publicQuestions

        });

    }
);


/* =====================================================
   SUBMIT EXAM
   ===================================================== */

app.post(
    "/api/exam/submit",
    (req, res) => {

        const {
            studentName,
            studentId,
            answers
        } = req.body;


        if (
            !studentName ||
            !studentId ||
            !Array.isArray(answers)
        ) {

            return res.status(400).json({

                message:
                    "Invalid examination submission."

            });

        }


        let score = 0;
        let totalMarks = 0;


        questions.forEach(
            question => {

                totalMarks +=
                    Number(question.marks);


                const submittedAnswer =
                    answers.find(
                        answer =>
                            answer.questionId ===
                            question.id
                    );


                if (
                    submittedAnswer &&
                    Number(
                        submittedAnswer.answer
                    ) ===
                    Number(
                        question.correctAnswer
                    )
                ) {

                    score +=
                        Number(question.marks);

                }

            }
        );


        const percentage =
            totalMarks > 0
                ? Number(
                    (
                        score /
                        totalMarks *
                        100
                    ).toFixed(2)
                )
                : 0;


        const result = {

            submissionId:
                "SUB-" +
                crypto.randomBytes(5)
                    .toString("hex")
                    .toUpperCase(),

            studentName:
                String(studentName).trim(),

            studentId:
                String(studentId).trim(),

            score,

            totalMarks,

            percentage,

            qualifiesForRound2:
                percentage >= 50,

            submittedAt:
                new Date().toISOString()

        };


        results.push(
            result
        );


        res.status(201).json({

            message:
                "Examination submitted successfully.",

            result

        });

    }
);


/* =====================================================
   FALLBACK
   ===================================================== */

app.use(
    (req, res) => {

        res.status(404).json({

            message:
                "GMSC endpoint not found."

        });

    }
);


/* =====================================================
   START SERVER
   ===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `GMSC server running on http://localhost:${PORT}`
        );

        console.log(
            "Admin key:",
            ADMIN_KEY
        );

    }
);
```

