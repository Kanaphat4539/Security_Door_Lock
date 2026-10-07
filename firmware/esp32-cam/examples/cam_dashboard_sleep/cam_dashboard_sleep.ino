#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_camera.h>
#include <esp_http_server.h>
#include <esp_now.h>
#include <esp_idf_version.h>
#include <esp_heap_caps.h>
#include <cstring>
#include <atomic>
#include "cam_settings.h"

// Arduino .ino preprocessing must see this type before function prototypes.
struct JpegCopy;
bool copyFrameLocked(JpegCopy &image, bool fresh, const char *&reason);

// AI-Thinker camera pins, unchanged from pooh/full-cam_test.ino.
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

constexpr unsigned long kIdleSleepMs = 30000;
constexpr unsigned long kMaxStreamMs = 120000;
constexpr unsigned long kCooldownMs = 10000;
constexpr unsigned long kFrameIntervalMs = 125; // Upper bound 8 FPS, not guaranteed FPS.
constexpr int kJpegQuality = 16; // 16 provides safe buffer margin (~8-12KB) to eliminate FB-OVF.
constexpr bool kDashboardOnly = false; // Test variant disables backend, capture and ESP-NOW.
constexpr unsigned long kAbsenceSleepMs = 5000;
constexpr uint32_t kPresenceDebounceMs = 300;
constexpr uint32_t kPresenceRetryMs = 3000;

SemaphoreHandle_t cameraMutex = nullptr;
std::atomic<bool> cameraOn{false};
std::atomic<bool> streamActive{false};
std::atomic<bool> manualSleep{false};
std::atomic<bool> cooling{false};
std::atomic<uint32_t> cooldownStarted{0};
std::atomic<uint32_t> lastCameraUse{0};
std::atomic<int> presenceCommand{-1};
std::atomic<uint32_t> presenceChangedAtMs{0};
std::atomic<uint32_t> presenceRevision{0};
std::atomic<uint32_t> pendingCaptures{0};
bool hasPsram = false;
httpd_handle_t controlServer = nullptr;
httpd_handle_t streamServer = nullptr;

struct CameraLock {
  bool acquired;
  explicit CameraLock(uint32_t timeoutMs = 1500)
      : acquired(xSemaphoreTake(cameraMutex, pdMS_TO_TICKS(timeoutMs)) == pdTRUE) {}
  ~CameraLock() { if (acquired) xSemaphoreGive(cameraMutex); }
};

bool isCooling() {
  return cooling.load() && millis() - cooldownStarted.load() < kCooldownMs;
}

// Caller must hold cameraMutex; never deinitialize a borrowed frame buffer.
bool sleepCameraLocked() {
  if (cameraOn.load()) {
    const esp_err_t err = esp_camera_deinit();
    if (err != ESP_OK) {
      Serial.printf("[CAM] deinit failed 0x%x; sleep not confirmed\n", err);
      return false;
    }
    cameraOn.store(false);
    Serial.println("[CAM] Sensor sleep: deinitialized, PWDN HIGH; WiFi remains online");
  }
  pinMode(PWDN_GPIO_NUM, OUTPUT);
  digitalWrite(PWDN_GPIO_NUM, HIGH);
  return true;
}

bool wakeCameraLocked(bool entryCapture = false) {
  // Stream cooldown must never be a reason to reject an entry evidence request.
  // Explicit Serial manual sleep still disables all camera work for maintenance.
  if (manualSleep.load() || (!entryCapture && isCooling())) return false;
  if (cameraOn.load()) return true;
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
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = kJpegQuality;
  config.fb_count = 1;
  config.fb_location = hasPsram ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  const esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    pinMode(PWDN_GPIO_NUM, OUTPUT);
    digitalWrite(PWDN_GPIO_NUM, HIGH);
    Serial.printf("[CAM] init failed 0x%x\n", err);
    return false;
  }
  cameraOn.store(true);
  lastCameraUse.store(millis());
  Serial.printf("[CAM] Awake: JPEG %s, quality=%d, one frame buffer\n",
                hasPsram ? "640x480" : "320x240 (no PSRAM)", kJpegQuality);
  // Discard initial frames for exposure settling after a cold wake.
  for (int i = 0; i < 2; ++i) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) esp_camera_fb_return(fb);
  }
  return true;
}

