const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function reply(statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(payload)
  };
}

function isJsonValue(value) {
  return value !== undefined && value !== null &&
    (Array.isArray(value) || typeof value === "object" ||
      typeof value === "string" || typeof value === "number" || typeof value === "boolean");
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Use POST to generate questions." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return reply(503, { error: "The AI generator is not configured yet. Add OPENAI_API_KEY to your Netlify environment variables." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return reply(400, { error: "Request body must be valid JSON." });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const level = body.level;
  const count = Number(body.count);
  if (topic.length < 2 || topic.length > 120) {
    return reply(400, { error: "Topic must be between 2 and 120 characters." });
  }
  if (!["easy", "medium", "hard"].includes(level)) {
    return reply(400, { error: "Difficulty must be easy, medium or hard." });
  }
  if (![5, 10, 15, 20].includes(count)) {
    return reply(400, { error: "Choose 5, 10, 15 or 20 questions." });
  }

  const system = [
    "You are an expert MuleSoft DataWeave 2.0 instructor and coding-challenge author.",
    "Create technically correct, original, deterministic DataWeave 2.0 practice problems.",
    "Return ONLY a JSON object with a single property named questions.",
    "Each question must have: title, statement, inputPayload, expectedOutput, hints, solution, explanation, realWorldUseCase.",
    "inputPayload and expectedOutput must be valid JSON values (objects or arrays preferred), not JSON encoded strings.",
    "solution must be a complete runnable DataWeave 2.0 script beginning with %dw 2.0 and containing output application/json and ---.",
    "The expectedOutput must be the exact result of running solution against inputPayload.",
    "Use only real DataWeave 2.0 syntax and core functions. Do not invent functions or JavaScript syntax.",
    "Make each question meaningfully different, with realistic integration/API/business payloads.",
    "Hints must be an array of 2 to 4 progressive hints and must not reveal the complete solution.",
    "Explanation should explain the DataWeave concepts used. realWorldUseCase should describe a practical integration scenario.",
    "Do not include markdown fences or text outside the JSON object."
  ].join(" ");

  const user = `Generate exactly ${count} ${level.toUpperCase()}-difficulty DataWeave 2.0 coding questions about this topic: ${topic}. Vary the scenarios and transformations. Ensure every inputPayload and expectedOutput is valid JSON and every solution is complete.`;

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        max_tokens: 12000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = result && result.error && result.error.message;
      return reply(502, { error: detail || "The AI provider could not generate questions. Please try again." });
    }

    const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(content || "{}"); }
    catch (_) { return reply(502, { error: "The AI returned an invalid response. Please try again." }); }

    if (!Array.isArray(parsed.questions) || parsed.questions.length < 1) {
      return reply(502, { error: "The AI response did not contain any questions. Please try again." });
    }

    const questions = parsed.questions.slice(0, count).map((q) => ({
      title: typeof q.title === "string" ? q.title.trim().slice(0, 100) : "",
      statement: typeof q.statement === "string" ? q.statement.trim() : "",
      inputPayload: q.inputPayload,
      expectedOutput: q.expectedOutput,
      hints: Array.isArray(q.hints) ? q.hints.filter(x => typeof x === "string").slice(0, 4) : [],
      solution: typeof q.solution === "string" ? q.solution.trim() : "",
      explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
      realWorldUseCase: typeof q.realWorldUseCase === "string" ? q.realWorldUseCase.trim() : ""
    }));

    const invalid = questions.find(q => !q.title || !q.statement || !q.solution.startsWith("%dw 2.0") ||
      !isJsonValue(q.inputPayload) || !isJsonValue(q.expectedOutput) || q.hints.length < 1);
    if (invalid) {
      return reply(502, { error: "One or more generated questions were incomplete. Please regenerate the set." });
    }

    return reply(200, { questions });
  } catch (error) {
    return reply(500, { error: "The generator encountered a temporary error. Please try again." });
  }
};

