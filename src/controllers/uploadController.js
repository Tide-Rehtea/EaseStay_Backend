const path = require('path');
const fs = require('fs-extra');
const { imagesDir } = require('../config/upload');

class UploadController {
  // 单张图片上传
  static async uploadSingle(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '没有上传文件'
        });
      }

      // 构建图片URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/images/${path.basename(req.file.path)}`;
      
      res.json({
        success: true,
        message: '图片上传成功',
        data: {
          url: fileUrl,
          thumbnail: req.file.thumbnail ? `${baseUrl}${req.file.thumbnail}` : null,
          filename: req.file.filename,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('图片上传失败:', error);
      res.status(500).json({
        success: false,
        message: '图片上传失败',
        error: error.message
      });
    }
  }

  // 多张图片上传
  static async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有上传文件'
        });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const files = req.files.map(file => ({
        url: `${baseUrl}/uploads/images/${path.basename(file.path)}`,
        thumbnail: file.thumbnail ? `${baseUrl}${file.thumbnail}` : null,
        filename: file.filename,
        size: file.size
      }));

      res.json({
        success: true,
        message: '图片上传成功',
        data: {
          files
        }
      });
    } catch (error) {
      console.error('批量图片上传失败:', error);
      res.status(500).json({
        success: false,
        message: '批量图片上传失败',
        error: error.message
      });
    }
  }

  // 删除图片
  static async deleteImage(req, res) {
    try {
      const { filename } = req.params;
      
      // 防止路径遍历攻击
      const safeFilename = path.basename(filename);
      
      // 删除原图
      const imagePath = path.join(imagesDir, safeFilename);
      const thumbPath = path.join(imagesDir, `thumb-${safeFilename}`);
      const originalPath = path.join(imagesDir, safeFilename.replace(/^thumb-/, ''));
      
      const deletePromises = [];
      
      if (await fs.pathExists(imagePath)) {
        deletePromises.push(fs.remove(imagePath));
      }
      
      if (await fs.pathExists(thumbPath)) {
        deletePromises.push(fs.remove(thumbPath));
      }
      
      if (await fs.pathExists(originalPath)) {
        deletePromises.push(fs.remove(originalPath));
      }
      
      await Promise.all(deletePromises);

      res.json({
        success: true,
        message: '图片删除成功'
      });
    } catch (error) {
      console.error('图片删除失败:', error);
      res.status(500).json({
        success: false,
        message: '图片删除失败',
        error: error.message
      });
    }
  }

  // 获取图片列表（某个酒店的所有图片）
  static async getHotelImages(req, res) {
    try {
      const { hotelId } = req.params;
      
      // 读取酒店图片目录
      const files = await fs.readdir(imagesDir);
      
      // 筛选该酒店的图片（根据命名规则）
      const hotelImages = files
        .filter(file => file.startsWith(`hotel-${hotelId}-`))
        .map(file => ({
          filename: file,
          url: `/uploads/images/${file}`,
          thumbnail: `/uploads/images/thumb-${file}`,
          size: fs.statSync(path.join(imagesDir, file)).size
        }));

      res.json({
        success: true,
        data: {
          images: hotelImages
        }
      });
    } catch (error) {
      console.error('获取图片列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取图片列表失败',
        error: error.message
      });
    }
  }
}

module.exports = UploadController;