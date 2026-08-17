const {
    chat,
} = require("../services/chat/chat.service");

async function queryChat(req, res) {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                error: "question is required",
            });
        }

        const result = await chat(question);

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error("Chat error:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to process your question",
            message:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
}

module.exports = {
    queryChat,
};