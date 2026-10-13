# เอกสารสรุปอุปกรณ์และเครื่องมือที่ใช้ในโครงงาน (Tools & Specifications)
## โครงงาน: ระบบควบคุมการเข้า-ออกประตูอัจฉริยะด้วยบัตร RFID และกล้องสตรีมมิ่ง (Security Door Lock)
> สำหรับนำไปใช้ประกอบการเขียนเอกสาร **โครงงานบทที่ 2 (ทฤษฎีและอุปกรณ์ที่เกี่ยวข้อง)**
> *อัปเดตล่าสุด: รวมสถาปัตยกรรมแผงวงจร PCB (KiCad/EasyEDA), ระบบตรวจจับระยะประชิด (Proximity/Presence), การจัดการพลังงานกล้อง (Camera Sensor Sleep & Leased Viewer), สตรีมมิ่งสด CCTV และระบบเสียงแจ้งเตือนอัตโนมัติ*

---

## 1. ภาพรวมสถาปัตยกรรมระบบ (System Architecture Overview)

ระบบควบคุมการเข้า-ออกประตูอัจฉริยะ (Security Door Lock) ออกแบบสำหรับการรักษาความปลอดภัยและการควบคุมการเข้า-ออก 2 ทิศทาง (เข้า-ออก) รองรับการสแกนบัตร RFID ตรวจจับระยะผู้ใช้งานเพื่อปลุกระบบอัตโนมัติ บันทึกภาพถ่ายบุคคลขาเข้า ปลดล็อกกลอนประตูไฟฟ้า และส่งข้อมูลแจ้งเตือนแบบเรียลไทม์ โดยมีการสตรีมภาพสดจากกล้อง ESP32-CAM ขึ้นบน **Guard Dashboard** สำหรับเจ้าหน้าที่รักษาความปลอดภัย พร้อมระบบแจ้งเตือนเมื่อมีบุคคลเข้าใกล้ประตู (Proximity Alert)

```
[RFID Reader 1 (เข้า: VSPI)] ─┐
[RFID Reader 2 (ออก: HSPI)] ──┼──► [ESP32 Main] ──ESP-NOW (1-byte: 1/0)──► [ESP32-CAM (Sensor Sleep / Wake)]
[Ultrasonic (30-45cm Wake)] ──┘         │                                                  │
                                        ▼ (POST /access)                                   │ (MJPEG Stream:81 / Snapshot:80)
                             [NestJS Backend API :3001] ◄──────── Wi-Fi ───────────────────┤
                                        │                                                  │
                                        ├──────────────► [MySQL 8.4 DB]                    │
                                        ├──────────────► [Socket.io Event Gateway]         │
                                        ├──────────────► [LINE Messaging / Resend Email]   │
                                        ▼                                                  ▼
                        [Admin Dashboard (Next.js 16)]                 [Guard Dashboard (Next.js 16)]
                        - จัดการผู้ใช้ / บัตร RFID                     - หน้าจอมอนิเตอร์สด CCTV (Live Feed)
                        - ดู Log & สถิติภาพรวม                         - แจ้งเตือนระยะประชิด (Proximity Sound)
                        - ออกรหัสเชิญเจ้าหน้าที่                       - ประวัติการเข้า-ออก & Snapshot Viewer
```

### ไฮไลท์การปรับปรุงระบบในเวอร์ชันปัจจุบัน:
1. **การออกแบบ Custom Mainboard PCB:** พัฒนาแผ่นวงจรพิมพ์สำเร็จรูปทั้งแบบ 2-layer สำหรับส่งผลิตโรงงาน (JLCPCB) และแบบ Single-layer สำหรับการกัดปริ้นท์ทำมือ (DIY Etch) แก้ปัญหาการต่อสายหลุดหลวม
2. **ระบบจัดการพลังงานกล้อง (Demand-Driven Camera Sleep):** เซนเซอร์กล้อง OV2640 บน ESP32-CAM จะเข้าสู่โหมด Sleep เพื่อลดความร้อนสะสมและประหยัดพลังงาน จะตื่นทำงานเมื่อมีคนเดินเข้าใกล้หน้าประตู (ESP-NOW จาก Ultrasonic) หรือเมื่อมีเจ้าหน้าที่เปิดหน้าจอ CCTV บนแดชบอร์ด (Leased Viewer Protocol)
3. **การแยกบัส SPI อิสระ 2 ชุด (VSPI & HSPI):** ป้องกันปัญหาสัญญาณ MISO ชนกันเมื่ออ่านบัตรเข้าและออกพร้อมกัน
4. **CCTV Live Monitor & Proximity Sound:** หน้าจอแดชบอร์ดฝั่งเจ้าหน้าที่มีตัวเล่นภาพสดเรียลไทม์ (CCTV Monitor) หยุดเล่นอัตโนมัติเมื่อพับแท็บเพื่อประหยัดแบนด์วิดท์ พร้อมระบบเล่นเสียงเตือนเมื่อมีบุคคลเข้าใกล้

