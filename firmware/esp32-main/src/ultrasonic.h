#pragma once

// HY-SRF05 — ตรวจจับระยะผู้ใช้งานฝั่งขาเข้า
void ultrasonicBegin();

// คืนระยะเป็นเซนติเมตร, คืน -1 เมื่ออ่านไม่ได้ / timeout
long ultrasonicReadCm();
