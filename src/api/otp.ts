import { api } from './client';

export const otpApi = {
  send:   (purpose: string)               => api.post('/api/otp/send', { purpose }),
  verify: (code: string, purpose: string) => api.post('/api/otp/verify', { code, purpose }),
};
