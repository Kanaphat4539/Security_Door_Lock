#pragma once

// OLED SSD1306 — แสดงสถานะให้ผู้ใช้ฝั่งขาเข้า
// (TFT ไม่ได้อยู่ที่บอร์ดนี้ — ต่อกับ ESP32-CAM โดยตรง)
void displayBegin();

// แสดงข้อความ 2 บรรทัด (บรรทัดที่สองจะเว้นได้)
void displayShow(const char* line1, const char* line2 = nullptr);

void displayStandby();
void displayGranted();
void displayDenied();
