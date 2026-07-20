#pragma once

// ขา GPIO ของ ESP32 (main) — ตรงกับการต่อวงจรจริงที่ยืนยันแล้ว

// ---- RFID reader 1 = ขาเข้า (VSPI) ----
constexpr int kPinRfidEntrySck  = 18;
constexpr int kPinRfidEntryMiso = 19;
constexpr int kPinRfidEntryMosi = 23;
constexpr int kPinRfidEntrySs   = 5;
constexpr int kPinRfidEntryRst  = 27;

// ---- RFID reader 2 = ขาออก (HSPI — คนละ bus กับตัวขาเข้า) ----
constexpr int kPinRfidExitSck  = 14;
constexpr int kPinRfidExitMiso = 12;
constexpr int kPinRfidExitMosi = 13;
constexpr int kPinRfidExitSs   = 4;
constexpr int kPinRfidExitRst  = 2;

// ---- Ultrasonic HY-SRF05 ----
constexpr int kPinUltrasonicTrig = 33;
constexpr int kPinUltrasonicEcho = 32;

// ---- Output ----
constexpr int kPinBuzzer = 25;
constexpr int kPinRelay  = 26;

// ---- OLED (I2C) ----
constexpr int kPinOledSda     = 21;
constexpr int kPinOledScl     = 22;
constexpr int kOledWidth      = 128;
constexpr int kOledHeight     = 64;
constexpr int kOledI2cAddress = 0x3C;

// ---- UART2 ไปยัง ESP32-CAM ----
constexpr int kPinCamLinkRx = 16;  // RX2
constexpr int kPinCamLinkTx = 17;  // TX2

// ---- ค่าตามสเปกการทำงาน (ดู CLAUDE.md) ----
constexpr int kDistanceWakeCm     = 100;  // < 100cm -> เปิด TFT + สตรีม
constexpr int kDistanceApproachCm = 45;   // < 45cm  -> ถ่ายภาพล่วงหน้า
constexpr unsigned long kUnlockMs      = 5000;  // ปลดล็อก 5 วินาที
constexpr unsigned long kBuzzShortMs   = 200;   // granted
constexpr unsigned long kBuzzLongMs    = 3000;  // denied

// relay เป็น active-low หรือ active-high ขึ้นกับโมดูลที่ใช้จริง
constexpr bool kRelayActiveHigh = true;
