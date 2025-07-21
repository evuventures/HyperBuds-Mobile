// src/api/auth.ts

export interface RegisterPayload {
  firstName?: string;
  lastName?: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
}

export interface User {
  uid: string;
  email: string;
  username: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  createdAt?: string;
  lastSignIn?: string;
}

const BASE_URL = 'https://www.hyperbuds.com/api/auth';

async function safeFetch<T>(
  endpoint: string,
  options: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include', // for session cookies
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || res.statusText);
  }
  return json;
}

// Register a new user
export function registerUser(
  data: RegisterPayload
): Promise<{ message: string; user: User }> {
  return safeFetch<{ message: string; user: User }>(
    '/register',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

// Send forgot-password email
export function forgotPassword(
  email: string
): Promise<{ message: string }> {
  return safeFetch<{ message: string }>(
    '/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  );
}

// Create a session cookie given a Firebase ID token
export function createSession(
  idToken: string
): Promise<{ message: string; user: User }> {
  return safeFetch<{ message: string; user: User }>(
    '/session',
    {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }
  );
}

// Retrieve current session (if any)
export function getSession(
): Promise<{ message: string; user: User }> {
  return safeFetch<{ message: string; user: User }>(
    '/session',
    { method: 'GET' }
  );
}

// Logout (delete session cookie)
export function logout(
): Promise<{ message: string }> {
  return safeFetch<{ message: string }>(
    '/session',
    { method: 'DELETE' }
  );
}
