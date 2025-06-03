# 组件服务器 API 文档

这是一个用于管理和提供组件资源的服务器，支持组件的上传、查询和访问。node版本 v18.17.0

## 基本信息

- 默认端口：4000
- 基础URL：`http://localhost:4000`（实际部署时根据服务器地址调整）

## API 接口

### 1. 上传组件

上传组件文件及其相关信息。

- **接口**：`POST /upload`
- **Content-Type**：`multipart/form-data`
- **请求参数**：

  - `componentName`：组件名称（必需）
  - `version`：组件版本（可选，默认为 "unknown"）
  - `timestamp`：时间戳（可选，默认为当前时间）
  - `file`：组件文件（必需，.js 文件）
- **响应示例**：

```json
{
  "message": "File uploaded successfully",
  "filename": "组件名-时间戳.js",
  "path": "/components/组件名/组件名-时间戳.js",
  "info": {
    "path": "/components/组件名/组件名-时间戳.js",
    "time": 1234567890,
    "version": "1.0.0"
  }
}
```

### 2. 获取组件信息列表

获取所有已上传组件的完整信息。

- **接口**：`GET /components-info`
- **响应示例**：

```json
{
  "组件名": [
    {
      "path": "http://服务器地址:端口/components/组件名/组件名-时间戳.js",
      "time": 1234567890,
      "version": "1.0.0"
    }
  ]
}
```

注意：返回的 path 是完整的访问 URL，包含当前服务器的域名和端口。

### 3. 获取组件列表

获取所有已上传的组件列表。

- **接口**：`GET /components`
- **响应示例**：

```json
{
  "组件名": [
    {
      "path": "/components/组件名/组件名-时间戳.js",
      "time": 1234567890,
      "version": "1.0.0"
    }
  ]
}
```

### 4. 获取特定组件信息

获取指定组件的所有版本信息。

- **接口**：`GET /components/:componentName/info`
- **参数**：
  - `componentName`：组件名称（路径参数）
- **响应示例**：

```json
[
  {
    "path": "/components/组件名/组件名-时间戳.js",
    "time": 1234567890,
    "version": "1.0.0"
  }
]
```

### 5. 访问组件文件

获取组件的 JS 文件。

- **接口**：`GET /components/:componentName/:filename`
- **参数**：
  - `componentName`：组件名称（路径参数）
  - `filename`：文件名（路径参数）
- **响应**：组件的 JS 文件内容

### 6. 根据组件名称和版本查找组件

根据组件名称和版本号查找特定组件。

- **接口**：`POST /components/find`
- **Content-Type**：`application/json`
- **请求参数**：
  ```json
  {
    "componentName": "组件名称",
    "version": "版本号"
  }
  ```
- **响应示例**：
  ```json
  {
    "path": "http://服务器地址:端口/components/组件名/组件名-时间戳.js",
    "time": 1234567890,
    "version": "1.0.0",
    "publishInfo": {
      "publisher": "system",
      "publishTime": 1234567890,
      "description": "Version 1.0.0",
      "buildInfo": "",
      "status": "published"
    }
  }
  ```
- **错误响应**：
  - 400：组件名称或版本号缺失
  - 404：组件或版本不存在
  - 500：服务器内部错误

## 数据存储

组件信息存储在 `components/components-info.json` 文件中，格式如下：

```json
{
  "组件名": [
    {
      "path": "/components/组件名/组件名-时间戳.js",
      "time": 1234567890,
      "version": "1.0.0"
    }
  ]
}
```

## 注意事项

1. 组件文件按照 `组件名-时间戳.js` 的格式存储
2. 最新上传的组件版本信息会被放在数组的最前面
3. 所有接口都支持 CORS，可以从其他域名访问
4. 组件文件实际存储在 `components/组件名/` 目录下
