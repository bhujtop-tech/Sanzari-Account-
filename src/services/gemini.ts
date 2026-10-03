import { Wallet, Customer, Product, Sale, Expense, Payment, Purchase } from '../types';
import { processSanzariAiQuery, StoreContextData, AiEngineResponse } from './aiEngine';

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
  contextData: StoreContextData
): Promise<AiResponse> {
  // Built-in offline NLP engine (No external Gemini API key required)
  const result: AiEngineResponse = processSanzariAiQuery(question, contextData);
  return {
    answer: result.answer,
    proposedAction: result.proposedAction,
    suggestions: result.suggestions,
  };
}
