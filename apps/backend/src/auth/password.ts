import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const PREFIX = 'scrypt';

/**
 * ใช้ scrypt ที่มากับ Node เลย ไม่ต้องพึ่ง bcrypt/argon2
 * (สองตัวนั้นต้อง compile native module ซึ่งมักมีปัญหาบน Windows)
 *
 * scrypt ออกแบบมาให้กิน memory ทำให้เดารหัสผ่านด้วย GPU แพงกว่ามาก
 * เก็บเป็น "scrypt:<salt>:<hash>" จะได้เปลี่ยนอัลกอริทึมทีหลังได้โดยดูจาก prefix
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${PREFIX}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== PREFIX || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
