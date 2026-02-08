/**
 * MPC Client: Localhost → Party 1 (Vercel) and Party 2 (Cloudflare)
 * 
 * Responsibilities:
 * - Send party1Share to Vercel with HMAC signature
 * - Send party2Share to Cloudflare with HMAC signature
 * - Include timestamp + nonce for replay protection
 * - Never store shares locally after sending
 */

import crypto from 'crypto';

const PARTY1_URL = process.env.MPC_PARTY1_URL || 'https://your-vercel-app.vercel.app/api/mpc-party1';
const PARTY2_URL = process.env.MPC_PARTY2_URL || 'https://wandering-hill-f471.noreplytakaad.workers.dev/';
const PARTY1_SECRET = process.env.MPC_PARTY1_SECRET || 'dev-secret-party1';
const PARTY2_SECRET = process.env.MPC_PARTY2_SECRET || 'dev-secret-party2';

/**
 * Sign request with HMAC-SHA256
 */
function signRequest(payload: object, secret: string): string {
  const payloadStr = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('hex');
}

/**
 * Send party1Share to Vercel (Party 1)
 */
export async function sendToParty1(
  shareId: string,
  party1Share: string,
  fieldName: string
): Promise<{ success: boolean; computationId: string }> {
  const payload = {
    operation: 'store_share',
    shareId,
    party1Share,
    fieldName,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const signature = signRequest(payload, PARTY1_SECRET);

  try {
    const response = await fetch(PARTY1_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mpc-signature': signature,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Party 1 error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Sent party1Share (${fieldName}) to Party 1 (Vercel)`);
    return { success: true, computationId: data.computationId || shareId };
  } catch (error) {
    console.error(`❌ Failed to send to Party 1:`, error);
    throw error;
  }
}

/**
 * Send party2Share to Cloudflare (Party 2)
 */
export async function sendToParty2(
  shareId: string,
  party2Share: string,
  fieldName: string
): Promise<{ success: boolean; computationId: string }> {
  const payload = {
    shareId,
    party2Share,
    fieldName,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const signature = signRequest(payload, PARTY2_SECRET);

  try {
    const response = await fetch(PARTY2_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mpc-signature': signature,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Party 2 error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Sent party2Share (${fieldName}) to Party 2 (Cloudflare)`);
    return { success: true, computationId: data.computationId || shareId };
  } catch (error) {
    console.error(`❌ Failed to send to Party 2:`, error);
    throw error;
  }
}

/**
 * Distribute MPC shares to both parties
 * Call this after encoding identity fields
 */
export async function distributeShares(
  shareId: string,
  party1Share: string,
  party2Share: string,
  fieldName: string
): Promise<{ party1: { success: boolean }; party2: { success: boolean } }> {
  console.log(`🔐 Distributing shares for field: ${fieldName}`);

  try {
    const [p1Result, p2Result] = await Promise.all([
      sendToParty1(shareId, party1Share, fieldName),
      sendToParty2(shareId, party2Share, fieldName),
    ]);

    return {
      party1: { success: p1Result.success },
      party2: { success: p2Result.success },
    };
  } catch (error) {
    console.error('❌ Share distribution failed:', error);
    throw error;
  }
}
