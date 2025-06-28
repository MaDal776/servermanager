// 导入dotenv以加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const { NodeSSH } = require('node-ssh');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { serverStore, commandStore, commandHistoryStore, fileOperationsStore, decrypt } = require('./data-store');
const { validateCredentials, generateToken, authMiddleware } = require('./auth');

// 创建Express应用
const app = express();
const port = process.env.API_PORT || 3003; // 使用环境变量或默认端口

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 添加健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 登录API端点
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  if (validateCredentials(username, password)) {
    const token = generateToken(username);
    return res.json({ token, username });
  } else {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 在所有其他API路由前添加认证中间件
app.use(authMiddleware);

// 配置multer临时文件存储
const upload = multer({ 
  dest: path.join(os.tmpdir(), 'server-manager-uploads'),
  limits: { fileSize: 50 * 1024 * 1024 } // 限刵50MB
});

// 存储SSH连接
const sshConnections = {};

// 连接到SSH服务器
app.post('/api/connect', async (req, res) => {
  try {
    const { id, ip, user, authType, password, keyPath } = req.body;
    
    if (!id || !ip || !user) {
      return res.status(400).json({ success: false, message: '缺少必要的连接信息' });
    }

    // 检查是否已经存在连接
    if (sshConnections[id]) {
      return res.json({ success: true, message: '已连接到服务器' });
    }

    const ssh = new NodeSSH();
    
    // 根据认证类型选择连接方式
    let connectConfig = {
      host: ip,
      username: user,
      port: 22
    };

    if (authType === 'password') {
      // 如果密码是加密的，尝试解密
      let decryptedPassword = password;
      if (password) {
        try {
          // 尝试解密密码
          decryptedPassword = decrypt(password);
        } catch (e) {
          // 如果解密失败，可能是因为密码已经是明文，保持原样
          console.log('密码解密失败，将使用原始密码值');
        }
      }
      connectConfig.password = decryptedPassword;
    } else if (authType === 'key') {
      try {
        connectConfig.privateKey = fs.readFileSync(keyPath, 'utf8');
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: `无法读取SSH密钥: ${error.message}` 
        });
      }
    }

    await ssh.connect(connectConfig);
    sshConnections[id] = ssh;

    res.json({ success: true, message: '成功连接到服务器' });
  } catch (error) {
    console.error('SSH连接错误:', error);
    res.status(500).json({ success: false, message: `连接失败: ${error.message}` });
  }
});

// 获取服务器状态
app.get('/api/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ssh = sshConnections[id];
    
    if (!ssh) {
      return res.status(404).json({ success: false, message: '未找到服务器连接' });
    }

    // 获取系统信息
    const uptimeResult = await ssh.execCommand('uptime');
    const dfResult = await ssh.execCommand('df -h | grep "/$"');
    const freeResult = await ssh.execCommand('free -m');
    const loadAvgResult = await ssh.execCommand('cat /proc/loadavg');
    const cpuInfoResult = await ssh.execCommand('cat /proc/stat | grep "^cpu "');
    const netStatResult = await ssh.execCommand('cat /proc/net/dev | grep -E "eth0|ens|enp"');

    // 解析结果
    const status = {
      id,
      online: true,
      uptime: parseUptime(uptimeResult.stdout),
      cpu: parseCpuUsage(cpuInfoResult.stdout),
      memory: parseMemoryUsage(freeResult.stdout),
      disk: parseDiskUsage(dfResult.stdout),
      load: parseLoadAverage(loadAvgResult.stdout),
      network: parseNetworkUsage(netStatResult.stdout),
      lastCheck: new Date()
    };

    res.json({ success: true, data: status });
  } catch (error) {
    console.error('获取服务器状态错误:', error);
    res.status(500).json({ 
      success: false, 
      message: `获取状态失败: ${error.message}`,
      online: false,
      lastCheck: new Date()
    });
  }
});

