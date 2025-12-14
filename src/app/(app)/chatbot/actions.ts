'use server';

import type { FeedingLogData } from "@/ai/flows/ai-chatbot-feeding-query";
import * as admin from 'firebase-admin';

// This is safe to run on the server
if (!admin.apps.length) {
  // Check for production environment to use default credentials
  if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
  } else {
    // In local development, you might need to initialize with service account credentials
    // For now, we assume this is handled or not needed for this specific action.
    try {
        admin.initializeApp();
    } catch (e) {
        console.warn("Could not initialize Firebase Admin SDK. Data-related queries might fail if not in a Firebase environment.");
    }
  }
}

const db = admin.firestore();


async function getFeederLogs(feederId: string): Promise<FeedingLogData[]> {
    if (!feederId) return [];
    try {
        const logsRef = db.collection(`feeders/${feederId}/feedingLogs`);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const snapshot = await logsRef
            .where('timestamp', '>=', sevenDaysAgo)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                timestamp: data.timestamp.toDate().toISOString(),
                portionSize: data.portionSize,
            };
        });
    } catch (error) {
        console.error("Error fetching feeding history from Firestore:", error);
        return [];
    }
}


// This function will call the Hugging Face model.
export async function getAiResponse(query: string, feederId: string | null) {
  
  const isFeedingHistoryQuery = 
    query.toLowerCase().includes('eat') || 
    query.toLowerCase().includes('much') || 
    query.toLowerCase().includes('last') || 
    query.toLowerCase().includes('when') ||
    query.toLowerCase().includes('week') ||
    query.toLowerCase().includes('log') ||
    query.toLowerCase().includes('history');
  
  let finalPrompt = query;

  if (isFeedingHistoryQuery) {
    if (!feederId) {
      return {
        response: "I need to know which feeder you're asking about. Please link your feeder in the settings page.",
        error: null,
      };
    }
    const feedingHistory = await getFeederLogs(feederId);
    if (feedingHistory.length > 0) {
        const historyString = feedingHistory.map(log => `- At ${new Date(log.timestamp).toLocaleString()}, ${log.portionSize} grams were dispensed.`).join('\n');
        finalPrompt = `Based on the following feeding history, please answer the user's question.
        
        Feeding History:
        ${historyString}

        User's Question: ${query}
        `;
    } else {
        finalPrompt = `The user asked '${query}', but there is no feeding history available for their feeder. Please inform them of this fact in a friendly way.`;
    }
  }

  const HOST = "router.huggingface.co";
  const ENDPOINT = "/novita/v3/openai/chat/completions";
  const TOKEN = process.env.HUGGING_FACE_TOKEN;

  if (!TOKEN) {
    console.error('Hugging Face token not found in environment variables.');
    return {
      response: 'Sorry, the AI service is not configured correctly. The API token is missing.',
      error: 'Configuration error.',
    };
  }

  const payload = {
    messages: [
      { role: "user", content: finalPrompt }
    ],
    model: "deepseek/deepseek-v3-0324",
  };

  try {
    const response = await fetch(`https://${HOST}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Hugging Face API error:', response.status, errorText);
        return {
          response: `Sorry, I encountered an error while contacting the AI service (Status: ${response.status}).`,
          error: 'API error',
        };
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message?.content || 'Sorry, I could not get a response.';
    
    return { response: message, error: null };

  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    return {
      response: 'Sorry, I encountered an error while trying to reach the AI service. Please try again.',
      error: 'An unexpected error occurred.',
    };
  }
}
