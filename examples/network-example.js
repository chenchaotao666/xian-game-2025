/**
 * 网络通信示例
 * 展示如何使用通信协议的所有功能
 */

const NetworkAIClient = require('../src/ai/NetworkAIClient');
const NetworkClient = require('../src/network/NetworkClient');
const ActionBuilder = require('../src/network/ActionBuilder');
const MessageParser = require('../src/network/MessageParser');

/**
 * 基础网络通信示例
 */
async function basicNetworkExample() {
    console.log('========== 基础网络通信示例 ==========\n');
    
    const client = new NetworkClient();
    
    // 监听事件
    client.on('connected', () => {
        console.log('✅ 客户端连接成功');
    });
    
    client.on('gameStart', (gameData) => {
        console.log('🎮 游戏开始，地图尺寸:', gameData.map.width, 'x', gameData.map.height);
        console.log('🏳️ 特殊位置:', gameData.map.specialLocations);
    });
    
    client.on('inquire', async (gameData) => {
        console.log(`⏰ 第${gameData.round}回合询问`);
        
        // 构建示例行动
        const actions = [];
        
        // 如果是第一回合，选择阵容
        if (gameData.round === 1) {
            actions.push(ActionBuilder.buildPickAction([40, 43, 46])); // 吕布、刘备、诸葛亮
        }
        
        // 生产兵力
        const myPlayer = client.getMyPlayerData();
        if (myPlayer && myPlayer.supplies >= 60) {
            actions.push(ActionBuilder.buildMakeAction([
                { roleId: 40, soldiers: [7, 8] }, // 吕布带弓兵和盾兵
                { roleId: 43, soldiers: [8, 8] }  // 刘备带两个盾兵
            ]));
        }
        
        // 移动英雄
        if (myPlayer && myPlayer.roles.length > 0) {
            const hero = myPlayer.roles.find(r => r.isAlive && r.position);
            if (hero) {
                actions.push(ActionBuilder.buildMoveAction(hero.roleId, {
                    x: hero.position.x + 1,
                    y: hero.position.y
                }));
            }
        }
        
        // 发送行动
        if (actions.length > 0) {
            await client.sendActions(actions);
        } else {
            await client.sendActions([]); // 发送空行动
        }
    });
    
    client.on('gameOver', (result) => {
        console.log('🏁 游戏结束');
        console.log('🏆 获胜者:', result.winner.winner?.playerName || '未知');
        client.disconnect();
    });
    
    // 模拟连接（实际使用时需要真实的服务器地址）
    console.log('📡 尝试连接服务器...');
    console.log('⚠️ 注意：这是示例代码，需要真实的服务器才能实际连接\n');
    
    // 实际连接代码（需要真实服务器）:
    // await client.connect('127.0.0.1', 8080, 1001, 'TestPlayer');
}

/**
 * AI客户端示例
 */
async function aiClientExample() {
    console.log('========== AI客户端示例 ==========\n');
    
    const aiClient = new NetworkAIClient('expert');
    
    // 监听事件
    aiClient.on('connected', () => {
        console.log('✅ AI客户端连接成功');
    });
    
    aiClient.on('gameStart', (gameData) => {
        console.log('🤖 AI游戏开始，地图信息已加载');
        console.log('🧠 AI难度:', aiClient.getClientState().difficulty);
    });
    
    aiClient.on('inquire', (gameData) => {
        console.log(`🎯 AI正在分析第${gameData.round}回合...`);
    });
    
    aiClient.on('gameOver', (result) => {
        console.log('🏁 AI游戏结束');
        
        // 显示AI性能
        const state = aiClient.getClientState();
        console.log('📊 AI性能统计:');
        console.log(`  - 决策次数: ${state.totalDecisions}`);
        console.log(`  - 平均决策时间: ${state.gameLog.performanceMetrics.averageDecisionTime.toFixed(2)}ms`);
        console.log(`  - 行动成功率: ${state.gameLog.performanceMetrics.totalActions > 0 ? 
            (state.gameLog.performanceMetrics.successfulActions / state.gameLog.performanceMetrics.totalActions * 100).toFixed(2) : 0}%`);
    });
    
    // 模拟连接
    console.log('🤖 AI客户端准备连接...');
    console.log('⚠️ 注意：这是示例代码，需要真实的服务器才能实际连接\n');
    
    // 实际连接代码（需要真实服务器）:
    // await aiClient.connect('127.0.0.1', 8080, 1002, 'AIPlayer');
}

/**
 * 行动构建器示例
 */