// 执行命令
app.post('/api/execute', async (req, res) => {
  try {
    const { serverId, command } = req.body;
    
    if (!serverId || !command) {
      return res.status(400).json({ success: false, message: '缺少服务器ID或命令' });
    }

    const ssh = sshConnections[serverId];
    
    if (!ssh) {
      return res.status(404).json({ success: false, message: '未找到服务器连接' });
    }

    const result = await ssh.execCommand(command);
    
    res.json({
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      }
    });
  } catch (error) {
    console.error('执行命令错误:', error);
    res.status(500).json({ success: false, message: `执行命令失败: ${error.message}` });
  }
});

// 批量执行命令
app.post('/api/batch-execute', async (req, res) => {
  try {
    const { serverIds, command } = req.body;
    
    if (!serverIds || !Array.isArray(serverIds) || !command) {
      return res.status(400).json({ success: false, message: '缺少服务器ID列表或命令' });
    }

    const results = {};
    const promises = serverIds.map(async (serverId) => {
      try {
        const ssh = sshConnections[serverId];
        
        if (!ssh) {
          results[serverId] = { success: false, message: '未找到服务器连接' };
          return;
        }

        const result = await ssh.execCommand(command);
        results[serverId] = {
          success: true,
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        };
      } catch (error) {
        results[serverId] = { success: false, message: `执行命令失败: ${error.message}` };
      }
    });

    await Promise.all(promises);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('批量执行命令错误:', error);
    res.status(500).json({ success: false, message: `批量执行命令失败: ${error.message}` });
  }
});

// 文件上传 - 使用multer处理multipart/form-data
// 使用标准认证中间件保护文件上传端点
app.post('/api/upload', authMiddleware, async (req, res) => {
  // 处理文件上传
  upload.single('file')(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ success: false, message: `文件上传错误: ${err.message}` });
    }
    
    // 认证已由 authMiddleware 处理，无需再次验证令牌
    let localPath = null;
    try {
    // 从表单字段获取参数
    const serverId = req.body.serverId;
    const remotePath = req.body.remotePath;
    
    if (!serverId || !remotePath || !req.file) {
      return res.status(400).json({ success: false, message: '缺少必要的参数或文件' });
    }

    const ssh = sshConnections[serverId];
    
    if (!ssh) {
      return res.status(404).json({ success: false, message: '未找到服务器连接' });
    }

    // 上传由multer处理的临时文件
    localPath = req.file.path;
    
    // 检查临时文件是否存在
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, message: '上传的文件处理失败' });
    }

    // 处理远程路径，如果只指定了目录，则自动添加原始文件名
    let finalRemotePath = remotePath;
    const originalFileName = req.file.originalname;
    
    // 检查远程路径是否以斜杠结尾或没有指定文件名
    if (remotePath.endsWith('/') || remotePath.endsWith('\\')) {
      // 路径以斜杠结尾，说明是目录，附加原始文件名
      finalRemotePath = remotePath + originalFileName;
      console.log(`远程路径是目录，附加文件名: ${finalRemotePath}`);
    } else {
      // 检查是否是目录
      const checkDirCmd = `test -d "${remotePath}" && echo "isdir" || echo "notdir"`;
      const checkResult = await ssh.execCommand(checkDirCmd);
      
      if (checkResult.stdout.trim() === 'isdir') {
        // 是目录，附加原始文件名
        finalRemotePath = remotePath.endsWith('/') ? remotePath + originalFileName : remotePath + '/' + originalFileName;
        console.log(`远程路径是存在的目录，附加文件名: ${finalRemotePath}`);
      }
    }
    
    // 获取远程目录
    const remoteDir = path.dirname(finalRemotePath);
    console.log(`远程目录: ${remoteDir}`);
    
    // 创建远程目录
    const mkdirCmd = `mkdir -p "${remoteDir}"`;
    console.log(`创建远程目录: ${mkdirCmd}`);
    await ssh.execCommand(mkdirCmd);
    
    // 使用直接的文件流上传方式
    console.log(`上传文件从 ${localPath} 到 ${finalRemotePath}`);
    
    // 创建读取流
    const fileStream = fs.createReadStream(localPath);
    
    // 使用SSH执行命令将文件流写入远程文件
    const uploadCmd = `cat > "${finalRemotePath}"`;
    const uploadResult = await ssh.execCommand(uploadCmd, {
      stdin: fileStream
    });
    
    console.log('上传结果:', uploadResult);
    
    // 验证文件是否上传成功
    const checkCmd = `ls -la "${finalRemotePath}"`;
    const checkResult = await ssh.execCommand(checkCmd);
    console.log(`文件验证: ${checkResult.stdout || checkResult.stderr}`);
    
    // 上传完成后删除临时文件
    fs.unlink(localPath, (err) => {
      if (err) console.error('删除临时文件错误:', err);
    });
    localPath = null;
    
    res.json({
      success: true,
      message: '文件上传成功'
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    
    // 尝试获取更多错误信息
    try {
      const ssh = sshConnections[req.body.serverId];
      if (ssh) {
        // 检查用户和权限
        const whoamiCmd = `whoami && groups`;
        const whoamiResult = await ssh.execCommand(whoamiCmd);
        console.log(`当前用户和组: ${whoamiResult.stdout || whoamiResult.stderr}`);
        
        // 检查目录权限
        if (req.body.remotePath) {
          const remoteDir = path.dirname(req.body.remotePath);
          const permCmd = `ls -la "${remoteDir}" 2>&1 || echo "目录不存在或无权限访问"`;
          const permResult = await ssh.execCommand(permCmd);
          console.log(`远程目录状态: ${permResult.stdout || permResult.stderr}`);
        }
      }
    } catch (debugError) {
      console.error('获取调试信息失败:', debugError);
    }
    
    // 删除临时文件
    if (localPath) {
      fs.unlink(localPath, (err) => {
        if (err) console.error('删除临时文件错误:', err);
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: `文件上传失败: ${error.message}. 请检查远程路径和权限。` 
    });
  }
  });
});


