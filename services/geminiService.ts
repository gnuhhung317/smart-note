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
  Role: You are the "Synthesizer" defined in the System Instructions.
  Task: Transform the following conversation history into a finalized, structured Notion note.

  CONVERSATION HISTORY:
  ${historyContext}

  SYNTHESIS RULES:
  1. **Context First**: Start with the core concept/why.
  2. **Visualize**: You MUST generate a Mermaid diagram for processes/flows.
  3. **Preserve Depth**: Do not summarize away technical details. Keep specific config names, error codes, and numbers.
  4. **Critical Thinking**: Analyze trade-offs explicitly.

  STRICT OUTPUT FORMAT (Markdown):

  # [Title]

  📅 **Next Review:** ${nextReviewStr}

  > 💡 **Core Concept:** [Simple ELI5 definition]

  ## 1. Technical Deep Dive 🔧
  *   **Implementation**: Explain the 'Under the hood' architecture and workflow. Retain technical depth.
  *   **Visual**:
  \`\`\`mermaid
  [Insert graph LR or sequenceDiagram here]
  \`\`\`

  ## 2. Critical Analysis ⚖️
  *   **Trade-offs Table**:
  | ✅ Pros | ❌ Cons/Risks | ⚠️ When NOT to use |
  | :--- | :--- | :--- |
  | [Content] | [Content] | [Content] |

  ## 3. First Principles 🧠
  *   **Origin**: Why does this exist? What problem does it solve fundamentally?

  ### Tags
  [#Tag1, #Tag2, #Tag3]
  
  Output ONLY the Markdown content.
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