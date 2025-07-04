import { 
  ShouldChangeFormation, 
  shouldHeroChangeFormation, 
  getMostSuitableHeroForFormationChange 
} from '../src/conditions/ShouldChangeFormation';
import { ActionContext } from '../src/core/types';
import { TeamBlackboard } from '../src/core/TeamBlackboard';
import { GameMap } from '../src/context/gameMap';

// 创建测试用的游戏状态数据
function createTestGameState() {
  return {
    round: 1,
    players: [
      {
        playerId: 1,
        supplies: 800, // 充裕粮草
        morale: 80,    // 充裕士气
        roles: [
          {
            roleId: 1,
            commander: 100,
            totalSoldierCount: 90,
            isAlive: true,
            attack: 100,
            position: { x: 5, y: 5 }, // 与敌人距离较近
            life: 800,
            maxLife: 1000,
            camp: 1,
            campName: 'Red',
            reviveRound: 0,
            formationType: 1,
            formationName: 'Default',
            statuses: {},
            skills: [],
            soldiers: [],
            isReviving: false,
            healthPercentage: 80
          },
          {
            roleId: 2,
            commander: 150,
            totalSoldierCount: 140,
            isAlive: true,
            attack: 120,
            position: { x: 15, y: 15 }, // 远离敌人
            life: 1200,
            maxLife: 1200,
            camp: 1,
            campName: 'Red',
            reviveRound: 0,
            formationType: 1,
            formationName: 'Default',
            statuses: {},
            skills: [],
            soldiers: [],
            isReviving: false,
            healthPercentage: 100
          }
        ],
        totalLife: 2000,
        aliveHeroes: 2,
        totalSoldiers: 230
      },
      {
        playerId: 2,
        supplies: 500,
        morale: 60,
        roles: [
          {
            roleId: 3,
            commander: 120,
            totalSoldierCount: 100,
            isAlive: true,
            attack: 110,
            position: { x: 7, y: 7 }, // 与我方英雄1距离较近
            life: 1100,
            maxLife: 1100,
            camp: 2,
            campName: 'Blue',
            reviveRound: 0,
            formationType: 1,
            formationName: 'Default',
            statuses: {},
            skills: [],
            soldiers: [],
            isReviving: false,
            healthPercentage: 100
          }
        ],
        totalLife: 1100,
        aliveHeroes: 1,
        totalSoldiers: 100
      }
    ],
    cityProps: [],
    stronghold: null,
    timestamp: '2024-01-01T00:00:00Z'
  };
}

function createMockContext(teamBlackboard: TeamBlackboard | null = null): ActionContext {
  return {
    playerId: 1,
    agent: null,
    gameMap: new GameMap('0,0,0,0', 2, 2),
    teamBlackboard: teamBlackboard as any
  };
}