// 文件下载 - 使用GET请求和查询参数支持浏览器直接下载
app.get('/api/download', async (req, res) => {
  try {
    const { serverId, remotePath, token } = req.query;
    
    if (!serverId || !remotePath) {
      return res.status(400).json({ success: false, message: '缺少必要的参数' });
    }

    // 如果没有通过标准认证中间件，但提供了token参数，则手动验证token
    if (!req.user && token) {
      const { verifyToken } = require('./auth');
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: '无效的认证令牌' });
      }
      // 验证通过，设置用户信息
      req.user = decoded;
    }

    // 如果仍然没有用户信息，则表示未认证
    if (!req.user) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const ssh = sshConnections[serverId];
    
    if (!ssh) {
      return res.status(404).json({ success: false, message: '未找到服务器连接' });
    }

    // 创建临时文件路径
    const fileName = path.basename(remotePath);
    const tempFilePath = path.join(os.tmpdir(), `server-manager-download-${Date.now()}-${fileName}`);

    // 下载文件到临时目录
    await ssh.getFile(tempFilePath, remotePath);
    
    // 设置响应头信息以触发浏览器下载
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 流式发送文件
    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.pipe(res);
    
    // 文件发送完成后删除临时文件
    fileStream.on('end', () => {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error('删除临时文件错误:', err);
      });
    });
  } catch (error) {
    console.error('文件下载错误:', error);
    res.status(500).json({ success: false, message: `文件下载失败: ${error.message}` });
  }
});

// 保留原有的POST端点以保持兼容性
app.post('/api/download', async (req, res) => {
  res.status(400).json({ 
    success: false, 
    message: '请使用GET请求下载文件，该端点已更新' 
  });
});

// 断开连接
app.post('/api/disconnect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ssh = sshConnections[id];
    
    if (!ssh) {
      return res.status(404).json({ success: false, message: '未找到服务器连接' });
    }

    ssh.dispose();
    delete sshConnections[id];
    
    res.json({
      success: true,
      message: '已断开连接'
    });
  } catch (error) {
    console.error('断开连接错误:', error);
    res.status(500).json({ success: false, message: `断开连接失败: ${error.message}` });
  }
});

