'use server';

import { aiChatbotFeedingQuery } from '@/ai/flows/ai-chatbot-feeding-query';

export async function getAiResponse(query: string) {
  try {
    const result = await aiChatbotFeedingQuery({ query });
    return {
      response: result.response,
      error: null,
    };
  } catch (error) {
    console.error(error);
    return {
      response: 'Sorry, I encountered an error. Please try again.',
      error: 'An unexpected error occurred.',
    };
  }
}
