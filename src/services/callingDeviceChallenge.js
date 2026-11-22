import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

// Short-lived in-memory possession challenge for isolated single-instance
// pilots. Do not use across replicas or as a production verification service.
export function createDeviceChallengeStore({ now = () => Date.now(), ttlMs = 5 * 60_000, maxChallenges = 100 } = {}) {
  const challenges = new Map();
  function prune() {
    for (const [id, entry] of challenges) {
      if (entry.expiresAt <= now()) challenges.delete(id);
    }
  }
  function issue({ deviceId, ownerUserId }) {
    if (typeof deviceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(deviceId) ||
        typeof ownerUserId !== 'string' || !/^usr_[0-9a-f]{32}$/.test(ownerUserId)) {
      throw new TypeError('device_identity_invalid');
    }
    prune();
    if (challenges.size >= maxChallenges) {
      const error = new Error('challenge_capacity_reached');
      error.statusCode = 429;
      throw error;
    }
    const challenge = randomBytes(32).toString('base64url');
    const digest = createHash('sha256').update(challenge).digest();
    challenges.set(deviceId, { ownerUserId, digest, expiresAt: now() + ttlMs });
    return { challenge, expiresInSeconds: Math.ceil(ttlMs / 1000) };
  }
  function consume({ deviceId, ownerUserId, response }) {
    prune();
    const entry = challenges.get(deviceId);
    if (!entry || entry.ownerUserId !== ownerUserId) return false;
    challenges.delete(deviceId);
    if (typeof response !== 'string' || response.length > 128) return false;
    const digest = createHash('sha256').update(response).digest();
    return timingSafeEqual(entry.digest, digest);
  }
  return { issue, consume };
}
