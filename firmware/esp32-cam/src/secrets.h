#pragma once

// ⚠️ ไฟล์นี้ถูก gitignore ไว้ — ใส่ค่าจริงได้ ไม่ถูก commit
// ค่าด้านล่างเป็น placeholder ที่ใส่ไว้เพื่อให้ `pio run` คอมไพล์ผ่านเท่านั้น
// ต้องแก้เป็นค่าจริงก่อน flash ลงบอร์ด

constexpr char kWifiSsid[]     = "CHANGE_ME";
constexpr char kWifiPassword[] = "CHANGE_ME";

// backend ฟังที่พอร์ต 3001 (3000 เป็นของ frontend)
constexpr char kServerUrl[] = "http://192.168.1.100:3001/access";

// ต้องตรงกับ DEVICE_TOKEN ใน backend/.env
constexpr char kDeviceToken[] =
    "cda33ccc37b464c9547ed5bb4aae823bf4a1491c80bf59875094d35aa60e0512";
