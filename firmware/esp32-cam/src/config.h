#pragma once

// ---- ขากล้องของบอร์ด AI-Thinker ESP32-CAM ----
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

// ---- TFT ST7735 ----
constexpr int kPinTftMosi = 13;
constexpr int kPinTftSclk = 14;
constexpr int kPinTftCs   = 15;
constexpr int kPinTftDc   = 2;

// ---- UART ไปยัง ESP32 (main) ----
// ⚠️ RX=3 / TX=1 คือ UART0 ซึ่งเป็นพอร์ตเดียวกับ USB-serial ที่ใช้ตอน flash
//    ผลที่ตามมา: ห้าม print debug ลง Serial บนบอร์ดนี้เด็ดขาด เพราะทุกไบต์
//    จะถูกส่งไปเข้า ESP32 (main) และถูกตีความเป็นคำสั่งมั่ว
//    ถ้าต้องการ debug ให้ต่อ UART อีกชุดแล้วใช้ HardwareSerial(1) แทน
constexpr int kPinMainLinkRx = 3;
constexpr int kPinMainLinkTx = 1;

// ---- HTTP timeout ----
constexpr uint16_t kHttpTimeoutMs = 8000;
