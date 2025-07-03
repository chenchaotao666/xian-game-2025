#!/usr/bin/env node

/**
 * 修复TypeScript转换后的常见错误
 */

const fs = require('fs');
const path = require('path');

// 读取文件内容
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`无法读取文件 ${filePath}:`, error.message);
        return null;
    }
}

// 写入文件内容
function writeFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ 已修复: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`无法写入文件 ${filePath}:`, error.message);
        return false;
    }
}

// 修复NetworkClient类的属性声明
function fixNetworkClient() {
    const filePath = 'src/network/NetworkClient.ts';
    let content = readFile(filePath);
    
    if (!content) return;

    // 添加类属性声明
    const classDeclaration = 'class NetworkClient extends EventEmitter {';
    const propertyDeclarations = `class NetworkClient extends EventEmitter {
    private protocolManager: any;
    private gameState: any;
    private statistics: any;
`;

    content = content.replace(classDeclaration, propertyDeclarations);
    
    // 修复ProtocolManager导入
    content = content.replace(
        'import { ProtocolManager } from \'./ProtocolManager.js\';',
        'import ProtocolManager from \'./ProtocolManager.js\';'
    );

    writeFile(filePath, content);
}

// 修复示例文件的类型错误
function fixExampleFiles() {
    // 修复network-example.ts
    const networkExamplePath = 'examples/network-example.ts';
    let content = readFile(networkExamplePath);
    
    if (content) {
        // 添加类型注解和修复导入
        content = content.replace(
            'import type { GameState, GameAction, Position } from \'../src/types/index.js\';',
            'import type { GameState, GameAction, Position } from \'../src/types/index.js\';\n' +
            '// 临时类型定义用于示例\ninterface GameResult { winner?: any; }'
        );

        // 修复事件监听器的类型
        content = content.replace(
            /client\.on\('([^']+)', \(([^)]+)\) =>/g,
            'client.on(\'$1\', ($2: any) =>'
        );
        
        writeFile(networkExamplePath, content);
    }
}

// 修复Game.ts的类属性
function fixGameClass() {
    const filePath = 'src/Game.ts';
    let content = readFile(filePath);
    
    if (!content) return;

    // 添加类属性声明
    const classDeclaration = 'class XianGame {';
    const propertyDeclarations = `class XianGame {
    private config: any;
    private gameEngine: any;
    private aiControllers: any;
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private gameResult: any = null;
    private gameStats: any = {};
`;

    content = content.replace(classDeclaration, propertyDeclarations);
    writeFile(filePath, content);
}

// 主函数
function main() {
    console.log('开始修复TypeScript错误...\n');
    
    fixNetworkClient();
    fixExampleFiles();
    fixGameClass();
    
    console.log('\n修复完成！现在可以重新构建项目。');
}

main(); 