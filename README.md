# Security Door Lock System
ระบบประตูเพื่อความปลอดภัย

This monorepo contains the software and firmware for a Security Door Lock system featuring facial recognition, RFID, and ultrasonic sensing.

## Project Structure

- **apps/frontend**: Next.js (App Router) + Tailwind CSS application for the dashboard.
- **apps/backend**: NestJS + Prisma application for the API and WebSocket server.
- **firmware/esp32-main**: PlatformIO firmware for the main ESP32 (RFID, Ultrasonic, Lock control).
- **firmware/esp32-cam**: PlatformIO firmware for the ESP32-CAM (Face capture).
- **docker**: Docker compose configurations for database and other services.
- **uploads**: Local storage directory for captured face images.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- PlatformIO (for firmware development)

### Running the Database
```bash
docker-compose up -d
```

### Running the Backend
```bash
cd apps/backend
npm install
npm run start:dev
```

### Running the Frontend
```bash
cd apps/frontend
npm install
npm run dev
```
