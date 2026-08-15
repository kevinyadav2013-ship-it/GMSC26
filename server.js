const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "YOUR_SECRET_KEY";

const DATA_DIR = path.join(__dirname, "data");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const EVENTS_FILE = path.join(DATA_DIR, "proctoring-events.json");

const EXAM_DURATION_MINUTES = 60;


/* =========================================================
   BASIC SETUP
========================================================= */

app.use(express.json({ limit: "1mb" }));

app.use(
    express.static(__dirname, {
        extensions: ["html"]
    })
);


if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}


function ensureFile(file, defaultValue) {

    if (!fs.existsSync(file)) {
        fs.writeFileSync(
            file,
            JSON.stringify(defaultValue, null, 2)
        );
    }

}


ensureFile(RESULTS_FILE, []);
ensureFile(EVENTS_FILE, []);


/* =========================================================
   DATA HELPERS
========================================================= */

function readJson(file) {

    try {

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );

    } catch (error) {

        return [];

    }

}


function writeJson(file, data) {

    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2)
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
        options: ["1", "2", "3", "4"],
        marks: 1
    },

    {
        id: 2,
        question:
            "A 4×4 board is filled with the numbers 1,2,…,16, each used exactly once. What is the maximum possible number of rows and columns whose sums are all equal?",
        options: ["4", "5", "6", "7", "8"],
        marks: 1
    },

    {
        id: 3,
        question:
            "For positive real numbers a, b, c satisfying a + b + c = 3, find the minimum value of a² + 1/b² + b² + 1/c² + c² + 1/a².",
        options: ["2/3", "4/9", "3", "8/27", "6"],
        marks: 1
    },

    {
        id: 4,
        question:
            "In triangle ABC, AB = AC. A point D lies on BC such that BD:DC = 1:2. If ∠BAD = 30°, then ∠BAC equals:",
        options: ["60°", "75°", "90°", "120°"],
        marks: 1
    },

    {
        id: 5,
        question:
            "How many integers n, 1 ≤ n ≤ 1000, satisfy gcd(n,1000) = 10?",
        options: ["80", "100", "160", "200", "40"],
        marks: 1
    },

    {
        id: 6,
        question:
            "A particle moves in a circle of radius R with constant speed v. Its acceleration is suddenly doubled while its speed remains unchanged. What happens to the radius of curvature?",
        options: ["R/2", "R", "2R", "4R"],
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
   IN-MEMORY ACTIVE SESSIONS
========================================================= */

const sessions = new Map();


/* =========================================================
   SECURITY HELPERS
========================================================= */

function generateToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


function generateSubmissionId() {

    return (
        "GMSC-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()
    );

}


function cleanString(value, maxLength = 200) {

    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .slice(0, maxLength);

}


function requireExamSession(req, res, next) {

    const sessionId =
        req.headers["x-exam-session"];

    const token =
        req.headers["x-exam-token"];


    if (!sessionId || !token) {

        return res.status(401).json({
            success: false,
            message: "Exam session credentials are required."
        });

    }


    const session =
        sessions.get(sessionId);


    if (!session) {

        return res.status(401).json({
            success: false,
            message: "Exam session not found or expired."
        });

    }


    if (session.token !== token) {

        return res.status(401).json({
            success: false,
            message: "Invalid exam session."
        });

    }


    if (Date.now() > session.expiresAt) {

        sessions.delete(sessionId);

        return res.status(410).json({
            success: false,
            message: "Exam session has expired."
        });

    }


    req.examSession = session;

    next();

}


/* =========================================================
   QUESTIONS API
========================================================= */

app.get("/api/questions", (req, res) => {

    res.json({
        success: true,
        questions: QUESTIONS
    });

});


/* =========================================================
   START EXAM
========================================================= */

app.post("/api/exam/start", (req, res) => {

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


    if (studentName.length < 2) {

        return res.status(400).json({
            success: false,
            message: "Valid student name is required."
        });

    }


    if (!studentId) {

        return res.status(400).json({
            success: false,
            message: "Student ID is required."
        });

    }


    if (!email.includes("@")) {

        return res.status(400).json({
            success: false,
            message: "Valid email is required."
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

        studentName,

        studentId,

        email,

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

        sessionToken: token,

        startedAt:
            new Date(startedAt)
                .toISOString(),

        expiresAt:
            new Date(expiresAt)
                .toISOString(),

        durationMinutes:
            EXAM_DURATION_MINUTES

    });

});


/* =========================================================
   PROCTORING / SECURITY EVENT
========================================================= */

app.post(
    "/api/proctoring/violation",
    requireExamSession,
    (req, res) => {

        const session =
            req.examSession;


        if (session.submitted) {

            return res.status(400).json({
                success: false,
                message: "Exam already submitted."
            });

        }


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
            readJson(EVENTS_FILE);


        events.push(event);


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


        if (session.submitted) {

            return res.status(409).json({
                success: false,
                message: "This examination has already been submitted."
            });

        }


        let answers =
            Array.isArray(req.body.answers)
                ? req.body.answers
                : [];


        /*
         * Only accept the number of answers
         * corresponding to the actual exam.
         */

        answers =
            QUESTIONS.map(
                (_, index) => {

                    const answer =
                        answers[index];

                    if (
                        Number.isInteger(answer) &&
                        answer >= 0 &&
                        answer <
                        QUESTIONS[index].options.length
                    ) {

                        return answer;

                    }

                    return null;

                }
            );


        const reason =
            cleanString(
                req.body.reason || "manual",
                100
            );


        /*
         * IMPORTANT:
         * The answer key is deliberately not placed
         * in the browser. Add the real answer key
         * here when you are ready to activate scoring.
         *
         * Example:
         *
         * const ANSWER_KEY = [
         *     1, 2, 0, ...
         * ];
         *
         * Until then, the server records the answers
         * without inventing a score.
         */

        const ANSWER_KEY = null;


        let score = null;
        let totalMarks = 0;
        let percentage = null;


        if (Array.isArray(ANSWER_KEY)) {

            score = 0;


            QUESTIONS.forEach(
                (question, index) => {

                    totalMarks +=
                        Number(question.marks || 1);


                    if (
                        answers[index] !== null &&
                        answers[index] ===
                        ANSWER_KEY[index]
                    ) {

                        score +=
                            Number(
                                question.marks || 1
                            );

                    }

                }
            );


            percentage =
                totalMarks > 0
                    ? Number(
                        (
                            score /
                            totalMarks *
                            100
                        ).toFixed(2)
                    )
                    : 0;

        }
        else {

            totalMarks =
                QUESTIONS.reduce(
                    (sum, q) =>
                        sum +
                        Number(q.marks || 1),
                    0
                );

        }


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

            violationCount:
                session.violations.length,

            securityEvents:
                session.violations

        };


        const results =
            readJson(RESULTS_FILE);


        results.push(result);


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

            submittedAt

        });

    }
);


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

