# ฟอนต์อังกฤษ — Orange Avenue

ใช้ไฟล์ที่ผู้ใช้แนบโดยตรงและไม่แก้ bytes:

- OrangeAvenueDEMO-Regular.otf: ข้อความอังกฤษและหัวข้อหลัก รวมถึงตัวเลข
- OrangeAvenueOutlineDEMO-Regular.otf: เครื่องหมาย & ระหว่างชื่อบน hero เป็นจุดตกแต่ง

ภาษาไทย fallback ไป Prompt ซึ่งแนบไว้เดิม กำหนด @font-face และ unicode-range ใน css/styles.css ฟอนต์อยู่ภายในแพ็กเกจและฝังใน HTML ตัวอย่าง ไม่โหลดจากบริการภายนอก

ข้อความที่อยู่ใน PNG โลโก้เป็นส่วนของภาพ ไม่เปลี่ยนเป็นฟอนต์ใหม่นี้ ส่วนข้อความ HTML อังกฤษที่แก้ไขได้เปลี่ยนเป็น Orange Avenue แล้ว ปรับขนาดและระยะหัวข้อให้เข้ากับฟอนต์ใหม่

Metadata ในสองไฟล์ระบุ DEMO / PERSONAL USE ONLY พร้อม editable embedding bit นี่คือข้อมูลที่มากับไฟล์ ไม่ได้แนบสิทธิ์ใช้งานเพิ่มเติม การนำแพ็กเกจไปใช้กับงานอื่นให้ตรวจสิทธิ์ของผู้ให้ฟอนต์ตามการใช้งานนั้น


## 2.2 — PKF-Rayrai สำหรับภาพส่งออก

ใช้ไฟล์ PKF-rayraiDEMO.ttf จาก ZIP ฟอนต์ที่เจ้าของงานแนบไว้ ลงทะเบียนเป็น PKF-Rayrai ผ่าน @font-face และฝังใน Preview ใช้เฉพาะข้อความคำอวยพร/ชื่อบนการ์ดภาษาไทยและอังกฤษ ลายมือที่แขกเขียนไม่ถูกแทนด้วยฟอนต์ UI ไทยคง Prompt เดิม English display คง Orange Avenue แต่เพิ่ม font-weight:600 และเปิด font-synthesis:weight เนื่องจากไม่มีไฟล์ Bold แนบมา


## 2.3 — ใช้ Noto Sans TC แทน PKF-Rayrai

@font-face NotoSansTC ใช้ไฟล์แนบ NotoSansTC-VariableFont_wght.ttf ฉบับเต็มที่ assets/fonts/ รองรับน้ำหนัก 100–900 ไม่มีอักษรไทยใน cmap จึงคง Prompt สำหรับภาษาไทยบนการ์ด ใช้เฉพาะระบบส่งออก ไม่เปลี่ยน Orange Avenue ของ Wedding UI รายละเอียด 2.3 ใช้แทนบันทึกฟอนต์การ์ด 2.2 ข้างต้น
