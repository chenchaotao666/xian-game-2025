/**
 * 网络客户端测试
 * 测试所有网络通信相关功能
 */

const NetworkClient = require('../src/network/NetworkClient');
const NetworkAIClient = require('../src/ai/NetworkAIClient');
const ActionBuilder = require('../src/network/ActionBuilder');
const MessageParser = require('../src/network/MessageParser');
const { ProtocolManager, TERRAIN_TYPES, ACTION_TYPES, CAMP_TYPES } = require('../src/network/ProtocolManager');

describe('网络通信系统测试', () => {
    
    describe('协议管理器测试', () => {
        let protocolManager;
        
        beforeEach(() => {
            protocolManager = new ProtocolManager();
        });
        
        afterEach(() => {
            if (protocolManager) {
                protocolManager.disconnect();
            }
        });
        
        test('协议管理器初始化', () => {
            expect(protocolManager).toBeDefined();
            expect(protocolManager.socket).toBeNull();
            expect(protocolManager.isConnected).toBe(false);
            expect(protocolManager.buffer).toBeDefined();
        });
        
        test('常量定义正确', () => {
            expect(TERRAIN_TYPES.SPACE).toBe(0);
            expect(TERRAIN_TYPES.FLAG).toBe(3);
            expect(ACTION_TYPES.MOVE).toBe('MOVE');
            expect(CAMP_TYPES.RED).toBe(0);
        });
        
        test('消息长度格式化', () => {
            const testMessage = { test: 'data' };
            const messageStr = JSON.stringify(testMessage);
            const messageLength = Buffer.from(messageStr, 'utf8').length;
            const lengthStr = messageLength.toString().padStart(5, '0');
            
            expect(lengthStr).toHaveLength(5);
            expect(lengthStr).toMatch(/^\d{5}$/);
        });
    });
    
    describe('行动构建器测试', () => {
        
        test('构建移动行动', () => {
            const action = ActionBuilder.buildMoveAction(40, { x: 10, y: 20 });
            
            expect(action).toEqual({
                roleId: 40,
                action: 'MOVE',
                position: { x: 10, y: 20 }
            });
            expect(ActionBuilder.validateAction(action)).toBe(true);
        });
        
        test('构建选择阵容行动', () => {
            const action = ActionBuilder.buildPickAction([40, 43, 46]);
            
            expect(action).toEqual({
                action: 'PICK',
                roles: [40, 43, 46]
            });
            expect(ActionBuilder.validateAction(action)).toBe(true);
        });
        
        test('构建生产兵力行动', () => {
            const productionDetails = [
                { roleId: 40, soldiers: [7, 8] }
            ];
            const action = ActionBuilder.buildMakeAction(productionDetails);
            
            expect(action.action).toBe('MAKE');
            expect(action.details).toHaveLength(1);
            expect(action.details[0].roleId).toBe(40);
            expect(ActionBuilder.validateAction(action)).toBe(true);
        });
        
        test('构建技能行动', () => {
            const action = ActionBuilder.buildSkillAction(40, 4001, { x: 15, y: 25 });
            
            expect(action).toEqual({
                roleId: 40,
                action: 'SK',
                skillId: 4001,
                position: { x: 15, y: 25 }
            });
            expect(ActionBuilder.validateAction(action)).toBe(true);
        });
        
        test('构建刘备技能（带传送位置）', () => {
            const action = ActionBuilder.buildSkillAction(
                43, 4301, { x: 10, y: 10 }, null, { x: 20, y: 20 }
            );
            
            expect(action.skillId).toBe(4301);
            expect(action.teleportPosition).toEqual({ x: 20, y: 20 });
            expect(ActionBuilder.validateAction(action)).toBe(true);
        });
        
        test('批量构建行动', () => {
            const configs = [
                { type: 'MOVE', roleId: 40, position: { x: 5, y: 5 } },
                { type: 'AD', roleId: 40, position: { x: 6, y: 5 } },
                { type: 'FORM', roleId: 40, formationType: 1 }
            ];
            
            const actions = ActionBuilder.buildBatchActions(configs);
            
            expect(actions).toHaveLength(3);
            expect(actions[0].action).toBe('MOVE');
            expect(actions[1].action).toBe('AD');
            expect(actions[2].action).toBe('FORM');
            
            actions.forEach(action => {
                expect(ActionBuilder.validateAction(action)).toBe(true);
            });
        });
        
        test('获取行动描述', () => {
            const moveAction = ActionBuilder.buildMoveAction(40, { x: 10, y: 20 });
            const description = ActionBuilder.getActionDescription(moveAction);
            
            expect(description).toContain('英雄40');
            expect(description).toContain('移动到');
            expect(description).toContain('(10,20)');
        });
        
        test('无效参数抛出错误', () => {
            expect(() => {
                ActionBuilder.buildMoveAction(null, { x: 10, y: 20 });
            }).toThrow();
            
            expect(() => {
                ActionBuilder.buildPickAction([40, 43]); // 需要3个英雄
            }).toThrow();
            
            expect(() => {
                ActionBuilder.buildMakeAction([]); // 空数组
            }).toThrow();
        });
    });
    
    describe('消息解析器测试', () => {
        
        test('解析start消息', () => {
            const mockStartData = {
                map: {
                    data: "0,1,0,3,0,1",
                    maxX: 2,
                    maxY: 1
                },
                players: [
                    { playerId: 1001, camp: 0 }
                ]
            };
            
            const parsed = MessageParser.parseStartMessage(mockStartData);
            
            expect(parsed.map.width).toBe(3);
            expect(parsed.map.height).toBe(2);
            expect(parsed.players).toHaveLength(1);
            expect(parsed.players[0].campName).toBe('红方');
        });
        
        test('解析inquire消息', () => {
            const mockInquireData = {
                round: 5,
                players: [
                    {
                        playerId: 1001,
                        supplies: 200,
                        morale: 100,
                        roles: [
                            {
                                roleId: 40,
                                attack: 100,
                                position: { x: 10, y: 15 },
                                life: 1400,
                                maxLife: 1500,
                                camp: 0,
                                reviveRound: 0,
                                formationType: 1,
                                commander: 6,
                                statuses: {},
                                skills: [],
                                solderProps: []
                            }
                        ]
                    }
                ]
            };
            
            const parsed = MessageParser.parseInquireMessage(mockInquireData);
            
            expect(parsed.round).toBe(5);
            expect(parsed.players).toHaveLength(1);
            
            const player = parsed.players[0];
            expect(player.playerId).toBe(1001);
            expect(player.supplies).toBe(200);
        });
        
        test('解析游戏结束消息', () => {
            const mockOverData = {
                players: [
                    {
                        playerId: 1001,
                        playerName: '玩家1',
                        online: true,
                        progress: 0.8,
                        killedNum: 5,
                        occupyRound: 50,
                        heroes: []
                    },
                    {
                        playerId: 1002,
                        playerName: '玩家2',
                        online: true,
                        progress: 0.3,
                        killedNum: 2,
                        occupyRound: 20,
                        heroes: []
                    }
                ]
            };
            
            const parsed = MessageParser.parseOverMessage(mockOverData);
            
            expect(parsed.players).toHaveLength(2);
            expect(parsed.winner.winner.playerId).toBe(1001); // 进度更高的获胜
            expect(parsed.winner.rankings[0].rank).toBe(1);
            expect(parsed.winner.rankings[1].rank).toBe(2);
        });
        
        test('地形名称和可通行性', () => {
            expect(MessageParser.getTerrainName(0)).toBe('空地');
            expect(MessageParser.getTerrainName(3)).toBe('龙旗据点');
            expect(MessageParser.isTerrainWalkable(0)).toBe(true);
            expect(MessageParser.isTerrainWalkable(1)).toBe(false); // 山丘
            expect(MessageParser.isTerrainWalkable(2)).toBe(false); // 水域
        });
    });
    
    describe('网络客户端测试', () => {
        let networkClient;
        
        beforeEach(() => {
            networkClient = new NetworkClient();
        });
        
        afterEach(() => {
            if (networkClient) {
                networkClient.disconnect();
            }
        });
        
        test('网络客户端初始化', () => {
            expect(networkClient).toBeDefined();
            expect(networkClient.isConnected()).toBe(false);
            expect(networkClient.isGameStarted()).toBe(false);
        });
        
        test('游戏状态管理', () => {
            const state = networkClient.getGameState();
            expect(state.connected).toBe(false);
            expect(state.gameStarted).toBe(false);
            expect(state.currentRound).toBe(0);
        });
        
        test('统计信息管理', () => {
            // 模拟统计数据
            networkClient.statistics.messagesReceived = 5;
            networkClient.statistics.messagesSent = 3;
            networkClient.statistics.actionsExecuted = 10;
            
            const stats = networkClient.getStatistics();
            expect(stats.messagesReceived).toBe(5);
            expect(stats.messagesSent).toBe(3);
            expect(stats.actionsExecuted).toBe(10);
            
            networkClient.resetStatistics();
            const resetStats = networkClient.getStatistics();
            expect(resetStats.messagesReceived).toBe(0);
            expect(resetStats.messagesSent).toBe(0);
            expect(resetStats.actionsExecuted).toBe(0);
        });
        
        test('诊断信息', () => {
            const diagnostics = networkClient.getDiagnostics();
            
            expect(diagnostics).toHaveProperty('isConnected');
            expect(diagnostics).toHaveProperty('isGameStarted');
            expect(diagnostics).toHaveProperty('currentRound');
            expect(diagnostics).toHaveProperty('messagesReceived');
            expect(diagnostics).toHaveProperty('messagesSent');
        });
    });
    
    describe('网络AI客户端测试', () => {
        let aiClient;
        
        beforeEach(() => {
            aiClient = new NetworkAIClient('expert');
        });
        
        afterEach(() => {
            if (aiClient) {
                aiClient.disconnect();
            }
        });
        
        test('AI客户端初始化', () => {
            expect(aiClient).toBeDefined();
            expect(aiClient.clientState.difficulty).toBe('expert');
            expect(aiClient.clientState.aiEnabled).toBe(true);
        });
        
        test('AI设置修改', () => {
            aiClient.setAIEnabled(false);
            expect(aiClient.clientState.aiEnabled).toBe(false);
            
            aiClient.setDifficulty('hard');
            expect(aiClient.clientState.difficulty).toBe('hard');
        });
        
        test('游戏阶段判断', () => {
            expect(aiClient.determineGamePhase(25)).toBe('early');
            expect(aiClient.determineGamePhase(100)).toBe('middle');
            expect(aiClient.determineGamePhase(300)).toBe('late');
        });
        
        test('英雄名称获取', () => {
            expect(aiClient.getHeroName(40)).toBe('吕布');
            expect(aiClient.getHeroName(43)).toBe('刘备');
            expect(aiClient.getHeroName(46)).toBe('诸葛亮');
            expect(aiClient.getHeroName(99)).toBe('英雄99');
        });
        
        test('决策记录', () => {
            const decisions = [
                { type: 'MOVE', heroId: 40, position: { x: 10, y: 10 } },
                { type: 'ATTACK', heroId: 40, position: { x: 11, y: 10 } }
            ];
            
            aiClient.recordDecision(1, decisions, 150);
            
            expect(aiClient.gameLog.decisions).toHaveLength(1);
            expect(aiClient.gameLog.decisions[0].round).toBe(1);
            expect(aiClient.gameLog.decisions[0].decisionTime).toBe(150);
            expect(aiClient.gameLog.decisions[0].actionCount).toBe(2);
            expect(aiClient.clientState.totalDecisions).toBe(1);
        });
        
        test('AI决策转换为网络行动', () => {
            const decisions = [
                { type: 'PICK', heroIds: [40, 43, 46] },
                { type: 'MOVE', heroId: 40, position: { x: 10, y: 10 } },
                { type: 'ATTACK', heroId: 40, position: { x: 11, y: 10 } }
            ];
            
            const actions = aiClient.convertDecisionsToActions(decisions);
            
            expect(actions).toHaveLength(3);
            expect(actions[0].action).toBe('PICK');
            expect(actions[1].action).toBe('MOVE');
            expect(actions[2].action).toBe('AD');
            
            actions.forEach(action => {
                expect(ActionBuilder.validateAction(action)).toBe(true);
            });
        });
        
        test('客户端状态导出', () => {
            const state = aiClient.getClientState();
            
            expect(state).toHaveProperty('isActive');
            expect(state).toHaveProperty('aiEnabled');
            expect(state).toHaveProperty('difficulty');
            expect(state).toHaveProperty('networkState');
            expect(state).toHaveProperty('gameLog');
        });
        
        test('完整状态导出', () => {
            const fullState = aiClient.exportFullState();
            
            expect(fullState).toHaveProperty('clientState');
            expect(fullState).toHaveProperty('diagnostics');
            expect(fullState).toHaveProperty('gameHistory');
            expect(fullState).toHaveProperty('timestamp');
            expect(fullState.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });
    
    describe('集成测试', () => {
        
        test('完整的消息流程', () => {
            const client = new NetworkClient();
            let eventCount = 0;
            
            // 模拟事件处理
            client.on('connected', () => eventCount++);
            client.on('gameStart', () => eventCount++);
            client.on('inquire', () => eventCount++);
            client.on('gameOver', () => eventCount++);
            
            // 模拟事件触发
            client.emit('connected');
            client.emit('gameStart', { map: { width: 10, height: 10 }, players: [] });
            client.emit('inquire', { round: 1, players: [] });
            client.emit('gameOver', { players: [] });
            
            expect(eventCount).toBe(4);
        });
        
        test('行动构建和验证流程', () => {
            // 构建一系列行动
            const actions = [
                ActionBuilder.buildPickAction([40, 43, 46]),
                ActionBuilder.buildMakeAction([{ roleId: 40, soldiers: [7, 8] }]),
                ActionBuilder.buildMoveAction(40, { x: 10, y: 10 }),
                ActionBuilder.buildAttackAction(40, { x: 11, y: 10 }),
                ActionBuilder.buildSkillAction(40, 4001, { x: 12, y: 10 })
            ];
            
            // 验证所有行动
            actions.forEach(action => {
                expect(ActionBuilder.validateAction(action)).toBe(true);
                expect(ActionBuilder.getActionDescription(action)).toBeTruthy();
            });
            
            // 确保行动类型不同
            const actionTypes = actions.map(a => a.action);
            expect(new Set(actionTypes).size).toBe(actions.length);
        });
        
        test('错误处理', () => {
            // 测试无效消息解析
            expect(() => {
                MessageParser.parseStartMessage(null);
            }).toThrow();
            
            expect(() => {
                MessageParser.parseInquireMessage({ invalid: 'data' });
            }).toThrow();
            
            // 测试无效行动构建
            expect(() => {
                ActionBuilder.buildMoveAction(null, null);
            }).toThrow();
            
            expect(() => {
                ActionBuilder.buildPickAction([40]); // 不足3个英雄
            }).toThrow();
        });
    });
});

// 性能测试
describe('性能测试', () => {
    
    test('大量行动构建性能', () => {
        const startTime = Date.now();
        const actions = [];
        
        for (let i = 0; i < 1000; i++) {
            actions.push(ActionBuilder.buildMoveAction(40, { x: i % 80, y: i % 60 }));
        }
        
        const duration = Date.now() - startTime;
        
        expect(actions).toHaveLength(1000);
        expect(duration).toBeLessThan(1000); // 应该在1秒内完成
        
        // 验证所有行动都有效
        actions.forEach(action => {
            expect(ActionBuilder.validateAction(action)).toBe(true);
        });
    });
    
    test('消息解析性能', () => {
        const mockInquireData = {
            round: 100,
            players: Array.from({ length: 2 }, (_, i) => ({
                playerId: 1000 + i,
                supplies: 500,
                morale: 200,
                roles: Array.from({ length: 3 }, (_, j) => ({
                    roleId: 40 + j,
                    attack: 100,
                    position: { x: 10 + j, y: 15 + j },
                    life: 1400,
                    maxLife: 1500,
                    camp: i,
                    reviveRound: 0,
                    formationType: 1,
                    commander: 6,
                    statuses: {},
                    skills: [],
                    solderProps: Array.from({ length: 5 }, (_, k) => ({
                        roleId: 7 + (k % 2),
                        attack: 25,
                        heroId: 40 + j,
                        life: 240
                    }))
                }))
            }))
        };
        
        const startTime = Date.now();
        
        for (let i = 0; i < 100; i++) {
            const parsed = MessageParser.parseInquireMessage(mockInquireData);
            expect(parsed.round).toBe(100);
            expect(parsed.players).toHaveLength(2);
        }
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // 100次解析应该在1秒内完成
    });
});

module.exports = {}; 