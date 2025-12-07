


import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { getApiKey } from "./storageService";
import { SixHatsResult, DecisionResult, DebateDifficulty, DebateScorecard, Language, ThinkTankPersonas, FiveWhysResult, DevilsDictionaryResult } from "../types";

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

// --- DYNAMIC THINK TANK SERVICES ---

export const getThinkTankPersonas = async (userIdea: string, lang: Language): Promise<ThinkTankPersonas | null> => {
    const ai = getClient();
    const systemInstruction = `
    Role: You are an AI Manager. Your task is to analyze the user's request and assign 2 'Personas' to discuss it.
    IMPORTANT: The two personas must have CONTRASTING viewpoints or complementary but distinct expertise to foster deep discussion.
    
    Return strict JSON:
    {
      "persona_a": {
        "role": "Role Name (e.g. Literary Critic)",
        "goal": "Primary Goal (e.g. Ensure plot logic)"
      },
      "persona_b": {
        "role": "Role Name (e.g. Historical Expert)",
        "goal": "Primary Goal (e.g. Verify historical accuracy)"
      }
    }
    ${getLangPrompt(lang)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userIdea,
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

export const runThinkTankTurn = async (
    history: {role: string, content: string}[], 
    userIdea: string,
    currentPersona: {role: string, goal: string}, 
    partnerPersona: {role: string, goal: string},
    currentRound: number,
    maxRounds: number,
    lang: Language
): Promise<string> => {
    const ai = getClient();
    
    // Check if the last message was from Manager/User
    const lastMessage = history[history.length - 1];
    const isManagerIntervention = lastMessage && lastMessage.role === 'Manager';

    // Dynamic instructions based on progress
    let phaseInstruction = "";
    if (currentRound <= 2) {
        phaseInstruction = "Phase: EXPLORATION. Generate diverse ideas. Do not agree too early. Challenge assumptions. Offer new angles.";
    } else if (currentRound < maxRounds - 1) {
        phaseInstruction = "Phase: CRITIQUE & REFINE. Find flaws in the partner's ideas and propose fixes. Deepen the details.";
    } else {
        phaseInstruction = "Phase: CONVERGENCE. Start wrapping up the main points. Work towards a consensus solution.";
    }

    // Override phase instruction if Manager intervenes
    if (isManagerIntervention) {
        phaseInstruction = `
        ⚠️ CRITICAL OVERRIDE: THE MANAGER HAS SPOKEN.
        The last message is from the "Manager" (User).
        You MUST acknowledge their feedback immediately.
        Pivot your discussion to address the Manager's concern or direction.
        Do not ignore the Manager.
        `;
    }

    const systemInstruction = `
# CONTEXT
You are participating in a deep Brainstorming session.
Your Role: ${currentPersona.role}
Your Goal: ${currentPersona.goal}
Your Partner: ${partnerPersona.role}
Current Round: ${currentRound} of ${maxRounds}
${phaseInstruction}

# USER IDEA
"${userIdea}"

# INSTRUCTIONS
1. **Analyze & Expand:** Based on your expertise, add ideas, point out flaws, or suggest improvements to the original idea.
2. **Interact:** Read your partner's opinions carefully (in chat history) to counter or supplement. Do not repeat what has been said.
3. **Attitude:** Professional, Constructive, Insightful.
4. **Stop Condition (IMPORTANT):**
   - You MUST continue discussing until at least Round ${maxRounds - 1}.
   - ONLY if you are in the final rounds AND the idea is fully mature, end with token: [[DONE]]
   - Otherwise, end with a provocative question or a new angle to keep the discussion alive.

# FORMAT
Present your opinion clearly using bullet points.
${getLangPrompt(lang)}
    `;

    // Convert history for model (flattened context)
    const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n\n');
    const prompt = `Conversation History So Far:\n${historyText}\n\nYour Turn (${currentPersona.role}):`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
    });

    return response.text || "...";
};

export const synthesizeThinkTank = async (
    history: {role: string, content: string}[], 
    userIdea: string,
    lang: Language
): Promise<string> => {
    const ai = getClient();
    const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n\n');
    
    const systemInstruction = `
# TASK
You have observed a discussion between two experts about the idea: "${userIdea}".

Task: Synthesize this into a complete Plan/Content. 
Remove redundant arguments, keep only the finalized solution and key insights.
Use Markdown with H2, H3, Bullet points.
${getLangPrompt(lang)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: historyText,
        config: { systemInstruction }
    });

    return response.text || "Failed to synthesize.";
}

// --- SHADOW WORK SERVICE ---

