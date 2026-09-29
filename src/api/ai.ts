import { api } from './client';

export type Sentiment = 'positif' | 'negatif' | 'neutre';

export type Engine = 'memory' | 'naive_bayes' | 'neural' | 'context';

export interface ChatItem { title: string; subtitle?: string; price?: string }
export interface ChatAction { label: string; to: string }
export interface ChatReply {
  text: string;
  intent: string | null;
  confidence: number;
  entities: { date?: string; dateLabel?: string; persons?: number; nights?: number; budget?: number };
  corrections?: { from: string; to: string }[];
  engine?: Engine | null;
  neighbor?: string;
  logId?: string;
  items?: ChatItem[];
  actions?: ChatAction[];
  suggestions?: string[];
}

export interface ReviewAnalysis {
  sentiment: Sentiment;
  confidence: number;
  score: number;
  textSentiment: Sentiment | null;
  aspects: { id: string; label: string; sentiment: Sentiment }[];
  keywords: string[];
  inconsistent: boolean;
  corrected?: boolean;
}

export interface AnalyzedReview {
  id: string; module: string; rating: number; comment: string | null;
  fullname: string; created_at: string; analysis: ReviewAnalysis;
}

type Counts = Record<Sentiment, number>;

export interface ReviewsDashboard {
  total: number;
  totals: Counts;
  satisfaction: number;
  insights: string[];
  byModule: (Counts & { module: string; total: number; avgRating: number })[];
  aspects: (Counts & { id: string; label: string; total: number })[];
  keywords: Record<'positif' | 'negatif', { word: string; count: number }[]>;
  trend: { week: string; count: number; satisfaction: number }[];
  alerts: AnalyzedReview[];
  reviews: AnalyzedReview[];
}

export interface Evaluation {
  accuracy: number; total: number; correct: number; labels: string[];
  confusion: Record<string, Record<string, number>>;
  perClass: Record<string, { precision: number; recall: number; f1: number; support: number }>;
}

export interface ModelVersion {
  model: 'chatbot' | 'sentiment'; examples: number; learned: number;
  accuracy: number | null; test_accuracy: number | null; reason: string | null; trained_at: string;
}

export interface LearningReport {
  intents: string[];
  threshold: number;
  stats: {
    total: number; week: number; understoodRate: number | null; pending: number;
    thumbsUp: number; thumbsDown: number; learnedChatbot: number; learnedSentiment: number;
  };
  queue: { id: string; message: string; predicted_intent: string | null; confidence: number; understood: boolean; feedback: 'up' | 'down' | null; engine: Engine | null; created_at: string }[];
  examples: { id: string; model: 'chatbot' | 'sentiment'; text: string; label: string; source: string; created_at: string; created_by: string | null }[];
  versions: ModelVersion[];
  topMissed: { intent: string; n: number }[];
}

export interface ModelsReport {
  sentiment: { algorithm: string; examples: number; learned: number; vocabulary: number; crossValidation: Evaluation };
  chatbot: { algorithm: string; examples: number; learned: number; vocabulary: number; intents: number; crossValidation: Evaluation; testSet: Evaluation };
  history: ModelVersion[];
  neural: {
    status: 'off' | 'loading' | 'ready' | 'error'; model: string; examples: number; error?: string;
    thresholds: { naiveBayesTrusted: number; minAgreement: number; minSimilarity: number };
    comparison: {
      neuralReady: boolean;
      sets: { name: string; total: number; naiveBayes: number; hybrid: number }[];
      outOfScope: { total: number; naiveBayesRejected: number; hybridRejected: number };
    };
  };
  recommender: { algorithm: string; users?: number; tested?: number; topN?: number; hitRateAI?: number | null; hitRatePopularity?: number | null };
}

export const aiApi = {
  chat: (message: string, previousIntent?: string | null) =>
    api.post<ChatReply>('/api/ai/chat', { message, previousIntent }),
  sentiment: (text: string, rating?: number) =>
    api.post<ReviewAnalysis>('/api/ai/sentiment', { text, rating }),
  reviewsAnalysis: () => api.get<ReviewsDashboard>('/api/ai/reviews-analysis'),
  models: () => api.get<ModelsReport>('/api/ai/models'),

  // Apprentissage continu
  feedback: (logId: string, helpful: boolean) => api.post<{ success: boolean }>(`/api/ai/chat/${logId}/feedback`, { helpful }),
  learning: () => api.get<LearningReport>('/api/ai/learning'),
  learnFromLog: (logId: string, intent: string) => api.post<{ success: boolean }>(`/api/ai/learning/chat/${logId}`, { intent }),
  ignoreLog: (logId: string) => api.post<{ success: boolean }>(`/api/ai/learning/chat/${logId}`, { ignore: true }),
  addChatExample: (text: string, intent: string) => api.post<{ success: boolean }>('/api/ai/learning/chatbot', { text, intent }),
  correctSentiment: (label: Sentiment, opts: { reviewId?: string; text?: string }) =>
    api.post<{ success: boolean; analysis: ReviewAnalysis }>('/api/ai/learning/sentiment', { label, ...opts }),
  forgetExample: (id: string) => api.delete<{ success: boolean }>(`/api/ai/learning/examples/${id}`),
};
