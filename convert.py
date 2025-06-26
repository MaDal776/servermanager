#!/usr/bin/env python3
import json
import uuid
import argparse
import os
import sys
import random
import string
from datetime import datetime

# 生成类似nanoid的ID，系统使用的ID格式
def generate_nanoid(size=21):
    """生成类似nanoid的ID，长度默认为21个字符"""
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(random.choice(alphabet) for _ in range(size))

# 加密函数，与 data-store.js 中的 encrypt 函数逻辑相同
def encrypt(text, key='default-encryption-key'):
    try:
        # 尝试导入 pycryptodome (在 Python 中使用 Crypto 而不是 crypto)
        from Crypto.Cipher import AES
        from Crypto.Random import get_random_bytes
        import binascii
        
        # 确保密钥长度为32字节
        key_bytes = key.ljust(32)[:32].encode('utf-8')
        
        # 生成随机初始化向量
        iv = get_random_bytes(16)
        
        # 创建加密器
        cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
        
        # 确保文本长度是16的倍数
        text_bytes = text.encode('utf-8')
        padding_length = 16 - (len(text_bytes) % 16)
        text_bytes += bytes([padding_length]) * padding_length
        
        # 加密
        encrypted = cipher.encrypt(text_bytes)
        
        # 返回 iv:encrypted 格式的字符串
        return binascii.hexlify(iv).decode('utf-8') + ':' + binascii.hexlify(encrypted).decode('utf-8')
    except ImportError:
        print("警告: pycryptodome 库未安装，无法使用 AES 加密。将使用模拟加密。")
        print("建议安装 pycryptodome: pip install pycryptodome")
        # 模拟加密，实际项目中应使用真正的加密
        import hashlib
        import base64
        import os
        
        # 生成随机IV
        iv = os.urandom(8).hex()
        # 简单模拟加密（不安全，仅用于演示）
        h = hashlib.sha256((key + text).encode()).digest()
        encrypted = base64.b64encode(h).decode('utf-8')
        
        return iv + ':' + encrypted

def convert_to_server_json(input_file, output_file, encryption_key=None):
    """
    将简单格式的服务器配置文件转换为server.json格式
    
    输入格式: 每行一个服务器，格式为 "IP,密码"
    输出格式: server.json 格式
    """
    try:
        # 读取输入文件
        with open(input_file, 'r') as f:
            lines = f.readlines()
        
        # 过滤空行
        lines = [line.strip() for line in lines if line.strip()]
        
        servers = []
        for i, line in enumerate(lines):
            # 解析格式：IP,密码,其他业务数据
            # 密码可能包含逗号，业务数据也可能包含逗号
            try:
                # 找到第一个逗号的位置
                first_comma_pos = line.find(',')
                if first_comma_pos == -1:
                    print(f"警告: 第{i+1}行没有找到逗号分隔符，跳过: {line}")
                    continue
                
                # 提取IP
                ip = line[:first_comma_pos].strip()
                
                # 根据用户的说明，密码是第二个字段
                # 例如，对于 43.153.147.245,.,(@D,111,0.0009
                # IP是 43.153.147.245，密码是 .,(@D，其他是业务数据
                parts = line.split(',')
                if len(parts) >= 2:
                    ip = parts[0].strip()
                    password = parts[1].strip()  # 第二个字段作为密码
                else:
                    print(f"警告: 第{i+1}行格式不正确，跳过: {line}")
                    continue
                
                # 检查IP是否有效
                if not ip:
                    print(f"警告: 第{i+1}行的IP为空，跳过: {line}")
                    continue
            except Exception as e:
                print(f"解析第{i+1}行时出错: {str(e)}, 跳过: {line}")
                continue
            
            # 创建服务器对象，与系统格式完全匹配
            print(password)
            server = {
                "name": f"{i+1}号服务器",  # 按要求命名
                "ip": ip,
                "user": "root",  # 默认用户名
                "password": encrypt(password),  # 存储明文密码，系统会在保存时加密
                "authType": "password",
                "keyPath": "",  # 空字符串，与系统格式匹配
                "id": generate_nanoid(),  # 生成与系统相似的ID
                "createdAt": datetime.now().isoformat()
            }
            
            servers.append(server)
        
        # 写入输出文件
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(servers, f, ensure_ascii=False, indent=2)
        
        print(f"转换完成! 已生成 {len(servers)} 个服务器配置到 {output_file}")
        return True
    
    except Exception as e:
        print(f"转换失败: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='将简单格式的服务器配置转换为server.json格式')
    parser.add_argument('input_file', help='输入文件路径，每行格式为"IP,密码"')
    parser.add_argument('output_file', help='输出文件路径，server.json格式')
    parser.add_argument('--key', help='加密密钥（可选）', default=os.environ.get('ENCRYPTION_KEY', 'default-encryption-key'))
    
    args = parser.parse_args()
    
    convert_to_server_json(args.input_file, args.output_file, args.key)

if __name__ == "__main__":
    main()

