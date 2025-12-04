import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

let chatSession: Chat | null = null;

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const initializeChat = async () => {
  const ai = getClient();
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, 
    },
  });
  return chatSession;
};

export const sendMessageStream = async (message: string, onChunk: (text: string) => void) => {
  if (!chatSession) {
    await initializeChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
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
  // without carrying over too much conversational baggage, although we pass the history context.
  const prompt = `
  Based on the following conversation history, create a Final Structured Note optimized for Notion import.
  
  CONVERSATION HISTORY:
  ${historyContext}
  
  REQUIREMENTS:
  1. Title (H1)
  2. Metadata: Include a line "📅 **Next Review:** ${nextReviewStr}" immediately after the title.
  3. Core Concept (Callout/Blockquote)
  4. Structured Sections (H2/H3)
  5. Mermaid Diagram (Code block)
  6. Actionable items or Review questions
  7. Tags: Analyze the content and automatically generate 3-5 relevant semantic tags (e.g., #Backend, #Learning, #Architecture, #Idea). Create a "### Tags" section at the very bottom and list them.
  
  Output ONLY the Markdown.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster formatting tasks
    }
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