import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('รหัสผ่านถูกต้องผ่าน', async () => {
    const stored = await hashPassword('correct horse battery');
    await expect(verifyPassword('correct horse battery', stored)).resolves.toBe(
      true,
    );
  });

  it('รหัสผ่านผิดไม่ผ่าน', async () => {
    const stored = await hashPassword('correct horse battery');
    await expect(verifyPassword('wrong password', stored)).resolves.toBe(false);
  });

  it('salt ต่างกันทุกครั้ง รหัสเดียวกันได้ hash คนละค่า', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });

  it('ไม่เก็บรหัสผ่านเป็น plaintext', async () => {
    const stored = await hashPassword('myS3cret');
    expect(stored).not.toContain('myS3cret');
    expect(stored.startsWith('scrypt:')).toBe(true);
  });

  it('hash ที่รูปแบบเพี้ยนถือว่าไม่ผ่าน ไม่โยน error', async () => {
    await expect(verifyPassword('x', 'garbage')).resolves.toBe(false);
    await expect(verifyPassword('x', '')).resolves.toBe(false);
    await expect(verifyPassword('x', 'bcrypt:aa:bb')).resolves.toBe(false);
  });
});
