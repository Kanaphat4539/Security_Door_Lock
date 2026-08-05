// ============================================================
//  Security Door Lock — ESP32-CAM (Combined Version)
//  TFT Display Driver: Arduino_GFX (ST7735)
//  Backend Service: WebServer /capture + Server Auto Register
// ============================================================

#include <Arduino_GFX_Library.h>
#include <esp_camera.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

#define FLASH_LED_PIN 4

// 🎨 กำหนดชื่อสีสำหรับ Arduino_GFX
#define RED   RGB565_RED
#define GREEN RGB565_GREEN
#define BLUE  RGB565_BLUE
#define BLACK RGB565_BLACK
#define WHITE RGB565_WHITE

// ==================== ตั้งค่า (แก้ก่อน Flash) ====================
const char* WIFI_SSID    = "thiraphat";
const char* WIFI_PASS    = "12345678";
const char* SERVER_BASE  = "http://192.168.2.207:3001";
const char* DEVICE_TOKEN = "511d890b7d952e2c7291f2328a46f4ebce4ed81dd825b0bd6b296ac01397bdfb";

// ==================== ขา TFT ST7735 (อ้างอิงตาม test-cam_tft) ====================
#define TFT_CS   13
#define TFT_DC   12
#define TFT_RST  -1  // ต่อขา RST เข้า 3.3V
#define TFT_SCLK 14
#define TFT_MOSI 2

Arduino_DataBus *bus = new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, -1);

Arduino_GFX *gfx = new Arduino_ST7735(
  bus, 
  TFT_RST, 
  1,     /* rotation: 1 = แนวนอน (160x128) */
  false, /* ips: false */
  128,   /* width */
  160,   /* height */
  0, 0, 0, 0
);

// ==================== ขากล้อง AI-Thinker ====================
#define PWDN_GPIO_NUM  32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM   0
#define SIOD_GPIO_NUM  26
#define SIOC_GPIO_NUM  27
#define Y9_GPIO_NUM    35
#define Y8_GPIO_NUM    34
#define Y7_GPIO_NUM    39
#define Y6_GPIO_NUM    36
#define Y5_GPIO_NUM    21
#define Y4_GPIO_NUM    19
#define Y3_GPIO_NUM    18
#define Y2_GPIO_NUM     5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22

WebServer server(80);
unsigned long gNextPreviewMs = 0;
unsigned long gNextRegisterMs = 0;

uint32_t lastFrameTime = 0;
uint32_t frameCount = 0;

// ==================== ฟังก์ชันหน้าจอ TFT ====================
void tftShowStatus(const char* line1, const char* line2 = nullptr) {
  gfx->fillScreen(BLACK);
  gfx->setTextColor(WHITE);
  gfx->setTextSize(2);
  gfx->setCursor(6, 24);
  gfx->println(line1);
  if (line2 != nullptr) {
    gfx->setTextSize(1);
    gfx->setCursor(6, 60);
    gfx->println(line2);
  }
}

// ถ่าย 1 เฟรมแล้วยิงลงจอ TFT
void tftStreamFrame() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb == nullptr) return;

  // วาดภาพแบบ Big-Endian (RGB565) ช่วยแก้ปัญหาสีรุ้งและรีดสปีด
  gfx->draw16bitBeRGBBitmap(0, 4, (uint16_t *)fb->buf, 160, 120);

  esp_camera_fb_return(fb);

  // คำนวณ FPS บน Serial
  frameCount++;
  uint32_t now = millis();
  if (now - lastFrameTime >= 1000) {
    Serial.printf("[TFT] FPS: %d\n", frameCount);
    frameCount = 0;
    lastFrameTime = now;
  }
}

