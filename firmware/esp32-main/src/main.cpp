// ESP32 (main controller)
// รับผิดชอบ: RFID x2, Ultrasonic, OLED, Buzzer, Relay
// บอร์ดนี้ "ไม่มี Wi-Fi" ในสถาปัตยกรรมนี้ — ทุกอย่างที่ต้องคุยกับเซิร์ฟเวอร์
// ต้องส่งผ่าน ESP32-CAM ทาง Serial2 เสมอ (ดู src/shared/protocol.h)

#include <Arduino.h>

#include "protocol.h"
#include "buzzer.h"
#include "config.h"
#include "display.h"
#include "relay.h"
#include "rfid.h"
#include "ultrasonic.h"

namespace {

HardwareSerial gCamLink(2);

bool gAwake = false;       // TFT เปิด/สตรีมอยู่หรือไม่
bool gPrecaptured = false; // ถ่ายภาพล่วงหน้าไปแล้วในรอบนี้หรือยัง

unsigned long gNextDistanceReadMs = 0;
constexpr unsigned long kDistanceIntervalMs = 200;

void sendCmd(const String& cmd) {
  gCamLink.print(cmd);
  gCamLink.print('\n');
  Serial.printf("[link] -> %s\n", cmd.c_str());
}

// รอผล RESULT: จาก ESP32-CAM
// หมายเหตุ: บล็อกจนกว่าจะครบ timeout — ยอมรับได้เพราะระหว่างรอผลการทาบบัตร
// ระบบไม่ควรรับอินพุตอื่นอยู่แล้ว ถ้าภายหลังต้องรองรับเข้า-ออกพร้อมกันจริง ๆ
// ควรเปลี่ยนเป็น state machine แบบ non-blocking
String waitForResult() {
  const unsigned long deadline = millis() + proto::kResultTimeoutMs;
  String line;

  while (millis() < deadline) {
    while (gCamLink.available()) {
      const char c = gCamLink.read();
      if (c == '\n') {
        line.trim();
        Serial.printf("[link] <- %s\n", line.c_str());
        if (line.startsWith(proto::kResult)) {
          return line.substring(strlen(proto::kResult));
        }
        line = "";
      } else if (c != '\r') {
        line += c;
      }
    }
    buzzerUpdate();
    relayUpdate();
    delay(5);
  }

  Serial.println(F("[link] timeout waiting for RESULT"));
  return proto::kError;
}

void applyResult(const String& status, bool updateOled) {
  if (status == proto::kGranted) {
    if (updateOled) displayGranted();
    buzzerBeep(kBuzzShortMs);
    relayUnlockTimed();
  } else {
    // denied และ error ปฏิบัติเหมือนกัน: ประตูคงสถานะล็อก
    if (updateOled) displayDenied();
    buzzerBeep(kBuzzLongMs);
  }
}

// ---- ฝั่งขาเข้า: เช็คระยะก่อน แล้วค่อยรอทาบบัตร ----
void handleEntry() {
  if (millis() >= gNextDistanceReadMs) {
    gNextDistanceReadMs = millis() + kDistanceIntervalMs;

    const long cm = ultrasonicReadCm();
    const bool near = (cm > 0 && cm < kDistanceWakeCm);

    if (near && !gAwake) {
      gAwake = true;
      gPrecaptured = false;
      sendCmd(proto::kCmdWake);
      displayShow("READY", "Tap your card");
    } else if (!near && gAwake) {
      gAwake = false;
      gPrecaptured = false;
      sendCmd(proto::kCmdSleep);
      displayStandby();
    }

    if (gAwake && !gPrecaptured && cm > 0 && cm < kDistanceApproachCm) {
      gPrecaptured = true;
      sendCmd(proto::kCmdPrecap);
    }
  }

  String uid;
  if (!rfidReadEntry(uid)) return;

  Serial.printf("[entry] uid=%s\n", uid.c_str());
  sendCmd(String(proto::kCmdIn) + uid);
  applyResult(waitForResult(), /*updateOled=*/true);

  gPrecaptured = false;
}

// ---- ฝั่งขาออก: ไม่สนใจระยะ ไม่ถ่ายภาพ ----
void handleExit() {
  String uid;
  if (!rfidReadExit(uid)) return;

  Serial.printf("[exit] uid=%s\n", uid.c_str());
  sendCmd(String(proto::kCmdOut) + uid);
  applyResult(waitForResult(), /*updateOled=*/false);
}

}  // namespace

void setup() {
  Serial.begin(115200);
  gCamLink.begin(proto::kLinkBaud, SERIAL_8N1, kPinCamLinkRx, kPinCamLinkTx);

  buzzerBegin();
  relayBegin();
  ultrasonicBegin();
  displayBegin();
  rfidBegin();

  Serial.println(F("[main] ready"));
}

void loop() {
  buzzerUpdate();
  relayUpdate();

  handleEntry();
  handleExit();
}
