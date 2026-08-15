const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const ADMIN_SECRET =
    process.env.ADMIN_SECRET || "CHANGE_THIS_ADMIN_SECRET";

const DATA_DIR =
    path.join(__dirname, "data");

const RESULTS_FILE =
    path.join(DATA_DIR, "results.json");

const EVENTS_FILE =
    path.join(DATA_DIR, "proctoring-events.json");

const REGISTRATIONS_FILE =
    path.join(DATA_DIR, "registrations.json");

const QUESTIONS_FILE =
    path.join(DATA_DIR, "questions.json");

const RANKS_FILE =
    path.join(DATA_DIR, "ranks.json");


/* =========================================================
   GMSC EXAM SCHEDULE
========================================================= */

/*
   Registration:
   1 August 2026 00:00:00
   to
   31 August 2026 23:59:59

   Exam:
   1 September 2026 00:00:00
   to
   1 September 2026 23:59:59

   Result:
   1 December 2026
*/

const REGISTRATION_START =
    new Date("2026-08-01T00:00:00+05:30");

const REGISTRATION_END =
    new Date("2026-08-31T23:59:59+05:30");

const EXAM_START =
    new Date("2026-09-01T00:00:00+05:30");

const EXAM_END =
    new Date("2026-09-01T23:59:59+05:30");

const RESULT_DATE =
    new Date("2026-12-01T00:00:00+05:30");


/*
   Individual student attempt duration.

   The examination is available throughout
   1 September, but once a student starts,
   they receive 60 minutes or until the exam
   closes, whichever comes first.
*/

const EXAM_DURATION_MINUTES = 60;


/* =========================================================
   AWARD / ROUND RULES
========================================================= */

const ROUND_2_FULL_MARKS_REQUIRED = true;

const ROUND_2_AWARD_USD = 250;


/* =========================================================
   BASIC SETUP
========================================================= */

