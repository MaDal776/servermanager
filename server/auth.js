// 认证相关功能
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// 确保从项目根目录加载.env文件
const envPath = path.resolve(process.cwd(), '.env');
const rootEnvPath = path.resolve(process.cwd(), '../.env');

// 尝试加载.env文件，优先使用当前目录，如果不存在则尝试上级目录
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('从当前目录加载环境变量:', envPath);
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
  console.log('从上级目录加载环境变量:', rootEnvPath);
} else {
  console.warn('未找到.env文件，将使用默认配置');
  require('dotenv').config();
}

// 从环境变量中获取配置
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const jwtSecret = process.env.JWT_SECRET || 'server-manager-secret-key';
const tokenExpiresIn = parseInt(process.env.TOKEN_EXPIRES_IN || '86400', 10);

console.log("adminUsername", adminUsername);

/**
 * 验证用户凭证
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {boolean} 是否验证通过
 */
function validateCredentials(username, password) {
  return username === adminUsername && password === adminPassword;
}

/**
 * 生成JWT令牌
 * @param {string} username 用户名
 * @returns {string} JWT令牌
 */
function generateToken(username) {
  return jwt.sign({ username }, jwtSecret, {
    expiresIn: tokenExpiresIn // 默认24小时
  });
}

/**
 * 验证JWT令牌
 * @param {string} token JWT令牌
 * @returns {object|null} 解码后的令牌数据，验证失败则返回null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

/**
 * 认证中间件
 * @param {object} req 请求对象
 * @param {object} res 响应对象
 * @param {function} next 下一个中间件
 */
function authMiddleware(req, res, next) {
  // 登录和健康检查接口不需要认证
  if (req.path === '/api/auth/login' || req.path === '/api/health') {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }

  // 将用户信息添加到请求对象中
  req.user = decoded;
  next();
}

module.exports = {
  validateCredentials,
  generateToken,
  verifyToken,
  authMiddleware
};

