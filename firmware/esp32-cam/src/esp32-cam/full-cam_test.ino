// ============================================================
//  Security Door Lock — ESP32-CAM (Combined + ESP-NOW Version)
//  TFT Display Driver: Arduino_GFX (ST7735)
//  Backend Service: WebServer /capture + Server Auto Register
// ============================================================

#include <Arduino_GFX_Library.h>
#include <esp_camera.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <esp_now.h>

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

// ตัวแปรเก็บสถานะการเปิด/ปิด TFT จอดำ จากสัญญาณ ESP-NOW
volatile bool isTftActive = false;

// ==================== ★ ระบบจัดการความร้อน (Thermal Throttling) ★ ====================
// ESP32-CAM เป็นตัวที่ร้อนสุดในระบบ (WiFi + กล้องสตรีมต่อเนื่อง) อ่านอุณหภูมิชิปในตัว
// แล้วลด FPS ลงเมื่อร้อนเกิน เพื่อกันชิปร้อนจนภาพเพี้ยน/รีเซ็ตเอง และประหยัดพลังงาน
// หมายเหตุ: temperatureRead() วัด "อุณหภูมิแกนชิป" ไม่ใช่บรรยากาศ ปกติจึงสูงกว่าห้อง ~15-25°C
#define TEMP_WARN_C   70.0f   // อุ่น: เริ่มลด FPS
#define TEMP_HOT_C    80.0f   // ร้อนมาก: ลด FPS ลงเยอะ
#define FPS_NORMAL_MS 30      // ~33 fps (ปกติ)
#define FPS_WARN_MS   100     // ~10 fps
#define FPS_HOT_MS    250     // ~4 fps

uint32_t gFrameIntervalMs = FPS_NORMAL_MS;   // รอบเฟรมแบบปรับได้ตามความร้อน
float    gChipTempC       = 0.0f;

// ==================== ESP-NOW Callback Function ====================
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
  uint8_t command = incomingData[0];
  if (command == 1) {
    isTftActive = true;
    Serial.println("[ESP-NOW] Received: DISPLAY ON");
  } else if (command == 0) {
    isTftActive = false;
    gfx->fillScreen(BLACK); // สั่งหน้าจอเป็นสีดำทันทีเมื่อไม่มีคนอยู่
    Serial.println("[ESP-NOW] Received: DISPLAY OFF (Standby)");
  }
}

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

  // วาดภาพเฉพาะเวลาที่มีคนอยู่เท่านั้น
  if (isTftActive) {
    gfx->draw16bitBeRGBBitmap(0, 4, (uint16_t *)fb->buf, 160, 120);
  }

  esp_camera_fb_return(fb);

  // คำนวณ FPS บน Serial
  frameCount++;
  uint32_t now = millis();
  if (now - lastFrameTime >= 1000) {
    Serial.printf("[TFT] FPS: %d (Active: %s)\n", frameCount, isTftActive ? "YES" : "NO");
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
  
  config.xclk_freq_hz = 16000000;         
  config.pixel_format = PIXFORMAT_RGB565; 
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
void handleCapture() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb == nullptr) {
    server.send(500, "text/plain", "camera capture failed");
    return;
  }

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
  server.send_P(200, "image/jpeg", (const char*)jpg_buf, jpg_len);

  free(jpg_buf);
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
  
  // ใช้ AP_STA เพื่อให้ใช้งาน WiFi + ESP-NOW ร่วมกันได้สมบูรณ์
  WiFi.mode(WIFI_AP_STA); 
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

// ==================== จัดการความร้อน + ประหยัดพลังงาน ====================
// อ่านอุณหภูมิชิปทุก 3 วินาที แล้วปรับรอบเฟรม (FPS) ตามระดับความร้อน
// ร้อน = ลด FPS = กล้องทำงานน้อยลง = กินไฟน้อยลง + เย็นลง
void manageThermal() {
  static uint32_t nextCheck = 0;
  if (millis() < nextCheck) return;
  nextCheck = millis() + 3000;

  gChipTempC = temperatureRead();   // อุณหภูมิแกนชิป ESP32 (°C)

  uint32_t newInterval;
  const char* level;
  if (gChipTempC >= TEMP_HOT_C) {
    newInterval = FPS_HOT_MS;   level = "HOT";
  } else if (gChipTempC >= TEMP_WARN_C) {
    newInterval = FPS_WARN_MS;  level = "WARM";
  } else {
    newInterval = FPS_NORMAL_MS; level = "OK";
  }

  if (newInterval != gFrameIntervalMs) {
    gFrameIntervalMs = newInterval;
    Serial.printf("[THERMAL] %.1f C -> %s (frame every %ums)\n",
                  gChipTempC, level, gFrameIntervalMs);
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
  
  // 📢 แสดง MAC Address สำหรับนำไปใส่ใน ESP32 ตัวหลัก
  Serial.println("\n-----------------------------------------");
  Serial.print("[ESP-NOW] MAC Address: ");
  Serial.println(WiFi.macAddress());
  Serial.println("-----------------------------------------\n");

  // 4. เริ่มระบบ ESP-NOW
  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    Serial.println("[ESP-NOW] Initialized successfully!");
  } else {
    Serial.println("[ESP-NOW] Init Failed!");
  }

  registerWithServer();

  // 5. เริ่ม WebServer ให้บริการ Backend
  server.on("/capture", HTTP_GET, handleCapture);
  server.begin();
  Serial.println("[http] /capture server started");

  // เริ่มต้นปรับเป็นจอดำ
  gfx->fillScreen(BLACK);
}

void loop() {
  digitalWrite(FLASH_LED_PIN, LOW);   // ปิดไฟแฟลชเสมอ (แหล่งความร้อน ~1W ที่ไม่จำเป็น)

  server.handleClient();

  // เฝ้าอุณหภูมิชิป แล้วปรับ FPS ให้อัตโนมัติ
  manageThermal();

  // แสดงผลขึ้นจอ TFT เมื่อสั่งเปิด และถึงรอบเฟรม (รอบเฟรมยืดตามความร้อน)
  if (isTftActive && millis() >= gNextPreviewMs) {
    gNextPreviewMs = millis() + gFrameIntervalMs;
    tftStreamFrame();
  }

  if (millis() >= gNextRegisterMs) {
    gNextRegisterMs = millis() + 60000;
    registerWithServer();
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    registerWithServer();
  }
}