const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET =
    process.env.ADMIN_SECRET || "YOUR_SECRET_KEY";

const DATA_DIR =
    path.join(__dirname, "data");

const RESULTS_FILE =
    path.join(DATA_DIR, "results.json");

const EVENTS_FILE =
    path.join(DATA_DIR, "proctoring-events.json");

const REGISTRATIONS_FILE =
    path.join(DATA_DIR, "registrations.json");


/* =========================================================
   GMSC SCHEDULE
========================================================= */

const REGISTRATION_START =
    new Date("2026-08-01T00:00:00+05:30");

const REGISTRATION_DEADLINE =
    new Date("2026-09-01T23:59:59+05:30");

const EXAM_START =
    new Date("2026-10-01T00:00:00+05:30");

const EXAM_END =
    new Date("2026-10-01T23:59:59+05:30");

const RESULT_DATE =
    new Date("2026-12-01T00:00:00+05:30");

const EXAM_DURATION_MINUTES = 60;


/* =========================================================
   BASIC SETUP
========================================================= */

app.use(
    express.json({
        limit: "1mb"
    })
);


app.use(
    express.static(__dirname, {
        extensions: ["html"]
    })
);


if (!fs.existsSync(DATA_DIR)) {

    fs.mkdirSync(
        DATA_DIR,
        {
            recursive: true
        }
    );

}


function ensureFile(
    file,
    defaultValue
) {

    if (!fs.existsSync(file)) {

        fs.writeFileSync(
            file,
            JSON.stringify(
                defaultValue,
                null,
                2
            )
        );

    }

}


ensureFile(
    RESULTS_FILE,
    []
);

ensureFile(
    EVENTS_FILE,
    []
);

ensureFile(
    REGISTRATIONS_FILE,
    []
);


/* =========================================================
   DATA HELPERS
========================================================= */

function readJson(file) {

    try {

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch (error) {

        return [];

    }

}


function writeJson(
    file,
    data
) {

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            2
        )
    );

}


function cleanString(
    value,
    maxLength = 200
) {

    if (
        typeof value !==
        "string"
    ) {

        return "";

    }

    return value
        .trim()
        .slice(
            0,
            maxLength
        );

}


/* =========================================================
   QUESTIONS
========================================================= */

const QUESTIONS = [

    {
        id: 1,

        question:
            "Let n be a positive integer such that n² + 3n + 5 is divisible by n + 1. How many possible values of n are there?",

        options: [
            "1",
            "2",
            "3",
            "4"
        ],

        marks: 1
    },


    {
        id: 2,

        question:
            "A 4×4 board is filled with the numbers 1,2,…,16, each used exactly once. What is the maximum possible number of rows and columns whose sums are all equal?",

        options: [
            "4",
            "5",
            "6",
            "7",
            "8"
        ],

        marks: 1
    },


    {
        id: 3,

        question:
            "For positive real numbers a, b, c satisfying a + b + c = 3, find the minimum value of a² + 1/b² + b² + 1/c² + c² + 1/a².",

        options: [
            "2/3",
            "4/9",
            "3",
            "8/27",
            "6"
        ],

        marks: 1
    },


    {
        id: 4,

        question:
            "In triangle ABC, AB = AC. A point D lies on BC such that BD:DC = 1:2. If ∠BAD = 30°, then ∠BAC equals:",

        options: [
            "60°",
            "75°",
            "90°",
            "120°"
        ],

        marks: 1
    },


    {
        id: 5,

        question:
            "How many integers n, 1 ≤ n ≤ 1000, satisfy gcd(n,1000) = 10?",

        options: [
            "80",
            "100",
            "160",
            "200",
            "40"
        ],

        marks: 1
    },


    {
        id: 6,

        question:
            "A particle moves in a circle of radius R with constant speed v. Its acceleration is suddenly doubled while its speed remains unchanged. What happens to the radius of curvature?",

        options: [
            "R/2",
            "R",
            "2R",
            "4R"
        ],

        marks: 1
    },


    {
        id: 7,

        question:
            "A capacitor of capacitance C is charged to potential V and then disconnected from the battery. A dielectric of relative permittivity k is completely inserted between its plates. The new electrostatic energy is:",

        options: [
            "CV²/2",
            "CV²/(2k)",
            "kCV²/2",
            "k²CV²/2"
        ],

        marks: 1
    },


    {
        id: 8,

        question:
            "For the reaction N₂O₄(g) ⇌ 2NO₂(g), the equilibrium constant Kp is fixed at a particular temperature. If the volume of the container is suddenly decreased while temperature remains constant, which statement is correct?",

        options: [
            "Kp increases",
            "Kp decreases",
            "The equilibrium shifts toward N₂O₄",
            "The equilibrium shifts toward NO₂"
        ],

        marks: 1
    },


    {
        id: 9,

        question:
            "For a galvanic cell operating spontaneously under standard conditions, which statement must always be true?",

        options: [
            "E°cell < 0",
            "ΔG° > 0",
            "E°cell > 0",
            "K < 1"
        ],

        marks: 1
    },


    {
        id: 10,

        question:
            "A mutation changes a codon in an mRNA from UGG → UGA. Assuming translation normally proceeds through this codon, what is the most likely consequence?",

        options: [
            "A conservative amino-acid substitution",
            "A silent mutation",
            "Premature termination of translation",
            "A frameshift mutation"
        ],

        marks: 1
    }

];


