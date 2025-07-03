/**
 * 网络AI客户端
 * 集成网络通信和AI决策系统，提供完整的对战客户端
 */

import NetworkClient from '../network/NetworkClient.js';
import AIController from './AIController.js';
import ActionBuilder from '../network/ActionBuilder.js';
import { FORMATION_TYPES, SOLDIER_TYPES } from '../network/ProtocolManager.js';
import GameEngine from '../core/GameEngine.js';

/**
 * 客户端状态接口
 */
interface ClientState {
    isActive: boolean;
    isConnected: boolean;
    isInGame: boolean;
    autoPlay: boolean;
    aiEnabled: boolean;
    difficulty: string;
    lastDecisionTime: number | null;
    totalDecisions: number;
}

/**
 * 性能指标接口
 */
interface PerformanceMetrics {
    averageDecisionTime: number;
    totalActions: number;
    successfulActions: number;
    errors: number;
}

/**
 * 游戏记录接口
 */
interface GameLog {
    currentGame: any;
    decisions: any[];
    actionHistory: any[];
    performanceMetrics: PerformanceMetrics;
}

/**
 * 网络AI客户端主类
 * 结合网络通信和AI决策，实现自动对战
 */
class NetworkAIClient {
    private networkClient: NetworkClient;
    private aiController: AIController;
    private clientState: ClientState;
    private gameLog: GameLog;

    constructor(difficulty: string = 'expert') {
        // 初始化网络客户端
        this.networkClient = new NetworkClient();
        
        // 创建临时游戏引擎实例供AI使用
        const tempGameEngine = new GameEngine();
        
        // 初始化AI控制器
        this.aiController = new AIController(1, tempGameEngine, difficulty);
        
        // 客户端状态
        this.clientState = {
            isActive: false,
            isConnected: false,
            isInGame: false,
            autoPlay: true,           // 是否自动对战
            aiEnabled: true,          // 是否启用AI
            difficulty: difficulty,
            lastDecisionTime: null,
            totalDecisions: 0
        };

        // 游戏记录
        this.gameLog = {
            currentGame: null,
            decisions: [],
            actionHistory: [],
            performanceMetrics: {
                averageDecisionTime: 0,
                totalActions: 0,
                successfulActions: 0,
                errors: 0
            }
        };

        // 绑定网络事件
        this.bindNetworkEvents();
    }

    /**
     * 绑定网络客户端事件
     */
    bindNetworkEvents() {
        // 连接成功事件
        this.networkClient.on('connected', () => {
            console.log('[AI客户端] 网络连接成功');
            this.clientState.isConnected = true;
        });

        // 游戏开始事件
        this.networkClient.on('gameStart', (gameData) => {
            console.log('[AI客户端] 游戏开始，初始化AI系统');
            this.clientState.isInGame = true;
            this.gameLog.currentGame = {
                startTime: new Date().toISOString(),
                mapData: gameData.map,
                players: gameData.players,
                myPlayerId: this.networkClient.getGameState().playerId,
                myCamp: this.networkClient.getGameState().camp
            };

            // 重置AI系统
            this.aiController.reset();
            
            // 清空游戏日志
            this.gameLog.decisions = [];
            this.gameLog.actionHistory = [];
        });

        // 收到询问消息，AI决策
        this.networkClient.on('inquire', async (gameData) => {
            if (!this.clientState.aiEnabled || !this.clientState.autoPlay) {
                console.log('[AI客户端] AI已禁用或非自动模式，跳过决策');
                return;
            }

            try {
                console.log(`[AI客户端] 第${gameData.round}回合开始AI决策`);
                await this.handleInquire(gameData);
            } catch (error) {
                console.error('[AI客户端] AI决策处理错误:', error);
                this.gameLog.performanceMetrics.errors++;
                
                // 发送空行动避免超时
                await this.sendEmptyAction();
            }
        });

        // 游戏结束事件
        this.networkClient.on('gameOver', (gameResult) => {
            console.log('[AI客户端] 游戏结束');
            this.clientState.isInGame = false;
            
            // 更新游戏记录
            if (this.gameLog.currentGame) {
                this.gameLog.currentGame.endTime = new Date().toISOString();
                this.gameLog.currentGame.result = gameResult;
                this.gameLog.currentGame.performanceMetrics = { ...this.gameLog.performanceMetrics };
            }

            // 打印游戏总结
            this.printGameSummary(gameResult);
        });

        // 连接断开事件
        this.networkClient.on('disconnected', () => {
            console.log('[AI客户端] 网络连接断开');
            this.clientState.isConnected = false;
            this.clientState.isInGame = false;
        });

        // 错误事件
        this.networkClient.on('error', (error) => {
            console.error('[AI客户端] 网络错误:', error);
            this.gameLog.performanceMetrics.errors++;
        });
    }