app.use(
    express.json({
        limit: "2mb"
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


/* =========================================================
   INITIAL QUESTION BANK
========================================================= */

const INITIAL_QUESTIONS = [

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

        correctAnswer: 1,

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

        correctAnswer: 0,

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

        correctAnswer: 2,

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

        correctAnswer: 2,

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

        correctAnswer: 2,

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

        correctAnswer: 0,

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

        correctAnswer: 1,

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

        correctAnswer: 2,

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

        correctAnswer: 2,

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

        correctAnswer: 2,

        marks: 1
    }

];


/* =========================================================
   FILE HELPERS
========================================================= */

function ensureFile(
    file,
    value
) {

    if (!fs.existsSync(file)) {

        fs.writeFileSync(
            file,
            JSON.stringify(
                value,
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

ensureFile(
    QUESTIONS_FILE,
    INITIAL_QUESTIONS
);

ensureFile(
    RANKS_FILE,
    []
);


function readJson(file) {

    try {

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch {

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


/* =========================================================
   SESSION STORAGE
========================================================= */

const sessions =
    new Map();


/* =========================================================
   GENERAL HELPERS
========================================================= */

function generateToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


function generateId(prefix) {

    return (
        prefix +
        "-" +
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


function cleanString(
    value,
    maxLength = 300
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


function isRegistrationOpen() {

    const now =
        new Date();

    return (
        now >=
        REGISTRATION_START &&
        now <=
        REGISTRATION_END
    );

}


function isExamOpen() {

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
   STUDENT SESSION AUTHENTICATION
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
                "Exam session expired."

        });

    }


    req.examSession =
        session;

    next();

}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

function requireAdmin(
    req,
    res,
    next
) {

    const key =
        req.headers[
            "x-admin-key"
        ];


    if (
        !key ||
        key !== ADMIN_SECRET
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
   PUBLIC SCHEDULE
========================================================= */

app.get(
    "/api/schedule",
    (req, res) => {

        res.json({

            success: true,

            registrationStart:
                REGISTRATION_START
                    .toISOString(),

            registrationEnd:
                REGISTRATION_END
                    .toISOString(),

            examStart:
                EXAM_START
                    .toISOString(),

            examEnd:
                EXAM_END
                    .toISOString(),

            resultDate:
                RESULT_DATE
                    .toISOString(),

            examDurationMinutes:
                EXAM_DURATION_MINUTES,

            round2FullMarksRequired:
                ROUND_2_FULL_MARKS_REQUIRED,

            round2AwardUSD:
                ROUND_2_AWARD_USD,

            registrationOpen:
                isRegistrationOpen(),

            examOpen:
                isExamOpen()

        });

    }
);


/* =========================================================
   REGISTRATION
========================================================= */

app.post(
    "/api/register",
    (req, res) => {

        if (
            !isRegistrationOpen()
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Registration is currently closed."

            });

        }


        const name =
            cleanString(
                req.body.name,
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


        if (
            name.length < 2 ||
            !studentId ||
            !email.includes("@")
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Valid registration details are required."

            });

        }


        const registrations =
            readJson(
                REGISTRATIONS_FILE
            );


        const duplicate =
            registrations.find(
                person =>
                    String(
                        person.studentId
                    )
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
                generateId(
                    "REG"
                ),

            name,

            studentId,

            email,

            registeredAt:
                new Date()
                    .toISOString(),

            verified:
                false

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

            registrationId:
                registration.registrationId,

            message:
                "Registration successful."

        });

    }
);


/* =========================================================
   VERIFY STUDENT FROM RECORDS
========================================================= */

app.post(
    "/api/verify-student",
    (req, res) => {

        const studentId =
            cleanString(
                req.body.studentId,
                100
            );


        if (!studentId) {

            return res.status(400).json({

                success: false,

                verified: false,

                message:
                    "Student ID is required."

            });

        }


        const registrations =
            readJson(
                REGISTRATIONS_FILE
            );


        const person =
            registrations.find(
                item =>
                    String(
                        item.studentId
                    )
                        .toLowerCase() ===
                    studentId
                        .toLowerCase()
            );


        if (!person) {

            return res.status(404).json({

                success: false,

                verified: false,

                message:
                    "Student ID not found in registration records."

            });

        }


        res.json({

            success: true,

            verified: true,

            student: {

                name:
                    person.name,

                studentId:
                    person.studentId,

                email:
                    person.email,

                registrationId:
                    person.registrationId

            }

        });

    }
);


/* =========================================================
   PUBLIC QUESTIONS
   NEVER SEND ANSWERS
========================================================= */

app.get(
    "/api/questions",
    (req, res) => {

        const questions =
            readJson(
                QUESTIONS_FILE
            );


        const safeQuestions =
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

            success: true,

            questions:
                safeQuestions

        });

    }
);


/* =========================================================
   START EXAM
========================================================= */

app.post(
    "/api/exam/start",
    (req, res) => {

        if (!isExamOpen()) {

            return res.status(403).json({

                success: false,

                message:
                    "The examination is not currently open."

            });

        }


        const studentId =
            cleanString(
                req.body.studentId,
                100
            );


        const registrations =
            readJson(
                REGISTRATIONS_FILE
            );


        const student =
            registrations.find(
                item =>
                    String(
                        item.studentId
                    )
                        .toLowerCase() ===
                    studentId
                        .toLowerCase()
            );


        if (!student) {

            return res.status(403).json({

                success: false,

                message:
                    "Student ID is not present in registration records."

            });

        }


        /*
         * Prevent the same student from
         * creating unlimited sessions.
         */

        for (
            const [
                id,
                existingSession
            ]
            of sessions
        ) {

            if (
                existingSession.studentId
                    .toLowerCase() ===
                student.studentId
                    .toLowerCase() &&
                !existingSession.submitted
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This student already has an active exam session."

                });

            }

        }


        const sessionId =
            crypto.randomUUID();

        const token =
            generateToken();

        const startedAt =
            Date.now();


        const expiresAt =
            Math.min(

                startedAt +
                EXAM_DURATION_MINUTES *
                60 *
                1000,

                EXAM_END.getTime()

            );


        const session = {

            sessionId,

            token,

            studentName:
                student.name,

            studentId:
                student.studentId,

            email:
                student.email,

            startedAt,

            expiresAt,

            submitted:
                false,

            violations:
                []

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

            studentName:
                student.name,

            studentId:
                student.studentId,

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
   PROCTORING EVENT
========================================================= */

app.post(
    "/api/proctoring/violation",
    requireExamSession,
    (req, res) => {

        const session =
            req.examSession;


        if (
            session.submitted
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Exam already submitted."

            });

        }


        const event = {

            eventId:
                crypto.randomUUID(),

            sessionId:
                session.sessionId,

            studentId:
                session.studentId,

            type:
                cleanString(
                    req.body.type,
                    100
                ),

            details:
                cleanString(
                    req.body.details,
                    500
                ),

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

            recorded:
                true

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
                    "Exam already submitted."

            });

        }


        const questions =
            readJson(
                QUESTIONS_FILE
            );


        let answers =
            Array.isArray(
                req.body.answers
            )
                ? req.body.answers
                : [];


        answers =
            questions.map(
                (
                    question,
                    index
                ) => {

                    const answer =
                        answers[index];


                    if (
                        Number.isInteger(
                            answer
                        ) &&
                        answer >= 0 &&
                        answer <
                        question.options.length
                    ) {

                        return answer;

                    }


                    return null;

                }
            );


        let score =
            0;

        let totalMarks =
            0;


        questions.forEach(
            (
                question,
                index
            ) => {

                const marks =
                    Number(
                        question.marks ||
                        1
                    );


                totalMarks +=
                    marks;


                if (
                    answers[index] !==
                    null &&
                    answers[index] ===
                    question.correctAnswer
                ) {

                    score +=
                        marks;

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


        /*
         * Full marks = Round 2 qualification.
         */

        const qualifiesForRound2 =
            ROUND_2_FULL_MARKS_REQUIRED
                ? score === totalMarks
                : false;


        const submission = {

            submissionId:
                generateId(
                    "GMSC"
                ),

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

            submittedAt:
                new Date()
                    .toISOString(),

            reason:
                cleanString(
                    req.body.reason ||
                    "manual",
                    100
                ),

            answers,

            score,

            totalMarks,

            percentage,

            qualifiesForRound2,

            /*
             * This is true only for a Round 2
             * result that also receives full marks.
             *
             * Round 2 results can later be stored
             * with round: 2.
             */

            round:
                Number(
                    req.body.round
                ) === 2
                    ? 2
                    : 1,

            qualifiesFor250USD:
                false,

            violationCount:
                session.violations.length,

            securityEvents:
                session.violations

        };


        const results =
            readJson(
                RESULTS_FILE
            );


        results.push(
            submission
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


        recalculateRanks();


        res.json({

            success: true,

            submissionId:
                submission.submissionId,

            score,

            totalMarks,

            percentage,

            qualifiesForRound2,

            qualifiesFor250USD:
                false,

            round:
                submission.round,

            submittedAt:
                submission.submittedAt

        });

    }
);


/* =========================================================
   PERSISTENT RANK CALCULATION
========================================================= */

function recalculateRanks() {

    const results =
        readJson(
            RESULTS_FILE
        );


    const validResults =
        results.filter(
            result =>
                typeof result.score ===
                "number"
        );


    validResults.sort(
        (a, b) => {

            if (
                Number(b.score) !==
                Number(a.score)
            ) {

                return (
                    Number(b.score) -
                    Number(a.score)
                );

            }


            if (
                Number(b.percentage) !==
                Number(a.percentage)
            ) {

                return (
                    Number(b.percentage) -
                    Number(a.percentage)
                );

            }


            return new Date(
                a.submittedAt
            ) -
            new Date(
                b.submittedAt
            );

        }
    );


    const oldRanks =
        readJson(
            RANKS_FILE
        );


    const manualRanks =
        new Map();


    oldRanks.forEach(
        item => {

            if (
                item.manual === true
            ) {

                manualRanks.set(
                    item.submissionId,
                    item.rank
                );

            }

        }
    );


    const ranks =
        validResults.map(
            (
                result,
                index
            ) => ({

                submissionId:
                    result.submissionId,

                studentName:
                    result.studentName,

                studentId:
                    result.studentId,

                score:
                    result.score,

                totalMarks:
                    result.totalMarks,

                percentage:
                    result.percentage,

                qualifiesForRound2:
                    result.qualifiesForRound2,

                round:
                    result.round || 1,

                rank:
                    manualRanks.has(
                        result.submissionId
                    )
                        ? manualRanks.get(
                            result.submissionId
                        )
                        : index + 1,

                manual:
                    manualRanks.has(
                        result.submissionId
                    ),

                updatedAt:
                    new Date()
                        .toISOString()

            })
        );


    writeJson(
        RANKS_FILE,
        ranks
    );


    return ranks;

}


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

            registrationStart:
                REGISTRATION_START
                    .toISOString(),

            registrationEnd:
                REGISTRATION_END
                    .toISOString(),

            examStart:
                EXAM_START
                    .toISOString(),

            examEnd:
                EXAM_END
                    .toISOString(),

            resultDate:
                RESULT_DATE
                    .toISOString(),

            examDurationMinutes:
                EXAM_DURATION_MINUTES,

            round2FullMarksRequired:
                ROUND_2_FULL_MARKS_REQUIRED,

            round2AwardUSD:
                ROUND_2_AWARD_USD,

            registrationOpen:
                isRegistrationOpen(),

            examOpen:
                isExamOpen(),

            activeSessions:
                sessions.size,

            registeredParticipants:
                readJson(
                    REGISTRATIONS_FILE
                ).length,

            storedResults:
                readJson(
                    RESULTS_FILE
                ).length,

            storedSecurityEvents:
                readJson(
                    EVENTS_FILE
                ).length,

            questionCount:
                readJson(
                    QUESTIONS_FILE
                ).length,

            timestamp:
                new Date()
                    .toISOString()

        });

    }
);


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


        const ranks =
            recalculateRanks();


        const resultData =
            results.map(
                result => {

                    const rank =
                        ranks.find(
                            item =>
                                item.submissionId ===
                                result.submissionId
                        );


                    return {

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
                            result.qualifiesForRound2,

                        qualifiesFor250USD:
                            result.qualifiesFor250USD ||
                            false,

                        round:
                            result.round ||
                            1,

                        rank:
                            rank
                                ? rank.rank
                                : null,

                        violationCount:
                            result.violationCount

                    };

                }
            );


        res.json({

            success: true,

            results:
                resultData

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
   ADMIN QUESTION BANK
========================================================= */

app.get(
    "/api/admin/questions",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            questions:
                readJson(
                    QUESTIONS_FILE
                )

        });

    }
);


/* =========================================================
   ADD QUESTION
========================================================= */

app.post(
    "/api/admin/questions",
    requireAdmin,
    (req, res) => {

        const questionText =
            cleanString(
                req.body.question,
                2000
            );


        const options =
            Array.isArray(
                req.body.options
            )
                ? req.body.options.map(
                    option =>
                        cleanString(
                            option,
                            500
                        )
                )
                : [];


        const correctAnswer =
            Number(
                req.body.correctAnswer
            );


        const marks =
            Number(
                req.body.marks
            );


        if (
            !questionText ||
            options.length < 2 ||
            options.some(
                option =>
                    !option
            ) ||
            !Number.isInteger(
                correctAnswer
            ) ||
            correctAnswer < 0 ||
            correctAnswer >=
                options.length ||
            !Number.isFinite(
                marks
            ) ||
            marks <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid question data."

            });

        }


        const questions =
            readJson(
                QUESTIONS_FILE
            );


        const newQuestion = {

            id:
                questions.length > 0
                    ? Math.max(
                        ...questions.map(
                            q =>
                                Number(
                                    q.id
                                ) || 0
                        )
                    ) + 1
                    : 1,

            question:
                questionText,

            options,

            correctAnswer,

            marks

        };


        questions.push(
            newQuestion
        );


        writeJson(
            QUESTIONS_FILE,
            questions
        );


        res.json({

            success: true,

            message:
                "Question added successfully.",

            question:
                newQuestion

        });

    }
);


