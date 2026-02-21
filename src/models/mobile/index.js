const User = require('../User');
const Hotel = require('../Hotel');
const MobileUser = require('./MobileUser');
const Order = require('./Order');
const Favorite = require('./Favorite');
const BrowseHistory = require('./BrowseHistory');
const Banner = require('./Banner');
const SearchHistory = require('./SearchHistory');
const UserAddress = require('./UserAddress');

/**
 * 定义模型关联关系
 */

// User 与 MobileUser 一对一
User.hasOne(MobileUser, { foreignKey: 'user_id', as: 'mobileProfile' });
MobileUser.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User 与 Order 一对多
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Hotel 与 Order 一对多
Hotel.hasMany(Order, { foreignKey: 'hotel_id', as: 'orders' });
Order.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

// User 与 Favorite 一对多
User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Hotel 与 Favorite 一对多
Hotel.hasMany(Favorite, { foreignKey: 'hotel_id', as: 'favoritedBy' });
Favorite.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

// User 与 BrowseHistory 一对多
User.hasMany(BrowseHistory, { foreignKey: 'user_id', as: 'browseHistories' });
BrowseHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Hotel 与 BrowseHistory 一对多
Hotel.hasMany(BrowseHistory, { foreignKey: 'hotel_id', as: 'browseRecords' });
BrowseHistory.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

// User 与 SearchHistory 一对多
User.hasMany(SearchHistory, { foreignKey: 'user_id', as: 'searchHistories' });
SearchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User 与 UserAddress 一对多
User.hasMany(UserAddress, { foreignKey: 'user_id', as: 'addresses' });
UserAddress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  MobileUser,
  Order,
  Favorite,
  BrowseHistory,
  Banner,
  SearchHistory,
  UserAddress
};