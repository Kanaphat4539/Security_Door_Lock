#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Arduino.h>
#include <MFRC522.h>
#include <SPI.h>
#include <Wire.h>


// --- กำหนดขาพิน (แก้ไขใหม่เพื่อไม่ให้ชนกับระบบ SPI) ---
#define TRIG_PIN 32
#define ECHO_PIN 33
#define RELAY_PIN 26
#define BUZZER_PIN 25

// ขา SPI สำหรับ RFID (แชร์กัน)
#define RST_PIN 27
#define SS_IN_PIN 5  // ขา SS เครื่องอ่านขาเข้า
#define SS_OUT_PIN 4 // ขา SS เครื่องอ่านขาออก

// ==========================================
// Class จัดการระยะทาง (Ultrasonic)
// ==========================================
class Ultrasonic {
private:
  int trig, echo;

public:
  Ultrasonic(int t, int e) : trig(t), echo(e) {
    pinMode(trig, OUTPUT);
    pinMode(echo, INPUT);
  }
  int getDistance() {
    digitalWrite(trig, LOW);
    delayMicroseconds(2);
    digitalWrite(trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig, LOW);
    long duration = pulseIn(echo, HIGH, 30000); // Timeout 30ms
    if (duration == 0)
      return 999;
    return duration * 0.034 / 2;
  }
};

// ==========================================
// Class จัดการประตูและเสียง (Relay & Buzzer)
// ==========================================
class DoorLock {
private:
  int relay, buzzer;

public:
  DoorLock(int r, int b) : relay(r), buzzer(b) {
    pinMode(relay, OUTPUT);
    pinMode(buzzer, OUTPUT);
    digitalWrite(relay, LOW); // ล็อกประตู
  }
  void grantAccess() {
    // เสียงสั้น 1 ครั้ง เปิดประตู 5 วินาที
    tone(buzzer, 2000, 200);
    digitalWrite(relay, HIGH);
    delay(5000);
    digitalWrite(relay, LOW);
  }
  void denyAccess() {
    // เสียงยาว 1 ครั้ง ประตูไม่เปิด (ดังค้างไว้ 3 วินาที)
    tone(buzzer, 1000, 3000);
    delay(3000); // หน่วงเวลา 3 วินาทีเพื่อให้เสียงดังจบและมีเวลาดูหน้าจอ
  }
};

// ==========================================
// Class จัดการหน้าจอ (OLED)
// ==========================================
class DisplayOLED {
private:
  Adafruit_SSD1306 display;

public:
  DisplayOLED() : display(128, 64, &Wire, -1) {}
  void begin() {
    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    showText("System Ready");
  }
  void showText(String text) {
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(WHITE);
    display.setCursor(0, 20);
    display.println(text);
    display.display();
  }
};

// ==========================================
// Class จัดการเครื่องอ่านบัตร (RFID)
// ==========================================
class RFIDReader {
private:
  MFRC522 mfrc522;

public:
  RFIDReader(int ss_pin, int rst_pin) : mfrc522(ss_pin, rst_pin) {}
  void begin() { mfrc522.PCD_Init(); }
  String readCard() {
    if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
      return "";
    }
    String uid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
      uid += String(mfrc522.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    mfrc522.PICC_HaltA(); // หยุดพักบัตร
    return uid;
  }
};

// --- สร้าง Object ของแต่ละอุปกรณ์ ---
Ultrasonic sonar(TRIG_PIN, ECHO_PIN);
DoorLock door(RELAY_PIN, BUZZER_PIN);
DisplayOLED oled;
RFIDReader rfidIn(SS_IN_PIN, RST_PIN);
RFIDReader rfidOut(SS_OUT_PIN, RST_PIN);

// ตัวแปรเก็บสถานะ
bool isStreaming = false;
bool hasSnapped = false; // สำหรับป้องกันไม่ให้ส่งคำสั่งถ่ายรูปซ้ำๆ (Anti-spam)

// ประกาศฟังก์ชันก่อนเรียกใช้
void waitForResponse();

void setup() {
  Serial.begin(115200); // สำหรับ Debug
  Serial2.begin(115200, SERIAL_8N1, 16,
                17); // สำหรับคุยกับ ESP32-CAM (RX:16, TX:17)

  SPI.begin();
  rfidIn.begin();
  rfidOut.begin();
  oled.begin();

  Serial.println("ESP32 Main Started!");
}

void loop() {
  // 1. อ่านค่าระยะทาง
  int dist = sonar.getDistance();

  // ตรวจสอบระยะเพื่อสั่งงานกล้องและจอภาพ
  if (dist < 100) {
    // 1. ถ้าระยะ < 100 ซม. และยังไม่ได้สตรีม ให้สั่งเปิดสตรีมภาพสด
    if (!isStreaming) {
      Serial2.println("CMD_STREAM");
      oled.showText("Please Scan");
      isStreaming = true;
    }

    // 2. ถ้าระยะประชิด < 45 ซม. ให้ถ่ายรูปเก็บไว้ล่วงหน้า 1 รูป (Auto Snapshot)
    if (dist < 45) {
      if (!hasSnapped) {
        Serial2.println("CMD_SNAP");
        hasSnapped = true;
      }
    } else {
      // เมื่อถอยห่างเกิน 45 ซม. ให้รีเซ็ตสิทธิ์การถ่ายรูปล่วงหน้า
      hasSnapped = false;
    }
  } else {
    // ระยะ >= 100 ซม. (สแตนด์บาย)
    if (isStreaming) {
      Serial2.println("CMD_SLEEP");
      oled.showText("Standby");
      isStreaming = false;
      hasSnapped = false;
    }
  }

  // 2. ตรวจสอบการทาบบัตร (ขาเข้า)
  String uidIn = rfidIn.readCard();
  if (uidIn != "") {
    oled.showText("Checking IN...");
    // ส่งคำสั่งไปบอก ESP32-CAM ให้ยิง API ขาเข้า
    Serial2.println("CMD_AUTH_IN:" + uidIn);
    waitForResponse();
  }

  // 3. ตรวจสอบการทาบบัตร (ขาออก)
  String uidOut = rfidOut.readCard();
  if (uidOut != "") {
    oled.showText("Checking OUT...");
    // ส่งคำสั่งไปบอก ESP32-CAM ให้ยิง API ขาออก
    Serial2.println("CMD_AUTH_OUT:" + uidOut);
    waitForResponse();
  }

  delay(50); // หน่วงเวลาเล็กน้อยให้ระบบเสถียร
}

// ฟังก์ชันรอรับผลลัพธ์จาก ESP32-CAM
void waitForResponse() {
  long startTime = millis();
  while (millis() - startTime < 5000) { // รอสูงสุด 5 วินาที
    if (Serial2.available()) {
      String response = Serial2.readStringUntil('\n');
      response.trim();

      if (response == "RESP_GRANTED") {
        oled.showText("Access Granted");
        door.grantAccess();
        oled.showText("Standby");
        return;
      } else if (response == "RESP_DENIED") {
        oled.showText("Access Denied");
        door.denyAccess();
        oled.showText("Standby");
        return;
      }
    }
  }
  // ถ้าหมดเวลา (Timeout)
  oled.showText("Timeout Error");
  door.denyAccess(); // มี delay(3000) ด้านในแล้วเพื่อคงหน้าจอและเล่นเสียง
  oled.showText("Standby");
}