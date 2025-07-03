# 三国策略对战游戏 (TypeScript版本)

基于行为树技术的智能AI三国策略对战游戏，采用mistreevous行为树库实现，现已完全迁移到TypeScript。

## 🎮 游戏特色

- **完整的三国题材**：9位历史名将，3种兵种类型
- **智能AI系统**：基于mistreevous行为树的高级AI
- **网络对战支持**：TCP Socket协议，支持服务器对战
- **类型安全**：完全用TypeScript重写，提供完整的类型定义
- **高质量代码**：详细的中文注释，完善的测试覆盖
- **现代化架构**：ES模块、严格的TypeScript配置

## 🏗️ 技术栈

- **语言**：TypeScript 5.1+
- **运行时**：Node.js 18+
- **行为树库**：mistreevous 4.2.0
- **测试框架**：Jest + ts-jest
- **代码规范**：ESLint + TypeScript ESLint
- **构建工具**：TypeScript Compiler (tsc)

## 📦 项目结构

```
src/
├── types/                # TypeScript类型定义
│   └── index.ts         # 全局类型和接口
├── core/                # 核心游戏逻辑
│   ├── GameConstants.ts # 游戏常量和配置
│   ├── GameEngine.ts    # 游戏引擎主类
│   └── GameMap.ts       # 地图管理系统
├── entities/            # 游戏实体
│   └── General.ts       # 武将类定义
├── ai/                  # AI系统
│   ├── BehaviorTree.ts  # 行为树核心
│   ├── AIController.ts  # AI控制器
│   ├── AIPlayer.ts      # AI玩家实现
│   └── NetworkAIClient.ts # 网络AI客户端
├── network/             # 网络通信
│   ├── ProtocolManager.ts # 协议管理器
│   ├── MessageParser.ts   # 消息解析器
│   ├── ActionBuilder.ts   # 行动构建器
│   └── NetworkClient.ts   # 网络客户端
├── Game.ts              # 主游戏类
└── index.ts             # 入口文件
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动TypeScript编译监听
npm run build:watch

# 运行开发服务器
npm run dev
```

### 构建项目

```bash
# 编译TypeScript到JavaScript
npm run build

# 运行编译后的代码
npm start
```

### 运行示例

```bash
# 运行基础游戏示例
npm run example

# 运行网络对战示例
npm run example:network
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 🔧 代码质量

```bash
# 运行ESLint检查
npm run lint

# 自动修复ESLint问题
npm run lint:fix

# 清理构建目录
npm run clean
```

## 🎯 武将系统

### 猛将类
- **吕布**：无双乱舞 + 大杀四方
- **赵云**：龙胆突刺 + 冲锋陷阵  
- **关羽**：一骑当千 + 青龙偃月斩

### 统帅类
- **刘备**：仁德之君 + 蜀汉旗
- **曹操**：虎豹骑召令 + 乱世枭雄
- **孙权**：江东水师 + 制衡

### 谋士类
- **诸葛亮**：锦囊妙计 + 斗转星移
- **周瑜**：火攻 + 连营
- **司马懿**：鬼谋 + 天命

## 🤖 AI系统特性

### 行为树架构
- **决策层**：战略规划和目标选择
- **执行层**：具体行动实施
- **评估层**：态势分析和效果评估

### AI难度等级
- **简单**：基础AI，适合新手
- **中等**：平衡AI，提供挑战
- **困难**：高级AI，严峻考验
- **专家**：顶级AI，1%错误率，100ms反应时间

## 🌐 网络协议

### 支持的消息类型
- `start`：游戏开始，接收地图和玩家信息
- `inquire`：回合询问，获取当前游戏状态
- `over`：游戏结束，接收最终结果

### 行动指令
- `MOVE`：移动武将
- `PICK`：招募武将
- `MAKE`：生产兵力
- `ATTACK`：普通攻击
- `SKILL`：技能攻击
- `FORMATION`：切换阵型

## 📋 类型定义

项目提供完整的TypeScript类型定义：

```typescript
import type { 
  GameState, 
  Hero, 
  Position, 
  GameAction,
  AIContext 
} from './src/types/index.js';
```

### 核心接口
- `Position`：位置坐标
- `Hero`：英雄完整信息
- `GameState`：游戏状态
- `GameAction`：游戏行动
- `AIContext`：AI决策上下文

## 🔄 从JavaScript迁移

如果您有之前的JavaScript版本，现在可以享受TypeScript带来的好处：

### 主要改进
- **类型安全**：编译时错误检查
- **更好的IDE支持**：自动补全、重构等
- **清晰的接口定义**：易于理解和维护
- **现代模块系统**：ES模块替代CommonJS

### 迁移说明
- 所有`.js`文件已转换为`.ts`
- 添加了完整的类型注解
- 更新了模块导入/导出语法
- 配置了严格的TypeScript编译选项

## 📈 性能特性

- **高效AI**：行为树优化，决策时间<100ms
- **内存管理**：智能垃圾回收，低内存占用
- **网络优化**：粘包/分包处理，稳定通信
- **并发支持**：异步架构，高并发处理

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交改动：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 开发规范
- 遵循TypeScript严格模式
- 保持代码覆盖率>70%
- 添加详细的中文注释
- 使用ESLint规范代码风格

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🎉 致谢

- [mistreevous](https://github.com/nikkorn/mistreevous) - 优秀的行为树库
- 三国历史文化 - 灵感来源
- TypeScript团队 - 强大的类型系统

---

**现在开始您的三国征程吧！** 🚀 