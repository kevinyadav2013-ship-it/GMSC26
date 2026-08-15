const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = 3000;
const ADMIN_KEY = "GMSC_ADMIN_2026";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));


/* =====================================================
   DATA
===================================================== */

let registrations = [];

let results = [];

let securityEvents = [];

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


/* =====================================================
   ADMIN AUTHENTICATION
===================================================== */

function requireAdmin(req, res, next) {

    const key = req.headers["x-admin-key"];

    if (key !== ADMIN_KEY) {

        return res.status(401).json({
            message: "Invalid administrator key."
        });

    }

    next();
}


/* =====================================================
   HOME
===================================================== */

app.get("/", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


/* =====================================================
   REGISTRATION
===================================================== */

app.post("/api/register", function(req, res) {

    const name =
        String(req.body.name || "").trim();

    const studentId =
        String(req.body.studentId || "").trim();

    const email =
        String(req.body.email || "").trim();


    if (!name || !studentId || !email) {

        return res.status(400).json({
            message:
                "Name, Student ID and email are required."
        });

    }


    const alreadyRegistered =
        registrations.find(function(person) {

            return (
                person.email.toLowerCase() ===
                email.toLowerCase()
            );

        });


    if (alreadyRegistered) {

        return res.status(409).json({
            message:
                "This email is already registered."
        });

    }


    const registration = {

        registrationId:
            "GMSC-" +
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase(),

        name: name,

        studentId: studentId,

        email: email,

        registeredAt:
            new Date().toISOString()

    };


    registrations.push(
        registration
    );


    res.status(201).json({

        message:
            "Registration successful.",

        registration:
            registration

    });

});


/* =====================================================
   ADMIN STATUS
===================================================== */

app.get(
    "/api/admin/status",
    requireAdmin,
    function(req, res) {

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
    function(req, res) {

        res.json({

            registrations:
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
    function(req, res) {

        res.json({

            results:
                results

        });

    }
);


/* =====================================================
   QUESTIONS - GET
===================================================== */

app.get(
    "/api/questions",
    requireAdmin,
    function(req, res) {

        res.json({

            questions:
                questions

        });

    }
);


/* =====================================================
   QUESTIONS - ADD
===================================================== */

app.post(
    "/api/admin/questions",
    requireAdmin,
    function(req, res) {

        const question =
            String(
                req.body.question || ""
            ).trim();

        const options =
            req.body.options;

        const correctAnswer =
            Number(
                req.body.correctAnswer
            );

        const marks =
            Number(
                req.body.marks
            );


        if (!question) {

            return res.status(400).json({
                message:
                    "Question is required."
            });

        }


        if (
            !Array.isArray(options) ||
            options.length !== 4
        ) {

            return res.status(400).json({
                message:
                    "Exactly four options are required."
            });

        }


        for (
            let i = 0;
            i < options.length;
            i++
        ) {

            if (
                !String(
                    options[i] || ""
                ).trim()
            ) {

                return res.status(400).json({
                    message:
                        "All four options are required."
                });

            }

        }


        if (
            !Number.isInteger(correctAnswer) ||
            correctAnswer < 0 ||
            correctAnswer > 3
        ) {

            return res.status(400).json({
                message:
                    "Correct answer must be between 0 and 3."
            });

        }


        if (
            !Number.isFinite(marks) ||
            marks < 1
        ) {

            return res.status(400).json({
                message:
                    "Marks must be at least 1."
            });

        }


        const newQuestion = {

            id:
                "q-" +
                crypto
                    .randomBytes(6)
                    .toString("hex"),

            question:
                question,

            options:
                options.map(function(option) {

                    return String(
                        option
                    ).trim();

                }),

            correctAnswer:
                correctAnswer,

            marks:
                marks

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
   QUESTIONS - REMOVE
===================================================== */

app.delete(
    "/api/admin/questions/:id",
    requireAdmin,
    function(req, res) {

        const questionId =
            req.params.id;


        const index =
            questions.findIndex(
                function(question) {

                    return (
                        question.id ===
                        questionId
                    );

                }
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
   SECURITY EVENTS - GET
===================================================== */

app.get(
    "/api/admin/events",
    requireAdmin,
    function(req, res) {

        res.json({

            events:
                securityEvents

        });

    }
);


/* =====================================================
   SECURITY EVENT - ADD
===================================================== */

app.post(
    "/api/events",
    function(req, res) {

        const event = {

            timestamp:
                new Date().toISOString(),

            studentId:
                String(
                    req.body.studentId || ""
                ),

            type:
                String(
                    req.body.type || "UNKNOWN"
                ),

            details:
                String(
                    req.body.details || ""
                )

        };


        securityEvents.push(
            event
        );


        res.json({

            message:
                "Security event recorded."

        });

    }
);


/* =====================================================
   EXAM QUESTIONS
===================================================== */

app.get(
    "/api/exam/questions",
    function(req, res) {

        const publicQuestions =
            questions.map(
                function(question) {

                    return {

                        id:
                            question.id,

                        question:
                            question.question,

                        options:
                            question.options,

                        marks:
                            question.marks

                    };

                }
            );


        res.json({

            questions:
                publicQuestions

        });

    }
);


/* =====================================================
   EXAM SUBMISSION
===================================================== */

app.post(
    "/api/exam/submit",
    function(req, res) {

        const studentName =
            String(
                req.body.studentName || ""
            ).trim();

        const studentId =
            String(
                req.body.studentId || ""
            ).trim();

        const answers =
            req.body.answers;


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
            function(question) {

                totalMarks +=
                    Number(
                        question.marks
                    );


                const submitted =
                    answers.find(
                        function(answer) {

                            return (
                                answer.questionId ===
                                question.id
                            );

                        }
                    );


                if (
                    submitted &&
                    Number(
                        submitted.answer
                    ) ===
                    Number(
                        question.correctAnswer
                    )
                ) {

                    score +=
                        Number(
                            question.marks
                        );

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
                crypto
                    .randomBytes(5)
                    .toString("hex")
                    .toUpperCase(),

            studentName:
                studentName,

            studentId:
                studentId,

            score:
                score,

            totalMarks:
                totalMarks,

            percentage:
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

            result:
                result

        });

    }
);


/* =====================================================
   404
===================================================== */

app.use(
    function(req, res) {

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
    function() {

        console.log(
            "GMSC server running on http://localhost:" +
            PORT
        );

        console.log(
            "Administrator key: " +
            ADMIN_KEY
        );

    }
);

