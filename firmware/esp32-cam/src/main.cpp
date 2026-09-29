// ESP32-CAM
// รับผิดชอบ: กล้อง, Wi-Fi (จุดเชื่อมต่อเดียวของทั้งระบบ), TFT
//
// รับคำสั่งจาก ESP32 (main) ทาง Serial แล้วยิง HTTP ไป backend
// จากนั้นส่งผลลัพธ์กลับไปให้ ESP32 (main) สั่งงาน OLED/Buzzer/Relay ต่อ
//
// ⚠️ ลิงก์ไป ESP32 (main) ใช้ UART0 (RX=3/TX=1) ซึ่งเป็นพอร์ตเดียวกับ USB-serial
//    ดังนั้น "Serial" ในไฟล์นี้คือสายที่ต่อไปหา ESP32 ไม่ใช่ช่อง debug
//    ห้าม print อะไรลง Serial นอกจากข้อความตามโปรโตคอล มิฉะนั้น ESP32 จะได้คำสั่งมั่ว

#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <esp_camera.h>

#include "protocol.h"
#include "config.h"
#include "secrets.h"

// debug ปิดไว้โดยค่าเริ่มต้น เปิดได้ก็ต่อเมื่อต่อ UART อีกชุดจริง ๆ
// (build_flags = -DCAM_DEBUG=1 -DCAM_DEBUG_TX=<pin>)
#ifndef CAM_DEBUG
#define CAM_DEBUG 0
#endif

#if CAM_DEBUG
namespace {
HardwareSerial gDebug(1);
}
#define LOGF(...) gDebug.printf(__VA_ARGS__)
#define LOGLN(x) gDebug.println(x)
#else
#define LOGF(...) \
  do {            \
  } while (0)
#define LOGLN(x) \
  do {           \
  } while (0)
#endif

namespace {

// ลิงก์ไป ESP32 (main) = UART0 = อ็อบเจ็กต์ Serial
HardwareSerial& gMainLink = Serial;

// ภาพที่ถ่ายเก็บล่วงหน้าตอนผู้ใช้เข้าใกล้ (< 45cm)
uint8_t* gPrecapBuf = nullptr;
size_t gPrecapLen = 0;

void freePrecap() {
  if (gPrecapBuf != nullptr) {
    free(gPrecapBuf);
    gPrecapBuf = nullptr;
    gPrecapLen = 0;
  }
}

bool cameraBegin() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // PSRAM ทำให้ใช้ความละเอียดสูงและ buffer 2 ใบได้
  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
  }

  const esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    LOGF("[cam] init failed: 0x%x\n", err);
    return false;
  }
  return true;
}

void wifiBegin() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(kWifiSsid, kWifiPassword);

  const unsigned long deadline = millis() + 20000;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    LOGLN(WiFi.localIP());
  } else {
    LOGLN(F("[wifi] FAILED"));
  }
}

// ถ่ายภาพ 1 เฟรมแล้วคัดลอกลง heap (ต้อง free เอง)
bool captureToBuffer(uint8_t** out, size_t* outLen) {
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb == nullptr) {
    LOGLN(F("[cam] capture failed"));
    return false;
  }

  *out = static_cast<uint8_t*>(malloc(fb->len));
  if (*out == nullptr) {
    esp_camera_fb_return(fb);
    LOGLN(F("[cam] out of memory"));
    return false;
  }

  memcpy(*out, fb->buf, fb->len);
  *outLen = fb->len;
  esp_camera_fb_return(fb);
  return true;
}

