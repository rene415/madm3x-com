import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
);

export async function createToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { email: payload.email as string };
  } catch {
    return null;
  }
}

export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const adminEmail    = process.env.ADMIN_EMAIL ?? '';
  const adminHash     = process.env.ADMIN_PASSWORD_HASH ?? '';

  if (!adminEmail || !adminHash) return false;
  if (email.toLowerCase() !== adminEmail.toLowerCase()) return false;

  return bcrypt.compare(password, adminHash);
}
