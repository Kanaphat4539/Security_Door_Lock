#include <Arduino.h>

#include "config.h"
#include "ultrasonic.h"

namespace {
// timeout 30ms ~ 5 เมตร ซึ่งไกลเกินกว่าที่ระบบสนใจ (100cm)
constexpr unsigned long kEchoTimeoutUs = 30000;
}  // namespace

void ultrasonicBegin() {
  pinMode(kPinUltrasonicTrig, OUTPUT);
  pinMode(kPinUltrasonicEcho, INPUT);
  digitalWrite(kPinUltrasonicTrig, LOW);
}

long ultrasonicReadCm() {
  digitalWrite(kPinUltrasonicTrig, LOW);
  delayMicroseconds(2);
  digitalWrite(kPinUltrasonicTrig, HIGH);
  delayMicroseconds(10);
  digitalWrite(kPinUltrasonicTrig, LOW);

  const unsigned long durationUs =
      pulseIn(kPinUltrasonicEcho, HIGH, kEchoTimeoutUs);
  if (durationUs == 0) return -1;

  // ความเร็วเสียง ~343 m/s -> 58 us ต่อ 1 cm (ไป-กลับ)
  return static_cast<long>(durationUs / 58);
}
