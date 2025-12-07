
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { getApiKey } from "./storageService";
import { SixHatsResult, DecisionResult, DebateDifficulty, DebateScorecard, Language } from "../types";

// Use 'any' for the chat session to avoid strict type import issues with the SDK
let chatSession: any | null = null;

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found in storage");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to enforce language
const getLangPrompt = (lang: Language) => {
    return lang === 'vi' 
        ? "\nIMPORTANT: You MUST generate your output strictly in VIETNAMESE language." 
        : "\nIMPORTANT: You MUST generate your output strictly in ENGLISH language.";
};

export const initializeChat = async (lang: Language = 'vi') => {
  try {
    const ai = getClient();
    const langInstruction = getLangPrompt(lang);
    
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + langInstruction,
        temperature: 0.7, 
      },
    });
    return chatSession;
  } catch (error) {
    console.warn("Chat initialization paused: Waiting for API Key.");
    return null;
  }
};

export const sendMessageStream = async (message: string, onChunk: (text: string) => void) => {
  if (!chatSession) {
    // Defaulting to 'vi' if session was not explicitly initialized, though App.tsx handles this.
    await initializeChat('vi'); 
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session. Please check your API Key.");
  }

  try {
    const resultStream = await chatSession.sendMessageStream({ message });
    
    let fullText = "";
    for await (const chunk of resultStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Error in sendMessageStream:", error);
    throw error;
  }
};

export const synthesizeNote = async (historyContext: string, lang: Language): Promise<string> => {
  const ai = getClient();
  const langInstruction = getLangPrompt(lang);
  
  const prompt = `
  Role: You are the "Synthesizer".
  Task: Transform the conversation history into a finalized, structured Notion note following these STRICT rules.

  CONVERSATION HISTORY:
  ${historyContext}

  SYNTHESIS RULES (PHASE 2):
  RULE 0: ENOUGH KNOWLEDGE. Capture 100% of the insight from the chat, but cut the fluff.
  RULE 1: CONTEXT FIRST. Never start with technical details. Always start with the "Why" or "Core Concept". Use a Blockquote (> 💡) for the one-sentence summary.
  RULE 2: VISUALIZE COMPLEXITY. If the chat discusses a process, flow, or hierarchy, you MUST generate a Mermaid diagram (\`graph LR\` or \`sequenceDiagram\`).
  RULE 3: PRESERVE DEPTH. Do not dumb down. Retain specific technical details (numbers, config names, error codes). Use \`Code Blocks\` for data and **Bold** for key terms.
  RULE 4: CRITICAL THINKING. If the topic involves choices, include a comparison (Table or Pros/Cons).
  RULE 5: ORGANIZE LOGICALLY. Use H2 (##) for main sections. End with tags.
  
  ${langInstruction}

  ### Tags
  [#Tag1, #Tag2, #Tag3]
  
  Generate ONLY the Markdown content. Do not add preamble.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || "Failed to generate note.";
};

export const generateSessionTitle = async (firstMessage: string, lang: Language): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `Generate a very short, concise title (max 4-5 words) for a note-taking session based on this initial user input. Input: "${firstMessage}". Return ONLY the title text, no quotes. ${getLangPrompt(lang)}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text?.trim().replace(/^["']|["']$/g, '') || "New Note";
  } catch (e) {
    console.error("Failed to generate title", e);
    return "New Note";
  }
};

// --- Tool Services ---

export const runDecisionLab = async (problem: string, options: string, lang: Language): Promise<DecisionResult | null> => {
  const ai = getClient();
  const systemInstruction = `
# ROLE
You are the "Board of Directors Engine". You simulate a high-stakes board meeting between FIVE distinct personas.
The meeting has 3 PHASES: Reaction, Conflict, and Verdict.

# PERSONAS
1. **Skeptic**: Focus on risk, failure, cost. Harsh.
2. **Visionary**: Focus on potential, future, "what if". Optimistic.
3. **Pragmatist**: Focus on execution, reality, compromise. Grounded.
4. **Innovator**: Focus on disruption, weird ideas, breaking rules.
5. **Critic**: Focus on ethics, society, reputation.

# OUTPUT STRUCTURE (Strict JSON)
You must generate the full transcript in one go structure like this:

{
  "phase_1": [ 
    // Initial Thoughts. Everyone speaks once. Short & Punchy.
    { "role": "Skeptic", "initial_thought": "..." },
    { "role": "Visionary", "initial_thought": "..." },
    ...
  ],
  "phase_2": [
    // The Conflict. Agents MUST talk TO each other, not just to the user.
    // Ensure at least 4-5 turns of back-and-forth debate.
    // Example: Skeptic attacks Visionary's idea. Visionary defends. Pragmatist interrupts.
    { "role": "Skeptic", "target_role": "Visionary", "argument": "You are ignoring the burn rate!" },
    { "role": "Visionary", "target_role": "Skeptic", "argument": "And you are ignoring the market shift!" },
    ...
  ],
  "phase_3": {
    // The Conclusion.
    "winner": "The final decision advice",
    "vote_summary": "e.g., 3 Votes for Option A, 2 Votes for Option B",
    "critical_warning": "The specific Pre-mortem: If this fails, here is why."
  }
}

${getLangPrompt(lang)}
  `;

  const prompt = `Problem: ${problem}\nCurrent Options: ${options}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { 
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Decision Lab JSON", e);
    return null;
  }
};

export const runSixHats = async (topic: string, lang: Language): Promise<SixHatsResult | null> => {
  const ai = getClient();
  const systemInstruction = `
# ROLE
You are a "Six Thinking Hats" analysis tool. You DO NOT chat. You accept data and output a JSON report.

# OUTPUT FORMAT
Return strictly JSON matching this structure:
{
  "white_hat": { "title": "Facts & Data", "content": "..." },
  "red_hat": { "title": "Feelings & Intuition", "content": "..." },
  "black_hat": { "title": "Risks & Caution", "content": "..." },
  "yellow_hat": { "title": "Benefits & Optimism", "content": "..." },
  "green_hat": { "title": "Creativity & Solutions", "content": "..." },
  "blue_hat": { "title": "Action Plan", "content": "..." }
}

${getLangPrompt(lang)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: topic,
    config: { 
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Six Hats JSON", e);
    return null;
  }
};

export const runFirstPrinciples = async (problem: string, lang: Language): Promise<string> => {
  const ai = getClient();
  const systemInstruction = `
# ROLE
You are "The Deconstructor". You help the user understand the root cause of a problem.

# METHODOLOGY
1. Identify: Define the problem.
2. Breakdown: Remove assumptions and analogies.
3. Core Truths: Find basic principles (Physics, Biology, Economics, Logic).
4. Rebuild: Construct solution from principles.

# OUTPUT STYLE
Write like a sharp, concise essay with these headers:
## 🛑 Common Illusions
(What people usually mistakenly believe)
## 🧬 Core Truths
(The naked truth)
## 🛠️ First Principles Solution
(The fundamental fix)

${getLangPrompt(lang)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: problem,
    config: { systemInstruction }
  });

  return response.text || "Failed to generate analysis.";
};

// --- Debate Arena Services ---

const getDebateInstruction = (difficulty: DebateDifficulty, lang: Language) => {
    switch (difficulty) {
        case 'EASY':
            return `You are a polite but firm opponent in a debate. 
            Goal: Challenge the user's viewpoint to help them clarify their thoughts. 
            Style: Socratic, constructive, pointing out obvious contradictions.
            ${getLangPrompt(lang)}`;
        case 'HARD':
            return `You are a skilled, competitive debater. 
            Goal: Win the argument. 
            Style: Use logical fallacies (Ad Hominem, Strawman) occasionally to test the user's resilience. Cite (general) stats. Be sharp.
            ${getLangPrompt(lang)}`;
        case 'EXTREME':
            return `You are "The Destroyer". 
            Goal: Completely dismantle the user's worldview on this topic. 
            Style: Aggressive, sarcastic, relentless. Expose every tiny cognitive bias. Use 48 Laws of Power style rhetoric. Do not show mercy.
            ${getLangPrompt(lang)}`;
        default:
            return `You are a debater. ${getLangPrompt(lang)}`;
    }
};

export const initiateDebate = async (topic: string, difficulty: DebateDifficulty, lang: Language): Promise<string> => {
    const ai = getClient();
    const systemInstruction = getDebateInstruction(difficulty, lang) + `
    \nTASK: Provide an opening statement opposing the user's view: "${topic}".
    Keep it under 100 words. End with a provocative question.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `I believe: ${topic}`,
        config: { systemInstruction }
    });
    return response.text || "Ready to debate.";
};

export const continueDebate = async (history: {role: string, content: string}[], difficulty: DebateDifficulty, lang: Language): Promise<string> => {
    const ai = getClient();
    const systemInstruction = getDebateInstruction(difficulty, lang) + `
    \nTASK: Rebut the user's last point. Keep it under 80 words. End with a challenging question.`;
    
    // Convert history format
    const contents = history.map(h => ({
        role: h.role === 'AI' ? 'model' : 'user',
        parts: [{ text: h.content }]
    }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { systemInstruction }
    });

    return response.text || "I disagree.";
};

export const runAutoDebateTurn = async (
    history: {role: string, content: string}[], 
    topic: string, 
    apiKey: string, 
    lang: Language
): Promise<string> => {
    // Instantiate a new client with the Secondary API Key
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
    You are an "Ally Debater". 
    Role: You are arguing IN FAVOR of the Topic: "${topic}".
    Goal: Defend this topic against the Opponent. Win the argument using logic, facts, and rhetoric.
    Context: You are replying to the Opponent.
    Constraint: Keep it under 80 words. Be sharp and persuasive.
    ${getLangPrompt(lang)}
    `;

    // Convert history format. 
    // IMPORTANT: In the Ally's eyes, the "USER" messages are its own previous turns, and "AI" messages are the opponent.
    const contents = history.map(h => ({
        role: h.role === 'USER' ? 'model' : 'user', // Invert roles for the Ally's perspective
        parts: [{ text: h.content }]
    }));

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { systemInstruction }
    });

    return response.text || "I stand by my point.";
};

export const gradeDebate = async (history: {role: string, content: string}[], topic: string, lang: Language): Promise<DebateScorecard | null> => {
    const ai = getClient();
    const systemInstruction = `
    You are a Debate Judge. Analyze the following transcript.
    Topic: ${topic}
    
    Output strictly JSON:
    {
        "winner": "USER" | "AI" | "DRAW",
        "score": number (0-100 based on User's logic/persuasion),
        "commentary": "Brief summary of the match.",
        "critical_feedback": "One major thing the user needs to improve.",
        "best_point": "The strongest argument the user made."
    }
    
    ${getLangPrompt(lang)}
    `;

    // Convert history format
    const chatStr = history.map(h => `${h.role}: ${h.content}`).join('\n');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: chatStr,
        config: { 
            systemInstruction,
            responseMimeType: "application/json" 
        }
    });

    try {
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return null;
    }
};
