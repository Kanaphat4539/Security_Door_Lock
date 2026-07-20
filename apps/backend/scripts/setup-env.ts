/**
 * สร้างไฟล์ .env ให้อัตโนมัติ พร้อม token/secret สุ่มของเครื่องตัวเอง
 *
 *   npm run setup
 *
 * ทำไมต้องสุ่มเอง ไม่ commit ค่าลง repo:
 * repo นี้เป็น public — ถ้า commit JWT_SECRET ลงไป ใครก็ตามบนอินเทอร์เน็ต
 * ปลอม session เป็น ADMIN ได้ทันที และ git เก็บประวัติถาวร ลบทีหลังก็ยังดูย้อนได้
 * สคริปต์นี้เลยให้ทุกคน "รันคำสั่งเดียวได้ .env ที่ใช้ได้เลย" โดยไม่มีอะไรอยู่บน GitHub
 *
 * รันซ้ำได้ ไม่ทับของเดิม — ถ้ามี .env อยู่แล้วจะเติมเฉพาะค่าที่ยังขาด
 * (จะได้ไม่เผลอล้าง token ที่ตรงกับ secrets.h ของบอร์ดที่ flash ไปแล้ว)
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ENV_PATH = join(__dirname, "..", ".env");
const EXAMPLE_PATH = join(__dirname, "..", ".env.example");

/** ค่าที่ต้องสุ่มใหม่ทุกเครื่อง — key คือชื่อ env, value คือฟังก์ชันสร้างค่า */
const GENERATED: Record<string, () => string> = {
  DASHBOARD_TOKEN: () => randomBytes(32).toString("hex"),
  DEVICE_TOKEN: () => randomBytes(32).toString("hex"),
  JWT_SECRET: () => randomBytes(32).toString("hex"),
  // สั้นกว่าเพราะต้องพิมพ์มือตอนสมัคร
  ADMIN_INVITE_CODE: () => randomBytes(8).toString("hex").toUpperCase(),
};

/** ค่าที่ลอกจาก .env.example ได้ตรง ๆ (ตรงกับ docker-compose.yml อยู่แล้ว) */
const DEFAULTS: Record<string, string> = {
  DATABASE_URL: '"mysql://doorlock:doorlock_dev@localhost:3306/doorlock"',
  PORT: "3001",
  UPLOAD_DIR: "uploads",
};

function main() {
  if (!existsSync(EXAMPLE_PATH)) {
    console.error("หา .env.example ไม่เจอ — รันสคริปต์นี้จาก apps/backend/");
    process.exit(1);
  }

  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const alreadySet = new Set(
    existing
      .split("\n")
      .map((line) => line.match(/^\s*([A-Z_]+)\s*=/)?.[1])
      .filter((key): key is string => Boolean(key)),
  );

  const added: string[] = [];
  const lines: string[] = [];

  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (alreadySet.has(key)) continue;
    lines.push(`${key}=${value}`);
    added.push(key);
  }

  for (const [key, generate] of Object.entries(GENERATED)) {
    if (alreadySet.has(key)) continue;
    lines.push(`${key}=${generate()}`);
    added.push(key);
  }

  if (added.length === 0) {
    console.log(".env มีค่าครบแล้ว ไม่ได้แก้อะไร");
    return;
  }

  const header = existing
    ? "\n# --- เติมโดย npm run setup ---\n"
    : "# สร้างโดย npm run setup — ไฟล์นี้ถูก gitignore ไว้ ห้าม commit\n" +
      "# ถ้าอยากได้ token ชุดใหม่ ลบบรรทัดนั้นทิ้งแล้วรัน npm run setup อีกครั้ง\n\n";

  writeFileSync(ENV_PATH, existing + header + lines.join("\n") + "\n");

  console.log(existing ? "เติมค่าที่ขาดลง .env แล้ว:" : "สร้าง .env ให้แล้ว:");
  for (const key of added) {
    console.log(`  ${key}${key in GENERATED ? "  (สุ่มใหม่)" : ""}`);
  }
  console.log(
    "\nขั้นต่อไป:\n" +
      "  docker compose up -d --wait   (จาก root ของ repo)\n" +
      "  npm run db:generate\n" +
      "  npm run db:migrate\n" +
      "  npm run start:dev\n" +
      "\n⚠️ DEVICE_TOKEN ต้องตรงกับ kDeviceToken ใน firmware/esp32-cam/src/secrets.h\n" +
      "   ถ้าจะต่อกับบอร์ดจริง ให้ copy ค่าจาก .env ไปใส่ที่นั่นด้วย",
  );
}

main();
