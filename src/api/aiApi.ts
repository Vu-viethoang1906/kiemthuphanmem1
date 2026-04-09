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

const extractErrorMessage = (error: any): string => {
  const data = error?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.errMsg === 'string') return data.errMsg;
  if (typeof data?.error?.message === 'string') return data.error.message;
  if (typeof error?.message === 'string') return error.message;
  return 'Service is currently unstable, please try again later.';
};

export const generateTaskDescription = async (
  title: string,
  boardId?: string
): Promise<GenerateTaskDescriptionResponse> => {
  const maxAttempts = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await axiosInstance.post("/nlp/propose", { title, boardId });
      return res.data;
    } catch (error: any) {
      lastError = error;
      const message = extractErrorMessage(error).toLowerCase();
      const isUnstable = message.includes('unstable') || message.includes('unavailable');
      if (!isUnstable || attempt === maxAttempts) break;

      // Simple backoff for transient AI provider instability
      await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
  }

  const message = extractErrorMessage(lastError);
  return {
    status: 'error',
    data: {
      success: false,
      title,
      description: '',
      acceptanceCriteria: [],
      subtasks: [],
      error: message,
      message,
    },
  };
};
