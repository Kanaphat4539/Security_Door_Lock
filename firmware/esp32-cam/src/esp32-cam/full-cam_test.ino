#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <esp_camera.h>
#include <esp_http_server.h>
#include <esp_now.h>
#include <esp_idf_version.h>
#include <esp_heap_caps.h>
#include <cstring>
#include <cstdlib>
#include <atomic>
#include <lwip/sockets.h>
#include <lwip/tcp.h>
#include "cam_settings.h"

// Keep your existing cam_settings.h beside this sketch (WiFi/backend credentials).
// Stable LAN URL: http://kmitl-cam.local/ ; stream: http://kmitl-cam.local:81/stream
// IP stays on DHCP, as requested. mDNS requires the same LAN and multicast support.
// Use a unique hostname if you install more than one camera on the same LAN.
// External dashboard integration:
// - Open /stream only while the live panel is open. On close, remove the img src
//   or abort the streaming fetch. display:none alone does NOT close a stream.
// - Optional leased viewer: POST /viewer/start -> {viewerId}; stream with ?viewer=ID;
//   POST /viewer/heartbeat?viewer=ID every 2s while visible; POST /viewer/stop?viewer=ID
//   when closing. These control endpoints are on port 80, /stream on port 81.
// - /status never wakes the sensor. /capture may wake/capture when a viewer OR
//   confirmed ultrasonic presence is active (including the 5-second absence grace).
// Ultrasonic sender: keep the existing ESP-NOW one-byte protocol: 1=present, 0=absent.
// This sketch does not read TRIG/ECHO directly and does not save photos itself;
// the backend can request /capture after receiving /devices/cam/presence.
// This is CAMERA SENSOR sleep; WiFi/HTTP/ESP-NOW remain running.
constexpr char kHostname[] = "kmitl-cam";

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

constexpr uint32_t kViewerLeaseMs = 8000; // Lost dashboard heartbeat releases the camera.
constexpr unsigned long kMaxStreamMs = 0; // 0 = continuous; no forced two-minute pause.
constexpr unsigned long kCooldownMs = 10000;
constexpr unsigned long kFrameIntervalMs = 100; // Target cap 10 FPS with PSRAM; actual FPS varies.
constexpr int kJpegQuality = 10; // Lower means less compression/better quality.
constexpr bool kDashboardOnly = false; // Test variant disables backend, capture and ESP-NOW.
constexpr uint32_t kPresenceDebounceMs = 300;
constexpr uint32_t kPresenceRetryMs = 3000;
constexpr uint32_t kAbsenceSleepMs = 5000; // Keep ready briefly after the person leaves.
constexpr uint32_t kPresenceWakeRetryMs = 3000;

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
std::atomic<bool> presenceDemand{false};
std::atomic<uint32_t> pendingCaptures{0};
std::atomic<uint32_t> streamFrames{0};
std::atomic<uint32_t> lastStreamFrameMs{0};
std::atomic<uint32_t> streamFpsTenths{0};
std::atomic<uint32_t> cameraRecoveries{0};
// Only an explicit Start click selects a viewer. Reconnects never steal ownership.
std::atomic<uint32_t> selectedViewer{0};
std::atomic<uint32_t> lastViewerHeartbeat{0};
std::atomic<uint32_t> activeViewer{0};
std::atomic<uint32_t> frameFetchMs{0};
std::atomic<uint32_t> frameSendMs{0};
std::atomic<uint32_t> peakFetchMs{0};
std::atomic<uint32_t> peakSendMs{0};
std::atomic<uint32_t> jpegBytes{0};
std::atomic<uint32_t> droppedFrames{0};
bool hasPsram = false;
std::atomic<bool> mdnsStarted{false};
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

// Debounce entry; delay sleep on absence so a briefly missed ultrasonic echo
// does not cycle the camera or interrupt an imminent backend /capture request.
bool nextPresenceDemand(bool previous, int command, uint32_t stableForMs) {
  if (command == 1 && stableForMs >= kPresenceDebounceMs) return true;
  if (command == 0 && stableForMs >= kAbsenceSleepMs) return false;
  return previous;
}

