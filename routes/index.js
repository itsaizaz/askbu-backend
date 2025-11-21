const express = require('express');
const router = express.Router();
const textToSpeech = require('../helpers/tts');
const dotenv = require('dotenv');

dotenv.config();

const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/talk', async (req, res) => {
    const userText = req.body.text;

    // Input Validation (Best Practice)
    if (!userText || typeof userText !== 'string' || userText.trim() === '') {
        return res.status(400).json({ 
            error: 'Bad Request', 
            details: 'The request body must contain a non-empty string in the "text" field.' 
        });
    }

    try {
        // 1. Get response from OpenAI
        const openaiResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userText }],
            max_tokens: 100,
        });

        const openaiText = openaiResponse.choices[0].message.content;

        // 2. Generate speech and blend data
        textToSpeech(openaiText, req.body.voice)
            .then(result => {
                // 3. Send successful response with data
                res.json(result);
            })
            .catch(err => {
                console.error("TTS error details:", err.message);
                // 500 for external TTS failure
                res.status(500).json({ error: 'Text-to-speech error', details: err.message });
            });

    } catch (error) {
        // 500 for OpenAI or other upstream failure
        console.error("OpenAI error details:", error.message);
        res.status(500).json({ error: 'Error communicating with OpenAI', details: error.message });
    }
});

module.exports = router;