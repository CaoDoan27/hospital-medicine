const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// GET /login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { layout: false });
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { ten_dang_nhap, mat_khau } = req.body;
    if (!ten_dang_nhap || !mat_khau) {
      req.flash('error', 'Vui lòng nhập đầy đủ thông tin');
      return res.redirect('/login');
    }
    const [users] = await db.query('SELECT * FROM nguoi_dung WHERE ten_dang_nhap = ? AND trang_thai = 1', [ten_dang_nhap]);
    if (users.length === 0) {
      req.flash('error', 'Tên đăng nhập hoặc mật khẩu không đúng');
      return res.redirect('/login');
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(mat_khau, user.mat_khau);
    if (!isMatch) {
      req.flash('error', 'Tên đăng nhập hoặc mật khẩu không đúng');
      return res.redirect('/login');
    }
    req.session.user = {
      id: user.id,
      ten_dang_nhap: user.ten_dang_nhap,
      ho_ten: user.ho_ten,
      vai_tro: user.vai_tro
    };
    req.flash('success', `Xin chào, ${user.ho_ten}!`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Lỗi hệ thống, vui lòng thử lại');
    res.redirect('/login');
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Redirect root to dashboard or login
router.get('/', (req, res) => {
  res.redirect(req.session.user ? '/dashboard' : '/login');
});

module.exports = router;
