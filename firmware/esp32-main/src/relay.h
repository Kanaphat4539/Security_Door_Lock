#pragma once

// Relay -> Solenoid lock LY-03 12V
// ล็อกเป็นสถานะปกติ (fail-secure): ปลดล็อกเฉพาะตอน granted แล้วล็อกกลับอัตโนมัติ
void relayBegin();

// ปลดล็อกเป็นเวลา kUnlockMs แบบ non-blocking — ต้องเรียก relayUpdate() ใน loop
void relayUnlockTimed();
void relayUpdate();

bool relayIsUnlocked();
