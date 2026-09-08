# คำอวยพร — ส่งต่อให้นักพัฒนา

## Frontend

`js/celebration.js` สลับแท็บพิมพ์/ลายมือแบบ keyboard-accessible เก็บร่างทั้งสองโหมดใน localStorage ชื่อ `sp-wedding-wish-2026-10-25` โดยไม่ส่งอัตโนมัติ โหมดที่เลือกเป็นโหมดเดียวที่ใช้ส่งและสร้างการ์ด

Canvas 1200 × 720 แสดงผลอัตราส่วน 5:3 พิกัดเส้นเป็นสัดส่วน 0–1 จึงไม่หายเมื่อเปลี่ยนแนวหน้าจอ ใช้ Pointer Events และ pointer capture รองรับยกเลิกการลาก ไม่ดัก touch scroll ภายนอก canvas การ์ด PNG ดาวน์โหลดขนาดกว้าง 1200 px และเพิ่มความสูงตามจำนวนบรรทัดข้อความ

## API ที่ใช้

- `GET /api/guestbook-status`: `{ "service": "sp-wedding-guestbook-v1" }`
- `POST /api/wishes`: JSON `{ "name": "ชื่อ", "mode": "type", "text": "คำอวยพร", "image": "" }` หรือ `{ "name": "ชื่อ", "mode": "draw", "text": "", "image": "data:image/png;base64,..." }`
- สำเร็จ `201`: `{ "saved": true, "id": "..." }` เฉพาะหลังเขียนไฟล์สำเร็จ
- ผิดพลาดตอบ non-2xx; frontend ไม่แสดงว่าส่งแล้ว และเก็บร่างให้ลองส่งใหม่

จำกัดชื่อ 80 ตัวอักษร ข้อความ 1000 ตัวอักษร body 2 MB ตรวจ PNG 1200 × 720 เซิร์ฟเวอร์จำกัด 30 คำขอต่อนาทีต่อ IP; หลัง reverse proxy ค่าที่เห็นอาจเป็น IP proxy ร่วมกัน จึงควรตั้ง rate limiting ที่ proxy ตามผู้ใช้จริงก่อนใช้งานวงกว้าง

## ข้อมูลและโฮสต์

`server.mjs` ใช้ built-in Node modules ไม่มี npm dependency และรับ request origin เดียวกัน เก็บหนึ่ง JSON ต่อคำอวยพรด้วย UUID อยู่ภายนอก public asset tree ไม่มีหน้าสาธารณะสำหรับอ่านข้อความของผู้อื่น เจ้าของงานเข้าถึงผ่าน filesystem ของโฮสต์ โฟลเดอร์นี้ห้าม commit หรือวางใน CDN

Environment: `HOST`, `PORT`, `WISHES_DATA_DIR` ค่าเริ่มต้นรัน localhost:8080 และเก็บ `private-wishes/` ข้างเซิร์ฟเวอร์ ใช้ persistent disk จริงและสำรองข้อมูล สำหรับการย้ายไป Vercel/Supabase ให้คง API contract เดิม เปลี่ยนขั้นตอนเขียนเป็น database/object storage ฝั่ง server และเก็บ secret ไว้ server เท่านั้น ไม่ใส่ service key ใน config.js

ไม่มี authentication/admin dashboard, moderation UI หรือ public wall ในแพ็กเกจนี้ หาก request ตอบกลับขาดหายหลังเซิร์ฟเวอร์บันทึกแล้ว การส่งซ้ำอาจสร้างสองรายการได้ ตรวจ id/เวลาเมื่อนำไปจัดอัลบั้ม


เวอร์ชัน 1.6 เปลี่ยนเป็น send-only UI ไม่มีดาวน์โหลด PNG ปุ่มใช้ POST โดยตรง ไม่ต้องตรวจ health ก่อนส่ง มี loading/success/error และป้องกันส่งข้อความเดิมซ้ำในหน้าเดียวกัน ส่วน localStorage เป็นเพียงร่างอัตโนมัติ ไม่ใช่ผลลัพธ์ของปุ่มส่ง
