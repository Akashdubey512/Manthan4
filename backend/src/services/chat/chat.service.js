const {
    planQuery,
} = require("./queryPlanner.service");

const {
    executeQueryPlan,
} = require("./queryExecutor.service");

const {
    generateAnswer,
} = require("./answerGenerator.service");

async function chat(question) {
    if (!question || typeof question !== "string") {
        throw new Error("Please provide a valid question.");
    }

    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
        throw new Error("Question cannot be empty.");
    }

    // STEP 1:
    // Understand the user's question.
    const plan = await planQuery(cleanQuestion);

    // If Groq asks for clarification.
    if (plan.clarification_needed) {
        return {
            answer: plan.clarification_needed,
            plan,
            sourceData: null,
            recordCount: 0,
        };
    }

    // STEP 2:
    // Execute ONLY the safe backend operation.
    const databaseResult = await executeQueryPlan(plan);

    // STEP 3:
    // Convert actual DB data into natural language.
    const answer = await generateAnswer(
        cleanQuestion,
        plan,
        databaseResult
    );

    return {
        answer,
        plan,
        sourceData: databaseResult,
        recordCount: getRecordCount(databaseResult),
    };
}

function getRecordCount(result) {
    if (!result || typeof result !== "object") {
        return 0;
    }

    if (Array.isArray(result.alerts)) {
        return result.alerts.length;
    }

    if (Array.isArray(result.tigers)) {
        return result.tigers.length;
    }

    if (Array.isArray(result.stations)) {
        return result.stations.length;
    }

    if (Array.isArray(result.zones)) {
        return result.zones.length;
    }

    if (result.count !== undefined) {
        return result.count;
    }

    return 1;
}

module.exports = {
    chat,
};