/**
 * 三国争霸通讯协议管理器
 * 负责处理所有网络通信协议相关功能
 */

// 导入Node.js的net模块用于TCP Socket通信
const net = require('net');
const { EventEmitter } = require('events');

/**
 * 地形类型常量
 */
const TERRAIN_TYPES = {
    SPACE: 0,    // 空地
    MOUNT: 1,    // 山丘
    WATER: 2,    // 水域
    FLAG: 3,     // 龙旗据点
    CITY: 4,     // 中立城寨
    BASE: 5      // 主基地
};

/**
 * 行动指令类型常量
 */
const ACTION_TYPES = {
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
};

/**
 * 英雄状态枚举
 */
const HERO_STATUS = {
    NONE: 'NONE',                // 无状态
    RESURRECTION: 'RESURRECTION', // 复活中
    SILENCE: 'Silence',          // 沉默中
    GROUNDED: 'Grounded',        // 控制中
    WEAKNESS: 'WEAKNESS'         // 虚弱
};

/**
 * 阵营类型
 */
const CAMP_TYPES = {
    RED: 0,      // 红色阵营（左侧）
    BLUE: 1,     // 蓝色阵营（右侧）
    NEUTRAL: 2   // 中立（未占领据点）
};

/**
 * 阵型类型
 */
const FORMATION_TYPES = {
    NONE: 0,      // 无阵型
    ATTACK: 1,    // 攻击阵型
    DEFENSE: 2    // 防守阵型
};

/**
 * 兵种类型
 */
const SOLDIER_TYPES = {
    ARCHER: 7,    // 弓兵
    SHIELD: 8     // 盾兵
};

/**
 * 通讯协议管理器主类
 */
class ProtocolManager extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.buffer = Buffer.alloc(0); // 用于处理粘包和分包
        this.isConnected = false;
        this.playerId = null;
        this.playerName = '';
        this.version = '1.0';
    }

    /**
     * 连接到服务器
     * @param {string} host - 服务器地址
     * @param {number} port - 服务器端口
     * @param {number} playerId - 玩家ID
     * @param {string} playerName - 玩家名称
     * @param {string} version - 客户端版本
     * @returns {Promise<boolean>} 连接是否成功
     */
    async connect(host, port, playerId, playerName, version = '1.0') {
        return new Promise((resolve, reject) => {
            this.playerId = playerId;
            this.playerName = playerName;
            this.version = version;

            this.socket = new net.Socket();
            
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
                        resolve(true);
                    })
                    .catch(reject);
            });

            // 数据接收事件
            this.socket.on('data', (data) => {
                this.handleIncomingData(data);
            });

            // 连接关闭事件
            this.socket.on('close', () => {
                console.log('[协议管理器] 连接已关闭');
                this.isConnected = false;
                this.emit('disconnected');
            });

            // 错误事件
            this.socket.on('error', (error) => {
                console.error('[协议管理器] 连接错误:', error);
                this.isConnected = false;
                reject(error);
            });

            // 开始连接
            this.socket.connect(port, host);
        });
    }

    /**
     * 处理接收到的数据，解决粘包和分包问题
     * @param {Buffer} data - 接收到的数据
     */
    handleIncomingData(data) {
        // 将新数据追加到缓冲区
        this.buffer = Buffer.concat([this.buffer, Buffer.from(data, 'utf8')]);

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
                const message = JSON.parse(messageStr);
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
     * @param {Object} message - 解析后的消息对象
     */
    handleMessage(message) {
        console.log(`[协议管理器] 收到消息: ${message.msg_name}`);
        
        switch (message.msg_name) {
            case 'start':
                this.emit('gameStart', message.msg_data);
                break;
            case 'inquire':
                this.emit('inquire', message.msg_data);
                break;
            case 'over':
                this.emit('gameOver', message.msg_data);
                break;
            default:
                console.log(`[协议管理器] 未知消息类型: ${message.msg_name}`);
                this.emit('unknownMessage', message);
        }
    }

    /**
     * 发送消息到服务器
     * @param {Object} messageData - 消息数据
     * @param {string} messageName - 消息名称
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendMessage(messageData, messageName) {
        if (!this.isConnected || !this.socket) {
            throw new Error('未连接到服务器');
        }

        const message = {
            msg_data: messageData,
            msg_name: messageName
        };

        const messageStr = JSON.stringify(message);
        const messageBuffer = Buffer.from(messageStr, 'utf8');
        const messageLength = messageBuffer.length;

        // 构建完整消息：长度(5字节) + 消息体
        const lengthStr = messageLength.toString().padStart(5, '0');
        const fullMessage = lengthStr + messageStr;

        return new Promise((resolve, reject) => {
            this.socket.write(fullMessage, 'utf8', (error) => {
                if (error) {
                    console.error('[协议管理器] 发送消息失败:', error);
                    reject(error);
                } else {
                    console.log(`[协议管理器] 消息已发送: ${messageName}`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * 发送注册消息
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendRegistration() {
        const messageData = {
            playerId: this.playerId,
            playerName: this.playerName,
            version: this.version
        };
        
        return this.sendMessage(messageData, 'registration');
    }

    /**
     * 发送准备完成消息
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendReady() {
        const messageData = {
            playerId: this.playerId
        };
        
        return this.sendMessage(messageData, 'ready');
    }

    /**
     * 发送行动消息
     * @param {number} round - 当前回合数
     * @param {Array} actions - 行动指令数组
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendAction(round, actions) {
        const messageData = {
            round: round,
            playerId: this.playerId,
            actions: actions
        };
        
        return this.sendMessage(messageData, 'action');
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.isConnected = false;
        this.buffer = Buffer.alloc(0);
    }

    /**
     * 检查连接状态
     * @returns {boolean} 是否已连接
     */
    isConnectedToServer() {
        return this.isConnected && this.socket && !this.socket.destroyed;
    }
}

module.exports = {
    ProtocolManager,
    TERRAIN_TYPES,
    ACTION_TYPES,
    HERO_STATUS,
    CAMP_TYPES,
    FORMATION_TYPES,
    SOLDIER_TYPES
}; 