---

## 2. หมวดอุปกรณ์ฮาร์ดแวร์และการออกแบบแผงวงจร (Hardware & PCB)

### 2.1 บอร์ดประมวลผลและควบคุม (Microcontroller & Processing Boards)

1. **บอร์ดไมโครคอนโทรลเลอร์หลัก ESP32 Dev Board (ESP-WROOM-32 / DOIT DEVKIT V1)**
   * **สเปก:** ไมโครโพรเซสเซอร์ Dual-Core Tensilica Xtensa 32-bit LX6 240 MHz, SRAM 520 KB, Flash 4MB, Wi-Fi 2.4 GHz & Bluetooth
   * **หน้าที่ในระบบ:**
     * จัดการหัวอ่าน RFID-RC522 จำนวน 2 ตัวผ่าน Hardware SPI แยกอิสระ 2 ชุด (VSPI สำหรับฝั่งเข้า, HSPI สำหรับฝั่งออก)
     * อ่านค่าระยะห่างจากเซนเซอร์อัลตราโซนิก (HC-SR04/HY-SRF05) ปลุกหน้าจอ OLED และส่งสัญญาณตรวจจับคนไปยัง ESP32-CAM ผ่าน ESP-NOW
     * แสดงสถานะการทำงานบนจอแสดงผล OLED ผ่านบัส I2C
     * ควบคุม Active Buzzer ผ่านวงจรทรานซิสเตอร์ NPN
     * ขับโมดูลรีเลย์ (Optocoupler Isolated) เพื่อปลดล็อกกลอนประตูโซลินอยด์
     * ส่งข้อมูลการทาบบัตร (UID, Direction) เข้าสู่ Backend API ผ่าน Wi-Fi (HTTP POST `/access`)

2. **บอร์ดกล้องและเกตเวย์ภาพ AI-Thinker ESP32-CAM**
   * **สเปก:** โมดูล ESP32-S พร้อม PSRAM 4MB ภายนอก, เซนเซอร์กล้อง OV2640 ความละเอียด 2MP (UXGA 1600x1200), ไฟส่องสว่าง Onboard Flash LED (GPIO4), เสาอากาศ PCB Antenna
   * **หน้าที่ในระบบ:**
     * สตรีมภาพวิดีโอสดแบบ MJPEG Video Stream บนพอร์ต 81 (`/stream`)
     * เปิดบริการ Control Web Server บนพอร์ต 80 (`/capture`, `/status`, `/viewer/start`, `/viewer/heartbeat`, `/viewer/stop`)
     * รองรับระบบ mDNS (`http://kmitl-cam.local`)
     * รับสัญญาณตรวจจับคนจาก ESP32 Main ผ่านโปรโตคอล ESP-NOW แบบไร้สายความเร็วสูง
     * ถ่ายภาพ Snapshot และรายงานสถานะเข้าสู่เซิร์ฟเวอร์ Backend

---

### 2.2 อุปกรณ์เซนเซอร์ สัญญาณนำเข้า และกลไกสั่งการ (Sensors, Inputs & Actuators)

1. **โมดูลอ่านบัตรคลื่นความถี่วิทยุ RFID-RC522 (13.56 MHz) x 2 ชุด**
   * ทำงานที่แรงดัน 3.3V รองรับมาตรฐาน ISO/IEC 14443 Type A
   * **ตัวที่ 1 (ฝั่งเข้า - Entry):** เชื่อมต่อบัส VSPI (SS: GPIO5, SCK: GPIO18, MISO: GPIO19, MOSI: GPIO23, RST: GPIO27/4)
   * **ตัวที่ 2 (ฝั่งออก - Exit):** เชื่อมต่อบัส HSPI (SS: GPIO4/17, SCK: GPIO14, MISO: GPIO35, MOSI: GPIO13, RST: GPIO2)
   * *หมายเหตุ:* ใช้ GPIO35 (Input-Only) สำหรับ MISO ของตัวออก เพื่อเลี่ยง GPIO12 ซึ่งเป็น Strapping Pin ที่อาจทำให้บอร์ดบูตค้าง

