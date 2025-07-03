/**
 * 网络客户端类
 * 集成通信协议的所有功能，提供完整的网络通信接口
 */

import ProtocolManager from './ProtocolManager';
import MessageParser from './MessageParser';
import ActionBuilder from './ActionBuilder';
import { EventEmitter } from 'events';

/**
 * 网络客户端主类
 * 封装所有网络通信相关功能
 */
class NetworkClient extends EventEmitter {
    private protocolManager: any;
    private gameState: any;
    private statistics: any;

    constructor() {
        super();
        
        // 初始化协议管理器
        this.protocolManager = new ProtocolManager();
        
        // 游戏状态
        this.gameState = {
            connected: false,
            gameStarted: false,
            currentRound: 0,
            playerId: null,
            playerName: '',
            camp: null,
            lastGameData: null,
            mapData: null
        };

        // 统计信息
        this.statistics = {
            messagesReceived: 0,
            messagesSent: 0,
            actionsExecuted: 0,
            gameResults: [],
            connectionTime: null,
            lastActivity: null
        };

        // 绑定协议管理器事件
        this.bindProtocolManagerEvents();
    }

    /**
     * 绑定协议管理器事件
     */
    bindProtocolManagerEvents() {
        // 游戏开始事件
        this.protocolManager.on('gameStart', (startData) => {
            try {
                console.log('[网络客户端] 收到游戏开始消息');
                const parsedData = MessageParser.parseStartMessage(startData);
                
                this.gameState.gameStarted = true;
                this.gameState.mapData = parsedData.map;
                
                // 找到自己的阵营信息
                const myInfo = parsedData.players.find(p => p.playerId === this.gameState.playerId);
                if (myInfo) {
                    this.gameState.camp = myInfo.camp;
                    console.log(`[网络客户端] 我方阵营: ${myInfo.campName}`);
                }

                this.statistics.messagesReceived++;
                this.statistics.lastActivity = new Date().toISOString();

                // 触发游戏开始事件
                this.emit('gameStart', parsedData);

                // 自动发送准备完成消息
                this.sendReadyMessage();

            } catch (error) {
                console.error('[网络客户端] 处理游戏开始消息错误:', error);
                this.emit('error', error);
            }
        });

        // 询问行动事件
        this.protocolManager.on('inquire', (inquireData) => {
            try {
                console.log(`[网络客户端] 收到第${inquireData.round}回合询问消息`);
                const parsedData = MessageParser.parseInquireMessage(inquireData);
                
                this.gameState.currentRound = parsedData.round;
                this.gameState.lastGameData = parsedData;

                this.statistics.messagesReceived++;
                this.statistics.lastActivity = new Date().toISOString();

                // 触发询问事件，让AI或玩家决策
                this.emit('inquire', parsedData);

            } catch (error) {
                console.error('[网络客户端] 处理询问消息错误:', error);
                this.emit('error', error);
            }
        });

        // 游戏结束事件
        this.protocolManager.on('gameOver', (overData) => {
            try {
                console.log('[网络客户端] 收到游戏结束消息');
                const parsedData = MessageParser.parseOverMessage(overData);
                
                this.gameState.gameStarted = false;
                this.statistics.messagesReceived++;
                this.statistics.gameResults.push(parsedData);

                // 触发游戏结束事件
                this.emit('gameOver', parsedData);

            } catch (error) {
                console.error('[网络客户端] 处理游戏结束消息错误:', error);
                this.emit('error', error);
            }
        });

        // 连接断开事件
        this.protocolManager.on('disconnected', () => {
            console.log('[网络客户端] 连接已断开');
            this.gameState.connected = false;
            this.gameState.gameStarted = false;
            this.emit('disconnected');
        });

        // 未知消息事件
        this.protocolManager.on('unknownMessage', (message) => {
            console.log('[网络客户端] 收到未知消息:', message.msg_name);
            this.emit('unknownMessage', message);
        });
    }

