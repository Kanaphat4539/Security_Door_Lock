#include <MFRC522DriverPinSimple.h>
#include <MFRC522DriverSPI.h>
#include <MFRC522v2.h>
#include <SPI.h>

#include "config.h"
#include "rfid.h"

// หัวอ่านสองตัวอยู่คนละ SPI bus:
//   ขาเข้า -> VSPI (18/19/23)
//   ขาออก  -> HSPI (14/12/13)
// จึงต้องใช้ MFRC522v2 ซึ่งรับ SPIClass& เข้ามาได้
// (v1.4.x ผูกกับ global SPI object ตายตัว ใช้กับสองบัสไม่ได้)

namespace {

SPIClass gSpiEntry(VSPI);
SPIClass gSpiExit(HSPI);

MFRC522DriverPinSimple gSsEntry(kPinRfidEntrySs);
MFRC522DriverPinSimple gSsExit(kPinRfidExitSs);

MFRC522DriverSPI gDriverEntry(gSsEntry, gSpiEntry);
MFRC522DriverSPI gDriverExit(gSsExit, gSpiExit);

MFRC522 gEntry(gDriverEntry);
MFRC522 gExit(gDriverExit);

String toHex(const MFRC522::Uid& uid) {
  String out;
  out.reserve(uid.size * 2);
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) out += '0';
    out += String(uid.uidByte[i], HEX);
  }
  out.toUpperCase();
  return out;
}

bool readFrom(MFRC522& reader, String& uid) {
  if (!reader.PICC_IsNewCardPresent()) return false;
  if (!reader.PICC_ReadCardSerial()) return false;

  uid = toHex(reader.uid);

  // ต้องสั่งหยุด ไม่งั้นหัวอ่านจะค้างกับบัตรใบเดิมและอ่านซ้ำไม่รู้จบ
  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  return true;
}

// MFRC522v2 ใช้ soft reset ไม่ได้รับขา RST เข้ามาทาง driver
// แต่วงจรจริงต่อ RST ไว้ จึงต้องปลดรีเซ็ตเองด้วยการดึงขาขึ้น HIGH ก่อน init
void releaseReset(int pin) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
  delay(2);
  digitalWrite(pin, HIGH);
  delay(50);
}

}  // namespace

void rfidBegin() {
  releaseReset(kPinRfidEntryRst);
  releaseReset(kPinRfidExitRst);

  gSpiEntry.begin(kPinRfidEntrySck, kPinRfidEntryMiso, kPinRfidEntryMosi,
                  kPinRfidEntrySs);
  gSpiExit.begin(kPinRfidExitSck, kPinRfidExitMiso, kPinRfidExitMosi,
                 kPinRfidExitSs);

  if (!gEntry.PCD_Init()) Serial.println(F("[rfid] entry reader init failed"));
  if (!gExit.PCD_Init()) Serial.println(F("[rfid] exit reader init failed"));
}

bool rfidReadEntry(String& uid) { return readFrom(gEntry, uid); }
bool rfidReadExit(String& uid) { return readFrom(gExit, uid); }
