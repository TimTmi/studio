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

const FeedingLogDataSchema = z.object({
    timestamp: z.string(),
    portionSize: z.number(),
});
export type FeedingLogData = z.infer<typeof FeedingLogDataSchema>;


const AIChatbotFeedingQueryInputSchema = z.object({
  query: z.string().describe('The query about pet feeding history.'),
  feederId: z.string().optional().describe("The user's feeder ID."),
  feedingHistory: z.array(FeedingLogDataSchema).describe("An array of recent feeding log objects."),
});
export type AIChatbotFeedingQueryInput = z.infer<typeof AIChatbotFeedingQueryInputSchema>;

const AIChatbotFeedingQueryOutputSchema = z.object({
  response: z.string().describe('The response from the AI chatbot.'),
});
export type AIChatbotFeedingQueryOutput = z.infer<typeof AIChatbotFeedingQueryOutputSchema>;


export async function aiChatbotFeedingQuery(input: AIChatbotFeedingQueryInput): Promise<AIChatbotFeedingQueryOutput> {
  return aiChatbotFeedingQueryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiChatbotFeedingQueryPrompt',
  input: {schema: AIChatbotFeedingQueryInputSchema},
  output: {schema: AIChatbotFeedingQueryOutputSchema},
  prompt: `You are a helpful AI chatbot assistant for pet owners. Your task is to answer questions related to pet feeding history.
  You have been provided with the user's recent feeding history in the 'feedingHistory' field.
  Use this data to formulate a clear, friendly, and accurate response to the user's query.
  If the feeding history is empty, inform the user that you couldn't find any recent feeding data.
  Do not ask for a feeder ID, just use the data you've been given.
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