2. **บัตรและเหรียญแท็ก RFID (Mifare Classic 1K / 13.56 MHz)**
   * บันทึกหมายเลข UID ประจำตัวบัตรขนาด 4 ไบต์ (เช่น `A9620207`)

3. **เซนเซอร์วัดระยะทางอัลตราโซนิก (Ultrasonic Module HY-SRF05 / HC-SR04)**
   * วัดระยะ 2–400 ซม. มุมตรวจจับ 15 องศา
   * **หน้าที่:** ตรวจจับระยะวัตถุหน้าประตู:
     * ระยะ < 30–45 ซม.: ปลุกหน้าจอ OLED แสดงผล และส่งสัญญาณ ESP-NOW ปลุกกล้องให้เตรียมพร้อมถ่ายภาพ
     * สัญญาณ ECHO (5V) เชื่อมต่อผ่านวงจรแบ่งแรงดัน (Voltage Divider 1k / 2k) เข้าสู่ GPIO32 ของ ESP32 เพื่อความปลอดภัยต่อชิป

4. **จอแสดงผล OLED 0.96 นิ้ว / 1.3 นิ้ว (I2C 128x64 Pixels)**
   * ไดรเวอร์ชิป SH1106 หรือ SSD1306 สื่อสารผ่านบัส I2C (SDA: GPIO21, SCL: GPIO22) ที่ Address `0x3C`
   * แสดงสถานะการเชื่อมต่อ Wi-Fi, สแตนด์บาย, ผลการสแกนบัตร (Granted / Denied) พร้อมชื่อผู้ใช้

5. **โมดูลรีเลย์ 1 ช่อง (1-Channel 5V Relay with Optocoupler Isolation)**
   * สวิตช์ตัด-ต่อวงจรกลอนไฟฟ้าโซลินอยด์ ทนกระแสได้ถึง 10A 250VAC / 30VDC
   * ขับสัญญาณด้วย GPIO26/25 ผ่านวงจรออปโต้คัปเปิลแยกกราวด์ ป้องกันกระแสไฟฟ้าย้อนกลับรบกวน ESP32

6. **กลอนประตูไฟฟ้าโซลินอยด์ (Solenoid Door Lock LY-03 12V DC / 0.6A)**
   * ล็อกแบบ Fail-Secure (ไม่มีไฟ = ล็อก, จ่ายไฟ = ปลดล็อก) สลักหดตัวเปิดประตูเป็นเวลา 5 วินาทีเมื่อได้รับอนุมัติ

7. **ออดสัญญาณเตือน (Active Buzzer 5V) และวงจรขับขยาย**
   * ขับสัญญาณด้วยทรานซิสเตอร์ NPN (S8050 / 2N3904) ผ่านตัวต้านทาน 1k ที่ขาเบส โดยใช้ GPIO25/33
   * เสียง Beep สั้น (0.2 วินาที) เมื่อผ่าน และเสียงเตือนยาว (1.5–3 วินาที) เมื่อถูกปฏิเสธ

---

### 2.3 การออกแบบแผงวงจรพิมพ์และการจัดขา (PCB Design & Pinout Specifications)

ในโปรเจกต์ได้ออกแบบแผ่นวงจรพิมพ์ (Custom PCB) รองรับ 2 รูปแบบ พร้อมรายงานการตรวจสอบกฎการออกแบบ (DRC/ERC):
* **KiCad 2-Layer Routed Board (`hardware/mainboard-min-routed` / `mainboard-2layer`):** สำหรับสั่งผลิตระดับอุตสาหกรรม (JLCPCB) พร้อมไฟล์ Gerbers และ Drill Map ครบชุด
* **Handmade Single-Layer Etched Board (`hardware/mainboard-min-handmade`):** สำหรับการกัดแผ่นทองแดงทำมือ พร้อมเอกสารแนะนำการเดินสายจัมเปอร์ (Jumper Wires) และคู่มือตำแหน่งอุปกรณ์

#### ตารางการจัดสรรขา (Hardware Pinout Mapping) ของบอร์ด ESP32 Main:

