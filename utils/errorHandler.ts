// utils/errorHandler.ts
export interface APIError {
  title: string;
  message: string;
  code?: string;
}

export const parseAPIError = (error: unknown, context?: string): APIError => {
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message;

    if (error.message.includes('API_KEY') || error.message.includes('api key') || error.message.includes('401') || error.message.includes('Unauthorized')) {
      title = 'Authentication Error';
      message = 'Invalid or missing API key. Please check your settings.';
      code = 'AUTH_ERROR';
    } else if (error.message.includes('CORS') || error.message.includes('cors')) {
      title = 'Connection Blocked';
      message = 'Request blocked by browser security. Try using a different provider or check your API configuration.';
      code = 'CORS_ERROR';
    } else if (error.message.includes('rate limit') || error.message.includes('429') || error.message.includes('quota')) {
      title = 'Rate Limited';
      message = 'Too many requests. Please wait a moment before trying again.';
      code = 'RATE_LIMIT';
    } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      title = 'Network Error';
      message = 'Unable to connect. Check your internet connection and try again.';
      code = 'NETWORK_ERROR';
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      title = 'Request Timeout';
      message = 'The request took too long. Please try again.';
      code = 'TIMEOUT';
    } else if (error.message.includes('Vision') || error.message.includes('vision') || error.message.includes('image')) {
      title = 'Vision Not Supported';
      message = 'This model does not support image/PDF analysis. Please switch to a vision-capable model in settings.';
      code = 'VISION_ERROR';
    } else if (error.message.includes('Google Grounding') || error.message.includes('grounding')) {
      title = 'Search Not Available';
      message = 'Live job search requires Google Gemini with Grounding enabled. Please update your settings.';
      code = 'GROUNDING_ERROR';
    } else if (error.message.includes('JSON') || error.message.includes('parse') || error.message.includes('Unexpected token')) {
      title = 'Response Error';
      message = 'Failed to parse AI response. The model may have returned invalid data.';
      code = 'PARSE_ERROR';
    } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      title = 'Server Error';
      message = 'The AI service is temporarily unavailable. Please try again later.';
      code = 'SERVER_ERROR';
    } else if (error.message.includes('model') || error.message.includes('Model')) {
      title = 'Model Error';
      message = 'The selected model is unavailable or invalid. Please check your settings.';
      code = 'MODEL_ERROR';
    } else if (error.message.includes('content') || error.message.includes('safety') || error.message.includes('blocked')) {
      title = 'Content Blocked';
      message = 'The request was blocked by content safety filters. Try rephrasing your input.';
      code = 'CONTENT_BLOCKED';
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  if (context) {
    title = `${context}: ${title}`;
  }

  return { title, message, code };
};

export type ToastFunctions = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  toast: ToastFunctions,
  context?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (err) {
    const { title, message } = parseAPIError(err, context);
    toast.error(title, message);
    console.error(`[${context || 'Error'}]:`, err);
    return null;
  }
};