function requireAdmin(req, res, next) {

    const suppliedKey =
        req.headers["x-admin-key"];


    if (
        !suppliedKey ||
        suppliedKey !== ADMIN_SECRET
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
            readJson(RESULTS_FILE);


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

                        violationCount:
                            result.violationCount

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
            readJson(RESULTS_FILE);


        const result =
            results.find(
                item =>
                    item.submissionId ===
                    req.params.submissionId
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
   ADMIN SECURITY EVENTS
========================================================= */

app.get(
    "/api/admin/events",
    requireAdmin,
    (req, res) => {

        const events =
            readJson(EVENTS_FILE);


        res.json({

            success: true,

            events

        });

    }
);


/* =========================================================
   ADMIN HEALTH CHECK
========================================================= */

app.get(
    "/api/admin/status",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            server: "GMSC",

            status: "online",

            activeSessions:
                sessions.size,

            storedResults:
                readJson(RESULTS_FILE)
                    .length,

            storedSecurityEvents:
                readJson(EVENTS_FILE)
                    .length,

            timestamp:
                new Date()
                    .toISOString()

        });

    }
);


/* =========================================================
   404
========================================================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "exam.html"));
});
app.use(
    (req, res) => {

        if (
            req.path.startsWith("/api/")
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
    (error, req, res, next) => {

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
            `Exam duration: ${EXAM_DURATION_MINUTES} minutes`
        );
        console.log(
            "Fullscreen requirement: DISABLED"
        );
        console.log(
            "Camera: REQUIRED"
        );
        console.log(
            "Microphone: REQUIRED"
        );
        console.log(
            "Entire-screen sharing: REQUIRED"
        );
        console.log(
            "===================================="
        );
        console.log("");

    }
);
