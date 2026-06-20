# ระบบติดตามโครงการ - โรงเรียนบ้านวังทอง 🏫
แดชบอร์ดแสดงผลการติดตามแผนงานและโครงการสำหรับผู้บริหารสถานศึกษา โรงเรียนบ้านวังทอง โดยเชื่อมต่อข้อมูลจาก Google Sheet แบบเรียลไทม์ และสามารถเผยแพร่ผ่าน **GitHub Pages** ได้ทันที

---

## 🌟 คุณสมบัติเด่น (Features)
1. **Real-time Sync**: ดึงข้อมูลล่าสุดจาก Google Sheets ทุกครั้งที่ผู้ใช้งานเปิดหน้า Dashboard หรือกดปุ่ม "รีเฟรชข้อมูล" (Sync Now)
2. **Dynamic Column Mapping**: ตรวจหาหัวคอลัมน์อัตโนมัติ (เช่น ชื่อโครงการ, งบประมาณ, สถานะ, ผู้รับผิดชอบ) หากโครงสร้างคอลัมน์เปลี่ยนระบบจะปรับตัวตามโดยอัตโนมัติ
3. **Interactive Charts**: กราฟวงกลมแสดงสัดส่วนสถานะโครงการ และกราฟแท่งเปรียบเทียบงบประมาณจัดสรรรวมกับงบประมาณที่ใช้ไปจริงตามฝ่าย/กลุ่มงาน
4. **Search & Filters**: ค้นหาโครงการตามชื่อหรือผู้รับผิดชอบ และกรองตามแผนยุทธศาสตร์ กลุ่มงาน หรือสถานะโครงการ
5. **Detail Modal**: คลิกแถวตารางเพื่อดูรายละเอียดเชิงลึกของโครงการ รวมถึงฟิลด์ข้อมูลที่ไม่ได้แมปแบบอัตโนมัติ
6. **Themes support**: รองรับโหมดหน้าจอมืด (Dark Mode) และหน้าจอว่าง (Light Mode)

---

## 🛠️ โครงสร้างไฟล์
- `index.html` - โครงสร้างและเทมเพลต HTML
- `style.css` - ตกแต่งหน้าตาแบบพรีเมียม (Glassmorphism) และรองรับ Responsive (Mobile/Desktop)
- `app.js` - โค้ดดึงข้อมูล Google Sheet, ระบบพาร์ส CSV, ปรับความก้าวหน้า และควบคุมกราฟ
- `server.js` - เซิร์ฟเวอร์ทดสอบในเครื่องคอมพิวเตอร์ (ไม่จำเป็นสำหรับการทำงานบน GitHub Pages)
- `package.json` - ค่ากำหนดสำหรับการเริ่มระบบทดสอบ

---

## 🌐 วิธีการนำขึ้นระบบ GitHub Pages (เผยแพร่สาธารณะ)

เนื่องจากระบบนี้เป็น **Single Page Application (SPA)** ที่ทำงานบนเบราว์เซอร์ฝั่งไคลเอนต์ (Client-side) ทั้งหมด จึงสามารถใช้บริการ **GitHub Pages** โฮสต์ฟรีได้ทันทีโดยไม่ต้องตั้งค่าฐานข้อมูลหรือเบรกเอนด์เซิร์ฟเวอร์ใดๆ

### ขั้นตอนที่ 1: ตรวจสอบสิทธิ์ของ Google Sheet
โปรดตรวจสอบให้แน่ใจว่าได้เปิดแชร์ลิงก์ Google Sheet เป็นแบบ **"ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with the link can view)**
> ลิงก์ที่แชร์: https://docs.google.com/spreadsheets/d/1DrKZ_EosBp4jyjZzgzv15EPb0L6LMJwPk5eFPvyyD6I/edit?usp=sharing

### ขั้นตอนที่ 2: อัปโหลดโค้ดขึ้น GitHub
1. สร้าง **Repository** ใหม่บน GitHub (เช่น ชื่อว่า `wangthong-school-dashboard`)
2. เปิด Command Line/Terminal ในโฟลเดอร์โครงการนี้ แล้วรันคำสั่งดังนี้:
   ```bash
   # เริ่มต้นสร้าง Git repository ในเครื่อง
   git init

   # เพิ่มไฟล์ทั้งหมดเข้า git
   git add .

   # บันทึกเวอร์ชันแรก
   git commit -m "Initial commit of Wangthong school dashboard"

   # ตั้งชื่อกิ่งหลักเป็น main
   git branch -M main

   # เชื่อมโยงกับ GitHub Repository ของคุณ (เปลี่ยน USERNAME และ REPO เป็นของคุณ)
   git remote add origin https://github.com/USERNAME/wangthong-school-dashboard.git

   # ส่งโค้ดขึ้นไปยัง GitHub
   git push -u origin main
   ```

### ขั้นตอนที่ 3: เปิดใช้งาน GitHub Pages
1. เข้าไปที่หน้า Repository ของคุณบนเว็บไซต์ GitHub
2. คลิกไปที่แท็บ **Settings** (ตั้งค่า)
3. เมนูด้านซ้ายเลือก **Pages**
4. ในหัวข้อ **Build and deployment** -> **Branch**:
   - เลือกเป็นกิ่ง `main`
   - โฟลเดอร์ระบุเป็น `/ (root)`
5. กดปุ่ม **Save**
6. รอประมาณ 1-2 นาที GitHub จะแจ้งลิงก์สำหรับเข้าชมแดชบอร์ดสาธารณะ เช่น `https://USERNAME.github.io/wangthong-school-dashboard/`

---

## 💻 วิธีการรันบนเครื่องคอมพิวเตอร์ตัวเอง (Local Development)

หากต้องการทดสอบในเครื่องตัวเองก่อนนำขึ้น GitHub:
1. เปิด Terminal ในโฟลเดอร์นี้
2. พิมพ์คำสั่ง:
   ```bash
   npm start
   ```
3. เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)
