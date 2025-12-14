'use server';

/**
 * @fileOverview An AI chatbot to answer questions about pet feeding history.
 *
 * - aiChatbotFeedingQuery - A function that handles the AI chatbot query process.
 * - AIChatbotFeedingQueryInput - The input type for the aiChatbotFeedingQuery function.
 * - AIChatbotFeedingQueryOutput - The return type for the aiChatbotFeedingQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();


const AIChatbotFeedingQueryInputSchema = z.object({
  query: z.string().describe('The query about pet feeding history.'),
  feederId: z.string().optional().describe("The user's feeder ID. If not provided, the tool should ask the user for it."),
});
export type AIChatbotFeedingQueryInput = z.infer<typeof AIChatbotFeedingQueryInputSchema>;

const AIChatbotFeedingQueryOutputSchema = z.object({
  response: z.string().describe('The response from the AI chatbot.'),
});
export type AIChatbotFeedingQueryOutput = z.infer<typeof AIChatbotFeedingQueryOutputSchema>;

const getFeedingHistory = ai.defineTool({
  name: 'getFeedingHistory',
  description: 'Retrieves the feeding history for a specific feeder ID. The feeder ID is required.',
  inputSchema: z.object({
    feederId: z.string().describe('The ID of the feeder.'),
  }),
  outputSchema: z.array(z.object({
    timestamp: z.string(),
    portionSize: z.number(),
  })),
}, async ({ feederId }) => {
  console.log(`Tool 'getFeedingHistory' called for feederId: ${feederId}`);

  if (!feederId) {
      throw new Error("Feeder ID is required to fetch feeding history.");
  }
  
  try {
    const logsRef = db.collection(`feeders/${feederId}/feedingLogs`);
    // Get logs from the last 7 days for relevance
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

    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        timestamp: data.timestamp.toDate().toISOString(),
        portionSize: data.portionSize,
      };
    });
    
    return logs;
  } catch (error) {
      console.error("Error fetching feeding history from Firestore:", error);
      // It's often better to return an empty array and let the LLM report that it couldn't find data
      // than to throw an error that breaks the entire flow.
      return [];
  }
});

export async function aiChatbotFeedingQuery(input: AIChatbotFeedingQueryInput): Promise<AIChatbotFeedingQueryOutput> {
  return aiChatbotFeedingQueryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiChatbotFeedingQueryPrompt',
  input: {schema: AIChatbotFeedingQueryInputSchema},
  output: {schema: AIChatbotFeedingQueryOutputSchema},
  tools: [getFeedingHistory],
  prompt: `You are a helpful AI chatbot assistant for pet owners. Your task is to answer questions related to pet feeding history.
  You MUST use the 'getFeedingHistory' tool to answer any questions about feeding amounts, times, or history.
  The user's feeder ID is: {{{feederId}}}. You must pass this ID to the getFeedingHistory tool.
  If the feederId is not available, you must ask the user to provide it.
  Use the data returned from the tool to formulate a clear, friendly, and accurate response.
  Assume the current date is ${new Date().toDateString()}.

  Here is the user's query: {{{query}}}
`,
});

const aiChatbotFeedingQueryFlow = ai.defineFlow(
  {
    name: 'aiChatbotFeedingQueryFlow',
    inputSchema: AIChatbotFeedingQueryInputSchema,
    outputSchema: AIChatbotFeedingQueryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
