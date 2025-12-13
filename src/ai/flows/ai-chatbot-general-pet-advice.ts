'use server';
/**
 * @fileOverview An AI chatbot that provides general advice on pet feeding.
 *
 * - getPetFeedingAdvice - A function that handles the pet feeding advice process.
 * - GetPetFeedingAdviceInput - The input type for the getPetFeedingAdvice function.
 * - GetPetFeedingAdviceOutput - The return type for the getPetFeedingAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetPetFeedingAdviceInputSchema = z.object({
  query: z.string().describe('The user query about pet feeding.'),
});
export type GetPetFeedingAdviceInput = z.infer<typeof GetPetFeedingAdviceInputSchema>;

const GetPetFeedingAdviceOutputSchema = z.object({
  advice: z.string().describe('The AI chatbot response to the user query.'),
});
export type GetPetFeedingAdviceOutput = z.infer<typeof GetPetFeedingAdviceOutputSchema>;

export async function getPetFeedingAdvice(input: GetPetFeedingAdviceInput): Promise<GetPetFeedingAdviceOutput> {
  return getPetFeedingAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getPetFeedingAdvicePrompt',
  input: {schema: GetPetFeedingAdviceInputSchema},
  output: {schema: GetPetFeedingAdviceOutputSchema},
  prompt: `You are an AI chatbot assistant specializing in providing general advice about pet feeding.
  Use your knowledge base to answer the following user query about pet feeding:

  Query: {{{query}}}

  Response: `,
});

const getPetFeedingAdviceFlow = ai.defineFlow(
  {
    name: 'getPetFeedingAdviceFlow',
    inputSchema: GetPetFeedingAdviceInputSchema,
    outputSchema: GetPetFeedingAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
