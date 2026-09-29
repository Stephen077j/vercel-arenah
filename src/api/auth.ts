import { api, setToken, clearToken } from './client.js';

export interface User {
  id: string;
  email: string;
  fullname: string;
  phone: string;
  avatar_url: string | null;
  role: string;
  module_assigned?: string | null; // présent pour admin_module
  profile?: {
    bio: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
}

interface AuthResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await api.post<AuthResponse>('/api/auth/login', { email, password });
  setToken(data.token);
  return data.user;
}

export async function register(email: string, password: string, fullname: string, phone?: string, ref_code?: string): Promise<User> {
  const data = await api.post<AuthResponse>('/api/auth/register', { email, password, fullname, phone, ref_code });
  setToken(data.token);
  return data.user;
}

export function logout(): void {
  clearToken();
}

export function getMe(): Promise<User> {
  return api.get<User>('/api/auth/me');
}

export function updateMe(data: {
  fullname?: string;
  phone?: string;
  avatar_url?: string;
  password?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
}): Promise<{ success: boolean }> {
  return api.patch('/api/auth/me', data);
}
