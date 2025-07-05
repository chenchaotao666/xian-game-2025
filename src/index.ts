/**
 * 三国策略对战游戏 - TypeScript版本
 * 程序入口文件 - 用于连接服务器和启动游戏客户端
 */

import { ExecutePickGenerals } from './actions/GameStateActions.js';
import { handleTurn, init } from './core/index.js';
import { ActionContext } from './core/types.js';
import { sunquan, zhaoyun, zhugeliang } from './models/heros.js';
import { InquireMessageData } from './models/inquireMsg.js';
import ActionBuilder from './network/ActionBuilder.js';
import NetworkClient from './network/NetworkClient.js';
import type { GameConfig, InquireMessage } from './types/index.js';

/**
 * 游戏配置
 */
const config: GameConfig = {
    // 服务器配置
    serverHost: process.env.SERVER_HOST || '127.0.0.1',
    serverPort: parseInt(process.env.SERVER_PORT || '30000'),

    // 玩家配置
    playerId: parseInt(process.env.PLAYER_ID || '8680'),
    playerName: process.env.PLAYER_NAME || 'Player',

    logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
};

/**
 * 日志输出函数
 */
export function log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const levelMap = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
    };

    const shouldLog =
        config.logLevel === 'debug' ||
        (config.logLevel === 'info' && ['info', 'warn', 'error'].includes(level)) ||
        (config.logLevel === 'warn' && ['warn', 'error'].includes(level)) ||
        (config.logLevel === 'error' && level === 'error');

    if (shouldLog) {
        console.log(`[${timestamp}] ${levelMap[level]} ${message}`);
    }
}

/**
 * 启动人类玩家客户端
 */
async function startHumanClient(): Promise<void> {
    log(`启动人类玩家客户端`, 'info');

    const client = new NetworkClient();

    // 设置事件监听器
    setupClientEventListeners(client);

    try {
        log(`连接服务器: ${config.serverHost}:${config.serverPort}`, 'info');
        await client.connect(
            config.serverHost,
            config.serverPort,
            config.playerId,
            config.playerName
        );
        log('客户端连接成功', 'info');
        log('等待玩家输入...', 'info');
    } catch (error) {
        log(`客户端连接失败: ${(error as Error).message}`, 'error');
        if (config.autoReconnect) {
            log('5秒后尝试重新连接...', 'warn');
            setTimeout(() => startHumanClient(), 5000);
        } else {
            process.exit(1);
        }
    }
}

/**
 * 设置客户端事件监听器
 */
function setupClientEventListeners(client: NetworkClient): void {
    // 连接事件
    if ('on' in client) {
        client.on('connected', () => {
            log('已连接到服务器', 'info');
        });

        client.on('disconnected', () => {
            log('与服务器断开连接', 'warn');
        });

        client.on('error', (error: Error) => {
            log(`客户端错误: ${error.message}`, 'error');
        });

        // 游戏事件
        client.on('gameStart', (gameData: any) => {
            log(`游戏开始 - 地图: ${gameData.map?.width}x${gameData.map?.height}`, 'info');
        });

        client.on('gameOver', (result: any) => {
            log(`游戏结束 - 获胜者: ${result.winner?.playerName || '未知'}`, 'info');
        });

        client.on('inquire', (gameData: InquireMessageData) => {
            log(`第${gameData.round}回合 - 等待行动`, 'debug');
            if (gameData.round === 1) {
                init(client.getGameState().playerId);
            } else {
                handleTurn();
            }
        });
    }
}

/**
 * 优雅退出处理
 */
function setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
        log(`收到${signal}信号，正在关闭客户端...`, 'info');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon
}

/**
 * 主函数
 */
async function main(): Promise<void> {
    log('🚀 三国策略对战游戏客户端启动', 'info');
    log(`模式: ${config.gameMode}`, 'info');
    log(`服务器: ${config.serverHost}:${config.serverPort}`, 'info');
    log(`玩家: ${config.playerName} (ID: ${config.playerId})`, 'info');

    // 设置优雅退出
    setupGracefulShutdown();

    try {
        await startHumanClient();
    } catch (error) {
        log(`启动失败: ${(error as Error).message}`, 'error');
        process.exit(1);
    }
}

// 添加连接重试逻辑
const maxRetries = 5;
let retryCount = 0;

const connectWithRetry = () => {
    setTimeout(() => {
        if (retryCount < maxRetries) {
            retryCount++;
            console.log(`重试连接 (${retryCount}/${maxRetries})`);
            // 启动程序
            main().catch((error) => {
                console.error('程序启动失败:', error);
                process.exit(1);
            });
        }
    }, 2000); // 2秒后重试
};

connectWithRetry();
