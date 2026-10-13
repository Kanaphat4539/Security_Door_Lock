"""Source contract checks, not hardware or network integration tests."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parent
SOURCE = (ROOT / 'cam_dashboard_sleep.ino').read_text(encoding='utf-8') if (ROOT / 'cam_dashboard_sleep.ino').exists() else ''

class CamContract(unittest.TestCase):
    def test_no_tft_or_rgb_conversion(self):
        self.assertTrue('PIXFORMAT_JPEG' in SOURCE)
        self.assertFalse('Arduino_GFX' in SOURCE or 'fmt2jpg' in SOURCE)
    def test_ai_thinker_pins_preserved(self):
        for name, value in {'PWDN_GPIO_NUM':32,'RESET_GPIO_NUM':-1,'XCLK_GPIO_NUM':0,'SIOD_GPIO_NUM':26,'SIOC_GPIO_NUM':27,'Y9_GPIO_NUM':35,'Y8_GPIO_NUM':34,'Y7_GPIO_NUM':39,'Y6_GPIO_NUM':36,'Y5_GPIO_NUM':21,'Y4_GPIO_NUM':19,'Y3_GPIO_NUM':18,'Y2_GPIO_NUM':5,'VSYNC_GPIO_NUM':25,'HREF_GPIO_NUM':23,'PCLK_GPIO_NUM':22}.items():
            self.assertTrue(re.search(r'#define\s+'+name+r'\s+'+str(value)+r'\b', SOURCE), name)
    def test_dashboard_and_backend_endpoints(self):
        for text in ['"/stream"','"/capture"','"/status"','"/devices/cam/register"','multipart/x-mixed-replace','streamConfig.server_port = 81']:
            self.assertTrue(text in SOURCE, text)
    def test_sleep_keeps_network_reachable(self):
        self.assertTrue('esp_camera_deinit()' in SOURCE)
        self.assertTrue('digitalWrite(PWDN_GPIO_NUM, HIGH)' in SOURCE)
        self.assertFalse('esp_deep_sleep_start' in SOURCE)
    def test_stream_has_budget_and_idle_timeout(self):
        self.assertTrue('kMaxStreamMs' in SOURCE and 'kIdleSleepMs' in SOURCE and 'kCooldownMs' in SOURCE)
        self.assertTrue('now - started < kMaxStreamMs' in SOURCE)
    def test_camera_resources_are_serialized(self):
        self.assertTrue('xSemaphoreTake(cameraMutex' in SOURCE)
        self.assertTrue('esp_camera_fb_return(fb)' in SOURCE)
        self.assertTrue('streamActive.compare_exchange_strong' in SOURCE)
    def test_sleep_controls_not_public_http_mutations(self):
        self.assertTrue('manualSleep.store(true)' in SOURCE)
        self.assertFalse('"/sleep"' in SOURCE)
    def test_entry_capture_bypasses_stream_cooldown(self):
        body = SOURCE[SOURCE.index('esp_err_t captureHandler'):SOURCE.index('esp_err_t statusHandler')]
        self.assertTrue('wakeCameraLocked(true)' in body)
        self.assertTrue('(!entryCapture && isCooling())' in SOURCE)
    def test_proximity_notifies_without_waking_camera(self):
        self.assertTrue('void publishPresence()' in SOURCE)
        body = SOURCE[SOURCE.index('void publishPresence()'):SOURCE.index('void setup()')]
        self.assertFalse('wakeCameraLocked' in body)
        self.assertFalse('esp_camera_fb_get' in body)
        self.assertTrue('"/devices/cam/presence"' in body)
        self.assertTrue('kDeviceToken' in body)
        self.assertTrue('kPresenceDebounceMs' in body)
        self.assertTrue('kPresenceRetryMs' in body)
        self.assertFalse('presenceWakeRequested' in SOURCE)
        self.assertTrue('constexpr bool kDashboardOnly = false' in SOURCE)
    def test_network_io_does_not_hold_camera_or_framebuffer(self):
        self.assertTrue('bool copyFrameLocked(' in SOURCE)
        definition = 'bool copyFrameLocked(JpegCopy &image, bool fresh, const char *&reason) {'
        body = SOURCE[SOURCE.index(definition):SOURCE.index('esp_err_t captureHandler')]
        self.assertTrue('esp_camera_fb_return(fb)' in body)
        self.assertFalse('httpd_resp_send' in body)
        capture = SOURCE[SOURCE.index('esp_err_t captureHandler'):SOURCE.index('esp_err_t statusHandler')]
        stream = SOURCE[SOURCE.index('esp_err_t streamHandler'):SOURCE.index('const char kHomePage')]
        self.assertTrue('copyFrameLocked(image, true, reason)' in capture)
        self.assertTrue('copyFrameLocked(image, false, reason)' in stream)
        self.assertTrue('}\n  // Camera mutex released before network I/O.' in capture)
        self.assertTrue('}\n    // Camera mutex released before network I/O.' in stream)
    def test_capture_priority_and_diagnostic_logs(self):
        self.assertTrue('CapturePriority priority;' in SOURCE)
        self.assertTrue('pendingCaptures.load() > 0' in SOURCE)
        self.assertTrue('[CAPTURE] Request received' in SOURCE)
        self.assertTrue('esp_err_to_name(result)' in SOURCE)
        self.assertFalse('viewer disconnected or stopped' in SOURCE)
    def test_wifi_does_not_enter_power_save_between_requests(self):
        self.assertTrue('WiFi.setSleep(false)' in SOURCE)
        self.assertFalse('WiFi.setSleep(true)' in SOURCE)
    def test_custom_type_function_is_declared_before_arduino_autoprototypes(self):
        declaration = 'bool copyFrameLocked(JpegCopy &image, bool fresh, const char *&reason);'
        self.assertTrue('struct JpegCopy;' in SOURCE)
        self.assertTrue(declaration in SOURCE)
        self.assertLess(SOURCE.index('struct JpegCopy;'), SOURCE.index(declaration))
        self.assertLess(SOURCE.index(declaration), SOURCE.index('bool sleepCameraLocked()'))

if __name__ == '__main__':
    unittest.main()
