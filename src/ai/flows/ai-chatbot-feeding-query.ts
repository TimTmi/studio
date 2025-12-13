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

const AIChatbotFeedingQueryInputSchema = z.object({
  query: z.string().describe('The query about pet feeding history.'),
});
export type AIChatbotFeedingQueryInput = z.infer<typeof AIChatbotFeedingQueryInputSchema>;

const AIChatbotFeedingQueryOutputSchema = z.object({
  response: z.string().describe('The response from the AI chatbot.'),
});
export type AIChatbotFeedingQueryOutput = z.infer<typeof AIChatbotFeedingQueryOutputSchema>;

const getFeedingHistory = ai.defineTool({
  name: 'getFeedingHistory',
  description: 'Retrieves the feeding history of a pet.',
  inputSchema: z.object({
    petId: z.string().describe('The ID of the pet.'),
    startDate: z.string().describe('The start date for the feeding history (YYYY-MM-DD).'),
    endDate: z.string().describe('The end date for the feeding history (YYYY-MM-DD).'),
  }),
  outputSchema: z.array(z.object({
    timestamp: z.string(),
    amount: z.number(),
  })),
}, async (input) => {
  console.log('Tool called with input:', input);
  // TODO: Implement the actual data retrieval logic here.
  // Replace this with actual database or MQTT data access.
  // For now, return dummy data.
  return [
    { timestamp: '2024-07-24T08:00:00Z', amount: 0.5 },
    { timestamp: '2024-07-24T12:00:00Z', amount: 0.3 },
    { timestamp: '2024-07-24T18:00:00Z', amount: 0.4 },
  ];
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

  If the user asks a question that requires specific feeding history data, use the getFeedingHistory tool to retrieve the data. Otherwise, answer the question based on your general knowledge.

  Here is the user's query: {{{query}}}

  If the user asks about the feeding history for a specific pet, you can use the getFeedingHistory tool to retrieve the relevant information. You will need the petId, startDate, and endDate.
  Assume the current date if no date is specified.

  Make sure to cite your sources if you use external information, and be polite.
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