    /**
     * 连接到服务器并开始对战
     * @param {string} host - 服务器地址
     * @param {number} port - 服务器端口
     * @param {number} playerId - 玩家ID
     * @param {string} playerName - 玩家名称
     * @param {string} [version='1.0'] - 客户端版本
     * @returns {Promise<boolean>} 连接是否成功
     */
    async connect(host, port, playerId, playerName, version = '1.0') {
        try {
            console.log(`[AI客户端] 尝试连接服务器: ${host}:${port}`);
            console.log(`[AI客户端] 玩家信息: ID=${playerId}, 名称=${playerName}, AI难度=${this.clientState.difficulty}`);
            
            const success = await this.networkClient.connect(host, port, playerId, playerName, version);
            
            if (success) {
                this.clientState.isActive = true;
                console.log('[AI客户端] 连接成功，等待游戏开始...');
            }
            
            return success;
        } catch (error) {
            console.error('[AI客户端] 连接失败:', error);
            return false;
        }
    }

    /**
     * 处理询问消息，执行AI决策
     * @param {Object} gameData - 游戏状态数据
     */
    async handleInquire(gameData) {
        const startTime = Date.now();
        
        try {
            // 转换游戏数据格式给AI系统
            const aiGameState = this.convertToAIGameState(gameData);
            
            // AI决策 (暂时使用空数组，需要实现makeDecision方法)
            const decisions: any[] = []; // await this.aiController.makeDecision(aiGameState);
            
            // 记录决策信息
            const decisionTime = Date.now() - startTime;
            this.recordDecision(gameData.round, decisions, decisionTime);

            // 转换AI决策为网络协议行动
            const actions = this.convertDecisionsToActions(decisions);
            
            // 发送行动指令
            if (actions.length > 0) {
                const success = await this.networkClient.sendActions(actions);
                
                if (success) {
                    this.gameLog.performanceMetrics.successfulActions += actions.length;
                    console.log(`[AI客户端] 第${gameData.round}回合行动发送成功，耗时${decisionTime}ms`);
                } else {
                    console.error(`[AI客户端] 第${gameData.round}回合行动发送失败`);
                }
            } else {
                console.log(`[AI客户端] 第${gameData.round}回合无需行动`);
                // 发送空行动确认
                await this.sendEmptyAction();
            }

        } catch (error) {
            console.error(`[AI客户端] 第${gameData.round}回合AI决策失败:`, error);
            throw error;
        }
    }

    /**
     * 转换网络游戏数据为AI系统格式
     * @param {Object} gameData - 网络游戏数据
     * @returns {Object} AI系统游戏状态
     */
    convertToAIGameState(gameData) {
        const myPlayer = this.networkClient.getMyPlayerData();
        const enemyPlayer = this.networkClient.getEnemyPlayerData();
        const mapData = this.networkClient.getMapData();

        if (!myPlayer || !enemyPlayer || !mapData) {
            throw new Error('缺少必要的游戏数据');
        }

        return {
            currentRound: gameData.round,
            mapWidth: mapData.width,
            mapHeight: mapData.height,
            myPlayerId: myPlayer.playerId,
            enemyPlayerId: enemyPlayer.playerId,
            
            // 我方信息
            mySupplies: myPlayer.supplies,
            myMorale: myPlayer.morale,
            myHeroes: myPlayer.roles.map(role => this.convertRoleToAI(role)),
            
            // 敌方信息
            enemySupplies: enemyPlayer.supplies,
            enemyMorale: enemyPlayer.morale,
            enemyHeroes: enemyPlayer.roles.map(role => this.convertRoleToAI(role)),
            
            // 地图信息
            mapGrid: mapData.grid,
            specialLocations: mapData.specialLocations,
            
            // 城寨和据点信息
            cities: gameData.cityProps || [],
            stronghold: gameData.stronghold,
            
            // 游戏阶段
            gamePhase: this.determineGamePhase(gameData.round),
            
            // 历史信息
            actionHistory: this.gameLog.actionHistory
        };
    }

