#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> 
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

// 🛡️ ป้องกัน ESP32 รีเซ็ตตัวเองจากปัญหาไฟตกกระชาก
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ---------- ★ WiFi & Backend Server Config ★ ----------
const char* WIFI_SSID    = "thiraphat";
const char* WIFI_PASS    = "12345678";
// URL สำหรับ Backend (ระบุ Port และ Path /access ให้ตรงกับ Backend)
const char* SERVER_URL   = "http://192.168.2.207:3001/access"; 
// ⚠️ แก้ค่านี้ให้ตรงกับ DEVICE_TOKEN ในไฟล์ .env ของ Backend
const char* DEVICE_TOKEN = "511d890b7d952e2c7291f2328a46f4ebce4ed81dd825b0bd6b296ac01397bdfb"; 

// ---------- ★ PIN Definitions (ฮาร์ดแวร์อิงจาก rfid_wifi) ★ ----------
#define SS_IN      5      // RFID ตัวเข้า (IN)
#define RST_IN     4
#define SS_OUT     17     // RFID ตัวออก (OUT)
#define RST_OUT    2
#define RELAY_PIN  25
#define TRIG_PIN   26
#define ECHO_PIN   27
#define BUZZER_PIN 33

#define i2c_Address 0x3c  // หากจอไม่ติด ลองสลับเป็น 0x3D
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

MFRC522 rfidIn(SS_IN, RST_IN);
MFRC522 rfidOut(SS_OUT, RST_OUT);
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

bool lastDisplayState = false; // ตัวแปรเช็กสถานะการแสดงผลหน้าจอ

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
  WiFi.mode(WIFI_STA);
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

  // 🎯 สร้าง Body JSON ให้ตรงกับที่ Backend คาดหวัง
  StaticJsonDocument<128> reqDoc;
  reqDoc["uid"] = uid;

  // แปลงค่า "IN" / "OUT" ให้เป็นตัวพิมพ์เล็ก "in" / "out"
  String dir = device;
  dir.toLowerCase();
  reqDoc["direction"] = dir;

  String payload;
  serializeJson(reqDoc, payload);

  int httpCode = http.POST(payload);

  // 🔴 หากเจอ HTTP 401 (TOKEN ไม่ถูกต้อง)
  if (httpCode == 401) {
    Serial.println("[HTTP 401] Unauthorized! Check your DEVICE_TOKEN in code.");
    show("401 UNAUTH", "Invalid Token!", "Check .env file");
    delay(2000);
    http.end();
    return false;
  }

  // 🟢 หากผ่าน (HTTP 200 OK / 201 Created)
  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    Serial.printf("[HTTP] %d: %s\n", httpCode, response.c_str());

    StaticJsonDocument<256> resDoc;
    DeserializationError err = deserializeJson(resDoc, response);
    
    if (!err) {
      // ตรวจสอบผลลัพธ์ผ่าน Keyword "granted" หรือ "status"
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
  digitalWrite(RELAY_PIN, HIGH); // หาก Relay เป็น Active Low ให้เปลี่ยนเป็น LOW
  show("ACCESS GRANTED", name, "Gate: " + device);
  
  delay(200);
  digitalWrite(BUZZER_PIN, LOW); // ปิดเสียงติ๊ดสั้น
  
  delay(3000); // เปิดกลอนประตูค้างไว้ 3 วินาที
  digitalWrite(RELAY_PIN, LOW);
  
  lastDisplayState = false;
}

void denyAccess(String name, String device) {
  Serial.println("[ACTION] Access Denied!");
  // เสียงเตือนสั้นๆ 3 ครั้ง
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
    delay(80);
  }
  show("ACCESS DENIED", name, "Gate: " + device);
  delay(2000);
  
  lastDisplayState = false;
}

// ==================== ตรวจสอบการแตะบัตร RFID ====================
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
  // ปิดตัวจับไฟตก ป้องกัน ESP32 รีเซ็ตตัวเอง
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // เริ่มระบบ I2C (SDA=21, SCL=22)
  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(250);

  // สแกนหาอุปกรณ์ I2C เพื่อเช็ก Address จอใน Serial Monitor
  Serial.println("\n--- I2C Scanner ---");
  byte count = 0;
  for (byte i = 1; i < 127; i++) {
    Wire.beginTransmission(i);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Found I2C device at 0x%02X\n", i);
      count++;
    }
  }
  if (count == 0) Serial.println("No I2C devices found!");

  // เริ่มทำงาน OLED
  if (!display.begin(i2c_Address, true)) {
    Serial.println(F("[OLED] SH1106 Allocation Failed! Check I2C address"));
  }

  // โชว์ข้อความช่วงเริ่มระบบ 2 วินาที
  show("System Starting...", "Checking sensors...");
  delay(2000);

  SPI.begin();
  rfidIn.PCD_Init();
  rfidOut.PCD_Init();

  connectWiFi();

  // ดับหน้าจอไว้ เพื่อเข้าโหมด Standby
  display.clearDisplay();
  display.display();
  Serial.println(F("[SYSTEM] Standby. Waiting for Ultrasonic..."));
}

void loop() {
  // 1. อ่านระยะจาก Ultrasonic Sensor
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dist = pulseIn(ECHO_PIN, HIGH, 20000) * 0.0343 / 2;

  // 2. ควบคุมการเปิด-ปิดจอ OLED ตามระยะ Ultrasonic (ตัดเสียง Buzzer ออกแล้ว)
  if (dist > 0 && dist <= 30) {
    // เมื่อระยะ <= 30 ซม. (มีคนเดินเข้าใกล้)
    if (!lastDisplayState) {
      Serial.printf("[Ultrasonic] Detected! Distance: %ld cm\n", dist);
      
      // 💡 เปิดหน้าจอ OLED สว่างอย่างเดียว (ไม่มีเสียงติ๊ดแล้ว)
      show("== READY TO SCAN ==", "Tap your RFID card");

      lastDisplayState = true;
    }
  } else {
    // เมื่อระยะ > 30 ซม. หรืออ่านค่าไม่ได้ (ไม่มีคน)
    if (lastDisplayState) {
      Serial.println("[Ultrasonic] No object nearby. Turning off display...");
      
      // 🌑 ดับหน้าจอ OLED
      display.clearDisplay();
      display.display();
      
      lastDisplayState = false;
    }
  }

  // 3. ตรวจสอบการแตะบัตร RFID ทั้ง 2 หัวอ่าน (IN / OUT)
  processRFID(rfidIn, "IN");
  processRFID(rfidOut, "OUT");

  // 4. ตรวจสอบสถานะการเชื่อมต่อ WiFi ทุกๆ 10 วินาที
  static unsigned long lastWifiCheck = 0;
  if (millis() - lastWifiCheck > 10000) {
    lastWifiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
  }
}