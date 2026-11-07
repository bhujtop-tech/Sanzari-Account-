import { processSanzariAiQuery, StoreContextData } from './aiEngine';

export interface AiProposedAction {
  type: 'sale' | 'expense' | 'payment' | 'transfer' | 'purchase';
  description: string;
  data?: any;
}

export interface AiResponse {
  answer: string;
  proposedAction?: AiProposedAction;
  suggestions?: string[];
}

export async function askAiAssistant(
  question: string,
  contextData: any
): Promise<AiResponse> {
  try {
    const response = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: question,
        context: contextData,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.answer) {
        return { answer: data.answer };
      }
    }
  } catch (err) {
    console.warn('Gemini API endpoint fallback:', err);
  }

  // Fallback to local intelligence engine if server endpoint is offline or building
  const localResult = processSanzariAiQuery(question, contextData as StoreContextData);
  return {
    answer: localResult.answer,
    proposedAction: localResult.proposedAction,
    suggestions: localResult.suggestions,
  };
}