/* =========================================================
   ANSWER KEY
========================================================= */

const ANSWER_KEY = [

    1,
    2,
    4,
    2,
    0,
    0,
    1,
    2,
    2,
    2

];


/* =========================================================
   ACTIVE EXAM SESSIONS
========================================================= */

const sessions =
    new Map();


/* =========================================================
   REGISTRATION WINDOW
========================================================= */

function registrationIsOpen() {

    const now =
        new Date();

    return (
        now >=
        REGISTRATION_START &&
        now <=
        REGISTRATION_DEADLINE
    );

}


/* =========================================================
   EXAM WINDOW
========================================================= */

function examIsOpen() {

    const now =
        new Date();

    return (
        now >=
        EXAM_START &&
        now <=
        EXAM_END
    );

}


/* =========================================================
   GENERATE IDs
========================================================= */

function generateToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


function generateSubmissionId() {

    return (
        "GMSC-" +
        Date.now()
            .toString(36)
            .toUpperCase() +
        "-" +
        crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()
    );

}


/* =========================================================
   REGISTRATION
========================================================= */

app.post(
    "/api/register",
    (req, res) => {

        if (!registrationIsOpen()) {

            return res.status(403).json({

                success: false,

                message:
                    "GMSC registration is currently closed."

            });

        }


        const name =
            cleanString(
                req.body.name,
                100
            );


        const email =
            cleanString(
                req.body.email,
                150
            );


        const studentId =
            cleanString(
                req.body.studentId,
                100
            );


        if (
            name.length < 2 ||
            !email.includes("@") ||
            !studentId
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please provide a valid name, email and Student ID."

            });

        }


        const registrations =
            readJson(
                REGISTRATIONS_FILE
            );


        const duplicate =
            registrations.find(
                item =>
                    item.studentId
                        .toLowerCase() ===
                    studentId
                        .toLowerCase()
            );


        if (duplicate) {

            return res.status(409).json({

                success: false,

                message:
                    "This Student ID is already registered."

            });

        }


        const registration = {

            registrationId:
                "REG-" +
                crypto
                    .randomBytes(5)
                    .toString("hex")
                    .toUpperCase(),

            name,

            email,

            studentId,

            registeredAt:
                new Date()
                    .toISOString()

        };


        registrations.push(
            registration
        );


        writeJson(
            REGISTRATIONS_FILE,
            registrations
        );


        res.json({

            success: true,

            message:
                "Registration successful.",

            registration

        });

    }
);


/* =========================================================
   PARTICIPANT VERIFICATION
========================================================= */

app.post(
    "/api/participant/verify",
    (req, res) => {

        const studentId =
            cleanString(
                req.body.studentId,
                100
            );


        const email =
            cleanString(
                req.body.email,
                150
            );


        if (
            !studentId ||
            !email
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Student ID and registered email are required."

            });

        }


        const registrations =
            readJson(
                REGISTRATIONS_FILE
            );


        const participant =
            registrations.find(
                item =>

                    item.studentId
                        .toLowerCase() ===
                    studentId
                        .toLowerCase()

                    &&

                    item.email
                        .toLowerCase() ===
                    email
                        .toLowerCase()
            );


        if (!participant) {

            return res.status(401).json({

                success: false,

                message:
                    "Student ID and email do not match a GMSC registration record."

            });

        }


        const open =
            examIsOpen();


        let examMessage;


        if (open) {

            examMessage =
                "The GMSC examination is currently open.";

        }
        else {

            examMessage =
                "The GMSC examination is available only on 1 October 2026 from 12:00 AM to 11:59:59 PM.";

        }


        res.json({

            success: true,

            participant: {

                name:
                    participant.name,

                studentId:
                    participant.studentId,

                email:
                    participant.email

            },

            examOpen:
                open,

            examMessage

        });

    }
);


/* =========================================================
   QUESTIONS API
========================================================= */