esp_err_t unavailable(httpd_req_t *req, const char *message) {
  httpd_resp_set_status(req, "503 Service Unavailable");
  httpd_resp_set_hdr(req, "Retry-After", "10");
  httpd_resp_set_type(req, "text/plain");
  return httpd_resp_send(req, message, HTTPD_RESP_USE_STRLEN);
}

struct JpegCopy {
  uint8_t *data = nullptr;
  size_t capacity = 0;
  size_t length = 0;
  JpegCopy() = default;
  JpegCopy(const JpegCopy &) = delete;
  JpegCopy &operator=(const JpegCopy &) = delete;
  ~JpegCopy() { heap_caps_free(data); }
  bool reserve(size_t bytes) {
    if (bytes == 0 || bytes > 512 * 1024) return false;
    if (bytes <= capacity) return true;
    const size_t wanted = (bytes + 4095) & ~static_cast<size_t>(4095);
    const uint32_t caps = MALLOC_CAP_8BIT | (hasPsram ? MALLOC_CAP_SPIRAM : 0);
    void *replacement = heap_caps_realloc(data, wanted, caps);
    if (!replacement) return false;
    data = static_cast<uint8_t *>(replacement);
    capacity = wanted;
    return true;
  }
};

struct CapturePriority {
  CapturePriority() { pendingCaptures.fetch_add(1); }
  ~CapturePriority() { pendingCaptures.fetch_sub(1); }
};

// Caller owns cameraMutex. The outgoing JPEG owns independent memory;
// no camera framebuffer remains borrowed when network transmission begins.
bool copyFrameLocked(JpegCopy &image, bool fresh, const char *&reason) {
  image.length = 0;
  camera_fb_t *fb = esp_camera_fb_get();
  if (fresh && fb) {
    // The queued preview frame may predate the entry request. Discard it.
    esp_camera_fb_return(fb);
    fb = esp_camera_fb_get();
  }
  if (!fb) { reason = "frame acquisition failed"; return false; }
  const bool valid = fb->format == PIXFORMAT_JPEG && fb->len >= 4 &&
      fb->buf[0] == 0xff && fb->buf[1] == 0xd8;
  const bool copied = valid && image.reserve(fb->len);
  if (copied) {
    memcpy(image.data, fb->buf, fb->len);
    image.length = fb->len;
    lastCameraUse.store(millis());
  } else reason = valid ? "JPEG copy allocation failed" : "invalid JPEG frame";
  esp_camera_fb_return(fb);
  return copied;
}

esp_err_t captureHandler(httpd_req_t *req) {
  const uint32_t started = millis();
  Serial.println("[CAPTURE] Request received");
  JpegCopy image;
  const char *reason = "unknown";
  bool prepared = false;
  {
    CapturePriority priority;
    CameraLock lock;
    if (!lock.acquired) {
      reason = "camera mutex timeout";
    } else if (!wakeCameraLocked(true)) {
      reason = "init failed or manual maintenance sleep";
    } else {
      prepared = copyFrameLocked(image, true, reason);
    }
  }
  // Camera mutex released before network I/O.
  if (!prepared) {
    Serial.printf("[CAPTURE] HTTP 503: %s elapsed=%u ms\n", reason, millis() - started);
    return unavailable(req, reason);
  }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  const esp_err_t result = httpd_resp_send(req, reinterpret_cast<const char *>(image.data), image.length);
  Serial.printf("[CAPTURE] bytes=%u elapsed=%u ms send=%s\n",
      static_cast<unsigned>(image.length), millis() - started, esp_err_to_name(result));
  return result;
}

esp_err_t statusHandler(httpd_req_t *req) {
  char json[384];
  snprintf(json, sizeof(json),
      "{\"camera\":\"%s\",\"streamActive\":%s,\"manualSleep\":%s,\"cooling\":%s,"
      "\"psram\":%s,\"resolution\":\"%s\",\"maxFps\":8,\"maxStreamSeconds\":120,"
      "\"idleSleepSeconds\":30,\"presenceCommand\":%d}",
      cameraOn.load() ? "awake" : "asleep", streamActive.load() ? "true" : "false",
      manualSleep.load() ? "true" : "false", isCooling() ? "true" : "false",
      hasPsram ? "true" : "false", hasPsram ? "640x480" : "320x240", presenceCommand.load());
  httpd_resp_set_type(req, "application/json");
  // Public LAN telemetry only; enables the standalone HTML test dashboard.
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  return httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
}