    /**
     * 连接到服务器
     * @param {string} host - 服务器地址
     * @param {number} port - 服务器端口
     * @param {number} playerId - 玩家ID
     * @param {string} playerName - 玩家名称
     * @param {string} [version='1.0'] - 客户端版本
     * @returns {Promise<boolean>} 连接是否成功
     */
    async connect(host, port, playerId, playerName, version = '1.0') {
        try {
            console.log(`[网络客户端] 尝试连接到 ${host}:${port}`);
            
            this.gameState.playerId = playerId;
            this.gameState.playerName = playerName;
            
            const success = await this.protocolManager.connect(host, port, playerId, playerName, version);
            
            if (success) {
                this.gameState.connected = true;
                this.statistics.connectionTime = new Date().toISOString();
                console.log('[网络客户端] 连接成功，已发送注册消息');
                this.emit('connected');
            }

            return success;

        } catch (error) {
            console.error('[网络客户端] 连接失败:', error);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * 发送准备完成消息
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendReadyMessage() {
        try {
            const success = await this.protocolManager.sendReady();
            if (success) {
                this.statistics.messagesSent++;
                console.log('[网络客户端] 准备完成消息已发送');
            }
            return success;
        } catch (error) {
            console.error('[网络客户端] 发送准备消息失败:', error);
            throw error;
        }
    }

    /**
     * 发送行动指令
     * @param {Array} actions - 行动指令数组
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendActions(actions) {
        try {
            if (!Array.isArray(actions)) {
                throw new Error('行动指令必须是数组');
            }

            // 验证所有行动指令
            for (const action of actions) {
                if (!ActionBuilder.validateAction(action)) {
                    throw new Error(`无效的行动指令: ${JSON.stringify(action)}`);
                }
            }

            const success = await this.protocolManager.sendAction(this.gameState.currentRound, actions);
            
            if (success) {
                this.statistics.messagesSent++;
                this.statistics.actionsExecuted += actions.length;
                
                // 记录行动日志
                console.log(`[网络客户端] 第${this.gameState.currentRound}回合行动已发送:`);
                actions.forEach((action, index) => {
                    console.log(`  ${index + 1}. ${ActionBuilder.getActionDescription(action)}`);
                });
            }

            return success;

        } catch (error) {
            console.error('[网络客户端] 发送行动指令失败:', error);
            throw error;
        }
    }

    /**
     * 构建并发送单个行动
     * @param {string} actionType - 行动类型
     * @param {Object} params - 行动参数
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendSingleAction(actionType, params) {
        try {
            let action;

            switch (actionType) {
                case 'MOVE':
                    action = ActionBuilder.buildMoveAction(params.roleId, params.position);
                    break;
                case 'SP':
                    action = ActionBuilder.buildTeleportAction(params.roleId, params.position);
                    break;
                case 'PICK':
                    action = ActionBuilder.buildPickAction(params.roles);
                    break;
                case 'MAKE':
                    action = ActionBuilder.buildMakeAction(params.details);
                    break;
                case 'FORM':
                    action = ActionBuilder.buildFormAction(params.roleId, params.formationType);
                    break;
                case 'BUFF':
                    action = ActionBuilder.buildBuffAction(params.buffType, params.roleId);
                    break;
                case 'AC':
                    action = ActionBuilder.buildOccupyAction();
                    break;
                case 'SG':
                    action = ActionBuilder.buildSiegeAction(params.roleId, params.position);
                    break;
                case 'AD':
                    action = ActionBuilder.buildAttackAction(params.roleId, params.position);
                    break;
                case 'SK':
                    action = ActionBuilder.buildSkillAction(
                        params.roleId, 
                        params.skillId, 
                        params.position, 
                        params.formType, 
                        params.teleportPosition
                    );
                    break;
                default:
                    throw new Error(`未知的行动类型: ${actionType}`);
            }

            return await this.sendActions([action]);

        } catch (error) {
            console.error('[网络客户端] 构建并发送行动失败:', error);
            throw error;
        }
    }

    /**
     * 构建并发送批量行动
     * @param {Array} actionConfigs - 行动配置数组
     * @returns {Promise<boolean>} 发送是否成功
     */
    async sendBatchActions(actionConfigs) {
        try {
            const actions = ActionBuilder.buildBatchActions(actionConfigs);
            return await this.sendActions(actions);
        } catch (error) {
            console.error('[网络客户端] 发送批量行动失败:', error);
            throw error;
        }
    }

    /**
     * 断开连接
     */
    disconnect() {
        console.log('[网络客户端] 断开连接');
        this.protocolManager.disconnect();
        this.gameState.connected = false;
        this.gameState.gameStarted = false;
    }

    /**
     * 检查连接状态
     * @returns {boolean} 是否已连接
     */
    isConnected() {
        return this.gameState.connected && this.protocolManager.isConnectedToServer();
    }

    /**
     * 检查游戏状态
     * @returns {boolean} 游戏是否已开始
     */
    isGameStarted() {
        return this.gameState.gameStarted;
    }

    /**
     * 获取当前游戏状态
     * @returns {Object} 游戏状态对象
     */
    getGameState() {
        return { ...this.gameState };
    }

    /**
     * 获取最新的游戏数据
     * @returns {Object} 最新的inquire消息数据
     */
    getLatestGameData() {
        return this.gameState.lastGameData;
    }

    /**
     * 获取地图数据
     * @returns {Object} 地图数据
     */
    getMapData() {
        return this.gameState.mapData;
    }

    /**
     * 获取我方玩家信息
     * @returns {Object|null} 我方玩家数据
     */
    getMyPlayerData() {
        if (!this.gameState.lastGameData) {
            return null;
        }

        return this.gameState.lastGameData.players.find(
            player => player.playerId === this.gameState.playerId
        ) || null;
    }

    /**
     * 获取敌方玩家信息
     * @returns {Object|null} 敌方玩家数据
     */
    getEnemyPlayerData() {
        if (!this.gameState.lastGameData) {
            return null;
        }

        return this.gameState.lastGameData.players.find(
            player => player.playerId !== this.gameState.playerId
        ) || null;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计数据
     */
    getStatistics() {
        return {
            ...this.statistics,
            currentGameState: this.getGameState(),
            upTime: this.statistics.connectionTime ? 
                Date.now() - new Date(this.statistics.connectionTime).getTime() : 0
        };
    }

    /**
     * 重置统计信息
     */
    resetStatistics() {
        this.statistics = {
            messagesReceived: 0,
            messagesSent: 0,
            actionsExecuted: 0,
            gameResults: [],
            connectionTime: this.statistics.connectionTime, // 保留连接时间
            lastActivity: null
        };
    }

    /**
     * 获取游戏历史记录
     * @returns {Array} 游戏结果数组
     */
    getGameHistory() {
        return [...this.statistics.gameResults];
    }

    /**
     * 获取连接诊断信息
     * @returns {Object} 诊断信息
     */
    getDiagnostics() {
        return {
            isConnected: this.isConnected(),
            isGameStarted: this.isGameStarted(),
            currentRound: this.gameState.currentRound,
            playerId: this.gameState.playerId,
            camp: this.gameState.camp,
            messagesReceived: this.statistics.messagesReceived,
            messagesSent: this.statistics.messagesSent,
            lastActivity: this.statistics.lastActivity,
            socketStatus: this.protocolManager.socket ? {
                readyState: this.protocolManager.socket.readyState,
                destroyed: this.protocolManager.socket.destroyed
            } : null
        };
    }

    /**
     * 导出完整的网络客户端状态
     * @returns {Object} 完整状态数据
     */
    exportState() {
        return {
            gameState: this.getGameState(),
            statistics: this.getStatistics(),
            diagnostics: this.getDiagnostics(),
            timestamp: new Date().toISOString()
        };
    }
}

export default NetworkClient; 