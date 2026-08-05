#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> 
#include <SPI.h>
// ★ ไลบรารี MFRC522v2 (ต้องติดตั้งใน Arduino IDE: Library Manager → ค้น "MFRC522v2")
//   ใช้ v2 เพราะรับ SPIClass& ได้ จึงต่อหัวอ่าน 2 ตัวคนละบัส (VSPI/HSPI) เพื่อไม่ให้ MISO ชนกัน
#include <MFRC522v2.h>
#include <MFRC522DriverSPI.h>
#include <MFRC522DriverPinSimple.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <esp_now.h>

// 🛡️ ป้องกัน ESP32 รีเซ็ตตัวเองจากปัญหาไฟตกกระชาก
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ---------- ★ WiFi & Backend Server Config ★ ----------
const char* WIFI_SSID    = "thiraphat";
const char* WIFI_PASS    = "12345678";
const char* SERVER_URL   = "http://192.168.2.207:3001/access"; 
const char* DEVICE_TOKEN = "511d890b7d952e2c7291f2328a46f4ebce4ed81dd825b0bd6b296ac01397bdfb"; 

// ---------- ★ ESP-NOW Receiver Address ★ ----------
// ⚠️ แก้ไขค่า MAC Address ตรงนี้ตามที่ได้จาก Serial Monitor ของ ESP32-CAM
uint8_t camMacAddress[] = {0x00, 0x4B, 0x12, 0x24, 0x74, 0x00};

// ---------- ★ PIN Definitions ★ ----------
// RFID หัวอ่าน 2 ตัว แยกคนละ SPI บัส (แก้ปัญหา MISO ชนกันตอนใช้บัสเดียว)
//   หัวเข้า (IN)  → VSPI  — คงสายเดิม ไม่ต้องย้าย
//   หัวออก (OUT) → HSPI  — ⚠️ ต้องย้ายสาย SCK/MISO/MOSI/RST ตามค่าด้านล่าง
#define SS_IN    5        // RFID เข้า — VSPI
#define RST_IN   4
#define SCK_IN   18
#define MISO_IN  19
#define MOSI_IN  23

#define SS_OUT   17       // RFID ออก — HSPI (SS เดิม คงไว้ได้ ไม่ต้องย้าย)
#define RST_OUT  2        // RST เดิม คงไว้ได้ (ดึง HIGH หลังบูต — Door ใช้ขานี้ทำงานได้)
#define SCK_OUT  14       // ⚠️ ย้ายจาก 18
#define MISO_OUT 35       // ⚠️ ย้ายจาก 19 — GPIO35 input-only ปลอดภัย ไม่ใช่ strapping
#define MOSI_OUT 13       // ⚠️ ย้ายจาก 23

#define RELAY_PIN  25
#define TRIG_PIN   26
#define ECHO_PIN   27
#define BUZZER_PIN 33

// ระยะ (ซม.) ที่ตรวจจับว่ามีคนเข้ามาใกล้ → ปลุกจอ
// ใช้ 30 ซม. (ระยะประชิดจริงหน้าประตู) — ปรับได้ตามหน้างาน
#define WAKE_DISTANCE_CM 30

#define i2c_Address 0x3c
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// ★ หัวอ่าน 2 ตัวคนละบัส (MFRC522v2 รับ SPIClass& ได้)
SPIClass gSpiIn(VSPI);
SPIClass gSpiOut(HSPI);
MFRC522DriverPinSimple gSsIn(SS_IN);
MFRC522DriverPinSimple gSsOut(SS_OUT);
MFRC522DriverSPI gDriverIn(gSsIn, gSpiIn);
MFRC522DriverSPI gDriverOut(gSsOut, gSpiOut);
MFRC522 rfidIn(gDriverIn);
MFRC522 rfidOut(gDriverOut);

Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

bool lastDisplayState = false;

// ==================== ฟังก์ชันส่งคำสั่งไปหา ESP32-CAM ====================
void sendCamCommand(uint8_t command) {
  esp_err_t result = esp_now_send(camMacAddress, &command, sizeof(command));
  if (result == ESP_OK) {
    Serial.printf("[ESP-NOW] Sent command: %d OK\n", command);
  } else {
    Serial.println("[ESP-NOW] Error sending command");
  }
}

// ==================== ฟังก์ชันแสดงผลบน OLED ====================
void show(String a, String b = "", String c = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 10);
  display.println(a);
  display.println(b);
  display.println(c);
  display.display();
}

