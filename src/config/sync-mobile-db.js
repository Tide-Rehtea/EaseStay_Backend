/**
 * 移动端数据库同步脚本
 * 运行: npm run db:sync-mobile
 */

const { sequelize } = require('./db');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const {
  MobileUser,
  Order,
  Favorite,
  BrowseHistory,
  Banner,
  SearchHistory,
  UserAddress
} = require('../models/mobile');

const syncMobileDatabase = async () => {
  try {
    console.log('🔄 开始同步移动端数据库...');

    // 先同步基础表
    await sequelize.sync({ alter: true });
    console.log('✅ 基础表同步完成');

    // 创建默认Banner数据
    const bannerCount = await Banner.count();
    if (bannerCount === 0) {
      await Banner.bulkCreate([
        {
          title: '热门酒店推荐',
          image_url: '/uploads/banners/hotel-1.jpg',
          link_type: 'hotel',
          link_target: '1',
          sort_order: 1,
          status: 'active'
        },
        {
          title: '限时特惠',
          image_url: '/uploads/banners/sale.jpg',
          link_type: 'url',
          link_target: '/promotion',
          sort_order: 2,
          status: 'active'
        },
        {
          title: '亲子酒店精选',
          image_url: '/uploads/banners/family.jpg',
          link_type: 'hotel',
          link_target: '2',
          sort_order: 3,
          status: 'active'
        }
      ]);
      console.log('✅ 默认Banner数据创建完成');
    }

    // 创建默认用户扩展信息（为已有用户创建mobile_profile）
    const users = await User.findAll();
    for (const user of users) {
      const existing = await MobileUser.findOne({ where: { user_id: user.id } });
      if (!existing) {
        await MobileUser.create({
          user_id: user.id,
          nickname: `用户${user.id}`,
          avatar: '/uploads/default-avatar.png',
          member_level: '普通会员',
          points: 100
        });
      }
    }
    console.log('✅ 用户扩展信息同步完成');

    console.log('🎉 移动端数据库同步完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 移动端数据库同步失败:', error);
    process.exit(1);
  }
};

// 如果直接运行此文件
if (require.main === module) {
  syncMobileDatabase();
}

module.exports = syncMobileDatabase;