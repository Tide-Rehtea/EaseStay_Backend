const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { MobileUser } = require('../../models/mobile');
const ResponseUtil = require('../../utils/response');
const Validator = require('../../utils/validator');

/**
 * 移动端认证控制器
 * 处理用户注册、登录、个人信息管理
 */
class MobileAuthController {
  /**
   * 移动端用户注册
   * POST /api/mobile/auth/register
   * 需求：注册界面，可选择角色（但移动端固定为普通用户）
   */
  static async register(req, res) {
    try {
      const { email, password, nickname, phone } = req.body;

      // 验证必填字段
      const required = Validator.validateRequired(req.body, ['email', 'password']);
      if (!required.valid) {
        return ResponseUtil.error(res, required.message, 400);
      }

      // 验证邮箱格式
      if (!Validator.isValidEmail(email)) {
        return ResponseUtil.error(res, '邮箱格式不正确', 400);
      }

      // 验证手机号（如果提供）
      if (phone && !Validator.isValidPhone(phone)) {
        return ResponseUtil.error(res, '手机号格式不正确', 400);
      }

      // 检查邮箱是否已存在
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return ResponseUtil.error(res, '邮箱已被注册', 400);
      }

      // 创建基础用户（移动端用户角色设为merchant，但通过MobileUser区分）
      const user = await User.create({
        email,
        password,
        role: 'merchant' // 复用merchant角色，但通过MobileUser标识移动端用户
      });

      // 创建移动端扩展信息
      const mobileUser = await MobileUser.create({
        user_id: user.id,
        nickname: nickname || `用户${user.id}`,
        phone,
        avatar: '/uploads/default-avatar.png',
        member_level: '普通会员',
        points: 100 // 新用户赠送100积分
      });

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return ResponseUtil.created(res, {
        user: {
          id: user.id,
          email: user.email,
          nickname: mobileUser.nickname,
          avatar: mobileUser.avatar,
          member_level: mobileUser.member_level,
          points: mobileUser.points,
          phone: mobileUser.phone
        },
        token
      }, '注册成功');

    } catch (error) {
      console.error('注册错误:', error);
      return ResponseUtil.error(res, '注册失败', 500);
    }
  }

  /**
   * 移动端用户登录
   * POST /api/mobile/auth/login
   * 需求：登录界面，自动根据账号判断角色
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // 验证必填字段
      if (!email || !password) {
        return ResponseUtil.error(res, '邮箱和密码不能为空', 400);
      }

      // 查找用户
      const user = await User.findOne({ 
        where: { email },
        include: [{
          model: MobileUser,
          as: 'mobileProfile'
        }]
      });

      if (!user) {
        return ResponseUtil.error(res, '邮箱或密码错误', 401);
      }

      // 验证密码
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return ResponseUtil.error(res, '邮箱或密码错误', 401);
      }

      // 检查是否为移动端用户（如果没有mobileProfile，自动创建）
      let mobileUser = user.mobileProfile;
      if (!mobileUser) {
        mobileUser = await MobileUser.create({
          user_id: user.id,
          nickname: `用户${user.id}`,
          avatar: '/uploads/default-avatar.png'
        });
      } else {
        // 更新登录信息
        await mobileUser.update({
          last_login_at: new Date(),
          login_count: mobileUser.login_count + 1
        });
      }

      // 生成token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return ResponseUtil.success(res, {
        user: {
          id: user.id,
          email: user.email,
          nickname: mobileUser.nickname,
          avatar: mobileUser.avatar,
          member_level: mobileUser.member_level,
          points: mobileUser.points,
          phone: mobileUser.phone,
          gender: mobileUser.gender,
          birthday: mobileUser.birthday
        },
        token
      }, '登录成功');

    } catch (error) {
      console.error('登录错误:', error);
      return ResponseUtil.error(res, '登录失败', 500);
    }
  }

  /**
   * 获取用户个人信息
   * GET /api/mobile/user/profile
   * 需求：显示用户头像、昵称、会员等级
   */
  static async getProfile(req, res) {
    try {
      const { user, mobileUser } = req;

      return ResponseUtil.success(res, {
        id: user.id,
        email: user.email,
        nickname: mobileUser.nickname,
        avatar: mobileUser.avatar,
        member_level: mobileUser.member_level,
        points: mobileUser.points,
        phone: mobileUser.phone,
        gender: mobileUser.gender,
        birthday: mobileUser.birthday,
        created_at: user.created_at,
        login_count: mobileUser.login_count,
        last_login_at: mobileUser.last_login_at
      });

    } catch (error) {
      console.error('获取个人信息错误:', error);
      return ResponseUtil.error(res, '获取个人信息失败', 500);
    }
  }

  /**
   * 更新个人信息
   * PUT /api/mobile/user/profile
   * 需求：修改头像、昵称等
   */
  static async updateProfile(req, res) {
    try {
      const { mobileUser } = req;
      const { nickname, avatar, gender, birthday, phone } = req.body;

      // 验证手机号
      if (phone && !Validator.isValidPhone(phone)) {
        return ResponseUtil.error(res, '手机号格式不正确', 400);
      }

      // 更新信息
      const updateData = {};
      if (nickname !== undefined) updateData.nickname = nickname;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (gender !== undefined) updateData.gender = gender;
      if (birthday !== undefined) updateData.birthday = birthday;
      if (phone !== undefined) updateData.phone = phone;

      await mobileUser.update(updateData);

      return ResponseUtil.success(res, {
        nickname: mobileUser.nickname,
        avatar: mobileUser.avatar,
        gender: mobileUser.gender,
        birthday: mobileUser.birthday,
        phone: mobileUser.phone
      }, '个人信息更新成功');

    } catch (error) {
      console.error('更新个人信息错误:', error);
      return ResponseUtil.error(res, '更新个人信息失败', 500);
    }
  }

  /**
   * 修改密码
   * PUT /api/mobile/user/password
   * 需求：密码修改
   */
  static async changePassword(req, res) {
    try {
      const { user } = req;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return ResponseUtil.error(res, '原密码和新密码不能为空', 400);
      }

      // 验证原密码
      const isValid = await user.verifyPassword(oldPassword);
      if (!isValid) {
        return ResponseUtil.error(res, '原密码错误', 400);
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      return ResponseUtil.success(res, null, '密码修改成功');

    } catch (error) {
      console.error('修改密码错误:', error);
      return ResponseUtil.error(res, '修改密码失败', 500);
    }
  }

  /**
   * 退出登录
   * POST /api/mobile/auth/logout
   * 需求：退出当前账号
   */
  static async logout(req, res) {
    // JWT是无状态的，客户端删除token即可
    return ResponseUtil.success(res, null, '退出成功');
  }

  /**
   * 获取会员等级信息
   * GET /api/mobile/user/member-level
   * 需求：显示会员等级及权益
   */
  static async getMemberLevelInfo(req, res) {
    try {
      const { mobileUser } = req;

      // 会员等级权益说明
      const memberBenefits = {
        '普通会员': {
          discount: '无折扣',
          pointsRate: 1, // 消费1元积1分
          benefits: ['积分累积', '生日礼遇']
        },
        '白银会员': {
          discount: '98折',
          pointsRate: 1.2,
          benefits: ['延迟退房', '积分加速', '生日礼遇']
        },
        '黄金会员': {
          discount: '95折',
          pointsRate: 1.5,
          benefits: ['房型升级', '延迟退房', '积分加速', '生日礼遇']
        },
        '铂金会员': {
          discount: '92折',
          pointsRate: 1.8,
          benefits: ['房型升级', '延迟退房', '早餐优惠', '积分加速', '生日礼遇']
        },
        '钻石会员': {
          discount: '88折',
          pointsRate: 2,
          benefits: ['房型升级', '延迟退房', '免费早餐', '积分加速', '专属客服', '生日礼遇']
        }
      };

      // 下一等级所需积分
      const nextLevelPoints = {
        '普通会员': 1000,
        '白银会员': 3000,
        '黄金会员': 8000,
        '铂金会员': 20000,
        '钻石会员': null
      };

      return ResponseUtil.success(res, {
        current_level: mobileUser.member_level,
        current_points: mobileUser.points,
        benefits: memberBenefits[mobileUser.member_level],
        next_level: mobileUser.member_level === '钻石会员' ? null : this.getNextLevel(mobileUser.member_level),
        points_to_next: nextLevelPoints[mobileUser.member_level] ? 
          Math.max(0, nextLevelPoints[mobileUser.member_level] - mobileUser.points) : null,
        all_levels: Object.keys(memberBenefits).map(level => ({
          level,
          discount: memberBenefits[level].discount,
          benefits: memberBenefits[level].benefits
        }))
      });

    } catch (error) {
      console.error('获取会员信息错误:', error);
      return ResponseUtil.error(res, '获取会员信息失败', 500);
    }
  }

  static getNextLevel(currentLevel) {
    const levels = ['普通会员', '白银会员', '黄金会员', '铂金会员', '钻石会员'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }
}

module.exports = MobileAuthController;