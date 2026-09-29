#include <Arduino.h>

#include "buzzer.h"
#include "config.h"

namespace {
bool gActive = false;
unsigned long gOffAtMs = 0;
}  // namespace

void buzzerBegin() {
  pinMode(kPinBuzzer, OUTPUT);
  digitalWrite(kPinBuzzer, LOW);
}

void buzzerBeep(unsigned long durationMs) {
  digitalWrite(kPinBuzzer, HIGH);
  gActive = true;
  gOffAtMs = millis() + durationMs;
}

void buzzerUpdate() {
  if (gActive && millis() >= gOffAtMs) {
    digitalWrite(kPinBuzzer, LOW);
    gActive = false;
  }
}
