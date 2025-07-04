import { AnalyzeAndSetStrategy, getCurrentStrategy, isStrategyStale, getCurrentStrategyData } from '../src/actions/AnalyzeAndSetStrategy';
import { TeamBlackboard } from '../src/core/TeamBlackboard';
import { StrategyType } from '../src/core/StrategyAnalysis';
import { GlobalGoalType } from '../src/core/types';
import { State } from 'mistreevous';

/**
 * AnalyzeAndSetStrategy 动作测试
 * =====================================
 * 
 * 测试策略分析动作是否能够正确：
 * 1. 调用StrategyAnalysis进行全局策略分析
 * 2. 将分析结果设置到TeamBlackboard中
 * 3. 为后续动作提供正确的决策依据
 */

describe('AnalyzeAndSetStrategy', () => {
  let mockBlackboard: TeamBlackboard;
  let mockAgent: any;
  let mockContext: any;

  beforeEach(() => {
    // 创建模拟的TeamBlackboard
    mockBlackboard = new TeamBlackboard(500);
    
    // 设置测试用的游戏状态数据
    const testGameState = {
      round: 25,
      players: [
        {
          playerId: 1111,
          supplies: 300,
          morale: 80,
          roles: [
            {
              roleId: 1,
              attack: 50,
              position: { x: 2, y: 2 },
              life: 80,
              maxLife: 100,
              camp: 1111,
              campName: 'Red',
              reviveRound: 0,
              formationType: 1,
              formationName: 'Standard',
              commander: 0,
              statuses: {},
              skills: [
                {
                  skillId: 1,
                  cd: 3,
                  cdRemainRound: 0,
                  damage: 30,
                  damageReduceRatio: 0,
                  damageAddByAttackRatio: 0.5,
                  roleId: 1,
                  isReady: true,
                  cooldownProgress: 100
                }
              ],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 0,
              healthPercentage: 80
            }
          ],
          totalLife: 80,
          aliveHeroes: 1,
          totalSoldiers: 0
        },
        {
          playerId: 2222,
          supplies: 200,
          morale: 60,
          roles: [
            {
              roleId: 2,
              attack: 45,
              position: { x: 10, y: 10 },
              life: 40,
              maxLife: 100,
              camp: 2222,
              campName: 'Blue',
              reviveRound: 0,
              formationType: 1,
              formationName: 'Standard',
              commander: 0,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 0,
              healthPercentage: 40
            }
          ],
          totalLife: 40,
          aliveHeroes: 1,
          totalSoldiers: 0
        }
      ],
      cityProps: [
        {
          roleId: 101,
          position: { x: 5, y: 5 },
          life: 60,
          maxLife: 100,
          cityType: 'SmallCity',
          healthPercentage: 60
        }
      ],
      stronghold: {
        roleId: 999,
        camp: 0,
        campName: 'Neutral',
        occupiedRound: [],
        position: { x: 8, y: 8 },
        isAvailable: false,
        redOccupiedRounds: 0,
        blueOccupiedRounds: 0,
        totalOccupiedRounds: 0
      },
      timestamp: new Date().toISOString()
    };

    mockBlackboard.updateGameState(testGameState, 1111);

    // 创建模拟的Agent
    mockAgent = {
      teamBlackboard: mockBlackboard,
      log: jest.fn()
    };

    // 创建模拟的ActionContext
    mockContext = {
      agent: mockAgent,
      playerId: 1111,
      gameMap: {},
      teamBlackboard: mockBlackboard
    };
  });

  test('应该成功执行策略分析并返回SUCCEEDED', () => {
    const result = AnalyzeAndSetStrategy(mockContext);
    
    expect(result).toBe(State.SUCCEEDED);
    expect(mockAgent.log).toHaveBeenCalledWith(
      expect.stringContaining('[策略分析] 开始策略分析 - 回合: 25')
    );
  });

  test('应该在blackboard中设置策略信息', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    // 检查是否设置了策略
    const currentStrategy = mockBlackboard.getCurrentStrategy();
    const strategyData = mockBlackboard.getCurrentStrategyData();
    const strategyPriority = mockBlackboard.getData('strategy_priority');
    const strategyConfidence = mockBlackboard.getData('strategy_confidence');
    const strategyReason = mockBlackboard.getData('strategy_reason');
    
    expect(currentStrategy).toBeDefined();
    expect(strategyData).toBeDefined();
    expect(strategyPriority).toBeGreaterThan(0);
    expect(strategyConfidence).toBeGreaterThan(0);
    expect(strategyReason).toBeDefined();
    
    console.log('设置的策略:', currentStrategy);
    console.log('策略数据:', strategyData);
    console.log('策略优先级:', strategyPriority);
    console.log('策略置信度:', strategyConfidence);
    console.log('策略理由:', strategyReason);
  });

  test('应该根据策略类型存储对应的数据', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    const currentStrategy = mockBlackboard.getCurrentStrategy();
    
    // 根据策略类型检查对应的数据
    switch (currentStrategy) {
      case StrategyType.FOCUS_FIRE:
        const focusTarget = mockBlackboard.getFocusTarget();
        expect(focusTarget).toBeDefined();
        if (focusTarget) {
          console.log('集火目标:', focusTarget);
          expect(focusTarget.targetId).toBeDefined();
          expect(focusTarget.priority).toBeGreaterThan(0);
        }
        break;
        
      case StrategyType.ATTACK_CITY:
        const cityTarget = mockBlackboard.getCityAttackTarget();
        expect(cityTarget).toBeDefined();
        if (cityTarget) {
          console.log('城寨攻击目标:', cityTarget);
          expect(cityTarget.cityId).toBeDefined();
          expect(cityTarget.cityType).toBeDefined();
        }
        break;
        
      case StrategyType.ATTACK_ENEMY:
        const enemyTarget = mockBlackboard.getEnemyAttackTarget();
        expect(enemyTarget).toBeDefined();
        if (enemyTarget) {
          console.log('敌方攻击目标:', enemyTarget);
          expect(enemyTarget.targetEnemyId).toBeDefined();
        }
        break;
        
      case StrategyType.GATHER_FORCES:
        const gatherPos = mockBlackboard.getGatherPosition();
        expect(gatherPos).toBeDefined();
        if (gatherPos) {
          console.log('集合位置:', gatherPos);
          expect(gatherPos.position).toBeDefined();
        }
        break;
        
      case StrategyType.CAPTURE_FLAG:
        const flagTarget = mockBlackboard.getFlagCaptureTarget();
        expect(flagTarget).toBeDefined();
        if (flagTarget) {
          console.log('龙旗目标:', flagTarget);
          expect(flagTarget.flagPosition).toBeDefined();
        }
        break;
    }
  });

  test('应该设置战斗模式和阵型偏好', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    const combatMode = mockBlackboard.getData('combat_mode');
    const formationPreference = mockBlackboard.getData('formation_preference');
    
    expect(combatMode).toBeDefined();
    expect(formationPreference).toBeDefined();
    
    console.log('战斗模式:', combatMode);
    console.log('阵型偏好:', formationPreference);
  });

  test('应该记录策略历史', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    const strategyHistory = mockBlackboard.getStrategyHistory();
    expect(strategyHistory.length).toBeGreaterThan(0);
    
    const lastEntry = strategyHistory[strategyHistory.length - 1];
    expect(lastEntry.round).toBe(25);
    expect(lastEntry.strategy).toBeDefined();
    expect(lastEntry.priority).toBeGreaterThan(0);
    expect(lastEntry.confidence).toBeGreaterThan(0);
    expect(lastEntry.reason).toBeDefined();
    
    console.log('策略历史记录:', strategyHistory);
  });

  test('辅助函数应该正确工作', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    // 测试getCurrentStrategy
    const strategy = getCurrentStrategy(mockBlackboard);
    expect(strategy).toBeDefined();
    expect(Object.values(StrategyType)).toContain(strategy);
    
    // 测试getCurrentStrategyData
    const strategyData = getCurrentStrategyData(mockBlackboard);
    expect(strategyData).toBeDefined();
    
    // 测试isStrategyStale
    const isStale = isStrategyStale(mockBlackboard, 1);
    expect(typeof isStale).toBe('boolean');
    
    console.log('当前策略:', strategy);
    console.log('策略数据:', strategyData);
    console.log('策略是否过期:', isStale);
  });

  test('当没有游戏状态数据时应该优雅处理', () => {
    // 创建没有游戏状态的blackboard
    const emptyBlackboard = new TeamBlackboard(500);
    const emptyAgent = {
      teamBlackboard: emptyBlackboard,
      log: jest.fn()
    };
    const emptyContext = {
      agent: emptyAgent,
      playerId: 1111,
      gameMap: {},
      teamBlackboard: emptyBlackboard
    };

    const result = AnalyzeAndSetStrategy(emptyContext);
    
    expect(result).toBe(State.SUCCEEDED); // 应该成功但跳过分析
    expect(emptyAgent.log).toHaveBeenCalledWith(
      expect.stringContaining('[策略分析] 警告：游戏状态数据为空，跳过策略分析')
    );
  });

  test('当没有teamBlackboard时应该返回FAILED', () => {
    const noBlackboardAgent = {
      teamBlackboard: null,
      log: jest.fn()
    };
    const noBlackboardContext = {
      agent: noBlackboardAgent,
      playerId: 1111,
      gameMap: {},
      teamBlackboard: null
    };

    const result = AnalyzeAndSetStrategy(noBlackboardContext);
    
    expect(result).toBe(State.FAILED);
    expect(noBlackboardAgent.log).toHaveBeenCalledWith(
      '[策略分析] 错误：未找到团队黑板实例'
    );
  });

  test('应该支持策略执行结果记录', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    // 记录策略执行结果
    mockBlackboard.recordStrategyResult('SUCCESS');
    
    const history = mockBlackboard.getStrategyHistory();
    const lastEntry = history[history.length - 1];
    
    expect(lastEntry.result).toBe('SUCCESS');
    console.log('策略执行结果已记录:', lastEntry);
  });

  test('应该支持策略数据清除', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    const currentStrategy = mockBlackboard.getCurrentStrategy();
    
    if (currentStrategy) {
      // 清除策略数据
      mockBlackboard.clearStrategyData(currentStrategy);
      
      // 检查数据是否被清除
      switch (currentStrategy) {
        case StrategyType.FOCUS_FIRE:
          expect(mockBlackboard.getFocusTarget()).toBeNull();
          break;
        case StrategyType.ATTACK_CITY:
          expect(mockBlackboard.getCityAttackTarget()).toBeNull();
          break;
        case StrategyType.ATTACK_ENEMY:
          expect(mockBlackboard.getEnemyAttackTarget()).toBeNull();
          break;
        case StrategyType.GATHER_FORCES:
          expect(mockBlackboard.getGatherPosition()).toBeNull();
          break;
        case StrategyType.CAPTURE_FLAG:
          expect(mockBlackboard.getFlagCaptureTarget()).toBeNull();
          break;
      }
      
      console.log(`策略数据已清除: ${currentStrategy}`);
    }
  });

  test('应该支持获取最近策略历史', () => {
    // 设置多个策略来测试历史记录
    AnalyzeAndSetStrategy(mockContext);
    
    // 手动添加一些历史记录来测试
    mockBlackboard.setGlobalStrategy(
      StrategyType.DEFENSIVE,
      {},
      50,
      70,
      '测试防御策略'
    );
    
    const recentHistory = mockBlackboard.getRecentStrategyHistory(2);
    expect(recentHistory.length).toBeGreaterThan(0);
    expect(recentHistory.length).toBeLessThanOrEqual(2);
    
    console.log('最近策略历史:', recentHistory);
  });

  test('应该验证策略数据的完整性', () => {
    AnalyzeAndSetStrategy(mockContext);
    
    const currentStrategy = mockBlackboard.getCurrentStrategy();
    const strategyData = mockBlackboard.getCurrentStrategyData();
    const strategyHistory = mockBlackboard.getStrategyHistory();
    
    // 验证策略设置的完整性
    expect(currentStrategy).toBeDefined();
    expect(strategyData).toBeDefined();
    expect(strategyHistory.length).toBeGreaterThan(0);
    
    console.log('策略完整性验证:');
    console.log('- 当前策略:', currentStrategy);
    console.log('- 策略数据:', strategyData);
    console.log('- 历史记录数量:', strategyHistory.length);
  });
}); 