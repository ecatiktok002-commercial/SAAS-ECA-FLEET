import { supabase } from '../supabase';

export const validateSubscriber = (subscriberId: string | undefined | null) => {
  if (!subscriberId) {
    throw new Error('Subscriber ID is required');
  }
};

export const applySubscriberFilter = (query: any, subscriberId: string) => {
  return query.eq('subscriber_id', subscriberId);
};

export const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3, initialDelayMs = 1000): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.status === 429 || error.status === 503 || error.status === 500 || error.message?.includes('fetch');
      if (isRetryable && attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`[API Retry] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const getTenantId = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) throw new Error('Not authenticated');
  
  let sId = user.user_metadata?.subscriber_id;
  const finalId = sId || user.id;
  validateSubscriber(finalId);
  return finalId;
};

export const logSupabaseError = (context: string, error: any) => {
  console.error(`[Supabase Error - ${context}]:`, error);
};
