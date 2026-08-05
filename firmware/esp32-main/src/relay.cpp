#include <Arduino.h>

#include "config.h"
#include "relay.h"

namespace {
bool gUnlocked = false;
unsigned long gLockAtMs = 0;

void driveRelay(bool on) {
  const bool level = kRelayActiveHigh ? on : !on;
  digitalWrite(kPinRelay, level ? HIGH : LOW);
}
}  // namespace

void relayBegin() {
  pinMode(kPinRelay, OUTPUT);
  driveRelay(false);  // ล็อกไว้ตั้งแต่บูต
  gUnlocked = false;
}

void relayUnlockTimed() {
  driveRelay(true);
  gUnlocked = true;
  gLockAtMs = millis() + kUnlockMs;
}

void relayUpdate() {
  if (gUnlocked && millis() >= gLockAtMs) {
    driveRelay(false);
    gUnlocked = false;
  }
}

bool relayIsUnlocked() { return gUnlocked; }
