/**
 * 三国争霸通讯协议管理器
 * 负责处理所有网络通信协议相关功能
 */

import { Socket } from 'net';
import { EventEmitter } from 'events';
import type { GameAction, GameState, GameResult, GameMap } from '../types/index.js';

/**
 * 地形类型常量
 */
export const TERRAIN_TYPES = {
    SPACE: 0,    // 空地
    MOUNT: 1,    // 山丘
    WATER: 2,    // 水域
    FLAG: 3,     // 龙旗据点
    CITY: 4,     // 中立城寨
    BASE: 5      // 主基地
} as const;

/**
 * 行动指令类型常量
 */
export const ACTION_TYPES = {
    MOVE: 'MOVE',    // 普通移动
    SP: 'SP',        // 传送指令
    PICK: 'PICK',    // 选择阵容
    MAKE: 'MAKE',    // 生产兵力
    FORM: 'FORM',    // 切换阵型
    BUFF: 'BUFF',    // 获取增益效果
    AC: 'AC',        // 占领据点
    SG: 'SG',        // 攻打城寨
    AD: 'AD',        // 普通攻击
    SK: 'SK'         // 技能攻击
} as const;

/**
 * 英雄状态枚举
 */
export const HERO_STATUS = {
    NONE: 'NONE',                // 无状态
    RESURRECTION: 'RESURRECTION', // 复活中
    SILENCE: 'Silence',          // 沉默中
    GROUNDED: 'Grounded',        // 控制中
    WEAKNESS: 'WEAKNESS'         // 虚弱
} as const;

/**
 * 阵营类型
 */
export const CAMP_TYPES = {
    RED: 0,      // 红色阵营（左侧）
    BLUE: 1,     // 蓝色阵营（右侧）
    NEUTRAL: 2   // 中立（未占领据点）
} as const;

/**
 * 阵型类型
 */
export const FORMATION_TYPES = {
    NONE: 0,      // 无阵型
    ATTACK: 1,    // 攻击阵型
    DEFENSE: 2    // 防守阵型
} as const;

/**
 * 兵种类型
 */
export const SOLDIER_TYPES = {
    ARCHER: 7,    // 弓兵
    SHIELD: 8     // 盾兵
} as const;

// ========== 类型定义 ==========

/** 协议消息接口 */
export interface ProtocolMessage {
    msg_name: string;
    msg_data: any;
}

/** 游戏开始消息数据 */
export interface GameStartData {
    map: any;
    players: Array<{
        playerId: number;
        camp: number;
    }>;
}

/** 注册消息数据 */
export interface RegistrationData {
    playerId: number;
    playerName: string;
    version: string;
}

/** 行动消息数据 */
export interface ActionData {
    round: number;
    actions: GameAction[];
}

/** 协议管理器事件接口 */
export interface ProtocolManagerEvents {
    'gameStart': (data: GameStartData) => void;
    'inquire': (data: GameState) => void;
    'gameOver': (data: GameResult) => void;
    'disconnected': () => void;
    'error': (error: Error) => void;
    'connected': () => void;
}

// 扩展EventEmitter的类型
declare interface ProtocolManager {
    on<K extends keyof ProtocolManagerEvents>(
        event: K,
        listener: ProtocolManagerEvents[K]
    ): this;
    
    emit<K extends keyof ProtocolManagerEvents>(
        event: K,
        ...args: Parameters<ProtocolManagerEvents[K]>
    ): boolean;
}

/**
 * 通讯协议管理器主类
 */
class ProtocolManager extends EventEmitter {
    private socket: Socket | null = null;
    private buffer: Buffer = Buffer.alloc(0); // 用于处理粘包和分包
    private isConnected: boolean = false;
    private playerId: number | null = null;
    private playerName: string = '';
    private version: string = '1.0';

    constructor() {
        super();
    }

