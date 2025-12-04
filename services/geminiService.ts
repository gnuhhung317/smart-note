import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { getApiKey } from "./storageService";

// Use 'any' for the chat session to avoid strict type import issues with the SDK
let chatSession: any | null = null;

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found in storage");
  }
  return new GoogleGenAI({ apiKey });
};

export const initializeChat = async () => {
  try {
    const ai = getClient();
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
    await initializeChat();
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

export const synthesizeNote = async (historyContext: string): Promise<string> => {
  const ai = getClient();
  
  // Calculate review date (+3 days)
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 3);
  const nextReviewStr = nextReview.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // We use a fresh single-turn generation for the final synthesis to ensure it strictly follows formatting rules
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

export const generateSessionTitle = async (firstMessage: string): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `Generate a very short, concise title (max 4-5 words) for a note-taking session based on this initial user input. Input: "${firstMessage}". Return ONLY the title text, no quotes.`;
    
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