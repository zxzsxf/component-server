const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 4000;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

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

// 活跃组件配置文件路径
const activeComponentsPath = path.join(__dirname, 'components', 'active-components.json');

// 确保活跃组件配置文件存在
if (!fs.existsSync(activeComponentsPath)) {
  fs.writeFileSync(activeComponentsPath, JSON.stringify({}), 'utf-8');
}

// 读取活跃组件配置
function readActiveComponents() {
  try {
    return JSON.parse(fs.readFileSync(activeComponentsPath, 'utf-8'));
  } catch (error) {
    return {};
  }
}

// 保存活跃组件配置
function saveActiveComponents(info) {
  fs.writeFileSync(activeComponentsPath, JSON.stringify(info, null, 2), 'utf-8');
}

// 更新活跃组件配置
function updateActiveComponents() {
  const componentsInfo = readComponentsInfo();
  const activeComponents = {};

  // 获取每个组件的最新版本
  for (const [componentName, versions] of Object.entries(componentsInfo)) {
    if (versions.length > 0) {
      activeComponents[componentName] = versions[0];  // 取最新版本
    }
  }

  saveActiveComponents(activeComponents);
  return activeComponents;
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

// 根据组件名称和版本查找组件文件
app.post('/components/find', (req, res) => {
  try {
    const { componentName, version } = req.body;
    
    if (!componentName || !version) {
      return res.status(400).json({ error: '组件名称和版本都是必需的' });
    }

    const componentsInfo = readComponentsInfo();
    
    if (!componentsInfo[componentName]) {
      return res.status(404).json({ error: '未找到该组件' });
    }

    const componentVersion = componentsInfo[componentName].find(v => v.version === version);
    
    if (!componentVersion) {
      return res.status(404).json({ error: '未找到该版本的组件' });
    }

    // 获取服务器的域名和端口
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    // 返回完整的组件信息，包括完整的URL
    const result = {
      ...componentVersion,
      path: `${baseUrl}${componentVersion.path}`
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 新增组件信息
app.post('/components/:componentName', (req, res) => {
  try {
    const { componentName } = req.params;
    const componentData = req.body;
    const componentsInfo = readComponentsInfo();

    if (!componentsInfo[componentName]) {
      componentsInfo[componentName] = [];
    }

    componentsInfo[componentName].unshift(componentData);
    saveComponentsInfo(componentsInfo);

    res.json({ message: 'Component info added successfully', data: componentData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 文件上传路由
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const componentName = req.body.componentName;
  const version = req.body.version || 'unknown';
  const timestamp = req.body.timestamp || Date.now();
  const buildInfo = req.body.buildInfo || '';
  const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
  
  // 更新组件信息
  const componentsInfo = readComponentsInfo();
  if (!componentsInfo[componentName]) {
    componentsInfo[componentName] = [];
  }

  const componentInfo = {
    path: `/components/${componentName}/${req.file.filename}`,
    time: timestamp,
    version: version,
    publishInfo: {
      publisher: req.body.publisher || 'system',
      publishTime: timestamp,
      description: req.body.description || `Version ${version}`,
      buildInfo: buildInfo,
      status: 'published'
    },
    buildDetails: metadata.buildDetails || {},
    metadata: {
      name: metadata.name,
      dependencies: metadata.dependencies,
      peerDependencies: metadata.peerDependencies,
      author: metadata.author,
      license: metadata.license,
      repository: metadata.repository
    }
  };

  // 将新信息添加到数组开头
  componentsInfo[componentName].unshift(componentInfo);
  saveComponentsInfo(componentsInfo);
  
  // 更新活跃组件配置
  updateActiveComponents();
  
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

// 更新组件信息
app.put('/components/:componentName/:timestamp', (req, res) => {
  try {
    const { componentName, timestamp } = req.params;
    const updateData = req.body;
    const componentsInfo = readComponentsInfo();

    if (!componentsInfo[componentName]) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const componentIndex = componentsInfo[componentName].findIndex(c => c.time === timestamp);
    if (componentIndex === -1) {
      return res.status(404).json({ error: 'Component version not found' });
    }

    componentsInfo[componentName][componentIndex] = {
      ...componentsInfo[componentName][componentIndex],
      ...updateData
    };

    saveComponentsInfo(componentsInfo);
    res.json({ message: 'Component info updated successfully', data: componentsInfo[componentName][componentIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除组件信息
app.delete('/components/:componentName/:timestamp', (req, res) => {
  try {
    const { componentName, timestamp } = req.params;
    const componentsInfo = readComponentsInfo();

    if (!componentsInfo[componentName]) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const initialLength = componentsInfo[componentName].length;
    componentsInfo[componentName] = componentsInfo[componentName].filter(c => c.time !== timestamp);

    if (initialLength === componentsInfo[componentName].length) {
      return res.status(404).json({ error: 'Component version not found' });
    }

    if (componentsInfo[componentName].length === 0) {
      delete componentsInfo[componentName];
    }

    saveComponentsInfo(componentsInfo);
    res.json({ message: 'Component info deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取活跃组件配置
app.get('/active-components', (req, res) => {
  try {
    const activeComponents = readActiveComponents();
    res.json(activeComponents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 手动更新活跃组件配置
app.post('/active-components/update', (req, res) => {
  try {
    const activeComponents = updateActiveComponents();
    res.json({ message: 'Active components updated successfully', data: activeComponents });
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