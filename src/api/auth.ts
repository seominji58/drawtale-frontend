import { ENGINE } from "./index";

export interface AuthResult { token: string; email: string }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function login(email: string, password: string): Promise<AuthResult> {
  if (ENGINE === "mock") {
    await wait(500);
    if (!password || password.length < 4) throw new Error("INVALID");
    return { token: "mock-token", email };
  }
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error("INVALID");
  return r.json();
}

export async function signup(email: string, password: string): Promise<AuthResult> {
  if (ENGINE === "mock") {
    await wait(600);
    return { token: "mock-token", email };
  }
  const r = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error("SIGNUP_FAILED");
  return r.json();
}