// ==================== เชื่อมต่อ WiFi ====================
void connectWiFi() {
  show("Connecting WiFi...", WIFI_SSID);
  
  // ใช้ AP_STA เพื่อให้รองรับ ESP-NOW
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    show("WiFi Connected!", WiFi.localIP().toString());
    Serial.println("\n[WiFi] Connected: " + WiFi.localIP().toString());
  } else {
    show("WiFi FAILED", "Check SSID/PASS");
    Serial.println("\n[WiFi] Connection Failed");
  }
  delay(1200);
}

// ==================== รับส่งข้อมูลกับ Backend ====================
bool sendScan(String device, String uid, String &outStatus, String &outName) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.setTimeout(5000);

  StaticJsonDocument<128> reqDoc;
  reqDoc["uid"] = uid;

  String dir = device;
  dir.toLowerCase();
  reqDoc["direction"] = dir;

  String payload;
  serializeJson(reqDoc, payload);

  int httpCode = http.POST(payload);

  if (httpCode == 401) {
    Serial.println("[HTTP 401] Unauthorized! Check your DEVICE_TOKEN in code.");
    show("401 UNAUTH", "Invalid Token!", "Check .env file");
    delay(2000);
    http.end();
    return false;
  }

  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    Serial.printf("[HTTP] %d: %s\n", httpCode, response.c_str());

    StaticJsonDocument<256> resDoc;
    DeserializationError err = deserializeJson(resDoc, response);
    
    if (!err) {
      if (response.indexOf("granted") >= 0 || (resDoc.containsKey("status") && resDoc["status"] == "OPEN")) {
        outStatus = "granted";
      } else {
        outStatus = "denied";
      }
      outName = resDoc.containsKey("name") ? resDoc["name"].as<String>() : "User";
      http.end();
      return true;
    }
  }

  Serial.printf("[HTTP] Request failed, code: %d\n", httpCode);
  http.end();
  return false;
}

// ==================== ควบคุมฮาร์ดแวร์เมื่อผ่าน / ไม่ผ่าน ====================
void grantAccess(String name, String device) {
  Serial.println("[ACTION] Access Granted! Opening relay...");
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(RELAY_PIN, HIGH);
  show("ACCESS GRANTED", name, "Gate: " + device);
  
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);

  delay(5000);   // ปลดล็อกประตูค้าง 5 วินาที (ตามโฟลว์ชาร์ต) แล้วล็อกกลับ
  digitalWrite(RELAY_PIN, LOW);

  lastDisplayState = false;
}

void denyAccess(String name, String device) {
  Serial.println("[ACTION] Access Denied!");
  show("ACCESS DENIED", name, "Gate: " + device);

  // buzzer ยาว 3 วินาที (ตามโฟลว์ชาร์ต: denied = เสียงยาว) ประตูคงสถานะล็อก
  digitalWrite(BUZZER_PIN, HIGH);
  delay(3000);
  digitalWrite(BUZZER_PIN, LOW);

  lastDisplayState = false;
}

// ==================== เริ่มต้นหัวอ่าน RFID ====================
// MFRC522v2 ไม่รับขา RST ทาง driver (ใช้ soft reset) แต่วงจรต่อ RST ไว้จริง
// จึงต้องดึงขา RST ขึ้น HIGH เองก่อน init
void releaseReset(int pin) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
  delay(2);
  digitalWrite(pin, HIGH);
  delay(50);
}

// PCD_Init คืน false บางจังหวะบูตที่ไฟยังไม่นิ่ง (ทั้งที่หัวอ่านตั้งค่าเสร็จแล้ว)
// ลองซ้ำ 3 ครั้งก่อนยอมแพ้ กัน log init failed หลอก
bool initWithRetry(MFRC522 &reader, const char *label) {
  for (int i = 0; i < 3; i++) {
    if (reader.PCD_Init()) return true;
    delay(50);
  }
  Serial.printf("[rfid] %s reader init failed\n", label);
  return false;
}

// ==================== ตรวจสอบการแตะบัตร RFID ====================
// 2 หัวอ่านอยู่คนละ SPI บัส (VSPI/HSPI) จึงอ่านสลับกันได้เลย ไม่ต้องสลับ power-down
void processRFID(MFRC522 &mfrc522, String deviceName) {
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String uid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(mfrc522.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();

    show("Scanning [" + deviceName + "]", "UID: " + uid, "Checking...");

    String status, name;
    if (sendScan(deviceName, uid, status, name)) {
      if (status == "granted") {
        grantAccess(name, deviceName);
      } else {
        denyAccess(name, deviceName);
      }
    } else {
      show("SERVER ERROR", "Try again", deviceName);
      delay(1500);
      lastDisplayState = false;
    }

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }
}

