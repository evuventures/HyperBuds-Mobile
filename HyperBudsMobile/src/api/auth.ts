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
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  const contentType = res.headers.get('Content-Type') || '';
  let text = '';
  let data: any = {};

  try {
    text = await res.text();
    if (contentType.includes('application/json') && text) {
      data = JSON.parse(text);
    }
  } catch (parseErr) {
    console.warn(`safeFetch parse error @ ${endpoint}`, parseErr, '\nraw:', text);
  }

  if (!res.ok) {
    const msg = data?.message || res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  return data as T;
}

export function registerUser(
  payload: RegisterPayload
): Promise<{ message: string; user: User }> {
  return safeFetch('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(
  email: string
): Promise<{ message: string }> {
  return safeFetch('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function createSession(
  idToken: string
): Promise<{ message: string; user: User }> {
  return safeFetch('/session', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export function getSession(): Promise<{ message: string; user: User }> {
  return safeFetch('/session', {
    method: 'GET',
  });
}

export function logout(): Promise<{ message: string }> {
  return safeFetch('/session', {
    method: 'DELETE',
  });
}
