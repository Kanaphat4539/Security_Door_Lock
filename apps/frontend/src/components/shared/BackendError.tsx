import { ServerCrash } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BackendError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <ServerCrash />
      <AlertTitle>เชื่อมต่อ backend ไม่ได้</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li>
            รัน <code className="font-mono">docker compose up -d</code>{" "}
            ที่ root ของ repo แล้วหรือยัง
          </li>
          <li>
            รัน <code className="font-mono">npm run start:dev</code> ที่{" "}
            <code className="font-mono">backend/</code> แล้วหรือยัง
          </li>
          <li>
            <code className="font-mono">NEST_API_URL</code> ใน{" "}
            <code className="font-mono">frontend/.env.local</code>{" "}
            ชี้ไปที่ backend ถูกพอร์ตไหม
          </li>
          <li>session หมดอายุหรือเปล่า — ลองออกจากระบบแล้วเข้าใหม่</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