bool presenceWantsCamera() {
  if (kDashboardOnly) return false;
  return nextPresenceDemand(presenceDemand.load(), presenceCommand.load(),
                            millis() - presenceChangedAtMs.load());
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

bool wakeCameraLocked() {
  // Viewing OR confirmed ultrasonic presence may wake the camera.
  // Stream cooldown does not block an ultrasonic-triggered evidence capture.
  const bool present = presenceWantsCamera();
  if (manualSleep.load() || (!streamActive.load() && !present) ||
      (isCooling() && !present)) return false;
  if (present) presenceDemand.store(true);
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
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  // Reserve larger driver JPEG buffers, then set actual sensor output to VGA below.
  // A VGA-sized allocation can be too small for a detailed quality-10 JPEG.
  // Same init-large / output-small technique as Espressif's CameraWebServer example.
  config.frame_size = hasPsram ? FRAMESIZE_UXGA : FRAMESIZE_QVGA;
  config.jpeg_quality = kJpegQuality;
  // Two JPEG buffers pipeline capture/transmit; retain one buffer without PSRAM.
  // https://github.com/espressif/esp32-camera#readme
  config.fb_count = hasPsram ? 2 : 1;
  config.fb_location = hasPsram ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode = hasPsram ? CAMERA_GRAB_LATEST : CAMERA_GRAB_WHEN_EMPTY;
  const esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    pinMode(PWDN_GPIO_NUM, OUTPUT);
    digitalWrite(PWDN_GPIO_NUM, HIGH);
    Serial.printf("[CAM] init failed 0x%x\n", err);
    return false;
  }
  sensor_t *sensor = esp_camera_sensor_get();
  const framesize_t outputSize = hasPsram ? FRAMESIZE_VGA : FRAMESIZE_QVGA;
  if (!sensor || sensor->set_framesize(sensor, outputSize) != 0 ||
      sensor->set_quality(sensor, kJpegQuality) != 0) {
    Serial.println("[CAM] Cannot restore original output resolution/quality");
    // Mark initialized before cleanup so deinit failure does not hide ownership.
    cameraOn.store(true);
    sleepCameraLocked();
    return false;
  }
  cameraOn.store(true);
  lastCameraUse.store(millis());
  Serial.printf("[CAM] Awake: JPEG %s, quality=%d, buffers=%d\n",
                hasPsram ? "640x480" : "320x240 (no PSRAM)", kJpegQuality, config.fb_count);
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

// JPEG payload must have SOI and EOI before handing it to a browser decoder.
// Trim only transport padding after EOI; never re-encode or change JPEG quality.
size_t completeJpegLength(const uint8_t *data, size_t length) {
  if (!data || length < 4 || data[0] != 0xff || data[1] != 0xd8) return 0;
  for (size_t end = length; end >= 4; --end) {
    if (data[end - 2] == 0xff && data[end - 1] == 0xd9) return end;
  }
  return 0;
}

void recordPeak(std::atomic<uint32_t> &peak, uint32_t value) {
  uint32_t previous = peak.load();
  while (value > previous && !peak.compare_exchange_weak(previous, value)) {}
}

// Caller owns cameraMutex. The outgoing JPEG owns independent memory;
// no camera framebuffer remains borrowed when network transmission begins.
bool copyFrameLocked(JpegCopy &image, bool fresh, const char *&reason) {
  image.length = 0;
  camera_fb_t *fb = esp_camera_fb_get();
  for (int stale = 0; fresh && fb && stale < (hasPsram ? 2 : 1); ++stale) {
    // Flush queued/in-flight preview frames before entry evidence acquisition.
    esp_camera_fb_return(fb);
    fb = esp_camera_fb_get();
  }
  if (!fb) { reason = "frame acquisition failed"; return false; }
  const size_t jpegLength = fb->format == PIXFORMAT_JPEG ? completeJpegLength(fb->buf, fb->len) : 0;
  const bool valid = jpegLength > 0;
  const bool copied = valid && image.reserve(jpegLength);
  if (copied) {
    memcpy(image.data, fb->buf, jpegLength);
    image.length = jpegLength;
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
    } else if (!wakeCameraLocked()) {
      reason = "Camera unavailable: no viewer/presence, manual sleep, or init failed";
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

// Control port remains responsive while the other HTTP task streams on port 81.
// Changing the selection makes the old stream exit at its next loop iteration.
esp_err_t selectViewerHandler(httpd_req_t *req) {
  uint32_t viewer = selectedViewer.fetch_add(1) + 1;
  if (viewer == 0) viewer = selectedViewer.fetch_add(1) + 1;
  lastViewerHeartbeat.store(millis());
  char json[48];
  snprintf(json, sizeof(json), "{\"viewerId\":%u}", viewer);
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
}

// Token-scoped actions: closing an old tab must not stop a newly selected viewer.
bool requestViewerId(httpd_req_t *req, uint32_t &viewer) {
  char query[48], value[16];
  if (httpd_req_get_url_query_str(req, query, sizeof(query)) != ESP_OK ||
      httpd_query_key_value(query, "viewer", value, sizeof(value)) != ESP_OK ||
      !value[0] || strspn(value, "0123456789") != strlen(value)) return false;
  char *end = nullptr;
  viewer = static_cast<uint32_t>(strtoul(value, &end, 10));
  return viewer != 0 && *end == '\0';
}

esp_err_t stopViewerHandler(httpd_req_t *req) {
  uint32_t viewer = 0;
  if (requestViewerId(req, viewer) && viewer == selectedViewer.load()) {
    selectedViewer.fetch_add(1); // Stream exits and deinitializes its camera safely.
  }
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  httpd_resp_set_status(req, "204 No Content");
  return httpd_resp_send(req, nullptr, 0);
}

esp_err_t heartbeatViewerHandler(httpd_req_t *req) {
  uint32_t viewer = 0;
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  if (!requestViewerId(req, viewer) || viewer != selectedViewer.load())
    return unavailable(req, "Viewer no longer selected");
  lastViewerHeartbeat.store(millis());
  httpd_resp_set_status(req, "204 No Content");
  return httpd_resp_send(req, nullptr, 0);
}

esp_err_t statusHandler(httpd_req_t *req) {
  char json[1024];
  const uint32_t lastFrame = lastStreamFrameMs.load();
  snprintf(json, sizeof(json),
      "{\"camera\":\"%s\",\"streamActive\":%s,\"manualSleep\":%s,\"cooling\":%s,"
      "\"psram\":%s,\"resolution\":\"%s\",\"jpegQuality\":%d,\"maxFps\":%u,"
      "\"maxStreamSeconds\":%lu,\"idleSleepSeconds\":0,\"viewerLeaseSeconds\":8,\"presenceCommand\":%d,"
      "\"streamFrames\":%u,\"fps\":%.1f,\"lastFrameAgeMs\":%u,\"recoveries\":%u,"
      "\"ip\":\"%s\",\"url\":\"http://%s.local/\",\"mdns\":%s,\"rssi\":%d,"
      "\"firmware\":\"presence-wake-5\",\"viewerId\":%u,\"selectedViewer\":%u,"
      "\"frameFetchMs\":%u,\"frameSendMs\":%u,\"peakFetchMs\":%u,"
      "\"peakSendMs\":%u,\"jpegBytes\":%u,\"droppedFrames\":%u,"
      "\"presenceKeepsAwake\":%s,\"absenceSleepSeconds\":5}",
      cameraOn.load() ? "awake" : "asleep", streamActive.load() ? "true" : "false",
      manualSleep.load() ? "true" : "false", isCooling() ? "true" : "false",
      hasPsram ? "true" : "false", hasPsram ? "640x480" : "320x240", kJpegQuality,
      hasPsram ? static_cast<unsigned>(1000 / kFrameIntervalMs) : 8u,
      kMaxStreamMs / 1000, presenceCommand.load(), streamFrames.load(),
      streamFpsTenths.load() / 10.0, lastFrame ? millis() - lastFrame : 0,
      cameraRecoveries.load(), WiFi.localIP().toString().c_str(), kHostname,
      mdnsStarted ? "true" : "false", WiFi.RSSI(), activeViewer.load(),
      selectedViewer.load(), frameFetchMs.load(), frameSendMs.load(), peakFetchMs.load(),
      peakSendMs.load(), jpegBytes.load(), droppedFrames.load(), presenceWantsCamera() ? "true" : "false");
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  return httpd_resp_send(req, json, HTTPD_RESP_USE_STRLEN);
}

esp_err_t streamHandler(httpd_req_t *req) {
  const uint32_t selection = selectedViewer.load();
  uint32_t viewer = 0; // Direct /stream clients remain supported.
  char query[96], value[16];
  if (httpd_req_get_url_query_len(req) >= sizeof(query))
    return unavailable(req, "Stream query too long");
  if (httpd_req_get_url_query_str(req, query, sizeof(query)) == ESP_OK &&
      httpd_query_key_value(query, "viewer", value, sizeof(value)) == ESP_OK) {
    char *end = nullptr;
    viewer = static_cast<uint32_t>(strtoul(value, &end, 10));
    if (!value[0] || *end || viewer == 0 || viewer != selection)
      return unavailable(req, "Viewer replaced; press Start to select this tab");
  }
  if (manualSleep.load() || isCooling()) return unavailable(req, "Camera sleeping or cooling; retry after 10 seconds");
  bool expected = false;
  if (!streamActive.compare_exchange_strong(expected, true))
    return unavailable(req, "One viewer at a time; close the other stream first");
  activeViewer.store(viewer);
  WiFi.setSleep(false);
  const int fd = httpd_req_to_sockfd(req);
  const int noDelay = 1;
  if (fd >= 0) setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &noDelay, sizeof(noDelay));
  const uint32_t started = millis();
  esp_err_t result = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=camframe");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store, no-cache, must-revalidate");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*"); // Dashboard fetch uses port 81.
  httpd_resp_set_hdr(req, "X-Accel-Buffering", "no");
  bool reachedLimit = false;
  uint32_t frames = 0;
  uint32_t sampleStarted = started;
  uint32_t sampleFrames = 0;
  unsigned recoveryAttempts = 0;
  unsigned consecutiveFailures = 0;
  const uint32_t frameInterval = hasPsram ? kFrameIntervalMs : 125;
  streamFpsTenths.store(0);
  JpegCopy image;
  // Allocate once, avoiding repeated realloc/copy as scene detail changes.
  if (hasPsram && !image.reserve(256 * 1024)) {
    activeViewer.store(0);
    streamActive.store(false);
    return unavailable(req, "Insufficient PSRAM for stream copy");
  }
  const char *reason = "manual maintenance sleep";
  while (result == ESP_OK && !manualSleep.load()) {
    const uint32_t now = millis();
    if (selectedViewer.load() != selection) { reason = "viewer stopped or changed"; result = ESP_FAIL; break; }
    if (viewer != 0 && now - lastViewerHeartbeat.load() >= kViewerLeaseMs) {
      reason = "viewer heartbeat expired"; result = ESP_FAIL; break;
    }
    if (WiFi.status() != WL_CONNECTED) { reason = "WiFi disconnected"; result = ESP_FAIL; break; }
    if (kMaxStreamMs > 0 && now - started >= kMaxStreamMs) { reachedLimit = true; break; }
    if (pendingCaptures.load() > 0) { delay(10); continue; }
    const uint32_t frameStarted = now;
    {
      CameraLock lock(50);
      if (!lock.acquired) { delay(10); continue; }
      if (!wakeCameraLocked()) { reason = "camera init failed or maintenance/cooldown"; result = ESP_FAIL; break; }
      if (!copyFrameLocked(image, false, reason)) {
        frameFetchMs.store(millis() - frameStarted);
        recordPeak(peakFetchMs, frameFetchMs.load());
        droppedFrames.fetch_add(1);
        // A single incomplete frame must not cause a full sensor restart/blackout.
        if (++consecutiveFailures < 3) { delay(1); continue; }
        // Reinitialize only after repeated failures; never while borrowing a buffer.
        if (recoveryAttempts >= 2 || manualSleep.load()) { result = ESP_FAIL; break; }
        ++recoveryAttempts;
        Serial.printf("[CAM] Stream recovery %u: %s\n", recoveryAttempts, reason);
        if (!sleepCameraLocked()) { result = ESP_FAIL; break; }
        delay(30);
        if (!wakeCameraLocked()) { result = ESP_FAIL; break; }
        cameraRecoveries.fetch_add(1);
        consecutiveFailures = 0;
        continue;
      }
    }
    consecutiveFailures = 0;
    frameFetchMs.store(millis() - frameStarted);
    recordPeak(peakFetchMs, frameFetchMs.load());
    jpegBytes.store(static_cast<uint32_t>(image.length));
    const uint32_t sendStarted = millis();
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
    frameSendMs.store(millis() - sendStarted);
    recordPeak(peakSendMs, frameSendMs.load());
    if (result != ESP_OK) reason = "HTTP send failed: disconnect, network or slow receiver";
    if (result == ESP_OK) {
      ++frames;
      ++sampleFrames;
      streamFrames.fetch_add(1);
      const uint32_t sentAt = millis();
      lastStreamFrameMs.store(sentAt);
      const uint32_t sampleMs = sentAt - sampleStarted;
      if (sampleMs >= 2000) {
        streamFpsTenths.store(sampleFrames * 10000UL / sampleMs);
        sampleFrames = 0;
        sampleStarted = sentAt;
      }
    }
    const uint32_t elapsed = millis() - frameStarted;
    if (result == ESP_OK) delay(elapsed < frameInterval ? frameInterval - elapsed : 1);
  }
  if (result == ESP_OK) result = httpd_resp_send_chunk(req, nullptr, 0);
  // Stopping a viewer must not put the camera to sleep while someone is nearby.
  // Keep streamActive true until cleanup ends; never deinit during frame acquisition.
  if (reachedLimit || manualSleep.load()) {
    cooldownStarted.store(millis());
    cooling.store(true);
  }
  {
    CameraLock lock(6000);
    if (lock.acquired && (manualSleep.load() || !presenceWantsCamera())) sleepCameraLocked();
  }
  streamFpsTenths.store(0);
  activeViewer.store(0);
  streamActive.store(false);
  Serial.printf("[STREAM] End: frames=%u elapsed=%u ms reason=%s send=%s RSSI=%d dBm\n", frames,
      millis() - started, reachedLimit ? "configured stream budget; cooldown" : reason,
      esp_err_to_name(result), WiFi.RSSI());
  return result;
}

const char kHomePage[] PROGMEM = R"HTML(<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP32-CAM</title><style>
:root{color-scheme:light dark}body{font:16px system-ui;max-width:800px;margin:24px auto;padding:0 16px}
button{padding:10px 16px;margin:0 8px 8px 0;cursor:pointer}canvas{max-width:100%;height:auto;border-radius:8px}
pre{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}#message{min-height:2em}
</style></head><body><h2>ESP32-CAM Live</h2>
<p>Original JPEG quality. Target: 10 FPS with PSRAM / 8 FPS without PSRAM.</p>
<p>One viewer at a time. Start selects this tab; other tabs stop automatically.</p>
<p>LAN HTTP: video is not encrypted or authenticated. Firmware: presence-wake-5.</p>
<button onclick="start()">Start / refresh</button><button onclick="stop()">Stop</button>
<p id="message">Camera wakes for live viewing or a nearby person; sleeps when neither is active.</p>
<canvas id="feed" width="640" height="480" style="display:none" role="img" aria-label="Live camera"></canvas><pre id="status"></pre>
<script>
const feed = document.getElementById('feed');
const context = feed.getContext('2d', {alpha:false});
const message = document.getElementById('message');
let wanted = false, attempting = false, retryTimer = null, suspended = false;
let viewerId = 0, action = 0, session = null;
let resumeWhenVisible = false, startPending = false;

// Content-Length framing works even when TCP splits a header/JPEG across reads.
// Keep only a partial encoded frame here; rendering has a separate one-frame slot.
class MjpegReader {
  constructor(onFrame) { this.buffer = new Uint8Array(0); this.needed = null; this.onFrame = onFrame; }
  push(chunk) {
    const joined = new Uint8Array(this.buffer.length + chunk.length);
    joined.set(this.buffer); joined.set(chunk, this.buffer.length); this.buffer = joined;
    while (true) {
      if (this.needed === null) {
        let end = -1;
        for (let i=0; i+3<this.buffer.length; ++i) {
          if (this.buffer[i]===13 && this.buffer[i+1]===10 && this.buffer[i+2]===13 && this.buffer[i+3]===10) { end=i; break; }
        }
        if (end < 0) {
          if (this.buffer.length > 4096) throw new Error('Invalid MJPEG header');
          return;
        }
        const header = new TextDecoder().decode(this.buffer.subarray(0,end));
        const match = /(?:^|\r\n)Content-Length:\s*(\d+)\s*(?:\r\n|$)/i.exec(header);
        const length = match ? Number(match[1]) : 0;
        if (length < 4 || length > 512*1024) throw new Error('Invalid JPEG length');
        this.needed = length; this.buffer = this.buffer.subarray(end+4);
      }
      if (this.buffer.length < this.needed) return;
      const jpeg = this.buffer.slice(0,this.needed);
      this.buffer = this.buffer.subarray(this.needed); this.needed = null;
      if (jpeg[0]===255 && jpeg[1]===216 && jpeg[jpeg.length-2]===255 && jpeg[jpeg.length-1]===217)
        this.onFrame(jpeg);
    }
  }
}
function detach(hide=true) {
  if (session) { session.pending = null; session.abort.abort(); }
  session = null;
  if (hide) feed.style.display = 'none';
}
function releaseViewer(id) {
  if (!id) return;
  void fetch('/viewer/stop?viewer=' + id, {method:'POST', keepalive:true}).catch(() => {});
}
function stop() {
  const oldViewer = viewerId;
  ++action; viewerId = 0;
  resumeWhenVisible = false; startPending = false;
  wanted = false; attempting = false; suspended = false;
  clearTimeout(retryTimer); retryTimer = null;
  detach(); releaseViewer(oldViewer);
  message.textContent = 'Stopped viewing. Camera sleeps when nobody is nearby; WiFi remains online.';
}
async function decodeJpeg(bytes) {
  const blob = new Blob([bytes], {type:'image/jpeg'});
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  return new Promise((resolve,reject) => {
    const image = new Image(), url = URL.createObjectURL(blob);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('JPEG decode failed')); };
    image.src = url;
  });
}
async function drawLatest(run) {
  run.decoding = true;
  try {
    while (session === run && run.pending) {
      const bytes = run.pending; run.pending = null;
      let bitmap;
      try {
        bitmap = await decodeJpeg(bytes);
        if (session !== run) break;
        if (feed.width !== bitmap.width || feed.height !== bitmap.height) {
          feed.width = bitmap.width; feed.height = bitmap.height;
        }
        context.drawImage(bitmap,0,0);
        feed.style.display = 'block';
        ++run.drawn; run.lastPaint = Date.now();
      } catch (_) { ++run.decodeErrors; }
      finally { if (bitmap && bitmap.close) bitmap.close(); }
    }
  } finally { run.decoding = false; }
}
async function receiveStream(url, run) {
  const response = await fetch(url, {cache:'no-store', signal:run.abort.signal});
  if (!response.ok || !response.body) throw new Error('Stream unavailable');
  const parser = new MjpegReader(bytes => {
    if (session !== run) return;
    ++run.received;
    if (run.pending) ++run.skipped;
    run.pending = bytes; // Replace older pending frame, never append a render queue.
    if (!run.decoding) void drawLatest(run);
  });
  const reader = response.body.getReader();
  try {
    while (session === run) {
      const {value,done} = await reader.read();
      if (done) throw new Error('Stream ended');
      parser.push(value);
    }
  } finally {
    try { await reader.cancel(); } catch (_) {}
    reader.releaseLock();
  }
}
function connectStream() {
  retryTimer = null;
  if (!wanted || suspended || document.hidden) return;
  detach(false); attempting = true;
  const run = {abort:new AbortController(), pending:null, decoding:false,
    received:0, drawn:0, skipped:0, decodeErrors:0, started:Date.now(), lastPaint:Date.now(), sampleAt:Date.now(), sampleDrawn:0};
  session = run;
  const url = new URL(location.href);
  url.port = '81'; url.pathname = '/stream';
  url.search = '?viewer=' + viewerId + '&t=' + Date.now(); url.hash = '';
  message.textContent = 'Connecting...';
  void receiveStream(url.toString(),run).catch(() => {
    if (session === run) scheduleRetry('Stream interrupted. Reconnecting...');
  });
}
function scheduleRetry(text) {
  if (!wanted || suspended || retryTimer !== null) return;
  attempting = false; detach(false); message.textContent = text;
  retryTimer = setTimeout(connectStream, 500);
}
async function start() {
  stop();
  if (document.hidden) { resumeWhenVisible = true; return; }
  startPending = true;
  const thisAction = action;
  message.textContent = 'Selecting this tab...';
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 4000);
  try {
    const response = await fetch('/viewer/start', {method:'POST', signal:abort.signal});
    if (!response.ok) throw new Error('Cannot select viewer');
    const s = await response.json();
    if (thisAction !== action || document.hidden) { releaseViewer(s.viewerId); return; }
    viewerId = s.viewerId;
    wanted = true; connectStream();
  } catch (_) {
    if (thisAction === action) message.textContent = 'Cannot reach camera. Press Start to retry.';
  } finally {
    clearTimeout(timeout);
    if (thisAction === action) startPending = false;
  }
}
async function pollStatus() {
  const expectedViewer = viewerId;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 2500);
  try {
    if (wanted && expectedViewer && !document.hidden) {
      await fetch('/viewer/heartbeat?viewer=' + expectedViewer, {method:'POST', signal:abort.signal});
    }
    const response = await fetch('/status', {cache:'no-store', signal:abort.signal});
    if (!response.ok) throw new Error('Status unavailable');
    const s = await response.json();
    if (session) {
      s.browserReceived = session.received; s.browserDisplayed = session.drawn;
      s.browserSkipped = session.skipped; s.browserDecodeErrors = session.decodeErrors;
    }
    document.getElementById('status').textContent = JSON.stringify(s, null, 2);
    if (wanted && expectedViewer === viewerId && expectedViewer !== 0) {
      if (s.selectedViewer !== viewerId) {
        stop();
        message.textContent = 'Another tab was selected, or camera restarted. Press Start to watch here.';
      } else if (s.manualSleep || s.cooling) {
        suspended = true; attempting = false;
        clearTimeout(retryTimer); retryTimer = null; detach();
        message.textContent = s.manualSleep ? 'Manual sleep. Send w in Serial Monitor to resume.' : 'Camera cooling. Waiting...';
      } else if (suspended) {
        suspended = false; connectStream();
      } else if (attempting && session) {
        const run = session, now = Date.now();
        if (run.drawn > run.sampleDrawn) {
          const fps = (run.drawn-run.sampleDrawn)*1000/Math.max(1,now-run.sampleAt);
          message.textContent = 'Live: ' + fps.toFixed(1) + ' display FPS | ' + s.resolution + ' | JPEG quality ' + s.jpegQuality;
        }
        run.sampleAt=now; run.sampleDrawn=run.drawn;
        if (now-run.lastPaint > (run.drawn ? 4000 : 12000))
          scheduleRetry('No new image displayed. Reconnecting...');
      }
    }
  } catch (_) {
    if (wanted && attempting && session && Date.now()-session.lastPaint > 12000)
      scheduleRetry('Connection lost. Reconnecting...');
  } finally {
    clearTimeout(timeout);
    setTimeout(pollStatus, 2000);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const resume = wanted || startPending;
    stop();
    resumeWhenVisible = resume;
  } else if (resumeWhenVisible) {
    resumeWhenVisible = false;
    void start();
  }
});
window.addEventListener('pagehide', stop);
pollStatus();
</script></body></html>)HTML";