describe('ShouldChangeFormation 条件检查', () => {
  let mockContext: ActionContext;
  let teamBlackboard: TeamBlackboard;

  beforeEach(() => {
    const gameState = createTestGameState();
    teamBlackboard = new TeamBlackboard(1000);
    teamBlackboard.updateGameState(gameState, 1);
    mockContext = createMockContext(teamBlackboard);
  });

  describe('ShouldChangeFormation 基本功能', () => {
    test('正在战斗且资源充裕时应返回 true', () => {
      const result = ShouldChangeFormation(mockContext);
      expect(result).toBe(true); // 英雄1与敌人距离近，且粮草和士气充裕
    });

    test('未在战斗时应返回 false', () => {
      // 创建所有英雄都远离敌人的状态
      const gameState = createTestGameState();
      gameState.players[0].roles[0].position = { x: 50, y: 50 }; // 英雄1远离敌人
      gameState.players[0].roles[1].position = { x: 60, y: 60 }; // 英雄2远离敌人
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = ShouldChangeFormation(mockContext);
      expect(result).toBe(false);
    });

    test('粮草不足时应返回 false', () => {
      const gameState = createTestGameState();
      gameState.players[0].supplies = 300; // 粮草不充裕
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = ShouldChangeFormation(mockContext);
      expect(result).toBe(false);
    });

    test('士气不足时应返回 false', () => {
      const gameState = createTestGameState();
      gameState.players[0].morale = 50; // 士气不充裕
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = ShouldChangeFormation(mockContext);
      expect(result).toBe(false);
    });

    test('无敌方英雄时应返回 false', () => {
      const gameState = createTestGameState();
      gameState.players[1].roles = []; // 无敌方英雄
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = ShouldChangeFormation(mockContext);
      expect(result).toBe(false);
    });

    test('无 TeamBlackboard 时应返回 false', () => {
      const context = createMockContext(null);
      const result = ShouldChangeFormation(context);
      expect(result).toBe(false);
    });
  });

  describe('shouldHeroChangeFormation 特定英雄检查', () => {
    test('在战斗中的英雄应该变阵', () => {
      const result = shouldHeroChangeFormation(1, mockContext); // 英雄1与敌人距离近
      expect(result).toBe(true);
    });

    test('不在战斗中的英雄不应该变阵', () => {
      const result = shouldHeroChangeFormation(2, mockContext); // 英雄2与敌人距离远
      expect(result).toBe(false);
    });

    test('不存在的英雄应返回 false', () => {
      const result = shouldHeroChangeFormation(999, mockContext);
      expect(result).toBe(false);
    });

    test('没有位置信息的英雄应返回 false', () => {
      const gameState = createTestGameState();
      gameState.players[0].roles[0].position = null;
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = shouldHeroChangeFormation(1, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('getMostSuitableHeroForFormationChange 最适合变阵的英雄', () => {
    test('应返回生命值比例最低的战斗英雄', () => {
      const result = getMostSuitableHeroForFormationChange(mockContext);
      expect(result).toBe(1); // 英雄1在战斗中且生命值比例较低（80%）
    });

    test('没有战斗英雄时应返回 null', () => {
      // 创建所有英雄都远离敌人的状态
      const gameState = createTestGameState();
      gameState.players[0].roles[0].position = { x: 50, y: 50 };
      gameState.players[0].roles[1].position = { x: 60, y: 60 };
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = getMostSuitableHeroForFormationChange(mockContext);
      expect(result).toBeNull();
    });

    test('无敌方英雄时应返回 null', () => {
      const gameState = createTestGameState();
      gameState.players[1].roles = [];
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = getMostSuitableHeroForFormationChange(mockContext);
      expect(result).toBeNull();
    });

    test('有多个战斗英雄时选择生命值最低的', () => {
      const gameState = createTestGameState();
      // 让两个英雄都在战斗范围内
      gameState.players[0].roles[0].position = { x: 5, y: 5 };
      gameState.players[0].roles[0].life = 500; // 50%生命值
      gameState.players[0].roles[1].position = { x: 8, y: 8 };
      gameState.players[0].roles[1].life = 900; // 75%生命值
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = getMostSuitableHeroForFormationChange(mockContext);
      expect(result).toBe(1); // 选择生命值更低的英雄1
    });
  });

  describe('边界情况和错误处理', () => {
    test('英雄位置为null时应正常处理', () => {
      const gameState = createTestGameState();
      gameState.players[0].roles[0].position = null;
      
      teamBlackboard.updateGameState(gameState, 1);
      
      expect(() => ShouldChangeFormation(mockContext)).not.toThrow();
      expect(ShouldChangeFormation(mockContext)).toBe(false);
    });

    test('敌方英雄位置为null时应正常处理', () => {
      const gameState = createTestGameState();
      gameState.players[1].roles[0].position = null;
      
      teamBlackboard.updateGameState(gameState, 1);
      
      expect(() => ShouldChangeFormation(mockContext)).not.toThrow();
      expect(ShouldChangeFormation(mockContext)).toBe(false);
    });

    test('GameState为null时应正常处理', () => {
      const tb = new TeamBlackboard(1000);
      const context = createMockContext(tb);
      
      const result = ShouldChangeFormation(context);
      expect(result).toBe(false);
    });

    test('资源阈值边界情况', () => {
      const gameState = createTestGameState();
      gameState.players[0].supplies = 500; // 刚好达到阈值
      gameState.players[0].morale = 70;     // 刚好达到阈值
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = ShouldChangeFormation(mockContext);
      expect(result).toBe(true); // 刚好达到阈值应该允许
    });
  });
}); 