// UUID polyfill for environments that don't support crypto.randomUUID

// Function to generate UUID v4
function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 立即执行函数，确保在所有环境中都能正确注入polyfill
(function() {
  // 浏览器环境
  if (typeof window !== 'undefined') {
    if (!window.crypto) {
      window.crypto = {};
    }
    
    if (!window.crypto.randomUUID) {
      window.crypto.randomUUID = generateUUIDv4;
      console.log('Added browser polyfill for crypto.randomUUID');
    }
  }
  
  // Node.js环境
  if (typeof global !== 'undefined') {
    if (!global.crypto) {
      global.crypto = {};
    }
    
    if (!global.crypto.randomUUID) {
      global.crypto.randomUUID = generateUUIDv4;
      console.log('Added Node.js polyfill for crypto.randomUUID');
    }
  }

  // 处理Next.js特殊的globalThis环境
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.crypto) {
      globalThis.crypto = {};
    }
    
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = generateUUIDv4;
      console.log('Added globalThis polyfill for crypto.randomUUID');
    }
  }
})();

// 导出函数以便直接使用
export function randomUUID() {
  return generateUUIDv4();
}

// 确保polyfill在模块导入时立即执行
if (typeof crypto === 'undefined') {
  global.crypto = {};
}

if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = generateUUIDv4;
  console.log('Added direct crypto polyfill for randomUUID');
}