esp_err_t streamHandler(httpd_req_t *req) {
  if (manualSleep.load() || isCooling()) return unavailable(req, "Camera sleeping or cooling; retry after 10 seconds");
  bool expected = false;
  if (!streamActive.compare_exchange_strong(expected, true))
    return unavailable(req, "One viewer at a time; close the other stream first");
  WiFi.setSleep(false);
  const uint32_t started = millis();
  esp_err_t result = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=camframe");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  bool reachedLimit = false;
  uint32_t frames = 0;
  JpegCopy image;
  const char *reason = "manual maintenance sleep";
  while (result == ESP_OK && !manualSleep.load()) {
    const uint32_t now = millis();
    if (!(now - started < kMaxStreamMs)) { reachedLimit = true; break; }
    if (pendingCaptures.load() > 0) { delay(10); continue; }
    const uint32_t frameStarted = now;
    {
      CameraLock lock(50);
      if (!lock.acquired) { delay(10); continue; }
      if (!wakeCameraLocked()) { reason = "camera init failed or maintenance/cooldown"; result = ESP_FAIL; break; }
      if (!copyFrameLocked(image, false, reason)) { result = ESP_FAIL; break; }
    }
    // Camera mutex released before network I/O.
    char header[96];
    const int headerLen = snprintf(header, sizeof(header),
        "\r\n--camframe\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
        static_cast<unsigned int>(image.length));
    if (headerLen < 0 || headerLen >= static_cast<int>(sizeof(header))) {
      reason = "MJPEG header overflow"; result = ESP_FAIL; break;
    }
    result = httpd_resp_send_chunk(req, header, headerLen);
    if (result == ESP_OK)
      result = httpd_resp_send_chunk(req, reinterpret_cast<const char *>(image.data), image.length);
    if (result != ESP_OK) reason = "HTTP send failed: disconnect, network or slow receiver";
    if (result == ESP_OK) ++frames;
    const uint32_t elapsed = millis() - frameStarted;
    if (elapsed < kFrameIntervalMs) delay(kFrameIntervalMs - elapsed);
  }
  if (result == ESP_OK) httpd_resp_send_chunk(req, nullptr, 0);
  // Keep streamActive true until the cooldown transition is complete.
  if (reachedLimit || manualSleep.load()) {
    cooldownStarted.store(millis());
    cooling.store(true);
    CameraLock lock(6000);
    if (lock.acquired) sleepCameraLocked();
  }
  streamActive.store(false);
  Serial.printf("[STREAM] End: frames=%u elapsed=%u ms reason=%s send=%s RSSI=%d dBm\n", frames,
      millis() - started, reachedLimit ? "120-second budget; 10-second cooldown" : reason,
      esp_err_to_name(result), WiFi.RSSI());
  return result;
}

const char kHomePage[] PROGMEM = R"HTML(<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>ESP32-CAM</title></head>
<body><h2>ESP32-CAM: VGA MJPEG</h2><p>LAN HTTP demo: video is not encrypted or authenticated. One viewer at a time.</p>
<button onclick="start()">Start / refresh</button><button onclick="stop()">Stop</button><p id="message">Camera wakes on request. Stream limit: 120 seconds, then 10 seconds cooldown.</p>
<img id="feed" style="max-width:100%;display:none" alt="Live camera"><pre id="status"></pre>
<script>let timer;function stop(){clearTimeout(timer);const img=document.getElementById('feed');img.removeAttribute('src');img.style.display='none';}
function start(){stop();const img=document.getElementById('feed');img.style.display='block';img.src='http://'+location.hostname+':81/stream?t='+Date.now();timer=setTimeout(()=>{stop();document.getElementById('message').textContent='Stream budget reached. Wait 10 seconds before restarting.';},121000);}
setInterval(()=>fetch('/status').then(r=>r.json()).then(s=>document.getElementById('status').textContent=JSON.stringify(s,null,2)).catch(()=>{}),3000);</script></body></html>)HTML";