| ขา ESP32 | ฟังก์ชัน / GPIO | สัญญาณเน็ต (Net Name) | เชื่อมต่อกับอุปกรณ์ | หมายเหตุ / ข้อควรระวังทางฮาร์ดแวร์ |
|:---:|:---:|:---|:---|:---|
| **D5** | GPIO5 | `RFID_ENTRY_SS` | U1 (RC522 Entry) ขา SDA/SS | บัส VSPI ฝั่งขาเข้า |
| **D18** | GPIO18 | `RFID_ENTRY_SCK` | U1 (RC522 Entry) ขา SCK | บัส VSPI |
| **D19** | GPIO19 | `RFID_ENTRY_MISO` | U1 (RC522 Entry) ขา MISO | บัส VSPI |
| **D23** | GPIO23 | `RFID_ENTRY_MOSI` | U1 (RC522 Entry) ขา MOSI | บัส VSPI |
| **D27** / **D4** | GPIO27 | `RFID_ENTRY_RST` | U1 (RC522 Entry) ขา RST | รีเซ็ตโมดูลฝั่งเข้า |
| **D4** / **D17** | GPIO4 / 17 | `RFID_EXIT_SS` | U2 (RC522 Exit) ขา SDA/SS | บัส HSPI ฝั่งขาออก |
| **D14** | GPIO14 | `RFID_EXIT_SCK` | U2 (RC522 Exit) ขา SCK | บัส HSPI |
| **D35** | GPIO35 | `RFID_EXIT_MISO` | U2 (RC522 Exit) ขา MISO | **Input-Only Pin ปลอดภัย หลีกเลี่ยง GPIO12** |
| **D13** | GPIO13 | `RFID_EXIT_MOSI` | U2 (RC522 Exit) ขา MOSI | บัส HSPI |
| **D2** | GPIO2 | `RFID_EXIT_RST` | U2 (RC522 Exit) ขา RST | ดึง HIGH หลังบูตเพื่อเริ่มการทำงาน |
| **D33** | GPIO33 | `US_TRIG` | U5 (Ultrasonic) ขา TRIG | สัญญาณยิงคลื่นตรวจจับระยะ |
| **D32** | GPIO32 | `US_ECHO_3V3` | U5 (Ultrasonic) ขา ECHO | **ผ่าน R6 (1k) + R7 (2k) Voltage Divider แปลง 5V เป็น 3.3V** |
| **D25** | GPIO25 | `BUZZER_CTRL` | ทรานซิสเตอร์ Q1 (Base ผ่าน R8 1k) | ขับ Buzzer โดยไม่ดึงโหลดกระแสตรงจากขาบอร์ด |
| **D26** | GPIO26 | `RELAY_CTRL` | โมดูล Relay ขา IN / Signal | ควบคุมสวิตช์โซลินอยด์ |
| **D21** | GPIO21 | `OLED_SDA` | จอแสดงผล OLED ขา SDA | บัส I2C (มี Pull-up 4.7k) |
| **D22** | GPIO22 | `OLED_SCL` | จอแสดงผล OLED ขา SCL | บัส I2C (มี Pull-up 4.7k) |
| **VIN** | — | `+5V` | ขั้วต่อไฟเข้า J1 (Pin 1) | ไฟเลี้ยง 5V DC จาก Step-Down Converter |
| **3V3** | — | `+3V3` | ไฟเลี้ยงโมดูล 3.3V | จ่ายให้ RC522 U1, U2 และ OLED |
| **GND** | — | `GND` | กราวด์ร่วมทุกอุปกรณ์ | กราวด์ระนาบทองแดง (Ground Plane) |
| **D12** | GPIO12 | — | **No Connect (ห้ามต่อ)** | **Strapping Pin: หากถูกดึง HIGH จะทำให้บอร์ดเปิดไม่ติด** |

---

### 2.4 ระบบจ่ายพลังงานและวงจรป้องกัน (Power Supply & Protection)

1. **แหล่งจ่ายไฟหลัก (AC-DC Switching Adapter 12V 2A–3A):** จ่ายพลังงานหลักให้กลอนประตูไฟฟ้าโซลินอยด์ (12V 0.6A)
2. **โมดูลแปลงแรงดันไฟฟ้า (Step-Down Buck Converter เช่น LM2596 / MP1584):** แปลงแรงดันจาก 12V DC เป็น 5V DC (กระแสสูงสุด 2A-3A) จ่ายให้บอร์ด ESP32, ESP32-CAM, Ultrasonic, Relay และ Buzzer
3. **วงจรกรองกระแสและคาปาซิเตอร์ (Filtering & Decoupling):**
   * **C1 (Electrolytic Capacitor 100–470 µF / 16V):** ติดตั้งขนานที่ช่องจ่ายไฟหลัก +5V ป้องกันแรงดันตกชั่วขณะ (Voltage Dip) เมื่อรีเลย์หรือกลอนทำงาน
   * **C2–C5 (Ceramic Capacitor 100 nF / 0.1 µF):** คาปาซิเตอร์ดีคัปปลิงวางคร่อมขั้ว VCC-GND ของแต่ละโมดูล (RC522, OLED, Ultrasonic) เพื่อกรองสัญญาณรบกวนความถี่สูง

