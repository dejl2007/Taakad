import bcrypt from "bcrypt";
import crypto from "crypto";
import { authenticator } from "otplib";

const SALT_ROUNDS = 10;

// Configure TOTP to use 8-digit codes and a 30s step (standard)
authenticator.options = { digits: 8, step: 30 } as any;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Legacy/email code generator (random 8-digit) — kept for compatibility
export function generateTwoFACode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// --- TOTP (time-based) helpers (otplib) ---
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

export function generateTOTPURI(secret: string, label: string, issuer = "Taakad") {
  return authenticator.keyuri(label, issuer, secret);
}

export function verifyTOTPToken(secret: string, token: string): boolean {
  return authenticator.check(token, secret);
}
