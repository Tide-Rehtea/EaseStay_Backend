const express = require('express');
const router = express.Router();
const { upload, processImage } = require('../config/upload');
const UploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');

// 所有上传路由都需要认证
router.use(authenticate);

// 单张图片上传
router.post(
  '/image',
  upload.single('image'),
  processImage,
  UploadController.uploadSingle
);

// 多张图片上传
router.post(
  '/images',
  upload.array('images', 10), // 最多10张
  processImage,
  UploadController.uploadMultiple
);

// 删除图片
router.delete('/image/:filename', UploadController.deleteImage);

// 获取酒店图片列表
router.get('/hotel/:hotelId/images', UploadController.getHotelImages);

module.exports = router;