export const runShadowWorkChat = async (
    history: {role: string, content: string}[], 
    message: string, 
    lang: Language
): Promise<string> => {
    const ai = getClient();
    
    const systemInstruction = `
    # ROLE
    You are a "Shadow Work Companion" (based on Carl Jung's psychology).
    Your Purpose: To help the user uncover hidden subconscious triggers, repressed emotions, and the "Shadow Self".
    
    # CRITICAL RULES
    1. **NO ADVICE**: Do not offer solutions, fixes, or superficial comfort. Do not say "You should try X" or "Everything will be okay".
    2. **BE A MIRROR**: Reflect the user's emotion back to them.
    3. **ASK "THE ORIGIN"**:
       - "When was the first time you felt this specific sensation?"
       - "Who does this person remind you of?"
       - "What part of *you* feels threatened by this?"
    4. **TONE**: Calm, slow, intimate, non-judgmental, slightly mysterious but safe.
    5. **SAFETY**: If the user expresses intent of self-harm, IMMEDIATELY provide standard safety resources and stop the shadow work.

    # GOAL
    Move the user from "Reacting to the outside world" to "Looking inward".
    
    ${getLangPrompt(lang)}
    `;

    // Flatten history for context
    const chatContents = history.map(h => ({
        role: h.role === 'AI' ? 'model' : 'user',
        parts: [{ text: h.content }]
    }));

    // Add current user message
    const contents = [...chatContents, { role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { systemInstruction }
    });

    return response.text || "...";
};

// --- 5 WHYS SERVICES ---

export const getFiveWhysQuestion = async (
    history: {question: string, answer: string}[], 
    originalProblem: string,
    lang: Language
): Promise<string> => {
    const ai = getClient();
    
    // Create prompt from history
    const context = history.map((h, i) => `Why ${i+1}: ${h.question}\nAnswer ${i+1}: ${h.answer}`).join('\n\n');
    const previousAnswer = history.length > 0 ? history[history.length - 1].answer : originalProblem;

    const systemInstruction = `
    You are a "5 Whys" Investigator (Toyota Method).
    Your Goal: Ask the next logical "Why?" question to dig deeper into the user's last answer.
    
    Rules:
    1. Be concise (max 15 words).
    2. Do NOT solve the problem yet. Just probe.
    3. Focus on process/system failures, not blaming individuals.
    4. Return ONLY the question string.
    
    ${getLangPrompt(lang)}
    `;

    const prompt = `
    Original Problem: "${originalProblem}"
    Past Chain:
    ${context}
    
    User's Last Answer: "${previousAnswer}"
    
    Generate the next "Why?" question:
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
    });

    return response.text || "Why?";
};

export const getFiveWhysAnalysis = async (
    history: {question: string, answer: string}[],
    originalProblem: string,
    lang: Language
): Promise<FiveWhysResult | null> => {
    const ai = getClient();
    const context = history.map((h, i) => `Level ${i+1}: ${h.question} -> ${h.answer}`).join('\n');
    
    const systemInstruction = `
    You are a "Root Cause Master". Analyze the 5 Whys chain.
    
    Output JSON:
    {
      "root_cause": "The fundamental systemic failure (not just a symptom).",
      "solution": "A concrete, actionable fix for the root cause.",
      "advice": "One piece of wisdom about this type of problem."
    }
    ${getLangPrompt(lang)}
    `;

    const prompt = `
    Problem: ${originalProblem}
    Investigation Chain:
    ${context}
    `;

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
        console.error("Failed to parse 5 Whys JSON", e);
        return null;
    }
};

// --- DEVIL'S DICTIONARY SERVICE ---

export const runDevilsDictionary = async (word: string, lang: Language): Promise<DevilsDictionaryResult | null> => {
    const ai = getClient();
    
    const systemInstruction = `
    # ROLE
    You are the author of "The Devil's Dictionary" (reincarnated Ambrose Bierce & Oscar Wilde).
    
    # TASK
    Redefine the user's word with pure cynicism, satire, irony, and dark humor.
    
    # RULES
    1. **NO LITERAL DEFINITIONS**: Do not explain what the word actually means.
    2. **STYLE**: Aphoristic, sharp, witty, slightly cruel but deeply true.
    3. **TONE**: Victorian cynicism mixed with modern despair.
    
    # OUTPUT JSON
    {
      "word": "The input word (capitalized)",
      "definition": "The satirical definition (1-2 sentences max).",
      "usage": "A context sentence using the word in a cynical way."
    }
    
    ${getLangPrompt(lang)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: word,
        config: { 
            systemInstruction,
            responseMimeType: "application/json"
        }
    });

    try {
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse Devil's Dictionary JSON", e);
        return null;
    }
};
