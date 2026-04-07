function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
  res.redirect('/login');
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      req.flash('error', 'Vui lòng đăng nhập');
      return res.redirect('/login');
    }
    if (roles.length && !roles.includes(req.session.user.vai_tro)) {
      req.flash('error', 'Bạn không có quyền truy cập chức năng này');
      return res.redirect('/dashboard');
    }
    next();
  };
}

module.exports = { isAuthenticated, authorize };
