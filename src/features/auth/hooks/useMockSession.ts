"use client";

/**
 * Sessão mockada do M3: apenas marca localmente que o usuário "logou", para
 * permitir navegar pela área autenticada sem backend real. Será substituída
 * pelo Supabase Auth (`@supabase/ssr`) no M4.
 */
const SESSION_STORAGE_KEY = "tripquote:mock-session";

export interface MockSession {
  email: string;
}

export function readMockSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MockSession;
  } catch {
    return null;
  }
}

export function writeMockSession(session: MockSession) {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Armazenamento indisponível; ignora silenciosamente (mock).
  }
}

export function clearMockSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignora silenciosamente.
  }
}