function actionBuilderExample() {
    console.log('========== 行动构建器示例 ==========\n');
    
    try {
        // 构建移动行动
        const moveAction = ActionBuilder.buildMoveAction(40, { x: 10, y: 20 });
        console.log('🚶 移动行动:', ActionBuilder.getActionDescription(moveAction));
        console.log('📝 行动对象:', JSON.stringify(moveAction, null, 2));
        
        // 构建选择阵容行动
        const pickAction = ActionBuilder.buildPickAction([40, 43, 46]);
        console.log('\n👥 选择阵容:', ActionBuilder.getActionDescription(pickAction));
        
        // 构建生产兵力行动
        const makeAction = ActionBuilder.buildMakeAction([
            { roleId: 40, soldiers: [7, 8] },
            { roleId: 43, soldiers: [8, 8, 8] }
        ]);
        console.log('\n🏭 生产兵力:', ActionBuilder.getActionDescription(makeAction));
        
        // 构建技能行动
        const skillAction = ActionBuilder.buildSkillAction(40, 4001, { x: 15, y: 25 });
        console.log('\n⚡ 技能攻击:', ActionBuilder.getActionDescription(skillAction));
        
        // 批量构建行动
        const batchActions = ActionBuilder.buildBatchActions([
            { type: 'MOVE', roleId: 40, position: { x: 5, y: 5 } },
            { type: 'AD', roleId: 40, position: { x: 6, y: 5 } },
            { type: 'FORM', roleId: 40, formationType: 1 }
        ]);
        
        console.log('\n📦 批量行动:');
        batchActions.forEach((action, index) => {
            console.log(`  ${index + 1}. ${ActionBuilder.getActionDescription(action)}`);
        });
        
        // 验证行动
        console.log('\n✅ 行动验证:');
        console.log('移动行动有效:', ActionBuilder.validateAction(moveAction));
        console.log('技能行动有效:', ActionBuilder.validateAction(skillAction));
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ 行动构建错误:', error.message);
    }
}

/**
 * 消息解析器示例
 */
function messageParserExample() {
    console.log('========== 消息解析器示例 ==========\n');
    
    // 模拟start消息数据
    const mockStartData = {
        map: {
            data: "0,0,1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0",
            maxX: 5,
            maxY: 3
        },
        players: [
            { playerId: 1001, camp: 0 },
            { playerId: 1002, camp: 1 }
        ]
    };
    
    try {
        const parsedStart = MessageParser.parseStartMessage(mockStartData);
        console.log('🗺️ 解析start消息:');
        console.log(`  地图尺寸: ${parsedStart.map.width}x${parsedStart.map.height}`);
        console.log(`  玩家数量: ${parsedStart.players.length}`);
        console.log(`  特殊位置: ${JSON.stringify(parsedStart.map.specialLocations)}`);
        
        // 模拟inquire消息数据
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
                            skills: [
                                {
                                    skillId: 4001,
                                    cd: 3,
                                    cdRemainRound: 0,
                                    damage: 150,
                                    roleId: 40
                                }
                            ],
                            solderProps: [
                                { roleId: 7, attack: 25, heroId: 40, life: 240 },
                                { roleId: 8, attack: 15, heroId: 40, life: 400 }
                            ]
                        }
                    ]
                }
            ],
            cityProps: [
                {
                    roleId: 50,
                    position: { x: 20, y: 25 },
                    life: 180
                }
            ],
            stronghold: {
                roleId: 3,
                camp: 2,
                occupiedRound: [0, 0],
                position: { x: 30, y: 30 }
            }
        };
        
        const parsedInquire = MessageParser.parseInquireMessage(mockInquireData);
        console.log('\n📊 解析inquire消息:');
        console.log(`  回合数: ${parsedInquire.round}`);
        console.log(`  玩家数: ${parsedInquire.players.length}`);
        
        const player = parsedInquire.players[0];
        console.log(`  玩家${player.playerId}信息:`);
        console.log(`    粮草: ${player.supplies}`);
        console.log(`    英雄数: ${player.roles.length}`);
        
        const hero = player.roles[0];
        console.log(`    英雄${hero.roleId}:`);
        console.log(`      位置: (${hero.position.x}, ${hero.position.y})`);
        console.log(`      生命: ${hero.life}/${hero.maxLife} (${hero.healthPercentage.toFixed(1)}%)`);
        console.log(`      存活: ${hero.isAlive ? '是' : '否'}`);
        console.log(`      士兵数: ${hero.soldiers.length}`);
        console.log(`      技能数: ${hero.skills.length}`);
        
        console.log(`  城寨数: ${parsedInquire.cityProps.length}`);
        console.log(`  据点可用: ${parsedInquire.stronghold?.isAvailable ? '是' : '否'}`);
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ 消息解析错误:', error.message);
    }
}

/**
 * 诊断工具示例
 */
