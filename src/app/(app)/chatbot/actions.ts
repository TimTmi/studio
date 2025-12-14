'use server';

import { aiChatbotFeedingQuery } from "@/ai/flows/ai-chatbot-feeding-query";
import { getPetFeedingAdvice } from "@/ai/flows/ai-chatbot-general-pet-advice";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

// This function will decide which AI flow to call based on the query.
export async function getAiResponse(query: string, feederId: string | null) {
  
  // Simple keyword-based routing.
  const isFeedingHistoryQuery = 
    query.toLowerCase().includes('eat') || 
    query.toLowerCase().includes('much') || 
    query.toLowerCase().includes('last') || 
    query.toLowerCase().includes('when') ||
    query.toLowerCase().includes('week') ||
    query.toLowerCase().includes('log') ||
    query.toLowerCase().includes('history');

  try {
    let result;
    if (isFeedingHistoryQuery) {
        if (!feederId) {
            return {
                response: "I need to know which feeder you're asking about. Please link your feeder in the settings page.",
                error: null,
            };
        }
      result = await aiChatbotFeedingQuery({ query, feederId });
      return { response: result.response, error: null };
    } else {
      result = await getPetFeedingAdvice({ query });
      return { response: result.advice, error: null };
    }
  } catch (error) {
    console.error('Error calling Genkit AI flow:', error);
    return {
      response: 'Sorry, I encountered an error while trying to reach the AI service. Please try again.',
      error: 'An unexpected error occurred.',
    };
  }
}