---

## 3. หมวดซอฟต์แวร์และเครื่องมือพัฒนา (Software & Stack)

### 3.1 ซอฟต์แวร์ฝั่งไมโครคอนโทรลเลอร์ (Embedded Firmware)

* **ภาษาที่ใช้:** ภาษา C / C++ (Arduino Framework / ESP-IDF Components)
* **เครื่องมือพัฒนา (IDE):** Arduino IDE 2.x และ PlatformIO IDE (VS Code)
* **ไลบรารีสำคัญที่ใช้งาน:**
  * `MFRC522v2` (`computer991/Arduino_MFRC522v2`): ไลบรารีขับ RC522 รุ่นใหม่ที่รองรับการกำหนดอินสแตนซ์ `SPIClass&` แยกบัส `VSPI` และ `HSPI` ชัดเจน
  * `esp_camera`: ไดรเวอร์กล้องฮาร์ดแวร์ระดับต่ำสำหรับชิป OV2640 จัดการเซนเซอร์ จัดสรร Framebuffer บน PSRAM และการแปลงสัญญาณเป็น JPEG
  * `esp_http_server`: เซิร์ฟเวอร์ HTTP บน ESP32-CAM รองรับ Chunked Transfer Encoding สำหรับส่ง MJPEG Stream พร้อมกันหลาย Clients
  * `esp_now.h`: โปรโตคอลการสื่อสารไร้สายแบบ Connectionless บนย่านความถี่ 2.4 GHz สำหรับเชื่อมต่อสถานะระหว่าง ESP32 Main และ ESP32-CAM
  * `Adafruit_SH110X` & `Adafruit_GFX`: ไลบรารีควบคุมการวาดกราฟิกและแสดงผลข้อความบนจอ OLED ผ่าน I2C
  * `ArduinoJson`: ไลบรารีประมวลผลและสร้างเพย์โหลด JSON (Serialize / Deserialize)
  * `ESPmDNS.h`: บริการตั้งชื่อโดเมนท้องถิ่นสำหรับอุปกรณ์ (เช่น `kmitl-cam.local`)
  * `WiFi.h` & `HTTPClient.h`: เชื่อมต่อเครือข่าย Wi-Fi ส่งคำขอ HTTP POST (JSON / Multipart Data)

---

### 3.2 ซอฟต์แวร์ระบบเซิร์ฟเวอร์หลังบ้าน (Backend Server)

* **รันไทม์ (Runtime):** Node.js 18+ / 20+
* **ภาษาพัฒนา:** TypeScript (Strict Mode)
* **เฟรมเวิร์ก:** **NestJS 11** โครงสร้างแบบ Modular Architecture
* **การจัดการฐานข้อมูล (ORM):** **Prisma ORM 7** พร้อมไดรเวอร์ `@prisma/adapter-mariadb`
* **ระบบฐานข้อมูล:** **MySQL 8.4** บน Docker Container (พอร์ต 3307)
* **ระบบความปลอดภัยและการยืนยันตัวตน (Auth & Security):**
  * **JWT (JSON Web Token):** สำหรับจัดการ Session ของ Dashboard และออก Token สำหรับ WebSocket Ticket (อายุ 60 วินาที)
  * **Scrypt Hashing (`node:crypto`):** แฮชรหัสผ่านความปลอดภัยสูง
  * **Role-Based Access Control (RBAC):** แยกสิทธิ์ผู้ใช้งานเป็น `ADMIN` (จัดการข้อมูล/บัตร/ระบบ) และ `GUARD` (เฝ้าระวัง/ดูภาพสด/ประวัติ)
  * **Device Token Authentication:** ป้องกันการส่งข้อมูลแปลกปลอมจากอุปกรณ์ภายนอก
* **ระบบตรวจจับและการจัดการกล้อง (Presence & Device Management):**
  * `CamPresenceService`: จัดการสถานะการปรากฏตัวของบุคคลหน้าประตู (Presence State) พร้อม Grace Period 5 วินาที
  * `CamRegistryService`: บันทึกและอัปเดต IP Address ของกล้องอัตโนมัติเมื่อกล้องเชื่อมต่อเครือข่าย
  * `ImageFetchService`: ดึงและบันทึกภาพถ่ายจากกล้องเพื่อจัดเก็บลงโฟลเดอร์ `uploads/`
