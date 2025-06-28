const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 定义数据文件存储路径
const DATA_DIR = path.join(__dirname, 'data');
const SERVERS_FILE = 'servers.json';
const COMMANDS_FILE = 'commands.json';
const COMMAND_HISTORY_FILE = 'command-history.json';
const FILE_OPERATIONS_FILE = 'file-operations.json';

// 确保数据目录存在
function ensureDataDirExists() {
  console.log('检查数据目录存在性:', DATA_DIR);
  if (!fs.existsSync(DATA_DIR)) {
    console.log('数据目录不存在，正在创建...');
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('数据目录创建成功');
    } catch (error) {
      console.error('创建数据目录失败:', error);
    }
  } else {
    console.log('数据目录已存在');
  }
}

// 简单的加密函数，用于敏感数据
function encrypt(text, key = process.env.ENCRYPTION_KEY || 'default-encryption-key') {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 解密函数
function decrypt(text, key = process.env.ENCRYPTION_KEY || 'default-encryption-key') {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('解密失败:', error);
    return text; // 如果解密失败，返回原文
  }
}

// 读取数据文件
function readDataFile(filename, defaultValue = []) {
  ensureDataDirExists();
  
  const filePath = path.join(DATA_DIR, filename);
  console.log('读取数据文件:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.log('文件不存在，创建默认文件:', filePath);
    fs.writeFileSync(filePath, JSON.stringify(defaultValue));
    return defaultValue;
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取文件失败 ${filePath}:`, error);
    return defaultValue;
  }
}

// 写入数据文件
function writeDataFile(filename, data) {
  ensureDataDirExists();
  const filePath = path.join(DATA_DIR, filename);
  console.log('正在写入数据文件:', filePath);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('数据文件写入成功:', filename);
    return true;
  } catch (error) {
    console.error('写入数据文件失败:', error);
    return false;
  }
}

// 服务器信息相关操作
const serverStore = {
  // 获取所有服务器信息
  // 添加 decryptPasswords 参数，默认为 false，只有明确需要时才解密密码
  getServers(decryptPasswords = false) {
    const servers = readDataFile(SERVERS_FILE);
    
    // 只有当明确要求解密密码时才解密
    if (decryptPasswords) {
      return servers.map(server => {
        if (server.authType === 'password' && server.password) {
          try {
            server.password = decrypt(server.password);
          } catch (e) {
            // 如果不是加密格式，保持原样
          }
        }
        return server;
      });
    }
    
    // 默认情况下不解密密码，直接返回原始数据
    return servers;
  },
  
  // 保存所有服务器信息
  saveServers(servers) {
    // 加密敏感数据
    const encryptedServers = servers.map(server => {
      const serverCopy = {...server};
      if (serverCopy.authType === 'password' && serverCopy.password) {
        // 检查是否已经加密
        if (!serverCopy.password.includes(':')) {
          serverCopy.password = encrypt(serverCopy.password);
        }
      }
      return serverCopy;
    });
    
    return writeDataFile(SERVERS_FILE, encryptedServers);
  },
  
  // 添加单个服务器
  addServer(server) {
    const servers = this.getServers();
    servers.push(server);
    return this.saveServers(servers);
  },
  
  // 更新单个服务器
  updateServer(serverId, updatedServer) {
    const servers = this.getServers();
    const index = servers.findIndex(s => s.id === serverId);
    
    if (index !== -1) {
      servers[index] = updatedServer;
      return this.saveServers(servers);
    }
    
    return false;
  },
  
  // 删除单个服务器
  deleteServer(serverId) {
    const servers = this.getServers();
    const filteredServers = servers.filter(s => s.id !== serverId);
    
    if (filteredServers.length < servers.length) {
      return this.saveServers(filteredServers);
    }
    
    return false;
  }
};

// 命令库相关操作
const commandStore = {
  // 获取所有命令
  getCommands() {
    return readDataFile(COMMANDS_FILE);
  },
  
  // 保存所有命令
  saveCommands(commands) {
    return writeDataFile(COMMANDS_FILE, commands);
  },
  
  // 添加单个命令
  addCommand(command) {
    const commands = this.getCommands();
    commands.push(command);
    return this.saveCommands(commands);
  },
  
  // 更新单个命令
  updateCommand(commandId, updatedCommand) {
    const commands = this.getCommands();
    const index = commands.findIndex(c => c.id === commandId);
    
    if (index !== -1) {
      commands[index] = updatedCommand;
      return this.saveCommands(commands);
    }
    
    return false;
  },
  
  // 删除单个命令
  deleteCommand(commandId) {
    const commands = this.getCommands();
    const filteredCommands = commands.filter(c => c.id !== commandId);
    
    if (filteredCommands.length < commands.length) {
      return this.saveCommands(filteredCommands);
    }
    
    return false;
  }
};

// 命令执行历史相关操作
const commandHistoryStore = {
  // 获取命令执行历史
  getCommandHistory() {
    return readDataFile(COMMAND_HISTORY_FILE);
  },
  
  // 保存命令执行历史
  saveCommandHistory(history) {
    return writeDataFile(COMMAND_HISTORY_FILE, history);
  },
  
  // 添加命令执行记录
  addCommandExecution(execution) {
    const history = this.getCommandHistory();
    history.push(execution);
    return this.saveCommandHistory(history);
  },
  
  // 清除命令执行历史
  clearCommandHistory() {
    return writeDataFile(COMMAND_HISTORY_FILE, []);
  }
};

// 文件操作历史相关操作
const fileOperationsStore = {
  // 获取文件操作历史
  getFileOperations() {
    return readDataFile(FILE_OPERATIONS_FILE);
  },
  
  // 保存文件操作历史
  saveFileOperations(operations) {
    return writeDataFile(FILE_OPERATIONS_FILE, operations);
  },
  
  // 添加文件操作记录
  addFileOperation(operation) {
    const operations = this.getFileOperations();
    operations.push(operation);
    return this.saveFileOperations(operations);
  },
  
  // 清除文件操作历史
  clearFileOperations() {
    return writeDataFile(FILE_OPERATIONS_FILE, []);
  }
};

module.exports = {
  serverStore,
  commandStore,
  commandHistoryStore,
  fileOperationsStore,
  encrypt,
  decrypt
};