/* =========================================================
   UPDATE QUESTION
========================================================= */

app.put(
    "/api/admin/questions/:id",
    requireAdmin,
    (req, res) => {

        const questions =
            readJson(
                QUESTIONS_FILE
            );


        const id =
            Number(
                req.params.id
            );


        const index =
            questions.findIndex(
                question =>
                    Number(
                        question.id
                    ) === id
            );


        if (index === -1) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found."

            });

        }


        const questionText =
            cleanString(
                req.body.question,
                2000
            );


        const options =
            Array.isArray(
                req.body.options
            )
                ? req.body.options.map(
                    option =>
                        cleanString(
                            option,
                            500
                        )
                )
                : [];


        const correctAnswer =
            Number(
                req.body.correctAnswer
            );


        const marks =
            Number(
                req.body.marks
            );


        if (
            !questionText ||
            options.length < 2 ||
            options.some(
                option =>
                    !option
            ) ||
            !Number.isInteger(
                correctAnswer
            ) ||
            correctAnswer < 0 ||
            correctAnswer >=
                options.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid question data."

            });

        }


        questions[index] = {

            id,

            question:
                questionText,

            options,

            correctAnswer,

            marks:
                Number.isFinite(
                    marks
                ) && marks > 0
                    ? marks
                    : 1

        };


        writeJson(
            QUESTIONS_FILE,
            questions
        );


        res.json({

            success: true,

            message:
                "Question updated successfully.",

            question:
                questions[index]

        });

    }
);