app.get(
    "/api/questions",
    (req, res) => {

        res.json({

            success: true,

            questions:
                QUESTIONS

        });

    }
);


/* =========================================================
   START EXAM
========================================================= */

app.post(
    "/api/exam/start",
    (req, res) => {

        if (!examIsOpen()) {

            return res.status(403).json({

                success: false,

                message:
                    "The GMSC examination is not currently open."

            });

        }


        const studentName =
            cleanString(
                req.body.studentName,
                100
            );


        const studentId =
            cleanString(
                req.body.studentId,
                100
            );


        const email =
            cleanString(
                req.body.email,
                150
            );


        const registrations =
            readJson(
                REGISTRATIONS_FILE
            );


        const participant =
            registrations.find(
                item =>

                    item.studentId
                        .toLowerCase() ===
                    studentId
                        .toLowerCase()

                    &&

                    item.email
                        .toLowerCase() ===
                    email
                        .toLowerCase()
            );


        if (!participant) {

            return res.status(401).json({

                success: false,

                message:
                    "Participant is not registered or verified."

            });

        }


        const sessionId =
            crypto.randomUUID();


        const token =
            generateToken();


        const startedAt =
            Date.now();


        const expiresAt =
            startedAt +
            EXAM_DURATION_MINUTES *
            60 *
            1000;


        const session = {

            sessionId,

            token,

            studentName:
                participant.name,

            studentId:
                participant.studentId,

            email:
                participant.email,

            startedAt,

            expiresAt,

            submitted: false,

            violations: []

        };


        sessions.set(
            sessionId,
            session
        );


        res.json({

            success: true,

            sessionId,

            sessionToken:
                token,

            startedAt:
                new Date(
                    startedAt
                ).toISOString(),

            expiresAt:
                new Date(
                    expiresAt
                ).toISOString(),

            durationMinutes:
                EXAM_DURATION_MINUTES

        });

    }
);


/* =========================================================
   EXAM SESSION SECURITY
========================================================= */

function requireExamSession(
    req,
    res,
    next
) {

    const sessionId =
        req.headers[
            "x-exam-session"
        ];


    const token =
        req.headers[
            "x-exam-token"
        ];


    if (
        !sessionId ||
        !token
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Exam session credentials are required."

        });

    }


    const session =
        sessions.get(
            sessionId
        );


    if (!session) {

        return res.status(401).json({

            success: false,

            message:
                "Exam session not found or expired."

        });

    }


    if (
        session.token !==
        token
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Invalid exam session."

        });

    }


    if (
        Date.now() >
        session.expiresAt
    ) {

        sessions.delete(
            sessionId
        );


        return res.status(410).json({

            success: false,

            message:
                "Exam session has expired."

        });

    }


    req.examSession =
        session;


    next();

}


/* =========================================================
   PROCTORING EVENT
========================================================= */

app.post(
    "/api/proctoring/violation",
    requireExamSession,
    (req, res) => {

        const session =
            req.examSession;


        const type =
            cleanString(
                req.body.type,
                100
            );


        const details =
            cleanString(
                req.body.details,
                500
            );


        const event = {

            eventId:
                crypto.randomUUID(),

            sessionId:
                session.sessionId,

            studentId:
                session.studentId,

            type,

            details,

            timestamp:
                new Date()
                    .toISOString()

        };


        session.violations.push(
            event
        );


        const events =
            readJson(
                EVENTS_FILE
            );


        events.push(
            event
        );


        writeJson(
            EVENTS_FILE,
            events
        );


        res.json({

            success: true,

            recorded: true

        });

    }
);


/* =========================================================
   SUBMIT EXAM
========================================================= */

