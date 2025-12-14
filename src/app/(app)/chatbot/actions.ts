
'use server';

// NOTE: The user has requested to bypass Genkit and call Hugging Face directly.
// The original Genkit flows are preserved in the file system but are no longer used by the chatbot.

type HuggingFacePayload = {
  model: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  stream?: boolean;
};

type HuggingFaceResponse = {
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string | null;
  }[];
};

export async function getAiResponse(query: string) {
  const HOST = 'https://router.huggingface.co';
  const ENDPOINT = '/novita/v3/openai/chat/completions';
  const URL = HOST + ENDPOINT;
  const TOKEN = process.env.HUGGING_FACE_TOKEN;

  if (!TOKEN) {
    console.error('Hugging Face token is not configured in .env file.');
    return {
      response: 'Sorry, the AI service is not configured correctly. The API token is missing.',
      error: 'Hugging Face token not found.',
    };
  }

  const payload: HuggingFacePayload = {
    model: 'deepseek/deepseek-v3-0324',
    messages: [{ role: 'user', content: query }],
  };

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Hugging Face API error:', response.status, errorBody);
      return {
        response: `Sorry, I encountered an API error: ${response.statusText}`,
        error: `API Error: ${response.status} ${errorBody}`,
      };
    }

    const result: HuggingFaceResponse = await response.json();

    if (result.choices && result.choices.length > 0) {
      return {
        response: result.choices[0].message.content,
        error: null,
      };
    } else {
      return {
        response: "Sorry, I received an unexpected response from the AI.",
        error: 'Invalid response structure from API.',
      };
    }

  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    return {
      response: 'Sorry, I encountered an error while trying to reach the AI service. Please try again.',
      error: 'An unexpected network error occurred.',
    };
  }
}
