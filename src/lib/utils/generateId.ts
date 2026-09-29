/**
 * Generate a unique ID with fallback for environments without crypto.randomUUID
 * Works in all browsers and contexts (HTTP/HTTPS)
 */
export const generateId = (): string => {
  // Try crypto.randomUUID first (modern browsers, HTTPS)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
