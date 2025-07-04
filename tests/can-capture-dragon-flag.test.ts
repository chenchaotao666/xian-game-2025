import { 
  CanCaptureDragonFlag, 
  canHeroCaptureDragonFlag, 
  getBestHeroForDragonFlagCapture,
  getDragonFlagCaptureUrgency 
} from '../src/conditions/CanCaptureDragonFlag';
import { ActionContext } from '../src/core/types';
import { TeamBlackboard } from '../src/core/TeamBlackboard';
import { StrategyType } from '../src/core/StrategyAnalysis';

describe('CanCaptureDragonFlag 条件检查', () => {
  let mockContext: ActionContext;
  let mockBlackboard: TeamBlackboard;

  beforeEach(() => {
    // 创建模拟的 TeamBlackboard
    mockBlackboard = new TeamBlackboard(1000);
    
    // 模拟游戏状态数据
    const mockGameState = {
      round: 100,
      players: [
        {
          playerId: 1,
          supplies: 200, // 足够的粮草
          morale: 80,
          roles: [
            {
              roleId: 1,
              attack: 100,
              position: { x: 5, y: 5 },
              life: 800,
              maxLife: 1000,
              camp: 1,
              campName: 'red',
              reviveRound: 0,
              formationType: 1,
              formationName: 'attack',
              commander: 0,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 50,
              healthPercentage: 80
            },
            {
              roleId: 2,
              attack: 80,
              position: { x: 7, y: 7 },
              life: 600,
              maxLife: 1000,
              camp: 1,
              campName: 'red',
              reviveRound: 0,
              formationType: 2,
              formationName: 'defense',
              commander: 0,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 40,
              healthPercentage: 60
            }
          ],
          totalLife: 1400,
          aliveHeroes: 2,
          totalSoldiers: 90
        },
        {
          playerId: 2,
          supplies: 150,
          morale: 70,
          roles: [
            {
              roleId: 3,
              attack: 90,
              position: { x: 15, y: 15 },
              life: 700,
              maxLife: 1000,
              camp: 2,
              campName: 'blue',
              reviveRound: 0,
              formationType: 1,
              formationName: 'attack',
              commander: 0,
              statuses: {},
              skills: [],
              soldiers: [],
              isAlive: true,
              isReviving: false,
              totalSoldierCount: 45,
              healthPercentage: 70
            }
          ],
          totalLife: 700,
          aliveHeroes: 1,
          totalSoldiers: 45
        }
      ],
      cityProps: [],
      stronghold: {
        roleId: 100,
        camp: 0, // 中立
        campName: 'neutral',
        occupiedRound: [],
        position: { x: 8, y: 8 },
        isAvailable: true,
        redOccupiedRounds: 0,
        blueOccupiedRounds: 0,
        totalOccupiedRounds: 0
      },
      timestamp: '2024-01-01T00:00:00Z'
    };

    mockBlackboard.updateGameState(mockGameState, 1);

    // 创建模拟的 ActionContext
    mockContext = {
      agent: {
        roleId: 1,
        log: jest.fn()
      },
      teamBlackboard: mockBlackboard
    } as any;
  });

  describe('CanCaptureDragonFlag 基本功能', () => {
    test('粮草充足且策略为占领龙旗时应返回 true', () => {
      // 设置策略为占领龙旗
      mockBlackboard.setGlobalStrategy(
        StrategyType.CAPTURE_FLAG, 
        {}, 
        80, 
        80, 
        '测试占领龙旗策略'
      );

      const result = CanCaptureDragonFlag(mockContext);
      expect(result).toBe(true);
    });

    test('粮草不足时应返回 false', () => {
      // 设置策略为占领龙旗
      mockBlackboard.setGlobalStrategy(
        StrategyType.CAPTURE_FLAG, 
        {}, 
        80, 
        80, 
        '测试占领龙旗策略'
      );

      // 修改玩家粮草为不足状态
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.players[0].supplies = 100; // 不足150的阈值
      mockBlackboard.updateGameState(gameState, 1);

      const result = CanCaptureDragonFlag(mockContext);
      expect(result).toBe(false);
    });

    test('策略不是占领龙旗时应返回 false', () => {
      // 设置其他策略
      mockBlackboard.setGlobalStrategy(
        StrategyType.ATTACK_CITY, 
        {}, 
        60, 
        70, 
        '测试攻击城寨策略'
      );

      const result = CanCaptureDragonFlag(mockContext);
      expect(result).toBe(false);
    });

    test('无策略时应返回 false', () => {
      // 不设置任何策略
      const result = CanCaptureDragonFlag(mockContext);
      expect(result).toBe(false);
    });

    test('无 TeamBlackboard 时应返回 false', () => {
      const emptyContext: ActionContext = {
        agent: { roleId: 1, log: jest.fn() }
      } as any;

      const result = CanCaptureDragonFlag(emptyContext);
      expect(result).toBe(false);
    });
  });

  describe('canHeroCaptureDragonFlag 特定英雄检查', () => {
    test('健康英雄应该能占领龙旗', () => {
      const result = canHeroCaptureDragonFlag(1, mockContext); // 英雄1健康度80%
      expect(result).toBe(true);
    });

    test('生命值低的英雄不应该占领龙旗', () => {
      const result = canHeroCaptureDragonFlag(2, mockContext); // 英雄2健康度60%
      expect(result).toBe(true); // 60% > 50% 所以还是可以
    });

    test('不存在的英雄应返回 false', () => {
      const result = canHeroCaptureDragonFlag(999, mockContext);
      expect(result).toBe(false);
    });

    test('正在复活的英雄应返回 false', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.players[0].roles[0].isReviving = true;
      mockBlackboard.updateGameState(gameState, 1);

      const result = canHeroCaptureDragonFlag(1, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('getBestHeroForDragonFlagCapture 最佳英雄选择', () => {
    test('应返回距离龙旗最近的英雄', () => {
      const result = getBestHeroForDragonFlagCapture(mockContext);
      expect(result).toBe(2); // 英雄2距离龙旗(8,8)更近，位置(7,7)距离1，英雄1位置(5,5)距离3
    });

    test('无适合英雄时应返回 null', () => {
      // 让所有英雄生命值都太低
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.players[0].roles.forEach(hero => {
        hero.healthPercentage = 30; // 低于50%阈值
      });
      mockBlackboard.updateGameState(gameState, 1);

      const result = getBestHeroForDragonFlagCapture(mockContext);
      expect(result).toBe(null);
    });

    test('无龙旗位置时应返回 null', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.stronghold!.position = null;
      mockBlackboard.updateGameState(gameState, 1);

      const result = getBestHeroForDragonFlagCapture(mockContext);
      expect(result).toBe(null);
    });
  });

  describe('getDragonFlagCaptureUrgency 紧急程度检查', () => {
    test('敌方控制龙旗时应返回 CRITICAL', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.stronghold!.camp = 2; // 敌方控制
      mockBlackboard.updateGameState(gameState, 1);

      const result = getDragonFlagCaptureUrgency(mockContext);
      expect(result).toBe('CRITICAL');
    });

    test('我方控制龙旗时应返回 LOW', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.stronghold!.camp = 1; // 我方控制
      mockBlackboard.updateGameState(gameState, 1);

      const result = getDragonFlagCaptureUrgency(mockContext);
      expect(result).toBe('LOW');
    });

    test('游戏后期且敌人接近龙旗时应返回 HIGH', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.round = 600; // 后期
      gameState.players[1].roles[0].position = { x: 8, y: 10 }; // 敌人靠近龙旗
      mockBlackboard.updateGameState(gameState, 1);

      const result = getDragonFlagCaptureUrgency(mockContext);
      expect(result).toBe('HIGH');
    });

    test('游戏中期应返回 MEDIUM', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.round = 300; // 中期
      mockBlackboard.updateGameState(gameState, 1);

      const result = getDragonFlagCaptureUrgency(mockContext);
      expect(result).toBe('MEDIUM');
    });

    test('游戏早期应返回 LOW', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.round = 50; // 早期
      mockBlackboard.updateGameState(gameState, 1);

      const result = getDragonFlagCaptureUrgency(mockContext);
      expect(result).toBe('LOW');
    });
  });

  describe('边界情况和错误处理', () => {
    test('GameState为null时应正常处理', () => {
      const contextWithoutState: ActionContext = {
        agent: { roleId: 1, log: jest.fn() },
        teamBlackboard: new TeamBlackboard(1000) // 空的黑板
      } as any;

      const result = CanCaptureDragonFlag(contextWithoutState);
      expect(result).toBe(false);
    });

    test('玩家数据为null时应正常处理', () => {
      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.players = []; // 清空玩家数据
      mockBlackboard.updateGameState(gameState, 1);

      const result = CanCaptureDragonFlag(mockContext);
      expect(result).toBe(false);
    });

    test('粮草阈值边界情况', () => {
      // 设置策略为占领龙旗
      mockBlackboard.setGlobalStrategy(
        StrategyType.CAPTURE_FLAG, 
        {}, 
        80, 
        80, 
        '测试占领龙旗策略'
      );

      const gameState = mockBlackboard.getGameStateSnapshot()!;
      gameState.players[0].supplies = 150; // 刚好等于阈值
      mockBlackboard.updateGameState(gameState, 1);

      const result = CanCaptureDragonFlag(mockContext);
      expect(result).toBe(true); // 刚好达到阈值应该允许
    });
  });
}); 