app.post(
    "/api/submit",
    requireExamSession,
    (req, res) => {

        const session =
            req.examSession;


        if (
            session.submitted
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "This examination has already been submitted."

            });

        }


        let answers =
            Array.isArray(
                req.body.answers
            )
                ? req.body.answers
                : [];


        answers =
            QUESTIONS.map(
                (_, index) => {

                    const answer =
                        answers[index];


                    if (
                        Number.isInteger(
                            answer
                        ) &&

                        answer >= 0 &&

                        answer <
                        QUESTIONS[index]
                            .options
                            .length
                    ) {

                        return answer;

                    }


                    return null;

                }
            );


        const reason =
            cleanString(
                req.body.reason ||
                "manual",
                100
            );


        let score = 0;


        let totalMarks =
            QUESTIONS.reduce(
                (
                    total,
                    question
                ) =>
                    total +
                    Number(
                        question.marks ||
                        1
                    ),
                0
            );


        QUESTIONS.forEach(
            (
                question,
                index
            ) => {

                if (
                    answers[index] !== null &&

                    answers[index] ===
                    ANSWER_KEY[index]
                ) {

                    score +=
                        Number(
                            question.marks ||
                            1
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


        const qualifiesForRound2 =
            score ===
            totalMarks;


        const submissionId =
            generateSubmissionId();


        const submittedAt =
            new Date()
                .toISOString();


        const result = {

            submissionId,

            sessionId:
                session.sessionId,

            studentName:
                session.studentName,

            studentId:
                session.studentId,

            email:
                session.email,

            startedAt:
                new Date(
                    session.startedAt
                ).toISOString(),

            submittedAt,

            reason,

            answers,

            score,

            totalMarks,

            percentage,

            qualifiesForRound2,

            violationCount:
                session
                    .violations
                    .length,

            securityEvents:
                session.violations

        };


        const results =
            readJson(
                RESULTS_FILE
            );


        results.push(
            result
        );


        writeJson(
            RESULTS_FILE,
            results
        );


        session.submitted =
            true;


        sessions.delete(
            session.sessionId
        );


        res.json({

            success: true,

            submissionId,

            score,

            totalMarks,

            percentage,

            qualifiesForRound2,

            submittedAt

        });

    }
);


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

function requireAdmin(
    req,
    res,
    next
) {

    const suppliedKey =
        req.headers[
            "x-admin-key"
        ];


    if (
        !suppliedKey ||
        suppliedKey !==
        ADMIN_SECRET
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Invalid administrator key."

        });

    }


    next();

}


/* =========================================================
   ADMIN RESULTS
========================================================= */

app.get(
    "/api/admin/results",
    requireAdmin,
    (req, res) => {

        const results =
            readJson(
                RESULTS_FILE
            );


        res.json({

            success: true,

            results:
                results.map(
                    result => ({

                        submissionId:
                            result.submissionId,

                        studentName:
                            result.studentName,

                        studentId:
                            result.studentId,

                        email:
                            result.email,

                        submittedAt:
                            result.submittedAt,

                        reason:
                            result.reason,

                        score:
                            result.score,

                        totalMarks:
                            result.totalMarks,

                        percentage:
                            result.percentage,

                        qualifiesForRound2:
                            result
                                .qualifiesForRound2,

                        violationCount:
                            result
                                .violationCount

                    })
                )

        });

    }
);


/* =========================================================
   ADMIN DETAILED RESULT
========================================================= */

app.get(
    "/api/admin/results/:submissionId",
    requireAdmin,
    (req, res) => {

        const results =
            readJson(
                RESULTS_FILE
            );


        const result =
            results.find(
                item =>
                    item.submissionId ===
                    req.params
                        .submissionId
            );


        if (!result) {

            return res.status(404).json({

                success: false,

                message:
                    "Submission not found."

            });

        }


        res.json({

            success: true,

            result

        });

    }
);


/* =========================================================
   ADMIN EVENTS
========================================================= */

app.get(
    "/api/admin/events",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            events:
                readJson(
                    EVENTS_FILE
                )

        });

    }
);


/* =========================================================
   ADMIN REGISTRATIONS
========================================================= */

app.get(
    "/api/admin/registrations",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            registrations:
                readJson(
                    REGISTRATIONS_FILE
                )

        });

    }
);


/* =========================================================
   ADMIN STATUS
========================================================= */

app.get(
    "/api/admin/status",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            server:
                "GMSC",

            status:
                "online",

            registrationOpen:
                registrationIsOpen(),

            examOpen:
                examIsOpen(),

            activeSessions:
                sessions.size,

            storedResults:
                readJson(
                    RESULTS_FILE
                ).length,

            registeredParticipants:
                readJson(
                    REGISTRATIONS_FILE
                ).length,

            timestamp:
                new Date()
                    .toISOString()

        });

    }
);


/* =========================================================
   HOMEPAGE
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "API endpoint not found."

            });

        }


        res.status(404).send(
            "GMSC page not found."
        );

    }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "SERVER ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "===================================="
        );
        console.log(
            "        GMSC SERVER ONLINE"
        );
        console.log(
            "===================================="
        );
        console.log(
            `GMSC server running at http://localhost:${PORT}`
        );
        console.log(
            `Questions loaded: ${QUESTIONS.length}`
        );
        console.log(
            `Registration start: ${REGISTRATION_START}`
        );
        console.log(
            `Registration deadline: ${REGISTRATION_DEADLINE}`
        );
        console.log(
            `Exam start: ${EXAM_START}`
        );
        console.log(
            `Exam end: ${EXAM_END}`
        );
        console.log(
            `Result date: ${RESULT_DATE}`
        );
        console.log(
            "===================================="
        );
        console.log("");

    }
);
