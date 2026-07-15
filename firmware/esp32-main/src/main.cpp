#include "esp_camera.h"
#include <Arduino.h>
#include <HTTPClient.h>
#include <TFT_eSPI.h>
#include <TJpg_Decoder.h>
#include <WiFi.h>


const char *ssid = "MIDTION";
const char *password = "0011001100";
const String apiUrl = "http://10.91.178.28:3000/api/auth/scan";

// --- ตั้งค่าพินกล้อง (รุ่น AI Thinker) ---
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

TFT_eSPI tft = TFT_eSPI();

bool tft_output(int16_t x, int16_t y, uint16_t w, uint16_t h,
                uint16_t *bitmap) {
  if (y >= tft.height())
    return 0;
  tft.pushImage(x, y, w, h, bitmap);
  return 1;
}

// ==========================================
// Class จัดการการเชื่อมต่อเครือข่าย (เปลี่ยนชื่อเพื่อแก้ปัญหา Name Collision)
// ==========================================
class APINetworkManager {
public:
  void connectWiFi() {
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
    }
  }

  // รับค่ากล้อง (fb) เข้ามาด้วย ถ้าเป็นขาออก (fb = nullptr) จะส่งแค่ข้อความ
  String sendAuthRequest(String direction, String uid, camera_fb_t *fb) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(apiUrl);

      // สร้าง Boundary ขอบเขตของข้อมูล (สำหรับ Multipart)
      String boundary = "----ESP32Boundary" + String(millis());
      http.addHeader("Content-Type",
                     "multipart/form-data; boundary=" + boundary);

      // ส่วนหัว (ข้อมูล UID และ Direction)
      String bodyStart = "--" + boundary + "\r\n";
      bodyStart += "Content-Disposition: form-data; name=\"uid\"\r\n\r\n";
      bodyStart += uid + "\r\n";
      bodyStart += "--" + boundary + "\r\n";
      bodyStart += "Content-Disposition: form-data; name=\"direction\"\r\n\r\n";
      bodyStart += direction + "\r\n";

      // ถ้ามีไฟล์ภาพ (ขาเข้า) ให้เพิ่มส่วนนี้
      if (fb != nullptr) {
        bodyStart += "--" + boundary + "\r\n";
        bodyStart += "Content-Disposition: form-data; name=\"image\"; "
                     "filename=\"capture.jpg\"\r\n";
        bodyStart += "Content-Type: image/jpeg\r\n\r\n";
      }

      // ส่วนปิดท้าย
      String bodyEnd = "\r\n--" + boundary + "--\r\n";

      // คำนวณขนาด Payload ทั้งหมด
      size_t totalLen = bodyStart.length() + bodyEnd.length();
      if (fb != nullptr)
        totalLen += fb->len;

      // จัดสรรหน่วยความจำ (RAM) เพื่อประกอบข้อมูลเตรียมส่ง
      uint8_t *payload = (uint8_t *)malloc(totalLen);
      if (!payload) {
        Serial.println("Memory allocation failed");
        return "error";
      }

      // คัดลอกข้อมูลทั้งหมดลงไปใน Payload ตัวเดียว
      memcpy(payload, bodyStart.c_str(), bodyStart.length());
      if (fb != nullptr) {
        memcpy(payload + bodyStart.length(), fb->buf, fb->len);
        memcpy(payload + bodyStart.length() + fb->len, bodyEnd.c_str(),
               bodyEnd.length());
      } else {
        memcpy(payload + bodyStart.length(), bodyEnd.c_str(), bodyEnd.length());
      }

      // ยิง HTTP POST เป็นไบนารี
      int httpResponseCode = http.POST(payload, totalLen);
      String response = "denied";

      if (httpResponseCode > 0) {
        response = http.getString();
      } else {
        Serial.printf("HTTP Error: %d\n", httpResponseCode);
      }

      free(payload); // คืนพื้นที่ RAM
      http.end();
      return response;
    }
    return "error";
  }
};

// ==========================================
// Class จัดการกล้องและจอ TFT
// ==========================================
class CameraSystem {
public:
  bool init() {
    camera_config_t config;
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
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size = FRAMESIZE_QQVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;

    esp_err_t err = esp_camera_init(&config);
    return (err == ESP_OK);
  }

  void initTFT() {
    tft.begin();
    tft.setRotation(1);
    tft.fillScreen(TFT_BLACK);
    TJpgDec.setJpgScale(1);
    TJpgDec.setSwapBytes(true);
    TJpgDec.setCallback(tft_output);
  }

  camera_fb_t *capture() { return esp_camera_fb_get(); }

  void freeBuffer(camera_fb_t *fb) { esp_camera_fb_return(fb); }

  void streamToTFT() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }
    TJpgDec.drawJpg(0, 0, (const uint8_t *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
  }
};

// เปลี่ยนชื่อ Object ให้ตรงกับคลาสใหม่
APINetworkManager net;
CameraSystem cam;

void setup() {
  Serial.begin(115200);
  cam.initTFT();
  cam.init();
  net.connectWiFi();
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "CMD_STREAM") {
      cam.streamToTFT();
    } else if (command == "CMD_SNAP") {
      camera_fb_t *fb = cam.capture();
      cam.freeBuffer(fb);
    } else if (command.startsWith("CMD_AUTH_IN:")) {
      String uid = command.substring(12);
      camera_fb_t *fb = cam.capture();
      // ส่งบัฟเฟอร์รูปภาพ (fb) ไปด้วย
      String result = net.sendAuthRequest("in", uid, fb);
      cam.freeBuffer(fb);

      if (result.indexOf("granted") >= 0)
        Serial.println("RESP_GRANTED");
      else
        Serial.println("RESP_DENIED");
    } else if (command.startsWith("CMD_AUTH_OUT:")) {
      String uid = command.substring(13);
      // ขาออกส่ง nullptr เพราะใน Flowchart ระบุว่าไม่ต้องส่งภาพ
      String result = net.sendAuthRequest("out", uid, nullptr);

      if (result.indexOf("granted") >= 0)
        Serial.println("RESP_GRANTED");
      else
        Serial.println("RESP_DENIED");
    }
  }
}