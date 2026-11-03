# WeaveRank — AI Custom Practice deployment

This folder contains the mobile-friendly WeaveRank website plus a Netlify serverless function for AI question generation.

## What is included

- Existing 60 DataWeave problems, profile, badges, scoring and browser persistence.
- AI Custom Practice page with topic, difficulty and question-count controls.
- Generated questions include JSON input, expected JSON output, hints, a complete DataWeave 2.0 solution, explanation and real-world use case.
- Generated questions are saved separately in the active local browser username profile and are added to the main Problems list.
- Netlify Function keeps the OpenAI API key on the server; it is not placed in the HTML.

## Deploy to Netlify

1. Sign in to Netlify and create a new site by importing this folder from a Git repository, or deploy the folder using Netlify CLI.
2. In the Netlify site dashboard, open **Site configuration → Environment variables**.
3. Add `OPENAI_API_KEY` with your own OpenAI API key. Never paste the key into `index.html` or commit it to Git.
4. Optionally add `OPENAI_MODEL` (defaults to `gpt-4.1-mini`).
5. Trigger a new deploy. The function is available at `/.netlify/functions/generate-questions`.

The static HTML can still be opened locally for the existing practice questions, but AI generation requires the deployed Netlify function and the server-side API key.

## Important notes

- Usernames are local browser profiles, not authenticated accounts. Generated questions and progress do not automatically sync between devices.
- AI-generated DataWeave scripts and expected outputs should be verified in the official DataWeave Playground before relying on them. This project compares pasted output; it does not embed a DataWeave runtime.
- Set usage limits/budget alerts with your AI provider. The function limits each request to 20 questions, but a public deployment may still receive repeated requests.