esp_err_t homeHandler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
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
  config.send_wait_timeout = 2; // Release stalled clients sooner.
  config.recv_wait_timeout = 3;
  config.lru_purge_enable = true;
  if (httpd_start(&controlServer, &config) != ESP_OK) return false;
  if (!addRoute(controlServer, "/", homeHandler) || !addRoute(controlServer, "/status", statusHandler)) return false;
  if (!kDashboardOnly && !addRoute(controlServer, "/capture", captureHandler)) return false;
  httpd_uri_t selectUri = {};
  selectUri.uri = "/viewer/start";
  selectUri.method = HTTP_POST;
  selectUri.handler = selectViewerHandler;
  if (httpd_register_uri_handler(controlServer, &selectUri) != ESP_OK) return false;
  selectUri.uri = "/viewer/stop";
  selectUri.handler = stopViewerHandler;
  if (httpd_register_uri_handler(controlServer, &selectUri) != ESP_OK) return false;
  selectUri.uri = "/viewer/heartbeat";
  selectUri.handler = heartbeatViewerHandler;
  if (httpd_register_uri_handler(controlServer, &selectUri) != ESP_OK) return false;
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
// loop() handles presence wake before this notification; backend requests /capture separately.
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
  Serial.printf("[PRESENCE] Notify present=%s HTTP %d; presence wake handled by main loop%s\n",
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
  WiFi.setHostname(kHostname); // Set before WiFi starts.
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
      Serial.println("[CAM] Manual sleep cleared; viewer or ultrasonic presence can wake sensor again");
    }
  }
  presenceDemand.store(presenceWantsCamera());
  // Warm up before notifying the backend, even with no dashboard open.
  static bool wakeAttempted = false;
  static uint32_t lastPresenceWakeAttempt = 0;
  const bool shouldWakeForPresence = presenceWantsCamera() && !manualSleep.load();
  if (!shouldWakeForPresence) wakeAttempted = false;
  if (shouldWakeForPresence && !cameraOn.load() &&
      (!wakeAttempted || millis() - lastPresenceWakeAttempt >= kPresenceWakeRetryMs)) {
    CameraLock lock(20);
    if (lock.acquired && !cameraOn.load() && presenceWantsCamera()) {
      wakeAttempted = true;
      lastPresenceWakeAttempt = millis();
      if (wakeCameraLocked()) Serial.println("[ULTRASONIC] Camera ready for /capture");
    }
  }
  // Sleep only when neither the dashboard nor ultrasonic needs the sensor.
  if (cameraOn.load() && !streamActive.load() && pendingCaptures.load() == 0 &&
      (manualSleep.load() || !presenceWantsCamera())) {
    CameraLock lock(20);
    if (lock.acquired && !streamActive.load() && pendingCaptures.load() == 0 &&
        (manualSleep.load() || !presenceWantsCamera())) sleepCameraLocked();
  }
  if (!kDashboardOnly) publishPresence();
  static bool wasConnected = false;
  static uint32_t lastRegister = 0;
  static uint32_t lastReconnect = 0;
  static uint32_t lastMdnsAttempt = 0;
  const bool connected = WiFi.status() == WL_CONNECTED;
  if (!connected && wasConnected) {
    if (mdnsStarted) MDNS.end();
    mdnsStarted = false;
  }
  if (connected && !mdnsStarted && (!wasConnected || millis() - lastMdnsAttempt >= 10000)) {
    lastMdnsAttempt = millis();
    mdnsStarted = MDNS.begin(kHostname);
    if (mdnsStarted) {
      MDNS.addService("http", "tcp", 80);
      Serial.printf("[URL] Fixed LAN URL: http://%s.local/\n", kHostname);
    } else Serial.println("[mDNS] Start failed; retry pending. Numeric IP still works.");
  }
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
