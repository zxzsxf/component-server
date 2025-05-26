const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000;

// 启用CORS
app.use(cors());

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 获取组件名
    const componentName = req.body.componentName;
    const componentDir = path.join(__dirname, 'components', componentName);
    
    // 如果组件目录不存在，创建它
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
    
    cb(null, componentDir);
  },
  filename: function (req, file, cb) {
    // 使用组件名和时间戳命名文件
    const componentName = req.body.componentName;
    const timestamp = Date.now();
    cb(null, `${componentName}.${timestamp}.js`);
  }
});

const upload = multer({ storage: storage });

// 创建components目录（如果不存在）
const componentsDir = path.join(__dirname, 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

// 文件上传路由
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    path: req.file.path
  });
});

// 获取组件列表
app.get('/components', (req, res) => {
  try {
    const components = fs.readdirSync(componentsDir);
    res.json(components);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取特定组件的所有版本
app.get('/components/:componentName', (req, res) => {
  const componentDir = path.join(componentsDir, req.params.componentName);
  
  if (!fs.existsSync(componentDir)) {
    return res.status(404).send('Component not found');
  }
  
  try {
    const files = fs.readdirSync(componentDir);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 