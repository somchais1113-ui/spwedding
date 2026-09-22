# อัปเดต v23 — แก้ Deploy และ Bubble

## จุดที่แก้
- เปลี่ยน Bubble เป็น “ถามเบิร์ดนะ” บรรทัดเดียว วางใต้ตัวนับถอยหลัง ข้างนก
- เว้นพื้นที่ข้อความสั้นก่อนปุ่ม 32px เพื่อไม่ทับตัวเลข ไม่เพิ่มแถวว่าง 80px แบบ v21
- แก้ vercel.json: includeFiles ต้องเป็น string glob เดียว ไม่ใช่ array และเพิ่ม $schema สำหรับตัวแก้ไขโค้ด

## วิธีอัปเดตจาก v21/v22 ที่ Deploy ไม่ผ่าน
1. แตก ZIP นี้ แล้วนำไฟล์ไปแทนในโฟลเดอร์โปรเจกต์เดิม โดยเฉพาะ vercel.json ที่รากเดียวกับ package.json และ index.html
2. Commit และ Push การแก้ไขใหม่ไป main ตามวิธีเดิม รอ Vercel สร้าง Deployment จาก commit ใหม่นี้
3. ไม่ใช่กด Redeploy commit เก่าที่มี includeFiles เป็น array เพราะจะผิดซ้ำ
4. ตรวจให้สถานะ Ready แล้วเปิดเว็บใหม่/Reload
5. ถ้ายังไม่เคยเปิดคิว v21 ให้ทำขั้นตอน setupWishesQueue ใน START-HERE-v21-TH.md หลังเว็บ Ready ถ้าตั้งค่าครบแล้ว ไม่ต้องเปลี่ยน Apps Script หรือรหัสลับ

START-HERE.html เป็นเพียงคู่มือ การเปลี่ยนข้อความในไฟล์นั้นไม่ใช่สาเหตุของ Build Failed ตามภาพ สาเหตุคือรูปแบบ includeFiles ใน vercel.json

รอบนี้ยังไม่ได้ Deploy ขึ้น Production แทนเจ้าของบัญชี
