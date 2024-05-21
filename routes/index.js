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

  console.log('Received request with text:', userText);

  try {
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userText }],
      max_tokens: 100,
    });

    const openaiText = openaiResponse.choices[0].message.content;

    textToSpeech(openaiText, req.body.voice)
      .then(result => {
        res.json(result);
      })
      .catch(err => {
        console.error("TTS error details:", err.message);
        res.status(500).json({ error: 'Text-to-speech error', details: err.message });
      });

  } catch (error) {
    console.error("OpenAI error details:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error communicating with OpenAI', details: error.message });
  }
});

module.exports = router;