* **ระบบ Real-time Event Streaming:** **Socket.io Gateway**
  * กระจายอีเวนต์ `access` เมื่อมีการสแกนบัตร
  * กระจายอีเวนต์ `presence` เมื่อมีบุคคลเข้าใกล้ประตู
* **การแจ้งเตือนภายนอก:**
  * **LINE Messaging API:** ส่ง Flex Message การเข้า-ออกประตูพร้อมภาพถ่ายบุคคลเข้ากลุ่ม LINE
  * **Resend API:** ส่งอีเมลแจ้งเตือนเจ้าของบัตรเมื่อบัตรถูกใช้งาน

---

### 3.3 ซอฟต์แวร์แดชบอร์ดส่วนติดต่อผู้ใช้งาน (Frontend Dashboard)

* **เฟรมเวิร์กหลัก:** **Next.js 16** (App Router, Server & Client Components)
* **ไลบรารี UI:** **React 19**
* **สไตล์และธีม:** **Tailwind CSS v4** และ **next-themes** (รองรับ Light / Dark Mode)
* **ชุดคอมโพเนนต์และไอคอน:** **shadcn/ui** และ **Lucide React**
* **การจัดการสถานะ (State Management):** **Zustand**
  * `useLogStore`: จัดเก็บและอัปเดตประวัติการสแกนบัตรแบบเรียลไทม์
  * `useSoundStore`: จัดการสถานะเปิด/ปิดเสียงเตือน (Proximity Alert Sounds)
* **คอมโพเนนต์สำคัญ:**
  * **CctvMonitor Component (`CctvMonitor.tsx`):**
    * หน้าจอแสดงภาพสด CCTV สตรีมมิ่งจาก ESP32-CAM (`/stream`)
    * ฟังก์ชัน Fullscreen, แสดง Overlay วันที่และเวลาเรียลไทม์
    * ใช้ **Page Visibility API** หยุดโหลดสตรีมภาพอัตโนมัติเมื่อผู้ใช้สลับหน้าแท็บ เพื่อประหยัดแบนด์วิดท์เครือข่าย
  * **ProximityNotice & GlobalProximitySound:**
    * วิดเจ็ตแจ้งเตือนเมื่อเซนเซอร์ตรวจพบการเข้าใกล้ประตู
    * เล่นเสียงแจ้งเตือนผ่านบราวเซอร์ (เลือกเสียงได้ เช่น 7-Eleven, Doorbell, Walls Icecream)
  * **AuthImage Component:** สำหรับดึงและแสดงภาพถ่าย Snapshot ที่ต้องการการยืนยันสิทธิ์ Token

---

### 3.4 เครื่องมือสนับสนุน ออกแบบแผงวงจร และทดสอบระบบ (EDA, DevOps & Tools)

1. **เครื่องมือออกแบบวงจรและแผ่นปริ้นท์ (EDA Tools):**
   * **KiCad 8 / 9:** ซอฟต์แวร์ Open-Source ออกแบบ Schematic, PCB Layout, ตรวจสอบกฎการออกแบบ (DRC/ERC) และ Export ไฟล์ Gerber
   * **EasyEDA:** เครื่องมือวาดผังวงจรออนไลน์ พร้อมการเชื่อมต่อ LCSC Component Search
2. **เครื่องมือคอนเทนเนอร์และฐานข้อมูล:**
   * **Docker & Docker Compose:** คอนเทนเนอร์รัน MySQL 8.4 พร้อมระบุ Healthcheck และพอร์ต 3307
   * **Prisma Studio:** เว็บอินเทอร์เฟซสำหรับดูและแก้ไขฐานข้อมูลโดยตรง
3. **เครื่องมือพัฒนาและควบคุมเวอร์ชัน:**
   * **Visual Studio Code (VS Code):** เครื่องมือพัฒนาหลัก
   * **Git & GitHub:** การควบคุมเวอร์ชัน ซิงก์โค้ดระหว่างทีมผ่าน Branching Strategy
4. **เครื่องมือทดสอบซอฟต์แวร์และฮาร์ดแวร์:**
   * **Node.js Test Runner (`node --test`):** ทดสอบ Layout และฟังก์ชัน Proximity ของ Frontend
   * **Jest / NestJS E2E Testing:** ทดสอบ REST API และ WebSocket Contract
   * **Python Test Scripts (`test_cam_contract.py`, `check_board.py`):** สคริปต์ตรวจสอบ Contract ของกล้องและการทดสอบบอร์ดฮาร์ดแวร์
   * **Postman / cURL:** ทดสอบ REST API endpoints
   * **Serial Monitor:** ตรวจสอบ Debug Log ของไมโครคอนโทรลเลอร์

