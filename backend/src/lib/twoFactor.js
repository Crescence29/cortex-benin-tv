import { authenticator } from 'otplib';
import crypto from 'node:crypto';

// Tolère un léger décalage d'horloge (1 pas de 30s avant/après), sinon un
// téléphone légèrement désynchronisé rendrait la 2FA inutilisable.
authenticator.options = { window: 1 };

export function generateSecret() {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(email, secret) {
  return authenticator.keyuri(email, 'Cortex Bénin TV', secret);
}

export function verifyTotp(code, secret) {
  try {
    return authenticator.check(String(code || '').replace(/\s/g, ''), secret);
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex'));
}
