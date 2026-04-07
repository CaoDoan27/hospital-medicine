require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Performance
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Body parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'hospital-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// Flash messages
app.use(flash());

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Global variables for views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.warning_msg = req.flash('warning');
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/danh-muc-thuoc', require('./routes/drugCatalog'));
app.use('/nhap-kho', require('./routes/warehouseImport'));
app.use('/dieu-chuyen', require('./routes/transfer'));
app.use('/kiem-ke', require('./routes/inventory'));
app.use('/cap-phat-ngoai-tru', require('./routes/outpatient'));
app.use('/y-lenh', require('./routes/medicalOrder'));
app.use('/tu-truc', require('./routes/emergencyCabinet'));
app.use('/cap-phat-noi-tru', require('./routes/inpatientDispense'));
app.use('/hoan-ung', require('./routes/replenishment'));
app.use('/chi-phi-noi-tru', require('./routes/inpatientCost'));
app.use('/bao-cao', require('./routes/report'));
app.use('/quyet-toan', require('./routes/settlement'));
app.use('/xuat-xml', require('./routes/xmlExport'));

// 404
app.use((req, res) => {
  res.status(404).render('errors/404', { layout: false });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', { layout: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`🏥 Hệ thống Quản lý Dược - Bệnh viện đang chạy tại http://localhost:${PORT}`);
});

module.exports = app;
