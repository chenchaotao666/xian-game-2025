/**
 * 三国策略对战游戏 - TypeScript版本
 * 主入口文件
 */

// 导出核心类型
export * from './types/index';

// 导出核心模块
export { default as Game } from './Game';
export { default as GameEngine } from './core/GameEngine';
export { default as GameMap } from './core/GameMap';
export { default as General } from './entities/General';

// 导出AI模块
export { default as AIController } from './ai/AIController';
export { default as AIPlayer } from './ai/AIPlayer';
export { default as BehaviorTree } from './ai/BehaviorTree';
export { default as NetworkAIClient } from './ai/NetworkAIClient';

// 导出网络模块
export { default as ProtocolManager } from './network/ProtocolManager';
export { default as MessageParser } from './network/MessageParser';
export { default as ActionBuilder } from './network/ActionBuilder';
export { default as NetworkClient } from './network/NetworkClient';

// 导出常量和工具
export * from './core/GameConstants';

// 导出协议常量
export {
    TERRAIN_TYPES,
    ACTION_TYPES,
    HERO_STATUS,
    CAMP_TYPES,
    FORMATION_TYPES,
    SOLDIER_TYPES
} from './network/ProtocolManager'; 
