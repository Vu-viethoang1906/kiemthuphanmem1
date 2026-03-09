import axiosInstance from "./axiosInstance";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    timestamp: string;
  };
}

/**
 * Send a message to AI chatbot
 * @param data - Chat request with message and optional history
 * @returns AI response
 */
export const sendChatMessage = async (data: ChatRequest): Promise<ChatResponse> => {
  const res = await axiosInstance.post("/ai/chat", data);
  return res.data;
};

/**
 * Get AI suggestions based on context
 * @param context - Current context (board, task, etc.)
 * @returns AI suggestions
 */
export const getAISuggestions = async (context: string): Promise<any> => {
  const res = await axiosInstance.post("/ai/suggestions", { context });
  return res.data;
};

/**
 * Generate task description, acceptance criteria, and subtasks using AI
 * @param title - Task title
 * @param boardId - Optional board ID for context
 * @returns AI generated task details
 */
export interface GenerateTaskDescriptionResponse {
  status: string;
  data: {
    success: boolean;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    subtasks: string[];
    error?: string;
    message?: string;
  };
}

export const generateTaskDescription = async (
  title: string,
  boardId?: string
): Promise<GenerateTaskDescriptionResponse> => {
  const res = await axiosInstance.post("/nlp/propose", { title, boardId });
  return res.data;
};
