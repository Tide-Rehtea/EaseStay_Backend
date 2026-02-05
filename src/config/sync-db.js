const { sequelize } = require('./db');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Review = require('../models/Review');

const syncDatabase = async () => {
  try {
    // 同步所有模型
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ 数据库同步完成！');
    
    // 创建默认管理员账户（可选）
    const bcrypt = require('bcryptjs');
    const AdminUser = require('../models/User');
    
    const adminExists = await AdminUser.findOne({ where: { email: 'admin@hotel.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await AdminUser.create({
        email: 'admin@hotel.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ 默认管理员账户创建成功：admin@hotel.com / admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    process.exit(1);
  }
};

syncDatabase();