esp_err_t homeHandler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, kHomePage, HTTPD_RESP_USE_STRLEN);
}

bool addRoute(httpd_handle_t server, const char *path, esp_err_t (*handler)(httpd_req_t *)) {
  httpd_uri_t uri = {};
  uri.uri = path;
  uri.method = HTTP_GET;
  uri.handler = handler;
  return httpd_register_uri_handler(server, &uri) == ESP_OK;
}

bool startServers() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.ctrl_port = 32768;
  config.stack_size = 6144;
  config.send_wait_timeout = 3;
  config.recv_wait_timeout = 3;
  config.lru_purge_enable = true;
  if (httpd_start(&controlServer, &config) != ESP_OK) return false;
  if (!addRoute(controlServer, "/", homeHandler) || !addRoute(controlServer, "/status", statusHandler)) return false;
  if (!kDashboardOnly && !addRoute(controlServer, "/capture", captureHandler)) return false;
  httpd_config_t streamConfig = config;
  streamConfig.server_port = 81;
  streamConfig.ctrl_port = 32769;
  if (httpd_start(&streamServer, &streamConfig) != ESP_OK) return false;
  return addRoute(streamServer, "/stream", streamHandler);
}

// WiFi-task callback: validate length, publish metadata only; no camera/GFX/HTTP work here.
#if ESP_IDF_VERSION_MAJOR >= 5
void onPresence(const esp_now_recv_info_t *, const uint8_t *data, int len) {
#else
void onPresence(const uint8_t *, const uint8_t *data, int len) {
#endif
  if (data && len == 1 && (data[0] == 0 || data[0] == 1)) {
    const int previous = presenceCommand.exchange(data[0]);
    if (previous != data[0]) {
      presenceChangedAtMs.store(millis());
      presenceRevision.fetch_add(1);
    }
  }
}

void registerWithBackend() {
  if (WiFi.status() != WL_CONNECTED || kServerBase[0] == '\0' || kDeviceToken[0] == '\0') return;
  HTTPClient http;
  http.setConnectTimeout(1500);
  http.setTimeout(2000);
  if (!http.begin(String(kServerBase) + "/devices/cam/register")) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + kDeviceToken);
  const String body = String("{\"ip\":\"") + WiFi.localIP().toString() + "\"}";
  const int code = http.POST(body);
  Serial.printf("[REGISTER] HTTP %d%s\n", code, code < 0 ? " (network failure)" : "");
  http.end();
}

// Publish latest stable state from loop(), never from the Wi-Fi callback.
// Presence is a notification only: it does not initialize or capture the camera.
void publishPresence() {
  static uint32_t sentRevision = 0;
  static uint32_t lastAttempt = 0;
  static bool attempted = false;
  const uint32_t revision = presenceRevision.load();
  const int command = presenceCommand.load();
  const uint32_t changedAt = presenceChangedAtMs.load();
  const uint32_t now = millis();
  if (command < 0 || revision == sentRevision ||
      now - changedAt < kPresenceDebounceMs || revision != presenceRevision.load()) return;
  if (WiFi.status() != WL_CONNECTED || kServerBase[0] == '\0' || kDeviceToken[0] == '\0') return;
  if (attempted && now - lastAttempt < kPresenceRetryMs) return;
  attempted = true;
  lastAttempt = now;
  HTTPClient http;
  http.setConnectTimeout(1500);
  http.setTimeout(2000);
  if (!http.begin(String(kServerBase) + "/devices/cam/presence")) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + kDeviceToken);
  const int code = http.POST(command == 1 ? "{\"present\":true}" : "{\"present\":false}");
  if (code >= 200 && code < 300) sentRevision = revision;
  Serial.printf("[PRESENCE] Notify present=%s HTTP %d; sensor unchanged%s\n",
      command == 1 ? "true" : "false", code,
      code >= 200 && code < 300 ? "" : "; latest-state retry pending");
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(4, OUTPUT); // Flash LED stays OFF.
  digitalWrite(4, LOW);
  hasPsram = psramFound();
  cameraMutex = xSemaphoreCreateMutex();
  if (!cameraMutex) { Serial.println("[FATAL] Camera mutex allocation failed"); return; }
  pinMode(PWDN_GPIO_NUM, OUTPUT);
  digitalWrite(PWDN_GPIO_NUM, HIGH); // Start with the camera asleep.
  Serial.printf("[BOOT] CAM without TFT; PSRAM=%s; Serial commands s=sleep, w=allow wake\n", hasPsram ? "yes" : "no");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // Keep capture/control responsive; sensor sleep is separate.
  WiFi.setAutoReconnect(true);
  WiFi.begin(kWifiSsid, kWifiPassword);
  if (!startServers()) Serial.println("[FATAL] HTTP server start/route registration failed");
  if (!kDashboardOnly) {
    if (esp_now_init() == ESP_OK) {
      const esp_err_t err = esp_now_register_recv_cb(onPresence);
      Serial.printf("[ESP-NOW] callback registration=0x%x\n", err);
    } else Serial.println("[ESP-NOW] unavailable; HTTP streaming still independent");
  } else Serial.println("[TEST] Dashboard only: no backend registration, ESP-NOW or /capture route");
}

