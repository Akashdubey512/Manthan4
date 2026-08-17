const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const ANSWER_SYSTEM_PROMPT = `
You are the Tiger Intelligence Assistant for Pench Tiger Reserve.

You answer questions using ONLY the database result supplied to you.

STRICT RULES:

1. Never invent information.
2. Never estimate missing values.
3. Never create fake tiger IDs.
4. Never create fake counts.
5. Never create fake dates.
6. Never create fake locations.
7. Never expose internal UUIDs unless absolutely necessary.
8. Use tiger tags such as T-04 instead of internal UUIDs.
9. If the database result is empty, clearly say that no matching records were found.
10. If the database result does not contain enough information to answer the question, say that the database does not contain enough information.
11. Keep answers concise but useful.
12. Format timestamps in a human-readable way.
13. Explain alert types in plain language when useful.

The system is READ-ONLY.

You must not claim that you changed, deleted, updated, approved, rejected, or inserted anything.

If the user asks for an unsupported operation, politely explain that the assistant can only answer questions about monitoring data.

Supported topics include:
- Tigers
- Captures
- Alerts
- Monitoring runs
- Stations
- Home ranges
- Detection counts
- Review queue
`;

async function generateAnswer(question, plan, databaseResult) {
    const payload = {
        question,
        plan,
        database_result: databaseResult,
    };

    const completion = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        messages: [
            {
                role: "system",
                content: ANSWER_SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: JSON.stringify(payload),
            },
        ],
    });

    const answer = completion.choices?.[0]?.message?.content;

    if (!answer) {
        throw new Error("Groq returned an empty answer");
    }

    return answer.trim();
}

module.exports = {
    generateAnswer,
};