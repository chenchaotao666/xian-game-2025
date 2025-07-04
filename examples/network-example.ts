/**
 * 网络通信示例 (TypeScript版本)
 * 展示如何使用通信协议的所有功能
 */

import NetworkAIClient from '../src/ai/NetworkAIClient';
import NetworkClient from '../src/network/NetworkClient';
import ActionBuilder from '../src/network/ActionBuilder';
import MessageParser from '../src/network/MessageParser';
import type { GameState, GameAction, Position } from '../src/types/index';
import { TeamBlackboard } from '../src/core/TeamBlackboard.js';
// 临时类型定义用于示例
interface GameResult { winner?: any; }

/**
 * 基础网络通信示例
 */
async function basicNetworkExample(): Promise<void> {
    console.log('========== 基础网络通信示例 ==========\n');
    
    const client = new NetworkClient();
    
    // 监听事件
    client.on('connected', () => {
        console.log('✅ 客户端连接成功');
    });
    
    client.on('gameStart', (gameData: any) => {
        console.log('🎮 游戏开始，地图尺寸:', gameData.map.width, 'x', gameData.map.height);
        console.log('🏳️ 特殊位置:', gameData.map.specialLocations);
    });
    
    client.on('inquire', async (gameData: GameState) => {
        console.log(`⏰ 第${gameData.round}回合询问`);
        
        // 构建示例行动
        const actions: GameAction[] = [];
        
        // 如果是第一回合，选择阵容
        if (gameData.round === 1) {
            actions.push(ActionBuilder.buildPickAction([40, 43, 46], client.getGameState().playerId)); // 吕布、刘备、诸葛亮
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
            if (hero && hero.position) {
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
    
    client.on('gameOver', (result: any) => {
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
 * 带TeamBlackboard的AI客户端示例
 */
async function networkWithBlackboardExample(): Promise<void> {
    console.log('========== NetworkClient + TeamBlackboard 示例 ==========\n');
    
    const client = new NetworkClient();
    const teamBlackboard = new TeamBlackboard(200); // 初始化粮草200
    
    // 连接TeamBlackboard到NetworkClient，实现自动数据填充
    client.setTeamBlackboard(teamBlackboard);
    console.log('🔗 TeamBlackboard已连接到NetworkClient');
    
    // 游戏开始事件
    client.on('gameStart', (startData: any) => {
        console.log('🎮 游戏开始 - 开始数据分析');
        console.log(`🗺️ 地图: ${startData.map.width}x${startData.map.height}`);
    });
    
    // 询问行动事件 - 现在可以使用TeamBlackboard进行智能分析
    client.on('inquire', async (gameData: GameState) => {
        console.log(`\n⚡ 第${gameData.round}回合 - 基于TeamBlackboard进行决策`);
        
        // 从TeamBlackboard获取分析数据
        const currentRound = teamBlackboard.getCurrentRound();
        const myHeroes = teamBlackboard.getMyAliveHeroes();
        const enemyHeroes = teamBlackboard.getEnemyAliveHeroes();
        const objectives = teamBlackboard.getAllObjectives();
        
        console.log(`📊 数据分析结果:`);
        console.log(`  - 当前回合: ${currentRound}`);
        console.log(`  - 我方存活英雄: ${myHeroes.length}个`);
        console.log(`  - 敌方存活英雄: ${enemyHeroes.length}个`);
        console.log(`  - 战略目标: ${objectives.length}个`);
        
        // 显示当前目标
        if (objectives.length > 0) {
            console.log(`🎯 战略目标列表:`);
            objectives.forEach((obj, index) => {
                console.log(`  ${index + 1}. ${obj.description} (优先级: ${obj.priority})`);
            });
        }
        
        // 显示集火目标
        const focusTarget = teamBlackboard.getFocusTargetId();
        if (focusTarget) {
            const targetHero = teamBlackboard.getHeroById(parseInt(focusTarget));
            if (targetHero) {
                console.log(`🔥 当前集火目标: 英雄${focusTarget} (血量: ${targetHero.healthPercentage.toFixed(1)}%)`);
            }
        }
        
        // 基于分析结果构建行动
        const actions: GameAction[] = [];
        
        // 第一回合选择阵容
        if (currentRound === 1) {
            actions.push(ActionBuilder.buildPickAction([40, 43, 46], client.getGameState().playerId));
            console.log(`⚔️ 选择阵容: [吕布, 刘备, 诸葛亮]`);
        }
        
        // 基于资源管理目标进行生产
        const resourceObjectives = teamBlackboard.getObjectivesByType('RESOURCE_MANAGEMENT');
        const myPlayer = teamBlackboard.getMyPlayerData();
        if (resourceObjectives.length > 0 && myPlayer && myPlayer.supplies >= 60) {
            actions.push(ActionBuilder.buildMakeAction([
                { roleId: 40, soldiers: [7, 8] }
            ]));
            console.log(`🏭 资源管理: 生产兵力`);
        }
        
        // 根据集火目标进行攻击
        if (focusTarget && myHeroes.length > 0) {
            const attacker = myHeroes[0];
            const target = teamBlackboard.getHeroById(parseInt(focusTarget));
            if (attacker && target && target.position) {
                actions.push(ActionBuilder.buildAttackAction(attacker.roleId, target.position));
                console.log(`⚔️ 集火攻击: 英雄${attacker.roleId} -> 英雄${focusTarget}`);
            }
        }
        
        // 发送行动
        if (actions.length > 0) {
            await client.sendActions(actions);
            console.log(`✅ 发送了${actions.length}个行动指令`);
        } else {
            await client.sendActions([]);
            console.log(`⏭️ 本回合跳过`);
        }
    });
    
    client.on('gameOver', (result: any) => {
        console.log('\n🏁 游戏结束 - 最终分析');
        
        // 显示最终统计
        const finalObjectives = teamBlackboard.getAllObjectives();
        console.log(`📈 最终目标完成情况: ${finalObjectives.length}个目标`);
        
        const winner = result.winner.winner;
        console.log(`🏆 获胜者: ${winner?.playerName || '未知'}`);
        
        // 断开连接
        client.removeTeamBlackboard();
        client.disconnect();
    });
    
    console.log('📡 准备连接服务器（需要真实服务器）...');
    console.log('🧠 AI分析系统已就绪\n');
    
    // 实际连接代码（需要真实服务器）:
    // await client.connect('127.0.0.1', 8080, 1002, 'AIPlayer');
}

/**
 * AI客户端示例
 */
async function aiClientExample(): Promise<void> {
    console.log('========== AI客户端示例 ==========\n');
    
    try {
        const aiClient = new NetworkAIClient('expert');
        console.log('✅ AI客户端创建成功');
        console.log('🧠 AI难度等级: expert');
        
        // 获取客户端状态
        const state = aiClient.getClientState();
        console.log('📊 AI客户端状态:');
        console.log(`  - 难度: ${state.difficulty}`);
        console.log(`  - 状态: ${state.state}`);
        console.log(`  - 决策次数: ${state.totalDecisions}`);
        
        console.log('\n🤖 AI客户端功能正常');
        console.log('⚠️ 注意：完整的网络功能需要真实的服务器环境\n');
        
    } catch (error) {
        console.error('❌ AI客户端示例错误:', (error as Error).message);
    }
}

/**
 * 行动构建器示例
 */
function actionBuilderExample(): void {
    console.log('========== 行动构建器示例 ==========\n');
    
    try {
        // 构建移动行动
        const moveAction = ActionBuilder.buildMoveAction(40, { x: 10, y: 20 });
        console.log('🚶 移动行动:', ActionBuilder.getActionDescription(moveAction));
        console.log('📝 行动对象:', JSON.stringify(moveAction, null, 2));
        
        // 构建选择阵容行动
        const pickAction = ActionBuilder.buildPickAction([40, 43, 46], 1001);
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
        console.error('❌ 行动构建错误:', (error as Error).message);
    }
}

/**
 * 消息解析器示例
 */
function messageParserExample(): void {
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
        const mockInquireData: Partial<GameState> = {
            round: 5,
            players: [
                {
                    playerId: 1001,
                    supplies: 200,
                    morale: 100,
                    roles: [],
                    totalLife: 1500,
                    aliveHeroes: 1,
                    totalSoldiers: 5
                }
            ],
            cityProps: [],
            stronghold: null,
            timestamp: new Date().toISOString()
        };
        
        const parsedInquire = MessageParser.parseInquireMessage(mockInquireData as GameState);
        console.log('\n🎮 解析inquire消息:');
        console.log(`  当前回合: ${parsedInquire.round}`);
        console.log(`  玩家状态: ${parsedInquire.players.length}位玩家`);
        
        // 模拟over消息数据
        const mockOverData = {
            players: [
                {
                    playerId: 1001,
                    playerName: '玩家1',
                    overRound: 100,
                    progress: 85.5,
                    soldierNum: 15,
                    totalGold: 500,
                    killedNum: 3,
                    occupyRound: 60,
                    heroes: []
                }
            ]
        };
        
        const parsedOver = MessageParser.parseOverMessage(mockOverData);
        console.log('\n🏁 解析over消息:');
        console.log(`  获胜者: ${parsedOver.winner.winner?.playerName || '未知'}`);
        console.log(`  游戏质量: ${parsedOver.summary.gameQuality}`);
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ 消息解析错误:', (error as Error).message);
    }
}

/**
 * 网络诊断示例
 */
function diagnosticsExample(): void {
    console.log('========== 网络诊断示例 ==========\n');
    
    console.log('🔧 网络客户端功能测试:');
    
    // 测试行动构建器
    console.log('✅ ActionBuilder 已加载');
    console.log('✅ MessageParser 已加载');
    console.log('✅ NetworkClient 已加载');
    console.log('✅ NetworkAIClient 已加载');
    
    // 测试基本功能
    try {
        const testAction = ActionBuilder.buildMoveAction(1, { x: 0, y: 0 });
        console.log('✅ 行动构建器工作正常');
        
        const isValid = ActionBuilder.validateAction(testAction);
        console.log('✅ 行动验证器工作正常:', isValid);
        
    } catch (error) {
        console.error('❌ 功能测试失败:', (error as Error).message);
    }
    
    console.log('\n📊 系统信息:');
    console.log(`  Node版本: ${process.version}`);
    console.log(`  平台: ${process.platform}`);
    console.log(`  架构: ${process.arch}`);
    console.log('\n');
}

/**
 * 完整对战示例
 */
async function fullBattleExample(): Promise<void> {
    console.log('========== 完整对战示例 ==========\n');
    
    console.log('🎯 创建两个AI客户端进行模拟对战...');
    
    const player1 = new NetworkAIClient('expert');
    const player2 = new NetworkAIClient('hard');
    
    // 设置玩家1事件
    player1.on('connected', () => console.log('🔴 玩家1 (Expert AI) 已连接'));
    player1.on('gameStart', () => console.log('🔴 玩家1 开始游戏'));
    player1.on('gameOver', (result) => {
        console.log('🔴 玩家1 游戏结束');
        const state = player1.getClientState();
        console.log(`   决策次数: ${state.totalDecisions}, 胜率: ${state.gameLog.performanceMetrics.winRate.toFixed(2)}%`);
    });
    
    // 设置玩家2事件
    player2.on('connected', () => console.log('🔵 玩家2 (Hard AI) 已连接'));
    player2.on('gameStart', () => console.log('🔵 玩家2 开始游戏'));
    player2.on('gameOver', (result) => {
        console.log('🔵 玩家2 游戏结束');
        const state = player2.getClientState();
        console.log(`   决策次数: ${state.totalDecisions}, 胜率: ${state.gameLog.performanceMetrics.winRate.toFixed(2)}%`);
    });
    
    console.log('⚠️ 注意：这是示例代码，需要真实的服务器进行实际对战');
    console.log('💡 实际使用时，请配置正确的服务器地址和端口\n');
    
    // 实际连接代码（需要真实服务器）:
    // await Promise.all([
    //     player1.connect('127.0.0.1', 8080, 1001, 'ExpertAI'),
    //     player2.connect('127.0.0.1', 8080, 1002, 'HardAI')
    // ]);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
    console.log('🚀 三国策略对战游戏 - 网络通信示例 (TypeScript版本)\n');
    
    try {
        // 运行所有示例
        await basicNetworkExample();
        await networkWithBlackboardExample();
        await aiClientExample();
        actionBuilderExample();
        messageParserExample();
        diagnosticsExample();
        await fullBattleExample();
        
        console.log('✅ 所有示例运行完成！');
        console.log('\n📖 更多信息请查看项目文档和源代码注释');
        
    } catch (error) {
        console.error('❌ 示例运行错误:', (error as Error).message);
        console.error('堆栈信息:', (error as Error).stack);
    }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url.includes('network-example.ts')) {
    main().catch(console.error);
}

export {
    basicNetworkExample,
    networkWithBlackboardExample,
    aiClientExample,
    actionBuilderExample,
    messageParserExample,
    diagnosticsExample,
    fullBattleExample
}; 