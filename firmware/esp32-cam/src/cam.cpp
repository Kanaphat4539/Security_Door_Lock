#include <Arduino.h>  
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include <TFT_eSPI.h>       
#include <TJpg_Decoder.h>   

const char* ssid = "Siuuuu";
const char* password = "j1234567";
const String apiUrl = "http://192.168.1.xxx:3000/api/auth/scan";

// --- ตั้งค่าพินกล้อง (รุ่น AI Thinker) ---
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// สร้างออบเจกต์จอ TFT
TFT_eSPI tft = TFT_eSPI();

// ==========================================
// ฟังก์ชัน Callback สำหรับดึงรูป JPEG ลงจอ TFT
// ==========================================
bool tft_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t* bitmap) {
  if (y >= tft.height()) return 0; // ถ้าภาพล้นจอให้หยุด
  tft.pushImage(x, y, w, h, bitmap); // วาดเม็ดสีลงจอ
  return 1;
}

// ==========================================
// Class จัดการการเชื่อมต่อเครือข่าย (Network & API)
// ==========================================
class NetworkManager {
  public:
    void connectWiFi() {
      WiFi.begin(ssid, password);
      while (WiFi.status() != WL_CONNECTED) {
        delay(500);
      }
    }
    
    String sendAuthRequest(String direction, String uid, bool includeImage) {
      if(WiFi.status() == WL_CONNECTED){
        HTTPClient http;
        http.begin(apiUrl);
        http.addHeader("Content-Type", "application/json");

        String jsonPayload = "{\"uid\":\"" + uid + "\",\"direction\":\"" + direction + "\"}";
        int httpResponseCode = http.POST(jsonPayload);
        String response = "denied"; 
        
        if(httpResponseCode > 0){
          response = http.getString(); 
        }
        http.end();
        return response;
      }
      return "error";
    }
};

// ==========================================
// Class จัดการกล้องและจอ TFT (Camera & Display)
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
      
      // ⚠️ จุดสำคัญ: เปลี่ยนความละเอียดเป็น QQVGA (160x120) ให้พอดีกับจอ 1.8 นิ้ว
      config.frame_size = FRAMESIZE_QQVGA; 
      config.jpeg_quality = 12;
      config.fb_count = 1;

      esp_err_t err = esp_camera_init(&config);
      return (err == ESP_OK);
    }
    
    void initTFT() {
      tft.begin();
      tft.setRotation(1); // หมุนจอแนวนอน (ลองเปลี่ยนเป็น 0, 1, 2, 3 ได้ตามการจัดวาง)
      tft.fillScreen(TFT_BLACK); // เคลียร์หน้าจอเป็นสีดำ
      
      // ตั้งค่าตัวถอดรหัส JPEG
      TJpgDec.setJpgScale(1);
      TJpgDec.setSwapBytes(true); // สลับสี RGB เป็น BGR ให้หน้าจอ TFT
      TJpgDec.setCallback(tft_output);
    }

    camera_fb_t* capture() {
      return esp_camera_fb_get();
    }
    
    void freeBuffer(camera_fb_t *fb) {
      esp_camera_fb_return(fb);
    }

    void streamToTFT() {
      // ดึงภาพจากกล้อง
      camera_fb_t *fb = esp_camera_fb_get();
      if (!fb) {
        Serial.println("Camera capture failed");
        return;
      }
      
      // วาดรูปลงจอ (เริ่มวาดที่พิกัด x=0, y=0)
      TJpgDec.drawJpg(0, 0, (const uint8_t*)fb->buf, fb->len);
      
      // คืนหน่วยความจำ
      esp_camera_fb_return(fb);
    }
};

// --- สร้าง Object ---
NetworkManager net;
CameraSystem cam;

void setup() {
  Serial.begin(115200); 
  
  cam.initTFT(); // เปิดการทำงานจอ TFT
  cam.init();    // เปิดการทำงานกล้อง
  net.connectWiFi();
}

void loop() {
  // ฟังคำสั่งจาก ESP32 Main (ผ่าน Serial)
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "CMD_STREAM") {
      // เมื่อบอร์ดหลักสั่ง CMD_STREAM ให้สตรีมภาพ 1 เฟรม
      cam.streamToTFT(); 
    } 
    else if (command == "CMD_SNAP") {
      camera_fb_t *fb = cam.capture();
      cam.freeBuffer(fb);
    } 
    else if (command.startsWith("CMD_AUTH_IN:")) {
      String uid = command.substring(12);
      camera_fb_t *fb = cam.capture();
      String result = net.sendAuthRequest("in", uid, true);
      cam.freeBuffer(fb);
      
      if (result.indexOf("granted") >= 0) Serial.println("RESP_GRANTED");
      else Serial.println("RESP_DENIED");
    }
    else if (command.startsWith("CMD_AUTH_OUT:")) {
      String uid = command.substring(13);
      String result = net.sendAuthRequest("out", uid, false);
      if (result.indexOf("granted") >= 0) Serial.println("RESP_GRANTED");
      else Serial.println("RESP_DENIED");
    }
  }
}