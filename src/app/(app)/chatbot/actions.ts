'use server';

import { aiChatbotFeedingQuery } from '@/ai/flows/ai-chatbot-feeding-query';
import { getPetFeedingAdvice } from '@/ai/flows/ai-chatbot-general-pet-advice';

export async function getAiResponse(query: string) {
  try {
    // Simple routing based on keywords.
    // In a real app, you might use a more sophisticated approach.
    if (query.toLowerCase().includes('history') || query.toLowerCase().includes('how much')) {
        const result = await aiChatbotFeedingQuery({ query });
        return {
          response: result.response,
          error: null,
        };
    } else {
        const result = await getPetFeedingAdvice({ query });
        return {
          response: result.advice,
          error: null,
        };
    }
  } catch (error) {
    console.error(error);
    return {
      response: 'Sorry, I encountered an error. Please try again.',
      error: 'An unexpected error occurred.',
    };
  }
}