/* =========================================================
   DELETE QUESTION
========================================================= */

app.delete(
    "/api/admin/questions/:id",
    requireAdmin,
    (req, res) => {

        const questions =
            readJson(
                QUESTIONS_FILE
            );


        const id =
            Number(
                req.params.id
            );


        const filtered =
            questions.filter(
                question =>
                    Number(
                        question.id
                    ) !== id
            );


        if (
            filtered.length ===
            questions.length
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found."

            });

        }


        writeJson(
            QUESTIONS_FILE,
            filtered
        );


        res.json({

            success: true,

            message:
                "Question deleted successfully."

        });

    }
);


/* =========================================================
   ADMIN RANKS
========================================================= */

app.get(
    "/api/admin/ranks",
    requireAdmin,
    (req, res) => {

        const ranks =
            recalculateRanks();


        res.json({

            success: true,

            ranks

        });

    }
);


/* =========================================================
   MANUAL RANK UPDATE
========================================================= */

app.put(
    "/api/admin/ranks/:submissionId",
    requireAdmin,
    (req, res) => {

        const submissionId =
            cleanString(
                req.params.submissionId,
                200
            );


        const requestedRank =
            Number(
                req.body.rank
            );


        if (
            !Number.isInteger(
                requestedRank
            ) ||
            requestedRank < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Rank must be a positive integer."

            });

        }


        /*
         * Load existing persistent ranks.
         */

        let ranks =
            readJson(
                RANKS_FILE
            );


        /*
         * If ranks have not yet been
         * generated, generate them first.
         */

        const existing =
            ranks.find(
                rank =>
                    rank.submissionId ===
                    submissionId
            );


        if (!existing) {

            ranks =
                recalculateRanks();

        }


        const item =
            ranks.find(
                rank =>
                    rank.submissionId ===
                    submissionId
            );


        if (!item) {

            return res.status(404).json({

                success: false,

                message:
                    "Submission rank not found."

            });

        }


        item.rank =
            requestedRank;

        item.manual =
            true;

        item.updatedAt =
            new Date()
                .toISOString();


        writeJson(
            RANKS_FILE,
            ranks
        );


        res.json({

            success: true,

            message:
                "Rank updated successfully.",

            rank:
                item

        });

    }
);


