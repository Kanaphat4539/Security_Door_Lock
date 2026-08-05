#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "display.h"

namespace {
Adafruit_SSD1306 gOled(kOledWidth, kOledHeight, &Wire, -1);
bool gReady = false;
}  // namespace

void displayBegin() {
  Wire.begin(kPinOledSda, kPinOledScl);
  gReady = gOled.begin(SSD1306_SWITCHCAPVCC, kOledI2cAddress);
  if (!gReady) {
    Serial.println(F("[display] SSD1306 init failed"));
    return;
  }
  gOled.setTextColor(SSD1306_WHITE);
  displayStandby();
}

void displayShow(const char* line1, const char* line2) {
  if (!gReady) return;
  gOled.clearDisplay();
  gOled.setTextSize(2);
  gOled.setCursor(0, 8);
  gOled.println(line1);
  if (line2 != nullptr) {
    gOled.setTextSize(1);
    gOled.setCursor(0, 40);
    gOled.println(line2);
  }
  gOled.display();
}

// หมายเหตุ: SSD1306 + Adafruit_GFX เรนเดอร์ได้เฉพาะ ASCII
// ถ้าต้องการข้อความภาษาไทยต้องใช้ฟอนต์บิตแมปเพิ่ม — ยังไม่ได้ทำ
void displayStandby() { displayShow("STANDBY", "Tap your card"); }
void displayGranted() { displayShow("GRANTED", "Door unlocked"); }
void displayDenied()  { displayShow("DENIED", "Access refused"); }
