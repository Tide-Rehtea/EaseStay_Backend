const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
const imagesDir = path.join(uploadDir, 'images');
fs.ensureDirSync(imagesDir);

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `hotel-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只接受图片文件
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、WEBP 格式的图片'), false);
  }
};

// 创建 multer 实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter
});

// 图片处理中间件
const processImage = async (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files || [req.file];
  
  try {
    for (const file of files.filter(Boolean)) {
      const filePath = file.path;
      const parsedPath = path.parse(filePath);
      const optimizedPath = path.join(parsedPath.dir, `optimized-${parsedPath.name}.jpg`);
      
      // 使用 sharp 优化图片
      await sharp(filePath)
        .resize(1200, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(optimizedPath);
      
      // 替换原文件
      await fs.remove(filePath);
      await fs.rename(optimizedPath, filePath);
      
      // 生成缩略图
      const thumbPath = path.join(parsedPath.dir, `thumb-${parsedPath.name}.jpg`);
      await sharp(filePath)
        .resize(300, 200, { fit: 'cover' })
        .jpeg({ quality: 60 })
        .toFile(thumbPath);
      
      // 保存缩略图路径
      file.thumbnail = `/uploads/images/thumb-${parsedPath.name}.jpg`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  processImage,
  uploadDir,
  imagesDir
};