---

## 4. มาตรฐานและโปรโตคอลการสื่อสาร (Communication Protocols)

| โปรโตคอล | สื่อกลาง / ช่องทาง | ข้อมูลและหน้าที่การทำงาน |
|:---|:---|:---|
| **Dual SPI Bus** | ขาฮาร์ดแวร์ SPI บน ESP32 | สื่อสารกับโมดูล RC522 สองตัวพร้อมกันโดยแยกเป็น VSPI (ฝั่งเข้า) และ HSPI (ฝั่งออก) ความเร็ว 4–10 MHz ไม่ชนกัน |
| **I2C Bus** | ขา SDA (21), SCL (22) | สื่อสารระหว่าง ESP32 กับจอแสดงผลสถานะ OLED (Address `0x3C`, ความเร็ว 400 kHz) |
| **ESP-NOW** | คลื่นวิทยุไร้สาย 2.4 GHz | โปรโตคอล Connectionless ความเร็วสูง ส่งแพ็กเก็ต 1 ไบต์จาก ESP32 Main ไปสั่งเปิด/ปิดเซนเซอร์กล้องบน ESP32-CAM |
| **Wi-Fi (802.11 b/g/n)** | คลื่นวิทยุไร้สาย 2.4 GHz | เชื่อมต่ออุปกรณ์ทั้งสองเข้าสู่เครือข่าย Local Area Network (DHCP พร้อม mDNS `kmitl-cam.local`) |
| **HTTP REST API** | เครือข่าย TCP/IP (พอร์ต 3001) | ESP32 ส่งข้อมูลสแกนบัตร (`POST /access`) และกล้องส่ง IP หรือสถานะ Presence (`POST /devices/cam/...`) |
| **HTTP MJPEG Stream** | เครือข่าย TCP/IP (พอร์ต 81) | ESP32-CAM ส่งสตรีมภาพวิดีโอสด (MJPEG) ขึ้นหน้าจอ CCTV Monitor บน Guard Dashboard |
| **WebSocket (Socket.io)** | เครือข่าย TCP/IP (พอร์ต 3001) | อัปเดตข้อมูลเหตุการณ์การสแกนบัตร (`access`) และการตรวจจับคน (`presence`) แบบเรียลไทม์สู่แดชบอร์ด |
| **LINE Messaging API** | อินเทอร์เน็ตภายนอก (HTTPS) | เซิร์ฟเวอร์ส่ง Flex Message แจ้งเตือนพร้อมภาพถ่ายเข้าสู่กลุ่ม LINE เจ้าหน้าที่ |
| **Resend API (SMTP/HTTPS)** | อินเทอร์เน็ตภายนอก (HTTPS) | ส่งอีเมลแจ้งเตือนอัตโนมัติไปยังผู้ถือบัตรเมื่อมีการสแกนสำเร็จ |

---

## 5. ตารางสรุปรายการอุปกรณ์และเครื่องมือสำหรับนำลงในเล่มโครงงานบทที่ 2

