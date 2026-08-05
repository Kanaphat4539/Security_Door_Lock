#pragma once

// โปรโตคอลสื่อสาร ESP32 (main) <-> ESP32-CAM ผ่าน Serial/UART
//
//   ESP32 main  --> ESP32-CAM :  "IN:<uid>\n"   ถ่ายภาพ + POST {uid, direction:"in", image}
//                                "OUT:<uid>\n"  ไม่ถ่ายภาพ + POST {uid, direction:"out"}
//                                "WAKE\n"       เปิด TFT + เริ่มสตรีมภาพสด (ระยะ < 100cm)
//                                "SLEEP\n"      ปิด TFT กลับสู่สแตนด์บาย
//                                "PRECAP\n"     ถ่ายภาพนิ่งเก็บล่วงหน้า (ระยะ < 45cm)
//
//   ESP32-CAM   --> ESP32 main:  "RESULT:granted\n"
//                                "RESULT:denied\n"
//                                "RESULT:error\n"    ต่อเซิร์ฟเวอร์ไม่ได้ / timeout
//
// ค่าคงที่ทั้งหมดถูกใช้ร่วมกันทั้งสองบอร์ด เพื่อกันสตริงพิมพ์ผิดคนละฝั่ง

namespace proto {

constexpr char kCmdIn[]    = "IN:";
constexpr char kCmdOut[]   = "OUT:";
constexpr char kCmdWake[]  = "WAKE";
constexpr char kCmdSleep[] = "SLEEP";
constexpr char kCmdPrecap[] = "PRECAP";
constexpr char kResult[]   = "RESULT:";

constexpr char kGranted[] = "granted";
constexpr char kDenied[]  = "denied";
constexpr char kError[]   = "error";

// baud ของลิงก์ระหว่างสองบอร์ด (คนละตัวกับ monitor_speed ที่ใช้ debug)
constexpr unsigned long kLinkBaud = 115200;

// รอผลลัพธ์จากเซิร์ฟเวอร์นานสุดกี่ ms ก่อนถือว่า error
constexpr unsigned long kResultTimeoutMs = 10000;

}  // namespace proto