/* =========================================================
   RESET MANUAL RANK
========================================================= */

app.delete(
    "/api/admin/ranks/:submissionId",
    requireAdmin,
    (req, res) => {

        const submissionId =
            cleanString(
                req.params.submissionId,
                200
            );


        const ranks =
            readJson(
                RANKS_FILE
            );


        const item =
            ranks.find(
                rank =>
                    rank.submissionId ===
                    submissionId
            );


        if (!item) {

            return res.status(404).json({

                success: false,

                message:
                    "Rank not found."

            });

        }


        /*
         * Remove the manual override.
         */

        item.manual =
            false;


        /*
         * Delete current rank file
         * and regenerate rankings.
         */

        writeJson(
            RANKS_FILE,
            ranks.filter(
                rank =>
                    rank.submissionId !==
                    submissionId
            )
        );


        const recalculated =
            recalculateRanks();


        res.json({

            success: true,

            message:
                "Manual rank removed and rankings recalculated.",

            ranks:
                recalculated

        });

    }
);


/* =========================================================
   ADMIN ANSWER KEY
========================================================= */

app.get(
    "/api/admin/answer-key",
    requireAdmin,
    (req, res) => {

        const questions =
            readJson(
                QUESTIONS_FILE
            );


        const answerKey =
            questions.map(
                question => ({

                    id:
                        question.id,

                    correctAnswer:
                        question.correctAnswer,

                    marks:
                        question.marks

                })
            );


        res.json({

            success: true,

            answerKey

        });

    }
);