// 断开所有连接
app.post('/api/disconnect-all', async (req, res) => {
  try {
    const ids = Object.keys(sshConnections);
    
    for (const id of ids) {
      const ssh = sshConnections[id];
      ssh.dispose();
      delete sshConnections[id];
    }
    
    res.json({
      success: true,
      message: '已断开所有连接'
    });
  } catch (error) {
    console.error('断开所有连接错误:', error);
    res.status(500).json({ success: false, message: `断开所有连接失败: ${error.message}` });
  }
});

// 辅助函数：解析uptime输出
function parseUptime(uptimeOutput) {
  try {
    // 示例输出: " 12:34:56 up 3 days, 12:34, 2 users, load average: 0.52, 0.58, 0.59"
    const uptimeMatch = uptimeOutput.match(/up\s+(.*?),/);
    return uptimeMatch ? uptimeMatch[1].trim() : "未知";
  } catch (error) {
    console.error('解析uptime错误:', error);
    return "未知";
  }
}

// 辅助函数：解析CPU使用率
function parseCpuUsage(cpuInfoOutput) {
  try {
    // 这是一个简化的CPU使用率计算，实际上需要两次采样并比较
    const cpuInfo = cpuInfoOutput.split(/\s+/);
    const user = parseInt(cpuInfo[1]);
    const nice = parseInt(cpuInfo[2]);
    const system = parseInt(cpuInfo[3]);
    const idle = parseInt(cpuInfo[4]);
    
    const total = user + nice + system + idle;
    const used = total - idle;
    const usagePercent = Math.round((used / total) * 100);
    
    return usagePercent;
  } catch (error) {
    console.error('解析CPU使用率错误:', error);
    return 0;
  }
}

// 辅助函数：解析内存使用率
function parseMemoryUsage(memoryOutput) {
  try {
    const lines = memoryOutput.split('\n');
    const memInfo = lines[1].split(/\s+/);
    
    const total = parseInt(memInfo[1]);
    const used = parseInt(memInfo[2]);
    
    const usagePercent = Math.round((used / total) * 100);
    
    return usagePercent;
  } catch (error) {
    console.error('解析内存使用率错误:', error);
    return 0;
  }
}

// 辅助函数：解析磁盘使用率
function parseDiskUsage(diskOutput) {
  try {
    const diskInfo = diskOutput.trim().split(/\s+/);
    const usagePercent = parseInt(diskInfo[4].replace('%', ''));
    
    return usagePercent;
  } catch (error) {
    console.error('解析磁盘使用率错误:', error);
    return 0;
  }
}

// 辅助函数：解析负载平均值
function parseLoadAverage(loadOutput) {
  try {
    const loadValues = loadOutput.trim().split(' ');
    return `${loadValues[0]} ${loadValues[1]} ${loadValues[2]}`;
  } catch (error) {
    console.error('解析负载平均值错误:', error);
    return "0.00 0.00 0.00";
  }
}

// 辅助函数：解析网络使用情况
function parseNetworkUsage(netOutput) {
  try {
    const lines = netOutput.trim().split('\n');
    if (lines.length === 0) return { up: 0, down: 0 };
    
    const parts = lines[0].trim().split(/\s+/);
    // 接收字节数和发送字节数
    const received = parseInt(parts[1]);
    const sent = parseInt(parts[9]);
    
    // 转换为KB/s (这里假设是采样间隔为1秒)
    return {
      down: Math.round(received / 1024),
      up: Math.round(sent / 1024)
    };
  } catch (error) {
    console.error('解析网络使用情况错误:', error);
    return { up: 0, down: 0 };
  }
}

// 服务器数据持久化API
// 获取所有服务器信息 - 默认不解密密码
app.get('/api/servers', (req, res) => {
  try {
    // 使用修改后的 getServers 方法，不解密密码
    const servers = serverStore.getServers(false);
    res.json({ success: true, data: servers });
  } catch (error) {
    console.error('获取服务器信息失败:', error);
    res.status(500).json({ success: false, message: '获取服务器信息失败', error: error.message });
  }
});