    /**
     * 转换英雄数据为AI格式
     * @param {Object} role - 网络英雄数据
     * @returns {Object} AI英雄数据
     */
    convertRoleToAI(role) {
        return {
            id: role.roleId,
            name: this.getHeroName(role.roleId),
            position: role.position,
            life: role.life,
            maxLife: role.maxLife,
            attack: role.attack,
            commander: role.commander,
            formationType: role.formationType,
            isAlive: role.isAlive,
            isReviving: role.isReviving,
            reviveRound: role.reviveRound,
            skills: role.skills,
            soldiers: role.soldiers,
            statuses: role.statuses
        };
    }

    /**
     * 转换AI决策为网络协议行动
     * @param {Array} decisions - AI决策列表
     * @returns {Array} 网络协议行动数组
     */
    convertDecisionsToActions(decisions: any[]): any[] {
        const actions: any[] = [];

        for (const decision of decisions) {
            try {
                let action: any = null;

                switch (decision.type) {
                    case 'PICK':
                        action = ActionBuilder.buildPickAction(decision.heroIds);
                        break;
                    
                    case 'MAKE':
                        action = ActionBuilder.buildMakeAction(decision.productionDetails);
                        break;
                    
                    case 'MOVE':
                        action = ActionBuilder.buildMoveAction(decision.heroId, decision.position);
                        break;
                    
                    case 'ATTACK':
                        action = ActionBuilder.buildAttackAction(decision.heroId, decision.position);
                        break;
                    
                    case 'SKILL':
                        action = ActionBuilder.buildSkillAction(
                            decision.heroId,
                            decision.skillId,
                            decision.position,
                            decision.formType,
                            decision.teleportPosition
                        );
                        break;
                    
                    case 'FORM':
                        action = ActionBuilder.buildFormAction(decision.heroId, decision.formationType);
                        break;
                    
                    case 'OCCUPY':
                        action = ActionBuilder.buildOccupyAction();
                        break;
                    
                    case 'SIEGE':
                        action = ActionBuilder.buildSiegeAction(decision.heroId, decision.position);
                        break;

                    case 'BUFF':
                        action = ActionBuilder.buildBuffAction(decision.buffType, decision.heroId);
                        break;

                    default:
                        console.warn(`[AI客户端] 未知的决策类型: ${decision.type}`);
                        continue;
                }

                if (action) {
                    actions.push(action);
                }

            } catch (error) {
                console.error(`[AI客户端] 转换决策失败:`, decision, error);
            }
        }

        return actions;
    }

    /**
     * 发送空行动（确认回合结束）
     */
    async sendEmptyAction() {
        try {
            return await this.networkClient.sendActions([]);
        } catch (error) {
            console.error('[AI客户端] 发送空行动失败:', error);
            return false;
        }
    }

    /**
     * 记录AI决策信息
     * @param {number} round - 回合数
     * @param {Array} decisions - 决策列表
     * @param {number} decisionTime - 决策耗时(ms)
     */
    recordDecision(round, decisions, decisionTime) {
        const decisionRecord = {
            round: round,
            timestamp: new Date().toISOString(),
            decisions: [...decisions],
            decisionTime: decisionTime,
            actionCount: decisions.length
        };

        this.gameLog.decisions.push(decisionRecord);
        
        // 更新统计信息
        this.clientState.lastDecisionTime = decisionTime;
        this.clientState.totalDecisions++;
        this.gameLog.performanceMetrics.totalActions += decisions.length;
        
        // 更新平均决策时间
        const totalDecisions = this.gameLog.decisions.length;
        const totalTime = this.gameLog.decisions.reduce((sum, d) => sum + d.decisionTime, 0);
        this.gameLog.performanceMetrics.averageDecisionTime = totalTime / totalDecisions;
    }

    /**
     * 确定游戏阶段
     * @param {number} round - 当前回合数
     * @returns {string} 游戏阶段
     */
    determineGamePhase(round) {
        if (round <= 50) return 'early';
        if (round <= 200) return 'middle';
        return 'late';
    }

    /**
     * 获取英雄名称
     * @param {number} roleId - 英雄ID
     * @returns {string} 英雄名称
     */
    getHeroName(roleId) {
        const names = {
            40: '吕布', 41: '赵云', 42: '关羽',
            43: '刘备', 44: '曹操', 45: '孙权',
            46: '诸葛亮', 47: '周瑜', 48: '司马懿'
        };
        return names[roleId] || `英雄${roleId}`;
    }