/* =========================================================
   ADMIN EXAM INFORMATION
========================================================= */

app.get(
    "/api/admin/exam-info",
    requireAdmin,
    (req, res) => {

        res.json({

            success: true,

            registration: {

                start:
                    REGISTRATION_START
                        .toISOString(),

                end:
                    REGISTRATION_END
                        .toISOString()

            },

            exam: {

                start:
                    EXAM_START
                        .toISOString(),

                end:
                    EXAM_END
                        .toISOString(),

                durationMinutes:
                    EXAM_DURATION_MINUTES

            },

            resultDate:
                RESULT_DATE
                    .toISOString(),

            rules: {

                fullMarksQualifiesRound2:
                    true,

                fullMarksBothRoundsAwardUSD:
                    ROUND_2_AWARD_USD

            }

        });

    }
);


/* =========================================================
   ADMIN AWARD STATUS
========================================================= */

app.get(
    "/api/admin/awards",
    requireAdmin,
    (req, res) => {

        const results =
            readJson(
                RESULTS_FILE
            );


        /*
         * A participant becomes eligible for
         * the $250 award only when they have
         * full marks in Round 1 AND Round 2.
         */

        const students =
            new Map();


        results.forEach(
            result => {

                const studentId =
                    result.studentId;


                if (!studentId) {
                    return;
                }


                if (
                    !students.has(
                        studentId
                    )
                ) {

                    students.set(
                        studentId,
                        {

                            studentId,

                            studentName:
                                result.studentName,

                            round1FullMarks:
                                false,

                            round2FullMarks:
                                false

                        }
                    );

                }


                const student =
                    students.get(
                        studentId
                    );


                if (
                    result.round === 1 &&
                    result.score ===
                    result.totalMarks
                ) {

                    student.round1FullMarks =
                        true;

                }


                if (
                    result.round === 2 &&
                    result.score ===
                    result.totalMarks
                ) {

                    student.round2FullMarks =
                        true;

                }

            }
        );


        const awards =
            Array.from(
                students.values()
            )
            .map(
                student => ({

                    ...student,

                    qualifiesFor250USD:
                        student.round1FullMarks &&
                        student.round2FullMarks,

                    awardUSD:
                        student.round1FullMarks &&
                        student.round2FullMarks
                            ? ROUND_2_AWARD_USD
                            : 0

                })
            );


        res.json({

            success: true,

            awardAmountUSD:
                ROUND_2_AWARD_USD,

            awards

        });

    }
);


/* =========================================================
   ROOT ROUTES
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


app.get(
    "/admin",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "admin.html"
            )
        );

    }
);


app.get(
    "/exam",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "exam.html"
            )
        );

    }
);


/* =========================================================
   API 404
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
            "======================================"
        );

        console.log(
            "          GMSC SERVER ONLINE"
        );

        console.log(
            "======================================"
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Questions: ${
                readJson(
                    QUESTIONS_FILE
                ).length
            }`
        );

        console.log(
            "Registration: 1 Aug 2026 - 31 Aug 2026"
        );

        console.log(
            "Exam: 1 Sep 2026 - 11:59:59 PM"
        );

        console.log(
            "Individual attempt: 60 minutes"
        );

        console.log(
            "Result date: 1 Dec 2026"
        );

        console.log(
            "Full marks: Round 2 qualification"
        );

        console.log(
            "Full marks in both rounds: $250"
        );

        console.log(
            "Question bank: PERSISTENT"
        );

        console.log(
            "Rank storage: PERSISTENT"
        );

        console.log(
            "Admin question management: ENABLED"
        );

        console.log(
            "Admin rank management: ENABLED"
        );

        console.log(
            "======================================"
        );

        console.log("");

    }
);
