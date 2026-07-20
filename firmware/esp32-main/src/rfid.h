#pragma once

#include <Arduino.h>

// RC522 x2 บน SPI bus เดียวกัน แยกกันด้วยขา SS
//   reader 1 = ขาเข้า (entry)
//   reader 2 = ขาออก (exit)
void rfidBegin();

// อ่านการ์ดจากหัวอ่านที่ระบุ ถ้ามีการทาบบัตรจะคืน true และเซ็ต uid
// (uid เป็น hex ตัวพิมพ์ใหญ่ ไม่มีตัวคั่น เช่น "A1B2C3D4")
bool rfidReadEntry(String& uid);
bool rfidReadExit(String& uid);
