#!/usr/bin/env node

/**
 * 批量转换CommonJS模块语法为ES模块语法
 */

import fs from 'fs';
import path from 'path';

// 需要转换的文件扩展名
const TARGET_EXTENSIONS = ['.ts', '.js'];

// 需要转换的目录
const TARGET_DIRS = ['src/'];

/**
 * 转换单个文件的模块语法
 * @param {string} filePath - 文件路径
 */
function convertFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // 转换 require() 为 import
        content = content.replace(/const\s+{\s*([^}]+)\s*}\s*=\s*require\(['"]([^'"]+)['"]\);?/g, 
            (match, imports, modulePath) => {
                modified = true;
                const cleanImports = imports.split(',').map(imp => imp.trim()).join(', ');
                const modulePathWithExt = modulePath.startsWith('.') && !modulePath.endsWith('.js') 
                    ? `${modulePath}.js` : modulePath;
                return `import { ${cleanImports} } from '${modulePathWithExt}';`;
            });

        // 转换默认导入
        content = content.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g, 
            (match, varName, modulePath) => {
                modified = true;
                const modulePathWithExt = modulePath.startsWith('.') && !modulePath.endsWith('.js') 
                    ? `${modulePath}.js` : modulePath;
                return `import ${varName} from '${modulePathWithExt}';`;
            });

        // 转换 module.exports 为 export default
        content = content.replace(/module\.exports\s*=\s*([^;]+);?/g, (match, exportValue) => {
            modified = true;
            return `export default ${exportValue};`;
        });

        // 转换 exports.xxx 为 export
        content = content.replace(/exports\.(\w+)\s*=\s*([^;]+);?/g, (match, exportName, exportValue) => {
            modified = true;
            return `export const ${exportName} = ${exportValue};`;
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ 已转换: ${filePath}`);
        }
    } catch (error) {
        console.error(`✗ 转换失败: ${filePath}`, error.message);
    }
}

/**
 * 递归遍历目录并转换文件
 * @param {string} dirPath - 目录路径
 */
function convertDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            convertDirectory(fullPath);
        } else if (stat.isFile() && TARGET_EXTENSIONS.includes(path.extname(item))) {
            convertFile(fullPath);
        }
    }
}

// 主执行逻辑
console.log('开始批量转换模块语法...\n');

for (const dir of TARGET_DIRS) {
    if (fs.existsSync(dir)) {
        console.log(`转换目录: ${dir}`);
        convertDirectory(dir);
    } else {
        console.warn(`目录不存在: ${dir}`);
    }
}

console.log('\n模块语法转换完成！'); 