import { users, identities, type Identity, type InsertIdentity, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createIdentity(identity: InsertIdentity): Promise<Identity>;
  getIdentityByHash(passportHash: string): Promise<Identity | undefined>;
  getIdentityByOwnerEmail(ownerEmail: string): Promise<Identity | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserTwoFA(
    email: string,
    twoFACode: string,
    expiry: Date
  ): Promise<void>;
  verifyUserTwoFA(email: string, code: string): Promise<boolean>;
  updateUserPassword(email: string, passwordHash: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createIdentity(identity: InsertIdentity): Promise<Identity> {
    const [newIdentity] = await db
      .insert(identities)
      .values(identity)
      .returning();
    return newIdentity;
  }

  async getIdentityByHash(passportHash: string): Promise<Identity | undefined> {
    const [identity] = await db
      .select()
      .from(identities)
      .where(eq(identities.passportHash, passportHash));
    return identity;
  }

  async getIdentityByOwnerEmail(ownerEmail: string): Promise<Identity | undefined> {
    const [identity] = await db
      .select()
      .from(identities)
      .where(eq(identities.ownerEmail, ownerEmail));
    return identity;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async updateUserTwoFA(
    email: string,
    twoFACode: string,
    expiry: Date
  ): Promise<void> {
    await db
      .update(users)
      .set({
        twoFACode: twoFACode,
        twoFACodeExpiry: expiry,
        twoFAVerified: false,
      })
      .where(eq(users.email, email));
  }

  async verifyUserTwoFA(email: string, code: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;

    // Check if code matches and hasn't expired
    const codeValid =
      user.twoFACode === code &&
      !!user.twoFACodeExpiry &&
      user.twoFACodeExpiry > new Date();

    if (codeValid) {
      // Mark 2FA as verified
      await db
        .update(users)
        .set({ twoFAVerified: true })
        .where(eq(users.email, email));
    }

    return codeValid;
  }

  async updateUserPassword(email: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash: passwordHash })
      .where(eq(users.email, email));
  }
}

export const storage = new DatabaseStorage();

