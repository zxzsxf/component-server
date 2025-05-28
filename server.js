const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000;

// 启用CORS
app.use(cors());

// 组件信息文件路径
const componentsInfoPath = path.join(__dirname, 'components', 'components-info.json');

// 确保组件信息文件存在
if (!fs.existsSync(componentsInfoPath)) {
  fs.writeFileSync(componentsInfoPath, JSON.stringify({}), 'utf-8');
}

// 读取组件信息
function readComponentsInfo() {
  try {
    return JSON.parse(fs.readFileSync(componentsInfoPath, 'utf-8'));
  } catch (error) {
    return {};
  }
}

// 保存组件信息
function saveComponentsInfo(info) {
  fs.writeFileSync(componentsInfoPath, JSON.stringify(info, null, 2), 'utf-8');
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const componentName = req.body.componentName;
    const componentDir = path.join(__dirname, 'components', componentName);
    
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
    
    cb(null, componentDir);
  },
  filename: function (req, file, cb) {
    const componentName = req.body.componentName;
    const timestamp = req.body.timestamp || Date.now();
    cb(null, `${componentName}-${timestamp}.js`);
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

  const componentName = req.body.componentName;
  const version = req.body.version || 'unknown';
  const timestamp = req.body.timestamp || Date.now();
  
  // 更新组件信息
  const componentsInfo = readComponentsInfo();
  if (!componentsInfo[componentName]) {
    componentsInfo[componentName] = [];
  }

  const componentInfo = {
    path: `/components/${componentName}/${req.file.filename}`,
    time: timestamp,
    version: version
  };

  // 将新信息添加到数组开头
  componentsInfo[componentName].unshift(componentInfo);
  saveComponentsInfo(componentsInfo);
  
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    path: componentInfo.path,
    info: componentInfo
  });
});

// 获取组件列表
app.get('/components', (req, res) => {
  try {
    const componentsInfo = readComponentsInfo();
    res.json(componentsInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取特定组件的所有版本信息
app.get('/components/:componentName/info', (req, res) => {
  try {
    const componentsInfo = readComponentsInfo();
    const componentInfo = componentsInfo[req.params.componentName] || [];
    res.json(componentInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 访问组件文件
app.get('/components/:componentName/:filename', (req, res) => {
  const filePath = path.join(componentsDir, req.params.componentName, req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  res.sendFile(filePath);
});

// 获取组件信息文件
app.get('/components-info', (req, res) => {
  try {
    const componentsInfo = readComponentsInfo();
    // 获取服务器的域名和端口
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // 为每个组件的 path 添加完整的 URL
    const fullPathComponentsInfo = Object.entries(componentsInfo).reduce((acc, [componentName, versions]) => {
      acc[componentName] = versions.map(version => ({
        ...version,
        path: `${baseUrl}${version.path}`
      }));
      return acc;
    }, {});

    res.json(fullPathComponentsInfo);
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