// ==================== ฟังก์ชันกล้อง ====================
bool cameraBegin() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
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
  
  config.xclk_freq_hz = 16000000;         // ปรับเป็น 16MHz เพื่อความเสถียรและลื่นไหล
  config.pixel_format = PIXFORMAT_RGB565; // โหมดความเร็วสูงสำหรับจอ TFT
  config.frame_size   = FRAMESIZE_QQVGA;  // 160x120
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[cam] init failed: 0x%x\n", err);
    return false;
  }
  return true;
}

// ==================== Backend: GET /capture ====================
// ==================== Backend: GET /capture ====================
void handleCapture() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb == nullptr) {
    server.send(500, "text/plain", "camera capture failed");
    return;
  }

  // แปลงภาพจาก RGB565 เป็น JPEG ก่อนส่งให้ Backend
  uint8_t * jpg_buf = NULL;
  size_t jpg_len = 0;
  bool converted = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, PIXFORMAT_RGB565, 80, &jpg_buf, &jpg_len);

  esp_camera_fb_return(fb);

  if (!converted) {
    server.send(500, "text/plain", "JPEG conversion failed");
    return;
  }

  server.sendHeader("Content-Disposition", "inline; filename=capture.jpg");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  // ⚡ ใช้ send_P เพื่อส่งข้อมูล Binary (ส่งพารามิเตอร์ 4 ตัวได้ไม่ฟ้อง Error)
  server.send_P(200, "image/jpeg", (const char*)jpg_buf, jpg_len);

  free(jpg_buf); // คืนพื้นที่ Memory หลังส่งเสร็จ
}

// ==================== Backend: รายงาน IP ไปยัง Server ====================
void registerWithServer() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(String(SERVER_BASE) + "/devices/cam/register");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  
  const String body = String("{\"ip\":\"") + WiFi.localIP().toString() + "\"}";
  const int code = http.POST(body);
  Serial.printf("[register] HTTP %d\n", code);
  http.end();
}

// ==================== ระบบ Wi-Fi ====================
void connectWiFi() {
  tftShowStatus("WiFi...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  const unsigned long deadline = millis() + 20000;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(300);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\n[wifi] IP = ");
    Serial.println(WiFi.localIP());
    tftShowStatus("CAM READY", WiFi.localIP().toString().c_str());
    delay(1000);
  } else {
    Serial.println("\n[wifi] FAILED");
    tftShowStatus("WiFi FAIL", "check SSID/PASS");
    delay(2000);
  }
}

// ==================== Main Setup & Loop ====================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  // 1. เริ่มทำงานหน้าจอ + Self Test
  gfx->begin();
  gfx->fillScreen(RED);
  delay(200);
  gfx->fillScreen(GREEN);
  delay(200);
  gfx->fillScreen(BLACK);

  // 2. เริ่มทำงานโมดูลกล้อง
  if (!cameraBegin()) {
    tftShowStatus("CAM ERROR", "init failed");
    gfx->fillScreen(BLUE);
    while (1);
  }

  // 3. เชื่อมต่อ WiFi และ ลงทะเบียน Server
  connectWiFi();
  registerWithServer();

  // 4. เริ่ม WebServer ให้บริการ Backend
  server.on("/capture", HTTP_GET, handleCapture);
  server.begin();
  Serial.println("[http] /capture server started");
}

void loop() {
  digitalWrite(FLASH_LED_PIN, LOW);

  // ให้บริการ Client ที่เข้ามาดึงภาพผ่าน API
  server.handleClient();

  // Live Preview ขึ้นหน้าจอ TFT ทุกๆ ~30ms (แสดงผลลื่นไหลบน Arduino_GFX)
  if (millis() >= gNextPreviewMs) {
    gNextPreviewMs = millis() + 30;
    tftStreamFrame();
  }

  // ส่ง IP ไปลงทะเบียนกับ Backend ทุกๆ 60 วินาที
  if (millis() >= gNextRegisterMs) {
    gNextRegisterMs = millis() + 60000;
    registerWithServer();
  }

  // หาก Wi-Fi หลุด ให้ทำการต่อใหม่
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    registerWithServer();
  }
}