    /**
     * 打印游戏总结
     * @param {Object} gameResult - 游戏结果
     */
    printGameSummary(gameResult) {
        console.log('\n========== AI客户端游戏总结 ==========');
        console.log(`游戏时长: ${this.gameLog.currentGame ? 
            new Date(this.gameLog.currentGame.endTime).getTime() - new Date(this.gameLog.currentGame.startTime).getTime() : 0}ms`);
        
        // 找到我方结果
        const myResult = gameResult.players.find(p => 
            p.playerId === this.networkClient.getGameState().playerId
        );
        
        if (myResult) {
            console.log(`我方排名: 第${myResult.rank || '?'}名`);
            console.log(`占点进度: ${(myResult.progress * 100).toFixed(2)}%`);
            console.log(`击杀数量: ${myResult.killedNum}`);
            console.log(`占领回合: ${myResult.occupyRound}`);
        }

        // AI性能统计
        console.log('\n--- AI性能统计 ---');
        console.log(`总决策次数: ${this.clientState.totalDecisions}`);
        console.log(`平均决策时间: ${this.gameLog.performanceMetrics.averageDecisionTime.toFixed(2)}ms`);
        console.log(`总行动数: ${this.gameLog.performanceMetrics.totalActions}`);
        console.log(`成功行动数: ${this.gameLog.performanceMetrics.successfulActions}`);
        console.log(`错误次数: ${this.gameLog.performanceMetrics.errors}`);
        console.log(`行动成功率: ${this.gameLog.performanceMetrics.totalActions > 0 ? 
            (this.gameLog.performanceMetrics.successfulActions / this.gameLog.performanceMetrics.totalActions * 100).toFixed(2) : 0}%`);
        
        // 获胜者信息
        if (gameResult.winner && gameResult.winner.winner) {
            const winner = gameResult.winner.winner;
            const isWinner = winner.playerId === this.networkClient.getGameState().playerId;
            console.log(`\n游戏结果: ${isWinner ? '🎉 胜利!' : '💀 失败'}`);
            console.log(`获胜者: ${winner.playerName} (ID: ${winner.playerId})`);
        }
        
        console.log('=====================================\n');
    }

    /**
     * 断开连接
     */
    disconnect() {
        console.log('[AI客户端] 断开连接');
        this.clientState.isActive = false;
        this.networkClient.disconnect();
    }

    /**
     * 启用/禁用AI
     * @param {boolean} enabled - 是否启用AI
     */
    setAIEnabled(enabled) {
        this.clientState.aiEnabled = enabled;
        console.log(`[AI客户端] AI${enabled ? '已启用' : '已禁用'}`);
    }

    /**
     * 设置自动对战模式
     * @param {boolean} autoPlay - 是否自动对战
     */
    setAutoPlay(autoPlay) {
        this.clientState.autoPlay = autoPlay;
        console.log(`[AI客户端] 自动对战${autoPlay ? '已启用' : '已禁用'}`);
    }

    /**
     * 更改AI难度
     * @param {string} difficulty - 新的难度等级
     */
    setDifficulty(difficulty) {
        this.aiController.setDifficulty(difficulty);
        this.clientState.difficulty = difficulty;
        console.log(`[AI客户端] AI难度已更改为: ${difficulty}`);
    }

    /**
     * 获取客户端状态
     * @returns {Object} 客户端状态信息
     */
    getClientState() {
        return {
            ...this.clientState,
            networkState: this.networkClient.getGameState(),
            networkStats: this.networkClient.getStatistics(),
            gameLog: this.gameLog,
            aiStats: {} // this.aiController.getStatistics() - 方法未实现
        };
    }

    /**
     * 获取详细的诊断信息
     * @returns {Object} 诊断信息
     */
    getDiagnostics() {
        return {
            client: this.getClientState(),
            network: this.networkClient.getDiagnostics(),
            ai: {}, // this.aiController.getDiagnostics() - 方法未实现
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 导出完整状态数据
     * @returns {Object} 完整状态数据
     */
    exportFullState() {
        return {
            clientState: this.getClientState(),
            diagnostics: this.getDiagnostics(),
            gameHistory: this.networkClient.getGameHistory(),
            timestamp: new Date().toISOString()
        };
    }
}

export default NetworkAIClient; 