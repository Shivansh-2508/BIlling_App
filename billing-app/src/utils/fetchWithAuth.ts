import { auth } from '@/firebase/config';

// Helper to get the current user's Firebase ID token
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.getIdToken();
}

// Generic fetch wrapper for authenticated requests to Flask backend
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    const idToken = await getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    // If not authenticated, return a rejected promise
    return Promise.reject(new Error('User not authenticated'));
  }
}
