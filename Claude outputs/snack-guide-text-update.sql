-- =====================================================================
-- ปรับข้อความหน้า "ของว่าง" และ "คู่มือบรรเทาปวด" ให้สั้นแบบในฟิกม่า
-- (บอกแค่ลักษณะ/สรรพคุณแบบเบาๆ + ปริมาณที่ทาน ไม่อ้างงานวิจัย ไม่มีวงเล็บ "ยังไม่มีงานทดสอบ")
--
-- วิธีใช้: เปิด Supabase > SQL Editor > วางทั้งไฟล์ > Run  (รันเองได้เลย ย้อนกลับได้ด้วยการรันค่าเดิมอีกที)
-- ไม่แตะโครงสร้างตาราง แก้เฉพาะข้อความในแถวที่ระบุ id
-- ข้อควรทำทีหลัง: ตรวจสรรพคุณแต่ละประโยคกับแหล่งข้อมูลอีกรอบก่อนส่งงาน
--   (ข้อความนี้ยังไม่ใช่ข้อความที่แพทย์รับรอง)
-- =====================================================================

begin;

-- ---------- ของว่าง (snack_items) : description ----------
update public.snack_items set description = 'ชาขิงอุ่นๆ ช่วยให้ท้องอุ่นสบาย ผ่อนคลาย ดื่มพอดี 1 แก้วต่อครั้ง' where id = 1;
update public.snack_items set description = 'โปรตีนและโอเมก้า-3 หาง่าย อิ่มท้อง ทานครั้งละ 1-2 ตัว (รสเค็ม ทานพอดี)' where id = 2;
update public.snack_items set description = 'นมขมิ้นอุ่นๆ รสนุ่มหอมเครื่องเทศ อุ่นท้อง ดื่มพอดี 1 แก้วต่อครั้ง' where id = 3;
update public.snack_items set description = 'ถั่วกรอบมัน มีโอเมก้า-3 จากพืช ทานครั้งละกำมือเล็กๆ (ประมาณ 30 กรัม)' where id = 4;
update public.snack_items set description = 'เนื้อเนียนนุ่ม อิ่มท้อง มีไขมันดีและใยอาหาร ดื่มแก้วเล็กๆ 1 แก้วพอ' where id = 5;
update public.snack_items set description = 'รสเข้มขมนิดๆ มีแมกนีเซียม ทานชิ้นเล็กๆ 1-2 ชิ้นพอ' where id = 6;
update public.snack_items set description = 'เค็มมัน มีแมกนีเซียม ทานครั้งละกำมือเล็กๆ (ประมาณ 30 กรัม)' where id = 7;
update public.snack_items set description = 'กรอบๆ มีแมกนีเซียม ทานครั้งละกำมือเล็กๆ (ประมาณ 30 กรัม)' where id = 8;
update public.snack_items set description = 'กรอบมัน มีวิตามินอีและแมกนีเซียม ทานกำมือเล็กๆ เลือกแบบเกลือน้อย' where id = 9;
update public.snack_items set description = 'โปรตีนจากพืชและใยอาหาร อิ่มท้อง ทานครั้งละถ้วยเล็กๆ' where id = 10;
update public.snack_items set description = 'มีโพแทสเซียมและใยอาหาร อิ่มท้อง ทานครึ่งถึง 1 หัวเล็ก' where id = 11;
update public.snack_items set description = 'โปรตีนจากพืชและแคลเซียม ดื่มอุ่นๆ พอดี 1 แก้วต่อครั้ง' where id = 12;
update public.snack_items set description = 'หวานตามธรรมชาติ มีโพแทสเซียมและวิตามินบี 6 ให้พลังงานเร็ว ทานครั้งละ 1 ผล' where id = 13;
update public.snack_items set description = 'โปรตีนและวิตามินบี 12 อิ่มท้อง ทานเป็นของว่างวันละ 1 ฟองพอ' where id = 14;
update public.snack_items set description = 'หวานตามธรรมชาติ ให้พลังงานเร็ว มีใยอาหาร ทานครั้งละ 2-3 ลูก' where id = 15;
update public.snack_items set description = 'หวานตามธรรมชาติ พกง่าย ให้พลังงานเร็ว ทานครั้งละกำมือเล็กๆ' where id = 16;
update public.snack_items set description = 'อุ่นๆ หวานตามธรรมชาติ มีใยอาหาร อิ่มท้อง ทานครั้งละ 1 หัวเล็ก' where id = 17;
update public.snack_items set description = 'โปรตีนสูงและวิตามินบี 12 ใส่น้ำผึ้งแค่ 1 ช้อนชา ทานครั้งละถ้วยเล็กๆ' where id = 18;
update public.snack_items set description = 'กรอบสดชื่น น้ำเยอะ พลังงานต่ำ ทานได้หลายชิ้น' where id = 19;
update public.snack_items set description = 'หวานอมเปรี้ยวชื่นใจ มีน้ำมากและวิตามินซี ทานครั้งละถ้วยเล็กๆ' where id = 20;
update public.snack_items set description = 'เนื้อนุ่มหวานหอม มีใยอาหารและวิตามินซี ทานครั้งละถ้วยเล็กๆ' where id = 21;
update public.snack_items set description = 'กลิ่นสดชื่น ไม่มีคาเฟอีน ดื่มอุ่นๆ พอดี 1 แก้วต่อครั้ง' where id = 22;
update public.snack_items set description = 'กรอบสด น้ำเยอะ พลังงานต่ำ ทานได้หลายแท่ง' where id = 23;

-- ---------- ของว่าง : pairing_tip (แก้แค่อันที่ยาว) ----------
update public.snack_items set pairing_tip = 'ใส่น้ำผึ้งนิดเดียวแทนน้ำตาลทราย' where id = 1;

-- ---------- คู่มือบรรเทาปวด (pain_relief_guides) : ชื่อ + คำอธิบายสั้น ----------
-- ขั้นตอน (steps) ไม่แก้ เพราะมีคำเตือนความปลอดภัย เช่น ห้ามประคบร้อนจนผิวแดง
update public.pain_relief_guides set
  title = 'ประคบร้อน',
  short_description = 'ประคบอุ่นบริเวณที่ปวด ช่วยให้กล้ามเนื้อคลายและรู้สึกอุ่นสบาย'
where id = 1;

update public.pain_relief_guides set
  short_description = 'ยืดหลังและสะโพกเบาๆ ช่วยผ่อนคลายกล้ามเนื้อ'
where id = 2;

update public.pain_relief_guides set
  short_description = 'กดนวดเบาๆ ที่จุดเหนือตาตุ่มด้านใน ช่วยให้รู้สึกผ่อนคลาย'
where id = 3;

update public.pain_relief_guides set
  short_description = 'หายใจช้าๆ ช่วยให้ร่างกายและใจผ่อนคลาย'
where id = 4;

update public.pain_relief_guides set
  short_description = 'ท่าพักหลังและสะโพก ช่วยให้รู้สึกผ่อนคลาย'
where id = 7;

update public.pain_relief_guides set
  short_description = 'บิดตัวเบาๆ ช่วยคลายหลังและสะโพก'
where id = 8;

commit;

-- ตรวจผล (ไม่บังคับ)
-- select id, name, description from public.snack_items order by id;
-- select id, title, short_description from public.pain_relief_guides order by id;
