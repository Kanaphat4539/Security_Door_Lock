#pragma once

// คัดลอกไฟล์นี้เป็น secrets.h แล้วใส่ค่าจริง
//   cp src/cam/secrets.example.h src/cam/secrets.h
//
// secrets.h ถูก gitignore ไว้แล้ว — ห้าม commit ค่าจริงเข้า git

constexpr char kWifiSsid[]     = "YOUR_WIFI_SSID";
constexpr char kWifiPassword[] = "YOUR_WIFI_PASSWORD";

// endpoint ของ Nest.js backend ที่รับ POST จาก ESP32-CAM
// backend ฟังที่พอร์ต 3001 (3000 เป็นของ frontend)
constexpr char kServerUrl[] = "http://192.168.1.100:3001/access";

// ต้องตรงกับ DEVICE_TOKEN ใน backend/.env ไม่งั้นจะโดน 401 ทุกครั้ง
// (ใช้คนละใบกับ DASHBOARD_TOKEN โดยตั้งใจ — ใบนี้เรียกได้แค่ POST /access)
constexpr char kDeviceToken[] = "YOUR_DEVICE_TOKEN";