function diagnosticsExample() {
    console.log('========== 诊断工具示例 ==========\n');
    
    const client = new NetworkClient();
    const aiClient = new NetworkAIClient('hard');
    
    // 网络客户端诊断
    const networkDiag = client.getDiagnostics();
    console.log('🔍 网络客户端诊断:');
    console.log(`  连接状态: ${networkDiag.isConnected ? '已连接' : '未连接'}`);
    console.log(`  游戏状态: ${networkDiag.isGameStarted ? '进行中' : '未开始'}`);
    console.log(`  当前回合: ${networkDiag.currentRound}`);
    console.log(`  消息统计: 收到${networkDiag.messagesReceived}条，发送${networkDiag.messagesSent}条`);
    
    // AI客户端诊断
    const aiDiag = aiClient.getDiagnostics();
    console.log('\n🤖 AI客户端诊断:');
    console.log(`  AI状态: ${aiDiag.client.aiEnabled ? '启用' : '禁用'}`);
    console.log(`  自动对战: ${aiDiag.client.autoPlay ? '开启' : '关闭'}`);
    console.log(`  难度等级: ${aiDiag.client.difficulty}`);
    console.log(`  决策次数: ${aiDiag.client.totalDecisions}`);
    
    console.log('\n');
}

/**
 * 完整对战流程示例
 */
async function fullBattleExample() {
    console.log('========== 完整对战流程示例 ==========\n');
    
    console.log('🎯 这个示例展示了完整的对战流程，包括：');
    console.log('  1. 创建AI客户端');
    console.log('  2. 连接服务器');
    console.log('  3. 等待游戏开始');
    console.log('  4. AI自动决策和行动');
    console.log('  5. 处理游戏结束');
    console.log('  6. 显示游戏结果和统计');
    
    // 创建两个AI客户端模拟对战
    const player1 = new NetworkAIClient('expert');
    const player2 = new NetworkAIClient('hard');
    
    // 设置不同的策略
    player1.setAIEnabled(true);
    player2.setAIEnabled(true);
    
    console.log('\n🤖 已创建两个AI客户端:');
    console.log('  玩家1: 专家难度AI');
    console.log('  玩家2: 困难难度AI');
    
    // 事件监听
    player1.on('gameStart', () => {
        console.log('🚀 玩家1 - 游戏开始');
    });
    
    player2.on('gameStart', () => {
        console.log('🚀 玩家2 - 游戏开始');
    });
    
    player1.on('gameOver', (result) => {
        console.log('🏁 玩家1 - 游戏结束');
        console.log('📊 玩家1最终状态:', player1.getClientState().gameLog.performanceMetrics);
        player1.disconnect();
    });
    
    player2.on('gameOver', (result) => {
        console.log('🏁 玩家2 - 游戏结束');
        console.log('📊 玩家2最终状态:', player2.getClientState().gameLog.performanceMetrics);
        player2.disconnect();
    });
    
    console.log('\n📡 准备连接服务器...');
    console.log('⚠️ 注意：需要真实的服务器才能实际运行对战');
    console.log('');
    
    // 实际连接代码（需要真实服务器）:
    /*
    try {
        const success1 = await player1.connect('127.0.0.1', 8080, 1001, 'Expert-AI');
        const success2 = await player2.connect('127.0.0.1', 8080, 1002, 'Hard-AI');
        
        if (success1 && success2) {
            console.log('✅ 两个客户端都连接成功，等待游戏开始...');
        } else {
            console.log('❌ 连接失败');
            player1.disconnect();
            player2.disconnect();
        }
    } catch (error) {
        console.error('❌ 连接错误:', error);
    }
    */
}

/**
 * 主函数 - 运行所有示例
 */
async function main() {
    console.log('🎮 三国争霸网络通信示例\n');
    console.log('这些示例展示了如何使用网络通信协议的各种功能\n');
    
    // 运行各种示例
    await basicNetworkExample();
    await aiClientExample();
    actionBuilderExample();
    messageParserExample();
    diagnosticsExample();
    await fullBattleExample();
    
    console.log('✨ 所有示例运行完成！');
    console.log('\n📚 要了解更多用法，请查看：');
    console.log('  - src/network/ProtocolManager.js - 协议管理器');
    console.log('  - src/network/ActionBuilder.js - 行动构建器');
    console.log('  - src/network/MessageParser.js - 消息解析器');
    console.log('  - src/network/NetworkClient.js - 网络客户端');
    console.log('  - src/ai/NetworkAIClient.js - AI网络客户端');
    console.log('');
}

// 运行示例
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    basicNetworkExample,
    aiClientExample,
    actionBuilderExample,
    messageParserExample,
    diagnosticsExample,
    fullBattleExample
}; 