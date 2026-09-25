import { ArrowRight, RotateCcw, ServerCrash } from "lucide-react";

export function BackendError({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border bg-card shadow-lg" role="alert">
      <div className="border-b bg-destructive/5 px-6 py-7 sm:px-8">
        <div className="mb-5 w-fit rounded-2xl bg-destructive/10 p-3 text-destructive"><ServerCrash className="size-7" /></div>
        <p className="text-xs font-bold tracking-[.2em] text-destructive">SERVICE UNAVAILABLE</p>
        <h1 className="mt-2 font-heading text-2xl font-bold">เชื่อมต่อระบบข้อมูลไม่ได้</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">หน้าเว็บยังทำงานอยู่ แต่ไม่สามารถโหลดข้อมูลจาก backend ได้ ข้อมูลในหน้านี้จึงไม่แสดงแทนด้วยค่าจำลอง</p>
      </div>
      <div className="space-y-5 px-6 py-7 sm:px-8">
        <p className="rounded-xl bg-muted px-4 py-3 font-mono text-xs break-all text-muted-foreground">{message}</p>
        <div><h2 className="text-sm font-semibold">ตรวจสอบก่อนลองใหม่</h2><ol className="mt-3 space-y-3 text-sm text-muted-foreground"><li className="flex gap-3"><span className="font-bold text-primary">01</span> เปิด MySQL และ backend ที่พอร์ต 3001</li><li className="flex gap-3"><span className="font-bold text-primary">02</span> ตรวจ NEST_API_URL ใน frontend/.env.local</li><li className="flex gap-3"><span className="font-bold text-primary">03</span> หาก session หมดอายุ ให้เข้าสู่ระบบใหม่</li></ol></div>
        <a href="" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"><RotateCcw className="size-4" /> ลองโหลดอีกครั้ง <ArrowRight className="size-4" /></a>
      </div>
    </section>
  );
}