// ==================== Setup & Loop ====================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(250);

  if (!display.begin(i2c_Address, true)) {
    Serial.println(F("[OLED] SH1106 Allocation Failed!"));
  }

  show("System Starting...", "Checking sensors...");
  delay(1500);

  // ---------- เริ่มหัวอ่าน RFID (2 บัสแยกกัน VSPI/HSPI) ----------
  // MFRC522v2 ใช้ soft reset ไม่รับขา RST ทาง driver จึงต้องปลดรีเซ็ตเองด้วยการดึง RST ขึ้น HIGH
  releaseReset(RST_IN);
  releaseReset(RST_OUT);
  gSpiIn.begin(SCK_IN, MISO_IN, MOSI_IN, SS_IN);
  gSpiOut.begin(SCK_OUT, MISO_OUT, MOSI_OUT, SS_OUT);
  initWithRetry(rfidIn, "entry");
  initWithRetry(rfidOut, "exit");

  connectWiFi();

  // ---------- เริ่มระบบ ESP-NOW ----------
  if (esp_now_init() == ESP_OK) {
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, camMacAddress, 6);
    peerInfo.channel = 0;  
    peerInfo.encrypt = false;
    
    if (esp_now_add_peer(&peerInfo) == ESP_OK) {
      Serial.println("[ESP-NOW] Peer ESP32-CAM added successfully!");
    }
  }

  // OLED แสดงสถานะสแตนด์บายตั้งแต่เริ่มต้น (ตามโฟลว์ชาร์ต)
  show("== STANDBY ==", "Please come closer");

  // สั่งดับจอ TFT ฝั่ง ESP32-CAM ตั้งแต่เริ่มต้น
  sendCamCommand(0);

  Serial.println(F("[SYSTEM] Standby. Waiting for Ultrasonic..."));
}

void loop() {
  // 1. อ่านระยะจาก Ultrasonic Sensor
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dist = pulseIn(ECHO_PIN, HIGH, 20000) * 0.0343 / 2;

  // มีคนเข้ามาใกล้ในระยะปลุกจอหรือไม่ (ฝั่งขาเข้า)
  bool nearby = (dist > 0 && dist <= WAKE_DISTANCE_CM);

  // 2. ควบคุมหน้าจอ OLED และสั่งงานจอ TFT ไร้สายไปที่ ESP32-CAM
  if (nearby) {
    if (!lastDisplayState) {
      Serial.printf("[Ultrasonic] Detected! Distance: %ld cm\n", dist);

      // 💡 เปิดหน้าจอ OLED ตัวหลัก
      show("== READY TO SCAN ==", "Tap your RFID card");

      // 📡 ส่งสัญญาณไร้สายสั่งเปิด TFT หน้าจอ ESP32-CAM
      sendCamCommand(1);

      lastDisplayState = true;
    }
  } else {
    if (lastDisplayState) {
      Serial.println("[Ultrasonic] No object nearby. Back to standby...");

      // 🌑 OLED กลับไปแสดงสแตนด์บาย — จอ TFT ฝั่ง CAM ถูกสั่งดับ
      show("== STANDBY ==", "Please come closer");

      // 📡 ส่งสัญญาณไร้สายสั่งดับ TFT หน้าจอ ESP32-CAM
      sendCamCommand(0);

      lastDisplayState = false;
    }
  }

  // 3. ตรวจสอบการแตะบัตร RFID
  //    หัวเข้า (IN) : ทาบได้เฉพาะตอนมีคนเข้ามาใกล้ < WAKE_DISTANCE_CM (ตามที่ต้องการ)
  //    หัวออก (OUT): ทาบได้เสมอ — ฝั่งในไม่มี ultrasonic ไม่งั้นคนข้างในจะออกไม่ได้
  if (nearby) processRFID(rfidIn, "IN");
  processRFID(rfidOut, "OUT");

  // 4. ตรวจสอบสถานะการเชื่อมต่อ WiFi ทุกๆ 10 วินาที
  static unsigned long lastWifiCheck = 0;
  if (millis() - lastWifiCheck > 10000) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
  }
}