// POST multipart/form-data: fields uid, direction และไฟล์ image (ถ้ามี)
// คืนค่า "granted" / "denied" / "error"
String postAccess(const String& uid, const char* direction, const uint8_t* image,
                  size_t imageLen) {
  if (WiFi.status() != WL_CONNECTED) return proto::kError;

  const String boundary = "----doorlock" + String(millis());

  String head;
  head += "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"uid\"\r\n\r\n" + uid + "\r\n";
  head += "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"direction\"\r\n\r\n";
  head += String(direction) + "\r\n";

  if (image != nullptr && imageLen > 0) {
    head += "--" + boundary + "\r\n";
    head +=
        "Content-Disposition: form-data; name=\"image\"; "
        "filename=\"capture.jpg\"\r\n";
    head += "Content-Type: image/jpeg\r\n\r\n";
  }

  const String tail = "\r\n--" + boundary + "--\r\n";
  const size_t bodyLen = head.length() + imageLen + tail.length();

  uint8_t* body = static_cast<uint8_t*>(malloc(bodyLen));
  if (body == nullptr) {
    LOGLN(F("[http] out of memory building body"));
    return proto::kError;
  }

  size_t off = 0;
  memcpy(body + off, head.c_str(), head.length());
  off += head.length();
  if (image != nullptr && imageLen > 0) {
    memcpy(body + off, image, imageLen);
    off += imageLen;
  }
  memcpy(body + off, tail.c_str(), tail.length());

  HTTPClient http;
  http.setTimeout(kHttpTimeoutMs);
  http.begin(kServerUrl);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  // backend ปฏิเสธ request ที่ไม่มี token ด้วย 401
  http.addHeader("Authorization", String("Bearer ") + kDeviceToken);

  const int code = http.POST(body, bodyLen);
  String result = proto::kError;

  if (code == HTTP_CODE_OK) {
    const String payload = http.getString();
    LOGF("[http] %d %s\n", code, payload.c_str());
    // ตรวจแบบ substring พอ ไม่ต้อง parse JSON เต็มรูปแบบ
    if (payload.indexOf(proto::kGranted) >= 0) {
      result = proto::kGranted;
    } else if (payload.indexOf(proto::kDenied) >= 0) {
      result = proto::kDenied;
    }
  } else {
    LOGF("[http] failed: %d\n", code);
  }

  http.end();
  free(body);
  return result;
}

void sendResult(const String& status) {
  gMainLink.print(proto::kResult);
  gMainLink.print(status);
  gMainLink.print('\n');
}

void handleIn(const String& uid) {
  // ถ้าถ่ายภาพสดตอนนี้ได้ ให้ใช้ภาพสด ไม่งั้นค่อยตกไปใช้ภาพ precapture
  uint8_t* buf = gPrecapBuf;
  size_t len = gPrecapLen;
  bool owned = false;

  uint8_t* fresh = nullptr;
  size_t freshLen = 0;
  if (captureToBuffer(&fresh, &freshLen)) {
    buf = fresh;
    len = freshLen;
    owned = true;
  }

  sendResult(postAccess(uid, "in", buf, len));

  if (owned) free(fresh);
  freePrecap();
}

void handleOut(const String& uid) {
  sendResult(postAccess(uid, "out", nullptr, 0));
}

void handleCommand(const String& line) {
  if (line.startsWith(proto::kCmdIn)) {
    handleIn(line.substring(strlen(proto::kCmdIn)));
  } else if (line.startsWith(proto::kCmdOut)) {
    handleOut(line.substring(strlen(proto::kCmdOut)));
  } else if (line == proto::kCmdPrecap) {
    freePrecap();
    captureToBuffer(&gPrecapBuf, &gPrecapLen);
  } else if (line == proto::kCmdWake) {
    // TODO: เปิด TFT (ST7735 ขา 13/14/15/2) + เริ่มสตรีมภาพสด
    // ยังไม่ implement — ยังไม่ได้เพิ่มไลบรารี TFT เข้า platformio.ini
  } else if (line == proto::kCmdSleep) {
    // TODO: ปิด TFT
    freePrecap();
  }
}

}  // namespace

void setup() {
  gMainLink.begin(proto::kLinkBaud, SERIAL_8N1, kPinMainLinkRx, kPinMainLinkTx);
#if CAM_DEBUG
  gDebug.begin(115200);
#endif

  cameraBegin();
  wifiBegin();
}

void loop() {
  static String line;

  while (gMainLink.available()) {
    const char c = gMainLink.read();
    if (c == '\n') {
      line.trim();
      if (line.length() > 0) handleCommand(line);
      line = "";
    } else if (c != '\r') {
      line += c;
    }
  }
}
