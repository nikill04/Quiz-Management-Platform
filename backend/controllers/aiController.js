import Groq from "groq-sdk";
import redisClient from "../redisClient.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const askAI = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // 🔑 Cache key
    const cacheKey = `ai:${question.trim().toLowerCase()}`;

    // 1️⃣ CACHE CHECK
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("✅ AI CACHE HIT (Groq)");
      return res.json({ answer: cached, cached: true });
    }

    console.log("❌ AI CACHE MISS → calling Groq");

    // 2️⃣ GROQ API CALL
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // ⚡ FAST & FREE
      messages: [
        {
          role: "system",
          content: "Explain clearly in simple words.",
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    // 3️⃣ SAVE TO CACHE (10 minutes)
    await redisClient.set(cacheKey, answer, {
      EX: 600,
    });

    res.json({
      answer,
      cached: false,
      provider: "groq",
    });

  } catch (error) {
    console.error("Groq AI error:", error.message);
    res.status(500).json({
      error: "Failed to fetch AI response from Groq",
    });
  }
};