void loop() {
  if (!cameraMutex) { delay(1000); return; }
  if (Serial.available()) {
    const char cmd = Serial.read();
    if (cmd == 's' || cmd == 'S') {
      manualSleep.store(true);
      Serial.println("[CAM] Manual sleep requested; send w to allow HTTP wake again");
    } else if (cmd == 'w' || cmd == 'W') {
      manualSleep.store(false);
      Serial.println("[CAM] Manual sleep cleared; next image request wakes sensor (after cooldown)");
    }
  }
  if (!kDashboardOnly) publishPresence();
  // เมื่อมีคนเข้าใกล้ ปลุกเซนเซอร์กล้องให้ตื่นทันที เพื่อให้ Stream Online และพร้อมถ่ายรูป
  if (!kDashboardOnly && presenceCommand.load() == 1 && !cameraOn.load() && !manualSleep.load()) {
    CameraLock lock(20);
    if (lock.acquired && !cameraOn.load() && presenceCommand.load() == 1 && !manualSleep.load()) {
      if (wakeCameraLocked(true)) {
        lastCameraUse.store(millis());
        Serial.println("[PRESENCE] Someone approached -> Waking camera sensor, stream online & capture ready!");
      }
    }
  }
  if (!kDashboardOnly && presenceCommand.load() == 1 && cameraOn.load()) {
    lastCameraUse.store(millis());
  }
  const bool absent = !kDashboardOnly && presenceCommand.load() == 0;
  const uint32_t idleMs = absent ? kAbsenceSleepMs : kIdleSleepMs;
  if (!streamActive.load() && pendingCaptures.load() == 0 && (manualSleep.load() || isCooling() ||
      (cameraOn.load() && millis() - lastCameraUse.load() >= idleMs))) {
    CameraLock lock(20);
    if (lock.acquired && !streamActive.load() && pendingCaptures.load() == 0 && (manualSleep.load() || isCooling() ||
        millis() - lastCameraUse.load() >= idleMs)) sleepCameraLocked();
  }
  static bool wasConnected = false;
  static uint32_t lastRegister = 0;
  static uint32_t lastReconnect = 0;
  const bool connected = WiFi.status() == WL_CONNECTED;
  if (connected && !wasConnected) {
    Serial.printf("[WIFI] IP=%s MAC=%s channel=%d\n", WiFi.localIP().toString().c_str(),
                  WiFi.macAddress().c_str(), WiFi.channel());
    Serial.printf("[URL] Dashboard stream: http://%s:81/stream\n", WiFi.localIP().toString().c_str());
    Serial.printf("[URL] Status: http://%s/status\n", WiFi.localIP().toString().c_str());
    if (!kDashboardOnly) Serial.println("[URL] /capture enabled for backend entry evidence");
  }
  if (connected && (!wasConnected || millis() - lastRegister >= 60000)) {
    lastRegister = millis();
    if (!kDashboardOnly) registerWithBackend();
  }
  if (!connected && millis() - lastReconnect >= 15000) {
    lastReconnect = millis();
    WiFi.reconnect();
  }
  wasConnected = connected;
  delay(20);
}