// 获取所有服务器信息 - 包含解密后的密码（仅在特殊情况下使用）
app.get('/api/servers/with-decrypted-passwords', (req, res) => {
  try {
    // 使用 getServers 方法，并解密密码
    const servers = serverStore.getServers(true);
    res.json({ success: true, data: servers });
  } catch (error) {
    console.error('获取服务器信息(含解密密码)失败:', error);
    res.status(500).json({ success: false, message: '获取服务器信息失败', error: error.message });
  }
});

// 保存所有服务器信息
app.post('/api/servers', (req, res) => {
  try {
    const servers = req.body;
    if (!Array.isArray(servers)) {
      return res.status(400).json({ success: false, message: '无效的服务器数据格式' });
    }
    
    const result = serverStore.saveServers(servers);
    if (result) {
      res.json({ success: true, message: '服务器信息保存成功' });
    } else {
      res.status(500).json({ success: false, message: '服务器信息保存失败' });
    }
  } catch (error) {
    console.error('保存服务器信息失败:', error);
    res.status(500).json({ success: false, message: '保存服务器信息失败', error: error.message });
  }
});

// 添加单个服务器
app.post('/api/servers/add', (req, res) => {
  console.log('收到添加服务器请求:', req.body);
  try {
    const server = req.body;
    if (!server || !server.id || !server.name || !server.ip) {
      return res.status(400).json({ success: false, message: '服务器信息不完整' });
    }
    
    const result = serverStore.addServer(server);
    if (result) {
      res.json({ success: true, message: '服务器添加成功', server });
    } else {
      res.status(500).json({ success: false, message: '服务器添加失败' });
    }
  } catch (error) {
    console.error('添加服务器失败:', error);
    res.status(500).json({ success: false, message: '添加服务器失败', error: error.message });
  }
});

// 更新单个服务器
app.put('/api/servers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const server = req.body;
    
    if (!server || !server.name || !server.ip) {
      return res.status(400).json({ success: false, message: '服务器信息不完整' });
    }
    
    const result = serverStore.updateServer(id, server);
    if (result) {
      res.json({ success: true, message: '服务器更新成功', server });
    } else {
      res.status(404).json({ success: false, message: '服务器不存在或更新失败' });
    }
  } catch (error) {
    console.error('更新服务器失败:', error);
    res.status(500).json({ success: false, message: '更新服务器失败', error: error.message });
  }
});

// 删除单个服务器
app.delete('/api/servers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = serverStore.deleteServer(id);
    
    if (result) {
      res.json({ success: true, message: '服务器删除成功' });
    } else {
      res.status(404).json({ success: false, message: '服务器不存在或删除失败' });
    }
  } catch (error) {
    console.error('删除服务器失败:', error);
    res.status(500).json({ success: false, message: '删除服务器失败', error: error.message });
  }
});

// 命令库数据持久化API
// 获取所有命令
app.get('/api/commands', (req, res) => {
  try {
    const commands = commandStore.getCommands();
    res.json({ success: true, data: commands });
  } catch (error) {
    console.error('获取命令库失败:', error);
    res.status(500).json({ success: false, message: '获取命令库失败', error: error.message });
  }
});

// 保存所有命令
app.post('/api/commands', (req, res) => {
  try {
    const commands = req.body;
    if (!Array.isArray(commands)) {
      return res.status(400).json({ success: false, message: '无效的命令数据格式' });
    }
    
    const result = commandStore.saveCommands(commands);
    if (result) {
      res.json({ success: true, message: '命令库保存成功' });
    } else {
      res.status(500).json({ success: false, message: '命令库保存失败' });
    }
  } catch (error) {
    console.error('保存命令库失败:', error);
    res.status(500).json({ success: false, message: '保存命令库失败', error: error.message });
  }
});

// 命令执行历史数据持久化API
// 获取命令执行历史
app.get('/api/command-history', (req, res) => {
  try {
    const history = commandHistoryStore.getCommandHistory();
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('获取命令执行历史失败:', error);
    res.status(500).json({ success: false, message: '获取命令执行历史失败', error: error.message });
  }
});

