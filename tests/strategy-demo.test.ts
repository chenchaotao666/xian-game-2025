/**
 * 策略分析演示测试
 * 用于演示 StrategyAnalysis 类的功能
 */

import { TeamBlackboard } from '../src/core/TeamBlackboard';
import { StrategyAnalysis, StrategyType } from '../src/core/StrategyAnalysis';

describe('StrategyAnalysis 演示测试', () => {
  test('应该能够分析前期游戏策略 - 优先攻击城寨', () => {
    // 创建前期游戏状态
    const gameState = {
      round: 25,
      players: [
        {
          playerId: 1111,
          supplies: 150,
          morale: 80,
          totalLife: 4500,
          aliveHeroes: 3,
          totalSoldiers: 30,
          roles: [
            {
              roleId: 10001,
              attack: 120,
              position: { x: 3, y: 3 },
              life: 1200,
              maxLife: 1500,
              camp: 1111,
              campName: "红方",
              reviveRound: 0,
              formationType: 1,
              formationName: "锋矢阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 12,
              healthPercentage: 80
            }
          ]
        },
        {
          playerId: 2222,
          supplies: 120,
          morale: 75,
          totalLife: 4200,
          aliveHeroes: 3,
          totalSoldiers: 25,
          roles: [
            {
              roleId: 20001,
              attack: 110,
              position: { x: 12, y: 10 },
              life: 1300,
              maxLife: 1500,
              camp: 2222,
              campName: "蓝方",
              reviveRound: 0,
              formationType: 1,
              formationName: "锋矢阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 10,
              healthPercentage: 86.7
            }
          ]
        }
      ],
      cityProps: [
        {
          roleId: 30001,
          position: { x: 7, y: 5 },
          life: 800,
          maxLife: 1000,
          cityType: "小城寨",
          healthPercentage: 80
        }
      ],
      stronghold: {
        roleId: 40001,
        camp: 0,
        campName: "中立",
        occupiedRound: [],
        position: { x: 8, y: 8 },
        isAvailable: false,
        redOccupiedRounds: 0,
        blueOccupiedRounds: 0,
        totalOccupiedRounds: 0
      },
      timestamp: new Date().toISOString()
    };

    const blackboard = new TeamBlackboard(100);
    const strategy = new StrategyAnalysis(blackboard);
    
    blackboard.updateGameState(gameState, 1111);
    
    const decision = strategy.analyzeGlobalStrategy();
    
    // 前期应该优先攻击城寨
    expect(decision.strategy).toBe(StrategyType.ATTACK_CITY);
    expect(decision.priority).toBeGreaterThan(50);
    expect(decision.reason).toContain('前期主要以打城寨为主');
    
    console.log('✅ 前期策略测试通过:', decision.reason);
  });

  test('应该能够识别集火攻击机会', () => {
    // 创建集火攻击机会状态
    const gameState = {
      round: 50,
      players: [
        {
          playerId: 1111,
          supplies: 200,
          morale: 85,
          totalLife: 4500,
          aliveHeroes: 3,
          totalSoldiers: 35,
          roles: [
            {
              roleId: 10001,
              attack: 150,
              position: { x: 8, y: 8 },
              life: 1500,
              maxLife: 1500,
              camp: 1111,
              campName: "红方",
              reviveRound: 0,
              formationType: 1,
              formationName: "锋矢阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 15,
              healthPercentage: 100
            },
            {
              roleId: 10002,
              attack: 140,
              position: { x: 7, y: 7 },
              life: 1600,
              maxLife: 1600,
              camp: 1111,
              campName: "红方",
              reviveRound: 0,
              formationType: 2,
              formationName: "鱼鳞阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 14,
              healthPercentage: 100
            }
          ]
        },
        {
          playerId: 2222,
          supplies: 120,
          morale: 60,
          totalLife: 1000,
          aliveHeroes: 1,
          totalSoldiers: 8,
          roles: [
            {
              roleId: 20001,
              attack: 100,
              position: { x: 8, y: 10 }, // 在攻击范围内
              life: 200, // 残血
              maxLife: 1500,
              camp: 2222,
              campName: "蓝方",
              reviveRound: 0,
              formationType: 1,
              formationName: "锋矢阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 3,
              healthPercentage: 13.3
            }
          ]
        }
      ],
      cityProps: [],
      stronghold: {
        roleId: 40001,
        camp: 0,
        campName: "中立",
        occupiedRound: [],
        position: { x: 8, y: 8 },
        isAvailable: false,
        redOccupiedRounds: 0,
        blueOccupiedRounds: 0,
        totalOccupiedRounds: 0
      },
      timestamp: new Date().toISOString()
    };

    const blackboard = new TeamBlackboard(200);
    const strategy = new StrategyAnalysis(blackboard);
    
    blackboard.updateGameState(gameState, 1111);
    
    const focusFireAnalysis = strategy.analyzeFocusFireStrategy();
    const decision = strategy.analyzeGlobalStrategy();
    
    // 应该识别集火攻击机会
    expect(focusFireAnalysis.shouldFocusFire).toBe(true);
    expect(focusFireAnalysis.primaryTargetId).toBe(20001);
    expect(focusFireAnalysis.canEliminate).toBe(true);
    expect(decision.strategy).toBe(StrategyType.FOCUS_FIRE);
    
    console.log('✅ 集火攻击测试通过:', focusFireAnalysis.reason);
  });

  test('应该能够正确处理粮草限制', () => {
    // 创建粮草不足状态
    const gameState = {
      round: 110,
      players: [
        {
          playerId: 1111,
          supplies: 30, // 粮草很少
          morale: 60,
          totalLife: 3500,
          aliveHeroes: 2,
          totalSoldiers: 25,
          roles: [
            {
              roleId: 10001,
              attack: 130,
              position: { x: 6, y: 6 },
              life: 1200,
              maxLife: 1500,
              camp: 1111,
              campName: "红方",
              reviveRound: 0,
              formationType: 1,
              formationName: "锋矢阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 12,
              healthPercentage: 80
            }
          ]
        },
        {
          playerId: 2222,
          supplies: 100,
          morale: 80,
          totalLife: 3200,
          aliveHeroes: 2,
          totalSoldiers: 22,
          roles: [
            {
              roleId: 20001,
              attack: 120,
              position: { x: 12, y: 10 },
              life: 1200,
              maxLife: 1500,
              camp: 2222,
              campName: "蓝方",
              reviveRound: 0,
              formationType: 1,
              formationName: "锋矢阵",
              commander: 1,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 11,
              healthPercentage: 80
            }
          ]
        }
      ],
      cityProps: [
        {
          roleId: 30001,
          position: { x: 4, y: 4 },
          life: 500,
          maxLife: 1000,
          cityType: "小城寨",
          healthPercentage: 50
        }
      ],
      stronghold: {
        roleId: 40001,
        camp: 2222, // 敌方控制
        campName: "蓝方",
        occupiedRound: [],
        position: { x: 8, y: 8 },
        isAvailable: true,
        redOccupiedRounds: 0,
        blueOccupiedRounds: 10,
        totalOccupiedRounds: 10
      },
      timestamp: new Date().toISOString()
    };

    const blackboard = new TeamBlackboard(100);
    const strategy = new StrategyAnalysis(blackboard);
    
    blackboard.updateGameState(gameState, 1111);
    
    const cityAnalysis = strategy.analyzeCityAttackStrategy();
    const flagAnalysis = strategy.analyzeFlagCaptureStrategy();
    
    // 城寨攻击不应该受粮草限制
    expect(cityAnalysis.length).toBeGreaterThan(0);
    expect(cityAnalysis[0].canAttack).toBe(true);
    expect(cityAnalysis[0].resourceCost).toBe(0); // 不消耗粮草
    
    // 龙旗占领应该受粮草限制
    expect(flagAnalysis.shouldCapture).toBe(false);
    expect(flagAnalysis.reason).toContain('粮草不足无法占领龙旗');
    
    console.log('✅ 粮草限制测试通过');
    console.log('  - 城寨攻击不受限制:', cityAnalysis[0].canAttack);
    console.log('  - 龙旗占领受限制:', flagAnalysis.reason);
  });
}); 