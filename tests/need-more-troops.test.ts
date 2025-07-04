import { 
  NeedMoreTroops, 
  doesHeroNeedTroops, 
  getMostUrgentHeroForTroops 
} from '../src/conditions/NeedMoreTroops';
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
        supplies: 1000,
        morale: 80,
        roles: [
          {
            roleId: 1,
            commander: 100,
            totalSoldierCount: 50, // 50%兵力
            isAlive: true,
            attack: 100,
            position: { x: 5, y: 5 },
            life: 1000,
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
            healthPercentage: 100
          },
          {
            roleId: 2,
            commander: 150,
            totalSoldierCount: 140, // 93%兵力
            isAlive: true,
            attack: 120,
            position: { x: 6, y: 6 },
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
        totalLife: 2200,
        aliveHeroes: 2,
        totalSoldiers: 190
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
            position: { x: 15, y: 15 },
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
    stronghold: {
      roleId: 0,
      camp: 0,
      campName: 'Neutral',
      occupiedRound: [],
      position: { x: 10, y: 10 },
      isAvailable: true,
      redOccupiedRounds: 0,
      blueOccupiedRounds: 0,
      totalOccupiedRounds: 0
    },
    timestamp: '2024-01-01T00:00:00Z'
  };
}

describe('NeedMoreTroops 条件检查', () => {
  let mockContext: ActionContext;
  let teamBlackboard: TeamBlackboard;

  beforeEach(() => {
    const gameState = createTestGameState();
    teamBlackboard = new TeamBlackboard(1000);
    teamBlackboard.updateGameState(gameState, 1);
    
    mockContext = {
      playerId: 1,
      agent: null,
      gameMap: new GameMap('0,0,0,0', 2, 2),
      teamBlackboard: teamBlackboard
    };
  });

  describe('NeedMoreTroops 基本功能', () => {
    test('兵力不足时应返回 true', () => {
      const result = NeedMoreTroops(mockContext);
      expect(result).toBe(true); // 英雄1只有50%兵力，低于90%阈值
    });

    test('兵力充足时应返回 false', () => {
      // 创建所有英雄兵力都充足的状态
      const gameState = createTestGameState();
      gameState.players[0].roles = [
        {
          ...gameState.players[0].roles[0],
          roleId: 1,
          commander: 100,
          totalSoldierCount: 95, // 95%兵力，超过90%阈值
        },
        {
          ...gameState.players[0].roles[1],
          roleId: 2,
          commander: 150,
          totalSoldierCount: 140, // 93%兵力
        }
      ];
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = NeedMoreTroops(mockContext);
      expect(result).toBe(false);
    });

    test('粮草不足时应返回 false', () => {
      // 设置粮草不足（少于100 = 20*5）
      const gameState = createTestGameState();
      gameState.players[0].supplies = 80;
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = NeedMoreTroops(mockContext);
      expect(result).toBe(false);
    });

    test('需要预留粮草占领据点时应返回 false', () => {
      // 设置粮草刚好在预留范围内（300 < 100+200）
      const gameState = createTestGameState();
      gameState.players[0].supplies = 250;
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = NeedMoreTroops(mockContext);
      expect(result).toBe(false);
    });

    test('无存活英雄时应返回 false', () => {
      const gameState = createTestGameState();
      gameState.players[0].roles = [];
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = NeedMoreTroops(mockContext);
      expect(result).toBe(false);
    });

    test('无 TeamBlackboard 时应返回 true', () => {
      const context = { 
        playerId: 1, 
        agent: null, 
        gameMap: new GameMap('0,0,0,0', 2, 2),
        teamBlackboard: null 
      };
      const result = NeedMoreTroops(context);
      expect(result).toBe(true);
    });
  });

  describe('doesHeroNeedTroops 特定英雄检查', () => {
    test('兵力低于90%的英雄需要补充', () => {
      const result = doesHeroNeedTroops(1, mockContext); // 英雄1兵力50%
      expect(result).toBe(true);
    });

    test('兵力超过90%的英雄不需要补充', () => {
      const result = doesHeroNeedTroops(2, mockContext); // 英雄2兵力93%
      expect(result).toBe(false);
    });

    test('不存在的英雄应返回 false', () => {
      const result = doesHeroNeedTroops(999, mockContext);
      expect(result).toBe(false);
    });

    test('统帅值为0的英雄应返回 false', () => {
      const gameState = createTestGameState();
      gameState.players[0].roles[0].commander = 0;
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = doesHeroNeedTroops(1, mockContext);
      expect(result).toBe(false);
    });
  });

  describe('getMostUrgentHeroForTroops 最紧急英雄', () => {
    test('应返回兵力比例最低的英雄', () => {
      const result = getMostUrgentHeroForTroops(mockContext);
      expect(result).toBe(1); // 英雄1兵力比例50%，比英雄2的93%更低
    });

    test('没有需要补充的英雄时应返回 null', () => {
      // 创建所有英雄兵力都充足的状态
      const gameState = createTestGameState();
      gameState.players[0].roles = [
        {
          ...gameState.players[0].roles[0],
          commander: 100,
          totalSoldierCount: 95, // 95%兵力
        }
      ];
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = getMostUrgentHeroForTroops(mockContext);
      expect(result).toBeNull();
    });

    test('统帅值为0的英雄应被忽略', () => {
      const gameState = createTestGameState();
      gameState.players[0].roles = [
        {
          ...gameState.players[0].roles[0],
          roleId: 1,
          commander: 0, // 统帅值为0
          totalSoldierCount: 10,
        },
        {
          ...gameState.players[0].roles[1],
          roleId: 2,
          commander: 100,
          totalSoldierCount: 50, // 50%兵力
        }
      ];
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = getMostUrgentHeroForTroops(mockContext);
      expect(result).toBe(2); // 应该返回英雄2，忽略统帅值为0的英雄1
    });
  });

  describe('边界情况和错误处理', () => {
    test('GameState为null时应正常处理', () => {
      const tb = new TeamBlackboard(1000);
      const context = { agent: null, teamBlackboard: tb };
      
      const result = NeedMoreTroops(context);
      expect(result).toBe(true); // 默认需要补充
    });

    test('英雄数据不完整时应正常处理', () => {
      const gameState = createTestGameState();
      gameState.players[0].roles[0].commander = 0; // 统帅值为0
      
      teamBlackboard.updateGameState(gameState, 1);
      
      // 应该不会抛出异常
      expect(() => NeedMoreTroops(mockContext)).not.toThrow();
    });

    test('粮草充足且无据点时应正常生产', () => {
      const gameState = createTestGameState();
      gameState.players[0].supplies = 2000; // 充足粮草
      gameState.stronghold = null; // 无据点
      
      teamBlackboard.updateGameState(gameState, 1);
      
      const result = NeedMoreTroops(mockContext);
      expect(result).toBe(true); // 应该生产士兵
    });
  });
}); 