// 保存命令执行历史
app.post('/api/command-history', (req, res) => {
  try {
    const history = req.body;
    if (!Array.isArray(history)) {
      return res.status(400).json({ success: false, message: '无效的历史数据格式' });
    }
    
    const result = commandHistoryStore.saveCommandHistory(history);
    if (result) {
      res.json({ success: true, message: '命令执行历史保存成功' });
    } else {
      res.status(500).json({ success: false, message: '命令执行历史保存失败' });
    }
  } catch (error) {
    console.error('保存命令执行历史失败:', error);
    res.status(500).json({ success: false, message: '保存命令执行历史失败', error: error.message });
  }
});

// 添加命令执行记录
app.post('/api/command-history/add', (req, res) => {
  try {
    const execution = req.body;
    const result = commandHistoryStore.addCommandExecution(execution);
    
    if (result) {
      res.json({ success: true, message: '命令执行记录添加成功' });
    } else {
      res.status(500).json({ success: false, message: '命令执行记录添加失败' });
    }
  } catch (error) {
    console.error('添加命令执行记录失败:', error);
    res.status(500).json({ success: false, message: '添加命令执行记录失败', error: error.message });
  }
});

// 清除命令执行历史
app.delete('/api/command-history', (req, res) => {
  try {
    const result = commandHistoryStore.clearCommandHistory();
    
    if (result) {
      res.json({ success: true, message: '命令执行历史清除成功' });
    } else {
      res.status(500).json({ success: false, message: '命令执行历史清除失败' });
    }
  } catch (error) {
    console.error('清除命令执行历史失败:', error);
    res.status(500).json({ success: false, message: '清除命令执行历史失败', error: error.message });
  }
});

// 文件操作历史数据持久化API
// 获取文件操作历史
app.get('/api/file-operations', (req, res) => {
  try {
    const operations = fileOperationsStore.getFileOperations();
    res.json({ success: true, data: operations });
  } catch (error) {
    console.error('获取文件操作历史失败:', error);
    res.status(500).json({ success: false, message: '获取文件操作历史失败', error: error.message });
  }
});

// 保存文件操作历史
app.post('/api/file-operations', (req, res) => {
  try {
    const operations = req.body;
    if (!Array.isArray(operations)) {
      return res.status(400).json({ success: false, message: '无效的历史数据格式' });
    }
    
    const result = fileOperationsStore.saveFileOperations(operations);
    if (result) {
      res.json({ success: true, message: '文件操作历史保存成功' });
    } else {
      res.status(500).json({ success: false, message: '文件操作历史保存失败' });
    }
  } catch (error) {
    console.error('保存文件操作历史失败:', error);
    res.status(500).json({ success: false, message: '保存文件操作历史失败', error: error.message });
  }
});

// 添加文件操作记录
app.post('/api/file-operations/add', (req, res) => {
  try {
    const operation = req.body;
    const result = fileOperationsStore.addFileOperation(operation);
    
    if (result) {
      res.json({ success: true, message: '文件操作记录添加成功' });
    } else {
      res.status(500).json({ success: false, message: '文件操作记录添加失败' });
    }
  } catch (error) {
    console.error('添加文件操作记录失败:', error);
    res.status(500).json({ success: false, message: '添加文件操作记录失败', error: error.message });
  }
});

// 清除文件操作历史
app.delete('/api/file-operations', (req, res) => {
  try {
    const result = fileOperationsStore.clearFileOperations();
    
    if (result) {
      res.json({ success: true, message: '文件操作历史清除成功' });
    } else {
      res.status(500).json({ success: false, message: '文件操作历史清除失败' });
    }
  } catch (error) {
    console.error('清除文件操作历史失败:', error);
    res.status(500).json({ success: false, message: '清除文件操作历史失败', error: error.message });
  }
});

// 只有当直接运行此文件时才启动服务器
if (require.main === module) {
  //app.listen(port, () => {
  //  console.log(`服务器管理后端运行在 http://localhost:${port}`);
  //});
  // 确保只监听localhost
  app.listen(port, 'localhost', () => {
    console.log(`API服务运行在 http://localhost:${port}`);
  });
} else {
  // 作为模块导入时，导出app而不启动服务器
  module.exports = { app, serverStore, commandStore, commandHistoryStore, fileOperationsStore };
}

