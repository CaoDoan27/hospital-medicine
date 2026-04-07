const db = require('../config/database');

async function runSimulation() {
  console.log("🚀 Bắt đầu quá trình giả lập dữ liệu (Simulation)...");
  try {
    // 1. Wipe data
    console.log("1. Xoá dữ liệu giao dịch cũ...");
    await db.query('SET FOREIGN_KEY_CHECKS = 0;');
    const tables = [
      'chi_tiet_kiem_ke', 'kiem_ke', 'chi_phi_bhyt', 'chi_tiet_phieu_hoan_ung',
      'phieu_hoan_ung', 'hang_cho_hoan_ung', 'ton_kho_tu_truc', 'phieu_linh_y_lenh',
      'chi_tiet_phieu_linh', 'phieu_linh', 'y_lenh', 'chi_tiet_cap_phat',
      'don_thuoc', 'dot_dieu_tri', 'benh_nhan', 'chi_tiet_dieu_chuyen',
      'phieu_dieu_chuyen', 'bien_dong_kho', 'chi_tiet_nhap_kho', 'phieu_nhap_kho', 'lo_thuoc'
    ];
    for (const table of tables) {
      await db.query(`TRUNCATE TABLE ${table}`);
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    // 2. Tái tạo inventory
    console.log("2. Nhập kho dữ liệu ban đầu...");
    const [thuocs] = await db.query('SELECT id, don_gia_thau, ten_thuoc FROM thuoc WHERE trang_thai = 1');
    const [nhaCungCap] = await db.query('SELECT id FROM nha_cung_cap LIMIT 1');
    const nccId = nhaCungCap.length ? nhaCungCap[0].id : 1;
    
    // Phieu Nhap (Import Receipt)
    await db.query(`INSERT INTO phieu_nhap_kho (so_hoa_don, nha_cung_cap_id, kho_id, nguoi_lap_id, ngay_lap, tong_tien) VALUES ('HD001SIM', ?, 1, 1, '2026-02-28 08:00:00', 0)`, [nccId]);
    
    for (const thuoc of thuocs) {
      const so_lo = `SIM_${thuoc.id}_01`;
      const han_dung = '2028-12-31';
      const gia_nhap = Number(thuoc.don_gia_thau) * 0.9;
      
      const [rslo1] = await db.query(`INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton) VALUES (?, ?, ?, ?, 5, 1, ?)`, [thuoc.id, so_lo, han_dung, gia_nhap, 50000]);
      const lo_id1 = rslo1.insertId;
      
      await db.query(`INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton) VALUES (?, ?, ?, ?, 5, 2, ?)`, [thuoc.id, so_lo, han_dung, gia_nhap, 1000]);
      await db.query(`INSERT INTO lo_thuoc (thuoc_id, so_lo, han_dung, gia_nhap, thue_vat, kho_id, so_luong_ton) VALUES (?, ?, ?, ?, 5, 3, ?)`, [thuoc.id, so_lo, han_dung, gia_nhap, 1000]);
      
      await db.query(`INSERT INTO ton_kho_tu_truc (kho_id, thuoc_id, lo_thuoc_id, so_lo, han_dung, so_luong_ton, co_so_tran) VALUES (4, ?, ?, ?, ?, 50, 100)`, [thuoc.id, lo_id1, so_lo, han_dung]);
    }
    
    // 3. Vòng lặp từ 2026-03-01 tới 2026-04-07
    console.log("3. Giả lập bệnh nhân và giao dịch hàng ngày (01/03/2026 - 07/04/2026)...");
    let currentDate = new Date('2026-03-01T08:00:00');
    const endDate = new Date('2026-04-07T18:00:00');
    
    const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô'];
    const middleNames = ['Văn', 'Thị', 'Hoàng', 'Minh', 'Ngọc', 'Hữu', 'Đức', 'Thanh', 'Xuân', 'Thu'];
    const lastNames = ['An', 'Bình', 'Hường', 'Nam', 'Long', 'Lan', 'Hoa', 'Tuấn', 'Anh', 'Khoa', 'Mai', 'Linh'];
    const [icd10s] = await db.query('SELECT ma_benh, thuoc_phu_luc_2 FROM danh_muc_icd10');
    
    let bnCount = 0;
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const patientsToday = Math.floor(Math.random() * 5) + 3; // 3-7 patients per day
      
      for (let i = 0; i < patientsToday; i++) {
        bnCount++;
        const ho_ten = `${firstNames[Math.floor(Math.random()*firstNames.length)]} ${middleNames[Math.floor(Math.random()*middleNames.length)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`;
        const gt = Math.random() > 0.5 ? 'Nam' : 'Nu';
        const year = 1940 + Math.floor(Math.random() * 60);
        const so_the_bhyt = `DN495${Math.floor(Math.random()*9000000) + 1000000}`;
        const maBenhNhan = `BN${String(bnCount).padStart(6, '0')}`;
        
        const [bnRs] = await db.query(
          `INSERT INTO benh_nhan (ma_benh_nhan, ho_ten, ngay_sinh, gioi_tinh, so_the_bhyt, dia_chi, dien_thoai) VALUES (?, ?, ?, ?, ?, 'Mô phỏng tự động', '0901234567')`,
          [maBenhNhan, ho_ten, `${year}-01-01`, gt, so_the_bhyt]
        );
        const patientId = bnRs.insertId;
        
        const isInpatient = Math.random() < 0.3; // 30% Inpatient
        const loai_hinh = isInpatient ? 'noi_tru' : 'ngoai_tru';
        const icd = icd10s[Math.floor(Math.random()*icd10s.length)];
        
        const admission = new Date(currentDate);
        admission.setHours(8 + Math.floor(Math.random()*8), Math.floor(Math.random()*60));
        
        const isDischarged = !isInpatient || (currentDate.getTime() + 5*86400000 < endDate.getTime());
        const discharge = isDischarged ? (isInpatient ? new Date(admission.getTime() + 5*86400000) : new Date(admission.getTime() + 2*3600000)) : null;
        
        const [dtRs] = await db.query(
          `INSERT INTO dot_dieu_tri (benh_nhan_id, loai_hinh, khoa, ngay_vao, ngay_ra, ma_benh, chan_doan_lam_sang, muc_huong, trang_thai) VALUES (?, ?, ?, ?, ?, ?, 'Chẩn đoán mô phỏng', 80, ?)`,
          [patientId, loai_hinh, isInpatient ? 'Khoa Nội' : null, admission, discharge, icd.ma_benh, isDischarged ? 'da_chot_vien_phi' : 'dang_dieu_tri']
        );
        const treatmentId = dtRs.insertId;
        
        // Dispense 2 random drugs
        for (let d = 0; d < 2; d++) {
          const thuoc = thuocs[Math.floor(Math.random()*thuocs.length)];
          const qty = Math.floor(Math.random() * 20) + 10;
          
          if (!isInpatient) {
            const [dtRs2] = await db.query(`INSERT INTO don_thuoc (dot_dieu_tri_id, bac_si_ke, trang_thai) VALUES (?, 'BS. Auto', 'da_cap_phat')`, [treatmentId]);
            const dtId = dtRs2.insertId;
            
            const [batches] = await db.query(`SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = 2 LIMIT 1`, [thuoc.id]);
            if (batches.length > 0) {
              const b = batches[0];
              await db.query(`UPDATE lo_thuoc SET so_luong_ton = so_luong_ton - ? WHERE id = ?`, [qty, b.id]);
              
              let muc_huong = icd.thuoc_phu_luc_2 === 1 ? 100 : 80;
              const tien_bhyt = qty * thuoc.don_gia_thau * (muc_huong/100);
              const tien_bn = qty * thuoc.don_gia_thau - tien_bhyt;
              
              const logDate = discharge || new Date();
              await db.query(`INSERT INTO chi_tiet_cap_phat (don_thuoc_id, thuoc_id, lo_thuoc_id, kho_xuat_id, so_luong_phat, don_gia, tien_bhyt_chi_tra, tien_bn_dong_chi_tra, ngay_cap_phat) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?)`,
                [dtId, thuoc.id, b.id, qty, thuoc.don_gia_thau, tien_bhyt, tien_bn, logDate]);
                
              await db.query(`INSERT INTO chi_phi_bhyt (dot_dieu_tri_id, thuoc_id, so_luong, don_gia, ty_le_tt, muc_huong, tien_bhyt, tien_bn_cung_tra, nguon, ngay_ghi_nhan) VALUES (?, ?, ?, ?, 100, ?, ?, ?, 'ngoai_tru', ?)`,
                [treatmentId, thuoc.id, qty, thuoc.don_gia_thau, muc_huong, tien_bhyt, tien_bn, logDate]);
                
              await db.query(`INSERT INTO bien_dong_kho (kho_id, thuoc_id, lo_thuoc_id, loai_bien_dong, so_luong, ngay_bien_dong) VALUES (2, ?, ?, 'xuat_cap_phat', ?, ?)`,
                [thuoc.id, b.id, qty, logDate]);
            }
          } else {
            await db.query(`INSERT INTO y_lenh (dot_dieu_tri_id, thuoc_id, so_luong, lieu_dung, ngay_y_lenh, bac_si_chi_dinh, trang_thai) VALUES (?, ?, ?, 'Sáng 1 Chiều 1', ?, 'BS. Auto', 'da_linh')`,
              [treatmentId, thuoc.id, qty, dateStr]);
              
            const [batches] = await db.query(`SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = 3 LIMIT 1`, [thuoc.id]);
            if (batches.length > 0) {
              const b = batches[0];
              await db.query(`UPDATE lo_thuoc SET so_luong_ton = so_luong_ton - ? WHERE id = ?`, [qty, b.id]);
              
              let muc_huong = icd.thuoc_phu_luc_2 === 1 ? 100 : 80;
              const tien_bhyt = qty * thuoc.don_gia_thau * (muc_huong/100);
              const tien_bn = qty * thuoc.don_gia_thau - tien_bhyt;
              
              const logDate = discharge || admission;
              await db.query(`INSERT INTO chi_phi_bhyt (dot_dieu_tri_id, thuoc_id, so_luong, don_gia, ty_le_tt, muc_huong, tien_bhyt, tien_bn_cung_tra, nguon, ngay_ghi_nhan) VALUES (?, ?, ?, ?, 100, ?, ?, ?, 'noi_tru', ?)`,
                [treatmentId, thuoc.id, qty, thuoc.don_gia_thau, muc_huong, tien_bhyt, tien_bn, logDate]);
                
              await db.query(`INSERT INTO bien_dong_kho (kho_id, thuoc_id, lo_thuoc_id, loai_bien_dong, so_luong, ngay_bien_dong) VALUES (3, ?, ?, 'xuat_cap_phat', ?, ?)`,
                [thuoc.id, b.id, qty, logDate]);
            }
          }
        }
      } // Closing for (let i = 0; i < patientsToday; i++)
      
      // ----- INJECT WAREHOUSING DATA -----
      // Every Monday (getDay() === 1) simulate Warehouse Transfer (Kho 1 -> Kho 2) and Import (NCC -> Kho 1)
      if (currentDate.getDay() === 1) {
        const dateStrDay = dateStr + ' 10:00:00';
        
        // 1. Warehouse Transfer Kho 1 -> Kho 2
        const [dcRs] = await db.query(
          `INSERT INTO phieu_dieu_chuyen (loai_phieu, kho_xuat_id, kho_nhan_id, nguoi_lap_id, nguoi_duyet_id, ngay_lap, ngay_duyet, trang_thai) VALUES ('DIEU_CHUYEN', 1, 2, 1, 1, ?, ?, 'hoan_thanh')`,
          [dateStrDay, dateStrDay]
        );
        const dcId = dcRs.insertId;
        
        for (let i = 0; i < 3; i++) {
          const t = thuocs[Math.floor(Math.random()*thuocs.length)];
          const qty = 500;
          const [b1] = await db.query(`SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = 1 LIMIT 1`, [t.id]);
          const [b2] = await db.query(`SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = 2 LIMIT 1`, [t.id]);
          if (b1.length > 0 && b2.length > 0) {
            await db.query(`INSERT INTO chi_tiet_dieu_chuyen (phieu_id, thuoc_id, lo_thuoc_id, so_luong_yeu_cau, so_luong_thuc_xuat) VALUES (?, ?, ?, ?, ?)`, [dcId, t.id, b1[0].id, qty, qty]);
            await db.query(`UPDATE lo_thuoc SET so_luong_ton = so_luong_ton - ? WHERE id = ?`, [qty, b1[0].id]);
            await db.query(`UPDATE lo_thuoc SET so_luong_ton = so_luong_ton + ? WHERE id = ?`, [qty, b2[0].id]);
            await db.query(`INSERT INTO bien_dong_kho (kho_id, thuoc_id, lo_thuoc_id, loai_bien_dong, so_luong, ngay_bien_dong) VALUES (1, ?, ?, 'xuat_dieu_chuyen', ?, ?)`, [t.id, b1[0].id, qty, dateStrDay]);
            await db.query(`INSERT INTO bien_dong_kho (kho_id, thuoc_id, lo_thuoc_id, loai_bien_dong, so_luong, ngay_bien_dong) VALUES (2, ?, ?, 'nhap_dieu_chuyen', ?, ?)`, [t.id, b2[0].id, qty, dateStrDay]);
          }
        }
        
        // 2. Warehouse Import -> Kho 1
        const [pnRs] = await db.query(`INSERT INTO phieu_nhap_kho (so_hoa_don, nha_cung_cap_id, kho_id, nguoi_lap_id, ngay_lap, tong_tien) VALUES (?, ?, 1, 1, ?, 0)`, [`HD_SIM_${Date.now()}`, nccId, dateStrDay]);
        const pnId = pnRs.insertId;
        for (let i = 0; i < 2; i++) {
          const t = thuocs[Math.floor(Math.random()*thuocs.length)];
          const qty = 2000;
          const [b1] = await db.query(`SELECT id FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = 1 LIMIT 1`, [t.id]);
          if (b1.length > 0) {
            await db.query(`INSERT INTO chi_tiet_nhap_kho (phieu_nhap_id, thuoc_id, lo_thuoc_id, so_lo, han_dung, so_luong, don_gia) VALUES (?, ?, ?, 'SIM_IMP', '2028-12-31', ?, ?)`, [pnId, t.id, b1[0].id, qty, t.don_gia_thau]);
            await db.query(`UPDATE lo_thuoc SET so_luong_ton = so_luong_ton + ? WHERE id = ?`, [qty, b1[0].id]);
            await db.query(`INSERT INTO bien_dong_kho (kho_id, thuoc_id, lo_thuoc_id, loai_bien_dong, so_luong, ngay_bien_dong) VALUES (1, ?, ?, 'nhap', ?, ?)`, [t.id, b1[0].id, qty, dateStrDay]);
          }
        }
      }
      
      // 3. Every 1st day of month (April 1st) simulate Inventory Check (Kiểm kê)
      if (currentDate.getDate() === 1 && currentDate.getMonth() !== 2) { 
        const dateStrDay = dateStr + ' 15:00:00';
        const [kkRs] = await db.query(`INSERT INTO kiem_ke (kho_id, nguoi_kiem_ke_id, ngay_bat_dau, ngay_ket_thuc, trang_thai) VALUES (1, 1, ?, ?, 'hoan_thanh')`, [dateStrDay, dateStrDay]);
        const kkId = kkRs.insertId;
        
        for (let i = 0; i < 2; i++) {
          const t = thuocs[Math.floor(Math.random()*thuocs.length)];
          const [b1] = await db.query(`SELECT id, so_luong_ton FROM lo_thuoc WHERE thuoc_id = ? AND kho_id = 1 LIMIT 1`, [t.id]);
          if (b1.length > 0) {
             const sysQty = b1[0].so_luong_ton;
             const actualQty = sysQty - 5; // Example: loss of 5 items
             await db.query(`INSERT INTO chi_tiet_kiem_ke (kiem_ke_id, thuoc_id, lo_thuoc_id, so_luong_he_thong, so_luong_thuc_te) VALUES (?, ?, ?, ?, ?)`, [kkId, t.id, b1[0].id, sysQty, actualQty]);
             await db.query(`UPDATE lo_thuoc SET so_luong_ton = ? WHERE id = ?`, [actualQty, b1[0].id]);
             await db.query(`INSERT INTO bien_dong_kho (kho_id, thuoc_id, lo_thuoc_id, loai_bien_dong, so_luong, ngay_bien_dong) VALUES (1, ?, ?, 'kiem_ke_giam', 5, ?)`, [t.id, b1[0].id, dateStrDay]);
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log("✅ Giả lập thành công: Đã tạo hơn " + bnCount + " bệnh nhân cùng hàng trăm giao dịch!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi trong quá trình giả lập:", err);
    process.exit(1);
  }
}

runSimulation();
