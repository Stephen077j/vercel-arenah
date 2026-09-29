/**
 * Local Storage Authentication for Development
 * Simulates user authentication using browser localStorage
 * No backend required - perfect for rapid development
 */

interface LocalUser {
  id: string;
  email: string;
  fullname: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  password: string; // For demo only
}

interface LocalAuthStore {
  users: LocalUser[];
  currentUserId: string | null;
}

const STORAGE_KEY = 'arenah_auth_store';

// Demo users
const DEMO_USERS: LocalUser[] = [
  {
    id: 'demo-client-001',
    email: 'demo.client@arenah.com',
    fullname: 'Démo Client',
    phone: '+229 91 23 45 67',
    role: 'client',
    password: 'Demo@2024Client',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_client'
  },
  {
    id: 'demo-vip-001',
    email: 'demo.vip@arenah.com',
    fullname: 'Démo VIP',
    phone: '+229 92 34 56 78',
    role: 'client',
    password: 'Demo@2024VIP',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_vip'
  },
  {
    id: 'demo-premium-001',
    email: 'demo.premium@arenah.com',
    fullname: 'Démo Premium',
    phone: '+229 93 45 67 89',
    role: 'client',
    password: 'Demo@2024Premium',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_premium'
  }
];

/**
 * Initialize local auth store
 */
export function initializeLocalAuth() {
  const existing = localStorage.getItem(STORAGE_KEY);
  
  if (!existing) {
    const store: LocalAuthStore = {
      users: DEMO_USERS,
      currentUserId: null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
}

/**
 * Get auth store
 */
function getStore(): LocalAuthStore {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { users: DEMO_USERS, currentUserId: null };
}

/**
 * Save auth store
 */
function saveStore(store: LocalAuthStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Login user
 */
export function loginUser(email: string, password: string) {
  const store = getStore();
  const user = store.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return { success: false, error: 'Email ou mot de passe incorrect' };
  }
  
  store.currentUserId = user.id;
  saveStore(store);
  
  return { success: true, user };
}

/**
 * Register new user
 */
export function registerUser(email: string, password: string, fullname: string, phone: string) {
  const store = getStore();
  
  // Check if email exists
  if (store.users.find(u => u.email === email)) {
    return { success: false, error: 'Email déjà utilisé' };
  }
  
  const newUser: LocalUser = {
    id: `user-${Date.now()}`,
    email,
    fullname,
    phone,
    role: 'client',
    password,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
  };
  
  store.users.push(newUser);
  store.currentUserId = newUser.id;
  saveStore(store);
  
  return { success: true, user: newUser };
}

/**
 * Get current user
 */
export function getCurrentUser() {
  const store = getStore();
  if (!store.currentUserId) return null;
  
  return store.users.find(u => u.id === store.currentUserId) || null;
}

/**
 * Logout user
 */
export function logoutUser() {
  const store = getStore();
  store.currentUserId = null;
  saveStore(store);
}

/**
 * Update user profile
 */
export function updateUserProfile(updates: Partial<LocalUser>) {
  const store = getStore();
  const user = getCurrentUser();
  
  if (!user) return { success: false, error: 'Utilisateur non connecté' };
  
  const index = store.users.findIndex(u => u.id === user.id);
  if (index === -1) return { success: false, error: 'Utilisateur non trouvé' };
  
  store.users[index] = { ...store.users[index], ...updates };
  saveStore(store);
  
  return { success: true, user: store.users[index] };
}

/**
 * Get all users (for admin)
 */
export function getAllUsers() {
  const store = getStore();
  return store.users.map(u => ({ ...u, password: undefined }));
}

/**
 * Check if localStorage auth is active
 */
export function isLocalAuthMode() {
  return import.meta.env.DEV && !import.meta.env.VITE_USE_SUPABASE;
}

export default {
  initializeLocalAuth,
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  updateUserProfile,
  getAllUsers,
  isLocalAuthMode
};