| ลำดับ | รายการอุปกรณ์ / เครื่องมือ | ข้อมูลจำเพาะ / รุ่น / เวอร์ชัน | หน้าที่การทำงานในระบบ |
|:---:|:---|:---|:---|
| **1** | บอร์ดประมวลผลหลัก | ESP32 Dev Board (ESP-WROOM-32) | ประมวลผลเซนเซอร์, แยกอ่าน RFID 2 ทิศทาง, สั่งกลอน และส่งอีเวนต์ |
| **2** | บอร์ดกล้องและวิดีโอสตรีม | AI-Thinker ESP32-CAM (OV2640 + PSRAM 4MB) | สตรีมภาพสด MJPEG (พอร์ต 81), ถ่ายภาพ Snapshot และจัดการ Sleep กล้อง |
| **3** | แผงวงจรพิมพ์ประดิษฐ์ | Custom Mainboard PCB (2-Layer / Single-Layer) | รวมวงจรหลัก ลดการใช้สายไฟ ป้องกันสัญญาณรบกวนและข้อผิดพลาดในการต่อสาย |
| **4** | เครื่องอ่านบัตร RFID | RC522 Module (13.56 MHz) จำนวน 2 ชุด | อ่านรหัสบัตรประจำตัว (ขาเข้าผ่าน VSPI, ขาออกผ่าน HSPI) |
| **5** | บัตรและเหรียญ RFID | Mifare Classic 1K (13.56 MHz) | บัตรประจำตัวสำหรับระบุตัวตนผู้ขอเข้า-ออกประตู |
| **6** | เซนเซอร์ตรวจจับระยะประชิด | Ultrasonic Module HY-SRF05 / HC-SR04 | ตรวจจับผู้ใช้ในระยะ 30-45 ซม. เพื่อปลุกระบบหน้าจอและกล้องอัตโนมัติ |
| **7** | วงจรแบ่งแรงดันเซนเซอร์ | Resistors 1kΩ (R6) และ 2kΩ (R7) | ลดแรงดันสัญญาณ ECHO จาก 5V เป็น 3.3V ป้องกันพอร์ต GPIO32 เสียหาย |
| **8** | จอแสดงผลสถานะ | OLED Display 0.96"/1.3" (I2C SH1106/SSD1306) | แสดงข้อความต้อนรับ สถานะการเชื่อมต่อ และผลการตรวจสอบบัตร |
| **9** | วงจรขับสัญญาณเสียงเตือน | Active Buzzer 5V + NPN Transistor (S8050) + R8 (1kΩ) | ส่งเสียงสัญญาณยืนยันผลการสแกนบัตร (สั้น=ผ่าน, ยาว=ปฏิเสธ) |
| **10** | สวิตช์อิเล็กทรอนิกส์ | 1-Channel 5V Relay with Optocoupler | ตัด-ต่อกระแสไฟ 12V สั่งเปิด-ปิดกลอนประตูไฟฟ้าโดยแยกกราวด์อิสระ |
| **11** | กลอนประตูไฟฟ้า | Solenoid Door Lock LY-03 (12V DC / 0.6A) | กลไกล็อกประตูแบบ Fail-Secure ดึงสลักปลดล็อกเมื่อได้รับสิทธิ์ |
| **12** | แหล่งจ่ายพลังงาน | Switching Adapter 12V DC + Step-Down Buck 5V | จ่ายไฟฟ้าเสถียรให้กลอนไฟฟ้าและลดแรงดันจ่ายให้บอร์ดไมโครคอนโทรลเลอร์ |
| **13** | ตัวเก็บประจุควบคุมแรงดัน | Electrolytic 100–470µF + Ceramic 100nF (C1–C5) | ป้องกันแรงดันไฟตก (Voltage Sag) และกรองสัญญาณรบกวนในระบบ |
| **14** | เฟิร์มแวร์ระบบควบคุม | ภาษา C/C++ (PlatformIO / Arduino Framework) | ควบคุมฮาร์ดแวร์ อัลกอริทึม Sleep กล้อง และโปรโตคอล ESP-NOW |
| **15** | เซิร์ฟเวอร์หลังบ้าน | NestJS 11 (TypeScript, Node.js) | ประมวลผลสิทธิ์, จัดการ API, กล้อง, Proximity Service และบันทึกข้อมูล |
| **16** | ระบบฐานข้อมูล | MySQL 8.4 (Docker) + Prisma ORM 7 | จัดเก็บฐานข้อมูลผู้ใช้ บัตร สิทธิ์การเข้าถึง และ Log ภาพถ่าย |
| **17** | เว็บแดชบอร์ดผู้ใช้งาน | Next.js 16 + React 19 + Tailwind CSS v4 | ระบบมอนิเตอร์เจ้าหน้าที่ (Guard) และระบบบริหารจัดการผู้ใช้ (Admin) |
| **18** | ระบบแสดงภาพสดหน้าประตู | CCTV Monitor Component (MJPEG over HTTP) | เฝ้าระวังพื้นที่หน้าประตูแบบเรียลไทม์ พร้อมระบบหยุดโหลดเพื่อประหยัดข้อมูล |
| **19** | ระบบเสียงแจ้งเตือนอัตโนมัติ | Proximity Audio & Zustand Sound Store | เล่นเสียงสัญญาณเตือนผ่านเว็บเบราว์เซอร์เมื่อมีบุคคลเข้าใกล้ประตู |
| **20** | ระบบการแจ้งเตือนภายนอก | LINE Messaging API & Resend Email API | แจ้งเตือนเหตุการณ์พร้อมรูปถ่ายผ่านกลุ่ม LINE และอีเมลส่วนบุคคล |
| **21** | โปรแกรมออกแบบวงจร | KiCad 8/9 & EasyEDA | ออกแบบวงจรพิมพ์ Schematics, PCB Layout, ตรวจ DRC/ERC และ Gerber |
| **22** | เครื่องมือทดสอบและควบคุม | Docker, Postman, Jest, Git & GitHub | ควบคุมสภาพแวดล้อม จำลองระบบ และทดสอบการทำงานของทั้งโปรเจกต์ |