    /**
     * 连接到服务器
     * @param host 服务器地址
     * @param port 服务器端口
     * @param playerId 玩家ID
     * @param playerName 玩家名称
     * @param version 客户端版本
     * @returns 连接是否成功
     */
    async connect(
        host: string, 
        port: number, 
        playerId: number, 
        playerName: string, 
        version: string = '1.0'
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.playerId = playerId;
            this.playerName = playerName;
            this.version = version;

            this.socket = new Socket();
            
            // 设置编码为UTF-8
            this.socket.setEncoding('utf8');
            
            // 连接成功事件
            this.socket.on('connect', () => {
                console.log(`[协议管理器] 成功连接到服务器 ${host}:${port}`);
                this.isConnected = true;
                
                // 立即发送注册消息
                this.sendRegistration()
                    .then(() => {
                        console.log('[协议管理器] 注册消息已发送');
                        this.emit('connected');
                        resolve(true);
                    })
                    .catch(reject);
            });

            // 数据接收事件
            this.socket.on('data', (data: string | Buffer) => {
                this.handleIncomingData(data);
            });

            // 连接关闭事件
            this.socket.on('close', () => {
                console.log('[协议管理器] 连接已关闭');
                this.isConnected = false;
                this.emit('disconnected');
            });

            // 错误事件
            this.socket.on('error', (error: Error) => {
                console.error('[协议管理器] 连接错误:', error);
                this.isConnected = false;
                this.emit('error', error);
                reject(error);
            });

            // 开始连接
            this.socket.connect(port, host);
        });
    }

    /**
     * 处理接收到的数据，解决粘包和分包问题
     * @param data 接收到的数据
     */
    private handleIncomingData(data: string | Buffer): void {
        // 将新数据追加到缓冲区
        const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
        this.buffer = Buffer.concat([this.buffer, dataBuffer]);

        // 循环处理完整的消息
        while (this.buffer.length >= 5) {
            // 读取消息长度（前5个字节）
            const lengthStr = this.buffer.toString('utf8', 0, 5);
            const messageLength = parseInt(lengthStr, 10);

            if (isNaN(messageLength)) {
                console.error('[协议管理器] 消息长度格式错误:', lengthStr);
                this.buffer = Buffer.alloc(0); // 清空缓冲区
                break;
            }

            // 检查是否接收到完整消息
            const totalLength = 5 + messageLength;
            if (this.buffer.length < totalLength) {
                // 消息不完整，等待更多数据
                break;
            }

            // 提取完整消息
            const messageBuffer = this.buffer.slice(5, totalLength);
            const messageStr = messageBuffer.toString('utf8');

            try {
                const message: ProtocolMessage = JSON.parse(messageStr);
                this.handleMessage(message);
            } catch (error) {
                console.error('[协议管理器] JSON解析错误:', error, messageStr);
            }

            // 从缓冲区移除已处理的消息
            this.buffer = this.buffer.slice(totalLength);
        }
    }

    /**
     * 处理解析后的消息
     * @param message 解析后的消息对象
     */
    private handleMessage(message: ProtocolMessage): void {
        console.log(`[协议管理器] 收到消息: ${message.msg_name}`);
        
        switch (message.msg_name) {
            case 'start':
                this.emit('gameStart', message.msg_data as GameStartData);
                break;
            case 'inquire':
                this.emit('inquire', message.msg_data as GameState);
                break;
            case 'over':
                this.emit('gameOver', message.msg_data as GameResult);
                break;
            default:
                console.warn(`[协议管理器] 未知消息类型: ${message.msg_name}`);
        }
    }

    /**
     * 发送消息到服务器
     * @param messageData 消息数据
     * @param messageName 消息名称
     * @returns 发送是否成功
     */
    async sendMessage(messageData: any, messageName: string): Promise<boolean> {
        if (!this.socket || !this.isConnected) {
            console.error('[协议管理器] 未连接到服务器，无法发送消息');
            return false;
        }

        try {
            const message: ProtocolMessage = {
                msg_name: messageName,
                msg_data: messageData
            };

            const messageStr = JSON.stringify(message);
            const messageBuffer = Buffer.from(messageStr, 'utf8');
            
            // 构造完整消息：5位长度 + 消息内容
            const lengthStr = messageBuffer.length.toString().padStart(5, '0');
            const fullMessage = lengthStr + messageStr;

            return new Promise((resolve, reject) => {
                this.socket!.write(fullMessage, 'utf8', (error) => {
                    if (error) {
                        console.error('[协议管理器] 发送消息失败:', error);
                        reject(error);
                    } else {
                        console.log(`[协议管理器] 消息发送成功: ${messageName}`);
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('[协议管理器] 消息序列化失败:', error);
            return false;
        }
    }

    /**
     * 发送玩家注册消息
     * @returns 发送是否成功
     */
    async sendRegistration(): Promise<boolean> {
        const registrationData: RegistrationData = {
            playerId: this.playerId!,
            playerName: this.playerName,
            version: this.version
        };

        return this.sendMessage(registrationData, 'register');
    }

    /**
     * 发送准备就绪消息
     * @returns 发送是否成功
     */
    async sendReady(): Promise<boolean> {
        const readyData = {
            playerId: this.playerId,
            status: 'ready'
        };

        return this.sendMessage(readyData, 'ready');
    }

    /**
     * 发送行动指令
     * @param round 当前回合数
     * @param actions 行动列表
     * @returns 发送是否成功
     */
    async sendAction(round: number, actions: GameAction[]): Promise<boolean> {
        const actionData: ActionData = {
            round: round,
            actions: actions
        };

        return this.sendMessage(actionData, 'action');
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.socket) {
            console.log('[协议管理器] 主动断开连接');
            this.socket.destroy();
            this.socket = null;
            this.isConnected = false;
        }
    }

    /**
     * 检查是否已连接到服务器
     * @returns 是否已连接
     */
    isConnectedToServer(): boolean {
        return this.isConnected && this.socket !== null;
    }

    /**
     * 获取当前玩家ID
     * @returns 玩家ID
     */
    getPlayerId(): number | null {
        return this.playerId;
    }

    /**
     * 获取当前玩家名称
     * @returns 玩家名称
     */
    getPlayerName(): string {
        return this.playerName;
    }

    /**
     * 获取客户端版本
     * @returns 版本号
     */
    getVersion(): string {
        return this.version;
    }
}

export default ProtocolManager; 