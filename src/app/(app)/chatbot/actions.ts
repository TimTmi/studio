'use server';

import type { FeedingLogData } from "@/ai/flows/ai-chatbot-feeding-query";
import * as admin from 'firebase-admin';
import { format, startOfDay, endOfDay, subDays, startOfTomorrow, endOfTomorrow } from 'date-fns';

// This is safe to run on the server
if (!admin.apps.length) {
  // Check for production environment to use default credentials
  try {
      admin.initializeApp();
  } catch (e) {
      console.warn("Could not initialize Firebase Admin SDK. Data-related queries might fail if not in a Firebase environment.");
  }
}

const db = admin.firestore();

async function getFeederLogs(feederId: string, startDate?: Date, endDate?: Date): Promise<FeedingLogData[]> {
    if (!feederId) return [];
    try {
        let query: admin.firestore.Query = db.collection(`feeders/${feederId}/feedingLogs`);

        if (startDate) {
            query = query.where('timestamp', '>=', startDate);
        }
        if (endDate) {
            query = query.where('timestamp', '<=', endDate);
        }
        
        query = query.orderBy('timestamp', 'desc').limit(100);

        const snapshot = await query.get();

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

async function getSchedulesForTomorrow(feederId: string) {
    if (!feederId) return [];
    try {
        const schedulesRef = db.collection(`feeders/${feederId}/feedingSchedules`);
        const snapshot = await schedulesRef
            .where('scheduledTime', '>=', startOfTomorrow())
            .where('scheduledTime', '<=', endOfTomorrow())
            .orderBy('scheduledTime', 'asc')
            .get();
        
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                time: data.scheduledTime.toDate().toISOString(),
            };
        });

    } catch (error) {
        console.error("Error fetching schedules from Firestore:", error);
        return [];
    }
}


// This function will call the Hugging Face model.
export async function getAiResponse(
    userQuery: string,
    feederId: string | null,
    questionKey?: string
) {
  let finalPrompt = userQuery;

  // If a question key is provided, it's a "smart" button click
  if (questionKey && feederId) {
     if (!feederId) {
      return {
        response: "I need to know which feeder you're asking about. Please link your feeder in the settings page.",
        error: null,
      };
    }

    let contextData = '';

    switch (questionKey) {
        case 'EAT_TODAY': {
            const logs = await getFeederLogs(feederId, startOfDay(new Date()), endOfDay(new Date()));
            if (logs.length > 0) {
                const total = logs.reduce((sum, log) => sum + log.portionSize, 0);
                contextData = `Today's feeding logs show a total of ${total.toFixed(2)} grams dispensed across ${logs.length} feedings.`;
            } else {
                contextData = "There are no feeding logs for today.";
            }
            break;
        }
        case 'LAST_FEEDING': {
            const logs = await getFeederLogs(feederId); // Gets latest by default
            if (logs.length > 0) {
                contextData = `The last feeding was at ${new Date(logs[0].timestamp).toLocaleString()}, and ${logs[0].portionSize} grams were dispensed.`;
            } else {
                contextData = "There is no feeding history available.";
            }
            break;
        }
        case 'SCHEDULE_TOMORROW': {
            const schedules = await getSchedulesForTomorrow(feederId);
             if (schedules.length > 0) {
                const scheduleStrings = schedules.map(s => `- At ${new Date(s.time).toLocaleTimeString()}, a feeding is scheduled.`);
                contextData = `Here are the feeding schedules for tomorrow:\n${scheduleStrings.join('\n')}`;
            } else {
                contextData = "There are no feedings scheduled for tomorrow.";
            }
            break;
        }
        case 'SUMMARY_LAST_WEEK': {
            const logs = await getFeederLogs(feederId, subDays(new Date(), 7), new Date());
             if (logs.length > 0) {
                const historyString = logs.map(log => `- At ${new Date(log.timestamp).toLocaleString()}, ${log.portionSize} grams were dispensed.`).join('\n');
                contextData = `Here is the feeding history for the last 7 days:\n${historyString}`;
            } else {
                contextData = "There is no feeding history for the last 7 days.";
            }
            break;
        }
    }

    finalPrompt = `Based on the following information, please answer the user's question.
    
    Context from feeder:
    ${contextData}

    User's Question: ${userQuery}

    Please provide a friendly, natural language response based on the context.
    `;

  } else {
    // This branch handles general typed queries
    const isFeedingHistoryQuery = 
        userQuery.toLowerCase().includes('eat') || 
        userQuery.toLowerCase().includes('much') || 
        userQuery.toLowerCase().includes('last') || 
        userQuery.toLowerCase().includes('when') ||
        userQuery.toLowerCase().includes('week') ||
        userQuery.toLowerCase().includes('log') ||
        userQuery.toLowerCase().includes('history');
    
    if (isFeedingHistoryQuery && feederId) {
        const feedingHistory = await getFeederLogs(feederId);
        if (feedingHistory.length > 0) {
            const historyString = feedingHistory.map(log => `- At ${new Date(log.timestamp).toLocaleString()}, ${log.portionSize} grams were dispensed.`).join('\n');
            finalPrompt = `Based on the following feeding history, please answer the user's question.
            
            Feeding History:
            ${historyString}

            User's Question: ${userQuery}
            `;
        } else {
            finalPrompt = `The user asked '${userQuery}', but there is no feeding history available for their feeder. Please inform them of this fact in a friendly way.`;
        }
    } else if (isFeedingHistoryQuery && !feederId) {
        return {
            response: "I need to know which feeder you're asking about to answer that. Please link your feeder in the settings page.",
            error: null,
        };
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
      { role: "system", content: "You are a helpful AI assistant for a pet feeder app. Answer the user's questions based on the context provided. Be friendly and conversational."},
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
