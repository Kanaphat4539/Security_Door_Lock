#pragma once

// Active buzzer — เสียงแจ้งเตือนสถานะ granted / denied
void buzzerBegin();

// ส่งเสียงแบบ non-blocking: สั่งแล้วกลับทันที ต้องเรียก buzzerUpdate() ใน loop
void buzzerBeep(unsigned long durationMs);
void buzzerUpdate();
