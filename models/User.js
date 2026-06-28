const db = require('../config/database');

class User {
  static async findByUsername(username) {
    const [users] = await db.query(
      'SELECT * FROM nguoi_dung WHERE ten_dang_nhap = ? AND trang_thai = 1',
      [username]
    );
    return users;
  }
}

module.exports = User;
