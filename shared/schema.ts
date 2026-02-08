import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Bcrypt hash of password
  twoFACode: text("two_fa_code"), // Temporary 8-digit code
  totpSecret: text("totp_secret"), // Optional TOTP secret for authenticator apps
  twoFAVerified: boolean("two_fa_verified").notNull().default(false),
  twoFACodeExpiry: timestamp("two_fa_code_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const identities = pgTable("identities", {
  id: serial("id").primaryKey(),
  passportHash: text("passport_hash").notNull().unique(), // SHA-256 of Passport ID
  encryptedData: text("encrypted_data").notNull(), // JSON blob containing { name: Enc(Name), age: Enc(Age), ... }
  ownerEmail: text("owner_email").unique(), // email of the user who registered/owns this identity (unique: one identity per user)
  issued: boolean("issued").notNull().default(false), // whether identity has been issued
  checkIn: boolean("check_in").notNull().default(false), // whether the user completed the check-in/issue delivery
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  twoFACode: true,
  twoFAVerified: true,
  twoFACodeExpiry: true,
});

export const insertIdentitySchema = createInsertSchema(identities).omit({
  id: true,
  createdAt: true,
});

// === API CONTRACT TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Identity = typeof identities.$inferSelect;
export type InsertIdentity = z.infer<typeof insertIdentitySchema>;

// Auth Input Schemas
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type SignupRequest = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const verify2FASchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(8, "2FA code must be 8 digits"),
});
export type Verify2FARequest = z.infer<typeof verify2FASchema>;

// Password reset via TOTP authenticator: provide email, an 8-digit TOTP code,
// and the new password (with confirmation). This allows resetting password
// when the user has access to their authenticator app.
export const resetPasswordSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    code: z.string().length(8, "2FA code must be 8 digits"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

// Input for Registration (Raw data - assuming Taakad encrypts it for storage)
export const registerIdentitySchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  // Age rules: children under 13 are blocked; minors (13-17) allowed but
  // will be marked as 'minor' (server-side magic) while keeping ID length.
  age: z.coerce.number().min(0, "Invalid age"),
  // Passport ID must be between 6 and 10 characters inclusive
  passportId: z.string().min(6, "Passport ID too short").max(10, "Passport ID too long"),
  // expiryDate in ISO YYYY-MM-DD format; server will ensure it's not older than 7 days before today
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  verificationCode: z.string().min(4, "Code required"),
});
export type RegisterIdentityRequest = z.infer<typeof registerIdentitySchema>;

// Input for Verification (Encrypted Query)
// passportHash is sent in clear (hashed) to lookup the record.
// The rest is encrypted.
export const verifyIdentitySchema = z.object({
  passportHash: z.string(),
  encryptedQuery: z.record(z.string(), z.string()), // Key: field, Value: EncryptedString (Hex/Base64)
  publicParams: z.string().optional(), // For simulated FHE context/noise
});
export type VerifyIdentityRequest = z.infer<typeof verifyIdentitySchema>;

// Response for Verification
export const verifyIdentityResponseSchema = z.object({
  encryptedResult: z.string(), // Enc(1) or Enc(0)
});
export type VerifyIdentityResponse = z.infer<typeof verifyIdentityResponseSchema>;
