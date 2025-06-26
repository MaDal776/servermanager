const fs = require('fs');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');

// 加密函数
function encrypt(text, key = process.env.ENCRYPTION_KEY || 'default-encryption-key') {
  console.log(key)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// 生成随机ID (24位)
function generateRandomId() {
  return crypto.randomBytes(12).toString('hex');
}

// 主转换函数
function convertServerInfo(inputFile, outputFile) {
  try {
    // 读取输入文件
    const data = fs.readFileSync(inputFile, 'utf-8');
    
    // 预处理数据 - 处理包含逗号的密码
    const fixedData = data.split('\n').map(line => {
      if (!line.trim()) return ''; // 跳过空行
      
      const parts = line.split('!');
      
      // 如果字段数超过4（IP+密码+两个价格字段），说明密码中包含逗号
      //if (parts.length > 4) {
      //  // IP在开头，两个价格在末尾，中间的合并为密码
      //  const ip = parts[0];
      //  const lastTwo = parts.slice(-2);
      //  const password = parts.slice(1, -2).join('!');
      //  return [ip, password, ...lastTwo].join('!');
      //}
      
      return line;
    }).join('\n');
    
    // 使用CSV解析器处理数据
    const records = parse(fixedData, {
      columns: ['ip', 'password',], // 明确的列名
      skip_empty_lines: true,
      relax_quotes: true,
      escape: '\\',
      trim: false // 不自动trim，保留原始格式
    });
    
    // 处理数据
    const result = records.map((record, index) => {
      if (!record.ip || !record.password) {
        throw new Error(`第${index + 1}行缺少IP或密码`);
      }
      console.log(record.password)
      
      
      return {
        name: `服务器${index + 1}`,
        ip: record.ip.trim(),
        user: "root",
        password: encrypt(".,(@DjL+2R#p6"),
        authType: "password",
        keyPath: "",
        id: generateRandomId(),
        createdAt: new Date().toISOString()
      };
    });

    // 写入输出文件
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`转换完成! 共处理 ${result.length} 台服务器`);
    
  } catch (error) {
    console.error('处理出错:', error.message);
    process.exit(1);
  }
}

// 使用方法
if (process.argv.length !== 4) {
  console.log('使用方法: node convert.js <输入文件> <输出文件>');
  console.log('示例: node convert.js servers.txt servers.json');
  process.exit(0);
} else {
  convertServerInfo(process.argv[2], process.argv[3]);
}
