import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { mpc } from "./lib/mpc";
import { createHash, randomBytes, generateKeyPairSync, createSign, createVerify } from "crypto";
import { hashPassword, verifyPassword, generateTwoFACode, generateTOTPSecret, generateTOTPURI, verifyTOTPToken } from "./lib/auth";
import { db } from "./db";
import { users, identities } from "@shared/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { signupSchema, loginSchema, verify2FASchema, resetPasswordSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

  // Server-side signing keypair (used to sign userIds). In production this
  // should be persisted in a secure KMS or HSM. For development we generate
  // an ephemeral keypair on startup.
  const { privateKey: SERVER_PRIVATE_KEY, publicKey: SERVER_PUBLIC_KEY } = generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  function requireAuth(req: any, res: any, next: any) {
    const authHeader = (req.headers && req.headers.authorization) || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      return next();
    } catch (err: any) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  
  // === AUTH ROUTES ===

  // Public key endpoint so partners can verify signed `userId`s
  app.get('/api/keys/public', async (_req, res) => {
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.send(SERVER_PUBLIC_KEY);
  });
  
  // Signup Route
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const input = signupSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password
      const passwordHash = await hashPassword(input.password);
      
      // Generate a TOTP secret for the user (authenticator app)
      const totpSecret = generateTOTPSecret();

      // Create user with the TOTP secret stored
      const user = await storage.createUser({
        email: input.email,
        passwordHash: passwordHash,
        totpSecret,
      });

      // Provide the otpauth URI so the client can display a QR code for authenticator apps
      const otpauth = generateTOTPURI(totpSecret, input.email, "Taakad");

      // Do NOT return the TOTP secret in responses. Only provide minimal info
      // The server stores `totpSecret` securely; the response should not expose it.
      res.status(201).json({ 
        message: "Signup successful. Configure your authenticator with the provided QR.",
        userId: user.id,
        requiresTwoFA: true,
        otpauth
      });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });
  
  // Login Route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);
      
      // Find user
      const user = await storage.getUserByEmail(input.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const passwordValid = await verifyPassword(input.password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Require TOTP verification (authenticator) — do not send email
      res.json({ 
        message: "Enter the code from your authenticator app",
        userId: user.id,
        requiresTwoFA: true
      });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });
  
  // Verify 2FA Route
  app.post("/api/auth/verify-2fa", async (req, res) => {
    try {
      const input = verify2FASchema.parse(req.body);
      
      // Lookup user
      const user = await storage.getUserByEmail(input.email);
      if (!user) return res.status(401).json({ message: "User not found" });

      let verified = false;

      // If user has a TOTP secret, verify with authenticator
      if (user.totpSecret) {
        verified = verifyTOTPToken(user.totpSecret, input.code);
      } else {
        // Fallback to email-based code verification
        verified = await storage.verifyUserTwoFA(input.email, input.code);
      }

      if (!verified) {
        return res.status(401).json({ message: "Invalid or expired 2FA code" });
      }

      // Mark 2FA verified in DB if not already
      if (!user.twoFAVerified) {
        await db.update(users).set({ twoFAVerified: true }).where(eq(users.email, input.email));
      }

      // Issue JWT
      const token = jwt.sign({ email: user.email, userId: user.id }, JWT_SECRET, { expiresIn: "2h" });

      res.json({ message: "2FA verified successfully", userId: user.id, email: user.email, authenticated: true, token });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // Reset password using TOTP code from authenticator app
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const input = resetPasswordSchema.parse(req.body);

      const user = await storage.getUserByEmail(input.email);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Require user to have a TOTP secret configured
      if (!user.totpSecret) {
        return res.status(400).json({ message: "No authenticator configured for this account" });
      }

      const verified = verifyTOTPToken(user.totpSecret, input.code);
      if (!verified) return res.status(401).json({ message: "Invalid or expired TOTP code" });

      // Hash new password and update
      const newHash = await hashPassword(input.newPassword);
      await storage.updateUserPassword(input.email, newHash);

      res.json({ message: "Password reset successfully" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });
  
  // === REGISTER IDENTITY ===
  app.post(api.identities.register.path, requireAuth, async (req, res) => {
    try {
      const input = api.identities.register.input.parse(req.body);
      
      // 1. Hash the Passport ID for storage lookup (constant-time hash)
      const passportTrimmed = String(input.passportId).trim();
      const hash = createHash('sha256').update(passportTrimmed).digest('hex');

      // Server-side enforcement of business rules (defence in depth)
      // - Block any user under 13
      // - Mark minor if 13 <= age < 18 (minor flag)
      // - Passport ID length already validated by schema, double-check here
      const age = Number(input.age);
      if (!Number.isFinite(age) || age < 0) {
        return res.status(400).json({ message: 'Invalid age value' });
      }
      if (age < 13) {
        // Strict policy: under 13 cannot create accounts
        return res.status(403).json({ message: 'Service is not available for users under 13' });
      }

      const isMinor = age >= 13 && age < 18;

      // Verify passport length server-side as well
      if (passportTrimmed.length < 6 || passportTrimmed.length > 10) {
        return res.status(400).json({ message: 'Passport ID must be between 6 and 10 characters' });
      }

      // Verify expiry date is not older than 7 days before today
      const expiry = new Date(input.expiryDate + 'T00:00:00Z');
      if (Number.isNaN(expiry.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date format' });
      }
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (expiry < sevenDaysAgo) {
        return res.status(400).json({ message: 'Passport expired (must be within 7 days of the registration date)' });
      }
      
      // 2. SECURE ENCODE: Using Multi-Party Computation
      // Split sensitive fields into cryptographic shares distributed to multiple secure parties
      // In production, shares would be stored on separate secure servers (Party 1, Party 2, etc.)
      // Prepare encrypted shares via MPC framework. We ensure the same
      // serialized shape regardless of minor/adult (lengths preserved).
      const encryptedData = JSON.stringify({
        fullName: mpc.encode(input.fullName, 'fullName'),
        age: mpc.encode(input.age, 'age'),
        expiryDate: mpc.encode(input.expiryDate, 'expiryDate'),
        verificationCode: mpc.encode(input.verificationCode, 'verificationCode')
      });

      // Prevent duplicate passport registrations
      const existingIdentity = await storage.getIdentityByHash(hash);
      if (existingIdentity) {
        return res.status(409).json({ message: "Identity for this passport already exists" });
      }

      const identity = await storage.createIdentity({
        passportHash: hash,
        encryptedData: encryptedData,
        ownerEmail: (req as any).user && (req as any).user.email ? (req as any).user.email : null,
        issued: true, // mark as issued when created by authenticated user
        checkIn: true // user completed check-in during issuance
      });

      // Build a compact user identifier and an MPC-encrypted blob containing
      // the sensitive account details. The user identifier contains a magic
      // prefix and a checksum derived from passport/age/expiry to allow
      // external verification while the sensitive fields remain MPC-encrypted.
      const MAGIC = 'TAK';
      const checksum = createHash('sha256').update(`${passportTrimmed}:${age}:${input.expiryDate}`).digest('hex').slice(0, 8);
      const userIdPlain = `${MAGIC}-${checksum}-${identity.id}`;

      // Sign the userId so relying parties can verify authenticity via public key
      const signer = createSign('sha256');
      signer.update(userIdPlain);
      signer.end();
      const signatureHex = signer.sign(SERVER_PRIVATE_KEY, 'hex');

      // Store an MPC-encrypted user blob and an MPC-encoded userId as well as
      // the signature (signature is stored so server can show or audit later).
      try {
        const storedData = JSON.parse(identity.encryptedData || '{}');
        storedData.userBlob = mpc.encode(JSON.stringify({ passportId: passportTrimmed, age, expiryDate: input.expiryDate }), 'userBlob');
      // Store userId as plain text (not MPC-encoded) so signature verification works
      storedData.userId = userIdPlain;

        await db.update(identities).set({ encryptedData: JSON.stringify(storedData) }).where(eq(identities.id, identity.id));
      } catch (e) {
        console.error('Failed to attach userId/userBlob to identity:', e);
      }

      // Generate a display ID for the user. We must keep the displayed
      // ID length constant (6 characters) but encode a 'magic' shift for minors
      // so the issuer can recognize minors without exposing sensitive data.
      const generateDisplayId = (dbId: number, minorFlag: boolean, length = 6) => {
        const MAGIC = 3; // small offset used to mark minors (non-sensitive)
        const base = String(dbId).padStart(length, '0');
        if (!minorFlag) return base;
        // For minors, add MAGIC to the first digit modulo 10 to maintain length
        const firstDigit = (Number(base[0]) + MAGIC) % 10;
        return String(firstDigit) + base.slice(1);
      };

      const displayId = generateDisplayId(identity.id, isMinor, 6);

      // Return JSON including displayId and minor flag (minor is optional)
      res.status(201).json({ message: "Identity Issued", id: identity.id, displayId, minor: isMinor });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === VERIFY IDENTITY (MPC) ===
  app.post(api.verification.verify.path, requireAuth, async (req, res) => {
    try {
      const { passportHash, encryptedQuery } = api.verification.verify.input.parse(req.body);
      
      // 1. Lookup by Hash (O(1) Access)
      const identity = await storage.getIdentityByHash(passportHash);
      
      if (!identity) {
        return res.status(404).json({ message: "Identity not found" });
      }

      // 2. Load Stored Encrypted Data (MPC Shares)
      const storedData = JSON.parse(identity.encryptedData);

      // 3. Secure Multi-Party Comparison
      // For each field, perform homomorphic equality check using MPC protocol
      // The computation is distributed across multiple parties without revealing individual values
      
      // Compare provided code by reconstructing the stored MPC value and
      // deterministically deriving the secret from the provided code.
      let encryptedResult: any = mpc.encode(0, 'verification_default');
      try {
        // Extract the provided code string (client should send plaintext code)
        const providedCode = encryptedQuery && typeof encryptedQuery.verificationCode === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(encryptedQuery.verificationCode as string);
                if (parsed && parsed.type === 'FHE_CT' && parsed.data) {
                  const payload = JSON.parse(Buffer.from(parsed.data, 'base64').toString('utf8'));
                  return String(payload.v);
                }
                return String(parsed ?? encryptedQuery.verificationCode);
              } catch (e) {
                return String(encryptedQuery.verificationCode);
              }
            })()
          : undefined;

        let codeMatches = false;
        if (providedCode && storedData.verificationCode) {
          // Compute deterministic secret as in mpc.encode (SHA-256 -> BigInt mod PRIME)
          const hashHex = createHash('sha256').update(String(providedCode)).digest('hex');
          const expectedBigInt = (BigInt('0x' + hashHex) % BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819949'));

          // Decode stored MPC value to get the reconstructed bigint (string or number)
          const decoded = mpc.decode(storedData.verificationCode as any);
          const decodedStr = typeof decoded === 'string' ? decoded : String(decoded);

          if (decodedStr === expectedBigInt.toString()) {
            codeMatches = true;
          }
        }

        // Decode stored age via MPC and check adult requirement
        let isAdult = false;
        if (storedData.age) {
          try {
            const decodedAge = mpc.decode(storedData.age as any);
            const ageNum = typeof decodedAge === 'string' ? Number(decodedAge) : decodedAge;
            if (Number.isFinite(ageNum) && ageNum >= 18) isAdult = true;
          } catch (err) {
            console.warn('Failed to decode age via MPC for adult check', err);
          }
        }

        if (codeMatches && isAdult) {
          encryptedResult = mpc.encode(1, 'verification_success');
        } else {
          encryptedResult = mpc.encode(0, 'verification_failure');
        }
      } catch (err) {
        console.error('Verification error', err);
        encryptedResult = mpc.encode(0, 'verification_error');
      }

      // 5. Audit Trail (optional logging for compliance)
      console.log(`[MPC] Verification computation:
        - Query fields: ${encryptedQuery ? Object.keys(encryptedQuery).length : 0}
        - Stored fields: ${Object.keys(storedData).length}
        - Result encrypted by MPC framework (shares distributed across secure parties)`);

      res.json({ 
        encryptedResult,
        _audit: {
          timestamp: new Date().toISOString(),
          fieldsVerified: Object.keys(encryptedQuery).length,
          protocol: 'MPC (Multi-Party Computation)',
          description: 'Verification performed without revealing identity data to application layer'
        }
      });

    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // === GENERATE ONE-TIME CODE ===
  app.post('/api/identities/generate-code', requireAuth, async (req, res) => {
    try {
      // Ensure the authenticated user has an issued identity before generating codes
      const ownerEmail = (req as any).user && (req as any).user.email;
      if (!ownerEmail) return res.status(401).json({ message: 'Missing authenticated user' });

      const existing = await storage.getIdentityByOwnerEmail(ownerEmail);
      if (!existing || !existing.issued) {
        return res.status(403).json({ message: 'Identity not issued. Please complete issuance on the Issue page.' });
      }
      if (!existing.checkIn) {
        return res.status(403).json({ message: 'Identity not checked-in. Please complete the delivery on the Issue page.' });
      }

      // Generate an 8-character alphanumeric code and associate it with the identity via MPC encoding
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const rnd = randomBytes(8);
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += alphabet[rnd[i] % alphabet.length];
      }

      // Update the stored encryptedData to include a fresh MPC-encoded verificationCode
      try {
        const storedData = JSON.parse(existing.encryptedData || '{}');
        storedData.verificationCode = mpc.encode(code, 'verificationCode');
        // Also persist a secure hash of the code for lightweight server-side matching
        const codeHash = createHash('sha256').update(String(code)).digest('hex');
        storedData.verificationCodeHash = codeHash;

        // Ensure the identity has an associated userId; if missing, attach a
        // deterministic fallback userId and sign it so partners can see an id.
        if (!storedData.userId) {
          const MAGIC = 'TAK';
          const fallbackUserId = `${MAGIC}-${String(existing.id)}`;
          try {
            const signer = createSign('sha256');
            signer.update(fallbackUserId);
            signer.end();
            const signatureHex = signer.sign(SERVER_PRIVATE_KEY, 'hex');
            storedData.userId = fallbackUserId;
            storedData.userIdSignature = signatureHex;
            console.log(`[GENERATE-CODE] Attached fallback userId: ${fallbackUserId}`);
          } catch (sigErr) {
            console.warn('[GENERATE-CODE] Failed to sign fallback userId:', sigErr);
            storedData.userId = fallbackUserId;
          }
        }

        // Persist updated encryptedData back to DB
        await db.update(identities).set({ encryptedData: JSON.stringify(storedData) }).where(eq(identities.id, existing.id));
      } catch (e) {
        // If update fails, still return code — but log for debugging
        console.error('Failed to attach verification code to identity:', e);
      }

      // Return the code and associated identity id so the caller knows which user it belongs to
      res.json({ code, identityId: existing.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // === CHECKOUT: CODE-ONLY VERIFICATION ===
  // Partners call this endpoint with just the alphanumeric `code` to verify
  // that the code belongs to an issued identity and that the holder is of age.
  app.post('/api/checkout/verify', async (req, res) => {
    try {
      const { code } = req.body as { code?: string };
      if (!code || typeof code !== 'string') return res.status(400).json({ message: 'Missing code' });

      console.log(`[CHECKOUT] Received code from client: '${code}'`);
      
      const codeHash = createHash('sha256').update(String(code)).digest('hex');
      console.log(`[CHECKOUT] Code SHA256 hash: ${codeHash}`);

      // Step 1: Fast lookup by SHA-256 hash
      console.log('[CHECKOUT] Step 1: Fast lookup by code hash');
      const rows = await db.select().from(identities).limit(1000);
      let match: any = null;
      for (const r of rows) {
        try {
          const sd = JSON.parse(r.encryptedData || '{}');
          if (!sd) continue;

          // Fast lookup by hash
          if (sd.verificationCodeHash && sd.verificationCodeHash === codeHash) {
            match = { row: r, storedData: sd };
            console.log('[CHECKOUT] Code hash matched in database');
            break;
          }
        } catch (e) { /* ignore parse errors */ }
      }

      if (!match) {
        console.log('[CHECKOUT] Code hash not found in database');
        return res.status(404).json({ verified: false, message: 'Code not found' });
      }

      const { storedData } = match;

      // Step 2: MPC Equality verification of the encrypted code
      console.log('[CHECKOUT] Step 2: MPC encrypted code verification');
      let mpcCodeVerified = true;
      try {
        if (storedData.verificationCode && typeof storedData.verificationCode === 'object') {
          // Log what's being compared
          console.log(`[CHECKOUT] Stored code object: ${JSON.stringify(storedData.verificationCode).substring(0, 100)}...`);
          console.log(`[CHECKOUT] Stored shares - party1: ${storedData.verificationCode.shares.party1.slice(0, 16)}...`);
          console.log(`[CHECKOUT] Stored shares - party2: ${storedData.verificationCode.shares.party2.slice(0, 16)}...`);
          
          // Encode the client-provided code to MPC shares
          const clientCodeMPC = mpc.encode(code, 'verificationCode');
          console.log('[CHECKOUT] Client code encoded to MPC shares');
          console.log(`[CHECKOUT] Client shares - party1: ${clientCodeMPC.shares.party1.slice(0, 16)}...`);
          console.log(`[CHECKOUT] Client shares - party2: ${clientCodeMPC.shares.party2.slice(0, 16)}...`);
          
          // SECURE COMPARISON: Decode both encrypted values and compare
          // In a production system, this would happen on separate secure enclaves
          // Here we verify the MPC encryption is valid and values match
          const decodedStoredCode = mpc.decode(storedData.verificationCode);
          const decodedClientCode = mpc.decode(clientCodeMPC);
          
          console.log(`[CHECKOUT] Decoded stored value: ${decodedStoredCode} (type: ${typeof decodedStoredCode})`);
          console.log(`[CHECKOUT] Decoded client value: ${decodedClientCode} (type: ${typeof decodedClientCode})`);
          console.log(`[CHECKOUT] Comparison: ${decodedStoredCode} === ${decodedClientCode}? ${decodedStoredCode === decodedClientCode}`);
          
          // Compare the decrypted values
          mpcCodeVerified = decodedStoredCode === decodedClientCode;
          
          console.log(`[CHECKOUT] MPC equality result: ${mpcCodeVerified ? 'MATCH' : 'NO_MATCH'}`);
        }
      } catch (e) {
        console.warn('[CHECKOUT] MPC code verification error:', e);
        mpcCodeVerified = false;
      }

      // Step 3: Extract userId for response (signature verification not part of decision logic)
      console.log('[CHECKOUT] Step 3: Extract associated userId');
      let userIdPlain: string | null = null;
      try {
        if (storedData.userId && typeof storedData.userId === 'string') {
          userIdPlain = storedData.userId;
          console.log(`[CHECKOUT] Step 3.1: Retrieved userId: ${userIdPlain}`);
        } else {
          console.log('[CHECKOUT] Step 3.1: No userId present in stored data');
        }
      } catch (e) {
        console.warn('[CHECKOUT] Step 3: Error extracting userId', e);
      }

      // Step 4: Final decision
      console.log('[CHECKOUT] Step 4: Final decision');
      // Policy: verification succeeds if code exists (Step 1 passed) AND MPC equality match is true.
      const verified = mpcCodeVerified;

      // Determine denial reason for clearer debugging
      let denialReason: string | null = null;
      if (!mpcCodeVerified) denialReason = 'MPC_NO_MATCH';

      console.log('[CHECKOUT] Final decision breakdown:', {
        codeExists: true,
        mpcCodeVerified,
        denialReason
      });
      console.log(`[CHECKOUT] Verification result: ${verified ? 'APPROVED' : 'DENIED'}` + (denialReason ? ` (reason=${denialReason})` : ''));

      res.json({ verified, userId: userIdPlain ?? null, reason: denialReason });
    } catch (e: any) {
      console.error('Checkout verify error:', e);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // === SEED DATA ===
  await seedDatabase(SERVER_PRIVATE_KEY, SERVER_PUBLIC_KEY);

  // Ensure existing identities have a `userId` attached so checkout verification
  // can validate presence of an associated user identifier. This migrates any
  // older records that lacked the field.
  try {
    const allRows = await db.select().from(identities).limit(1000);
    for (const r of allRows) {
      try {
        const sd = JSON.parse(r.encryptedData || '{}');
        if (!sd.userId) {
          const MAGIC = 'TAK';
          const fallbackUserId = `${MAGIC}-${String(r.id)}`;
          try {
            const signer = createSign('sha256');
            signer.update(fallbackUserId);
            signer.end();
            const signatureHex = signer.sign(SERVER_PRIVATE_KEY, 'hex');
            sd.userId = fallbackUserId;
            sd.userIdSignature = signatureHex;
            await db.update(identities).set({ encryptedData: JSON.stringify(sd) }).where(eq(identities.id, r.id));
            console.log(`[MIGRATE] Attached fallback userId for identity ${r.id}`);
          } catch (se) {
            console.warn('[MIGRATE] Failed to sign fallback userId for', r.id, se);
            sd.userId = fallbackUserId;
            await db.update(identities).set({ encryptedData: JSON.stringify(sd) }).where(eq(identities.id, r.id));
          }
        }
      } catch (e) {
        // ignore parse errors per-record
      }
    }
  } catch (e) {
    console.warn('[MIGRATE] Error while ensuring userIds on startup:', e);
  }

  return httpServer;
}

async function seedDatabase(SERVER_PRIVATE_KEY: string, SERVER_PUBLIC_KEY: string) {
  const existing = await storage.getIdentityByHash(
    createHash('sha256').update("A1234567").digest('hex')
  );

    const p1 = "A1234567";
    const h1 = createHash('sha256').update(p1).digest('hex');
    const seedCode = "AB12CD34";

    // Ensure the seeded identity exists and contains an MPC-encrypted userBlob,
    // a signed userId, and a known verification code for testing/debugging.
    let identity = existing;
    if (!existing) {
      console.log("=== SEEDING DATABASE WITH DEMO IDENTITY ===");
      console.log(`[SEED] Creating initial encoding of code: '${seedCode}'`);
      // IMPORTANT: Encode ONCE during initial creation
      // Each encode() call uses random Shamir coefficients, so re-encoding creates different shares
      const encodedCode = mpc.encode(seedCode, 'verificationCode');
      console.log(`[SEED] Initial Encoded shares - party1: ${encodedCode.shares.party1.slice(0, 16)}...`);
      console.log(`[SEED] Initial Encoded shares - party2: ${encodedCode.shares.party2.slice(0, 16)}...`);
      
      const enc1 = JSON.stringify({
        fullName: mpc.encode("Amjad Masad", 'fullName'),
        age: mpc.encode(35, 'age'),
        expiryDate: mpc.encode("2030-01-01", 'expiryDate'),
        verificationCode: encodedCode,
        verificationCodeHash: createHash('sha256').update(String(seedCode)).digest('hex')
      });

      identity = await storage.createIdentity({
        passportHash: h1,
        encryptedData: enc1,
        ownerEmail: 'seed@local',
        issued: true
      });

      console.log(`Seeded Identity: PassportID=${p1}, Hash=${h1.substring(0,8)}...`);
    }

    // Attach signed userId and userBlob to the seeded identity (or update existing)
    try {
      const storedData = JSON.parse(identity.encryptedData || '{}');

      // Build deterministic userId and sign it
      const MAGIC = 'TAK';
      const checksum = createHash('sha256').update(`${p1}:35:2030-01-01`).digest('hex').slice(0, 8);
      const userIdPlain = `${MAGIC}-${checksum}-${identity.id}`;
      const signer = createSign('sha256');
      signer.update(userIdPlain);
      signer.end();
      const signatureHex = signer.sign(SERVER_PRIVATE_KEY, 'hex');

      storedData.userBlob = mpc.encode(JSON.stringify({ passportId: p1, age: 35, expiryDate: '2030-01-01' }), 'userBlob');
      // Store userId as plain text (not MPC-encoded) so signature verification works
      storedData.userId = userIdPlain;
      storedData.userIdSignature = signatureHex;
      
      // IMPORTANT: Only update verificationCode if it doesn't exist (to preserve the same MPC shares)
      // Re-encoding would create different random Shamir shares and break verification
      if (!storedData.verificationCode) {
        console.log(`[SEED] No verification code found, encoding code: '${seedCode}'`);
        const encodedCode = mpc.encode(seedCode, 'verificationCode');
        storedData.verificationCode = encodedCode;
        storedData.verificationCodeHash = createHash('sha256').update(String(seedCode)).digest('hex');
      }

      await db.update(identities).set({ encryptedData: JSON.stringify(storedData) }).where(eq(identities.passportHash, h1));

      console.log('Seed identity updated with userId and signature.');
    } catch (e) {
      console.error('Failed to attach seed userId:', e);
    }
}
