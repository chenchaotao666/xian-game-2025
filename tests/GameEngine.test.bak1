import GameEngine from '../src/core/GameEngine.js';
import { PLAYERS, COMMANDS } from '../src/core/GameConstants.js';

/**
 * 游戏引擎测试套件
 * 测试游戏的核心功能和逻辑
 */
describe('GameEngine 游戏引擎测试', () => {
  let gameEngine;

  beforeEach(() => {
    // 每个测试前重新创建游戏引擎
    gameEngine = new GameEngine();
  });

  afterEach(() => {
    // 清理测试数据
    gameEngine = null;
  });

  describe('基础功能测试', () => {
    test('游戏引擎应该正确初始化', () => {
      expect(gameEngine).toBeDefined();
      expect(gameEngine.currentTurn).toBe(1);
      expect(gameEngine.gameState).toBe('preparing');
      expect(gameEngine.players).toBeDefined();
      expect(gameEngine.map).toBeDefined();
    });

    test('玩家数据应该正确初始化', () => {
      const player1 = gameEngine.players[PLAYERS.PLAYER1];
      const player2 = gameEngine.players[PLAYERS.PLAYER2];

      expect(player1).toBeDefined();
      expect(player1.food).toBe(100);
      expect(player1.generals.size).toBe(0);
      expect(player1.basePosition).toBeDefined();

      expect(player2).toBeDefined();
      expect(player2.food).toBe(100);
      expect(player2.generals.size).toBe(0);
      expect(player2.basePosition).toBeDefined();
    });

    test('应该能够开始游戏', () => {
      gameEngine.startGame();
      
      expect(gameEngine.gameState).toBe('running');
      expect(gameEngine.currentTurn).toBe(1);
    });
  });

  describe('武将选择测试', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('应该能够选择武将', () => {
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '吕布',
          position: { x: 10, y: 10 }
        }
      });

      expect(result.success).toBe(true);
      expect(result.generalId).toBeDefined();
      
      const player = gameEngine.players[PLAYERS.PLAYER1];
      expect(player.generals.size).toBe(1);
    });

    test('不应该允许选择已被选择的武将', () => {
      // 玩家1选择吕布
      gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '吕布',
          position: { x: 10, y: 10 }
        }
      });

      // 玩家2尝试选择同一武将
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER2, {
        type: COMMANDS.PICK,
        data: {
          generalName: '吕布',
          position: { x: 20, y: 20 }
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('已被选择');
    });

    test('不应该允许超过武将数量上限', () => {
      // 选择3个武将（假设上限是3）
      const generals = ['吕布', '赵云', '关羽', '刘备'];
      
      generals.forEach((name, index) => {
        const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
          type: COMMANDS.PICK,
          data: {
            generalName: name,
            position: { x: 10 + index, y: 10 }
          }
        });

        if (index < 3) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
          expect(result.message).toContain('上限');
        }
      });
    });
  });

  describe('小兵生产测试', () => {
    let generalId;

    beforeEach(() => {
      gameEngine.startGame();
      
      // 选择一个武将
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '刘备',
          position: { x: 10, y: 10 }
        }
      });
      
      generalId = result.generalId;
    });

    test('应该能够生产小兵', () => {
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MAKE,
        data: {
          generalId: generalId,
          archers: 2,
          shields: 2
        }
      });

      expect(result.success).toBe(true);
      
      const player = gameEngine.players[PLAYERS.PLAYER1];
      expect(player.food).toBe(20); // 100 - 4*20 = 20
    });

    test('粮草不足时不应该能够生产小兵', () => {
      // 消耗所有粮草
      gameEngine.players[PLAYERS.PLAYER1].food = 10;
      
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MAKE,
        data: {
          generalId: generalId,
          archers: 1,
          shields: 1
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('粮草不足');
    });

    test('超过统帅值时不应该能够生产小兵', () => {
      // 尝试生产超过统帅值的小兵
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MAKE,
        data: {
          generalId: generalId,
          archers: 10,
          shields: 10
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('统帅值');
    });
  });

  describe('移动测试', () => {
    let generalId;

    beforeEach(() => {
      gameEngine.startGame();
      
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '赵云',
          position: { x: 10, y: 10 }
        }
      });
      
      generalId = result.generalId;
    });

    test('应该能够移动武将', () => {
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MOVE,
        data: {
          generalId: generalId,
          targetX: 11,
          targetY: 11
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('移动到');
    });

    test('不应该允许超距离移动', () => {
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MOVE,
        data: {
          generalId: generalId,
          targetX: 20,
          targetY: 20
        }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('距离');
    });
  });

  describe('战斗测试', () => {
    let player1GeneralId, player2GeneralId;

    beforeEach(() => {
      gameEngine.startGame();
      
      // 玩家1选择武将
      const result1 = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '吕布',
          position: { x: 10, y: 10 }
        }
      });
      player1GeneralId = result1.generalId;

      // 玩家2选择武将
      const result2 = gameEngine.processPlayerCommand(PLAYERS.PLAYER2, {
        type: COMMANDS.PICK,
        data: {
          generalName: '赵云',
          position: { x: 12, y: 10 }
        }
      });
      player2GeneralId = result2.generalId;
    });

    test('应该能够攻击敌方武将', () => {
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.AD,
        data: {
          generalId: player1GeneralId,
          targetX: 12,
          targetY: 10
        }
      });

      expect(result.success).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
    });

    test('不应该允许攻击己方武将', () => {
      // 玩家1再选择一个武将
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '关羽',
          position: { x: 11, y: 10 }
        }
      });

      const friendlyGeneralId = result.generalId;

      // 尝试攻击己方武将
      const attackResult = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.AD,
        data: {
          generalId: player1GeneralId,
          targetX: 11,
          targetY: 10
        }
      });

      expect(attackResult.success).toBe(false);
      expect(attackResult.message).toContain('不能攻击自己');
    });
  });

  describe('回合系统测试', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('应该能够推进回合', () => {
      const initialTurn = gameEngine.currentTurn;
      
      const result = gameEngine.nextTurn();
      
      expect(result.success).toBe(true);
      expect(gameEngine.currentTurn).toBe(initialTurn + 1);
    });

    test('回合推进应该更新游戏状态', () => {
      const initialStats = { ...gameEngine.gameStats };
      
      gameEngine.nextTurn();
      
      expect(gameEngine.gameStats.totalTurns).toBe(initialStats.totalTurns + 1);
    });
  });

  describe('胜负判定测试', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('达到最大回合数时应该结束游戏', () => {
      // 模拟达到最大回合数
      gameEngine.currentTurn = 999; // 接近上限
      
      const result = gameEngine.nextTurn();
      
      expect(gameEngine.gameState).toBe('finished');
      expect(gameEngine.winner).toBeDefined();
    });
  });

  describe('游戏状态获取测试', () => {
    beforeEach(() => {
      gameEngine.startGame();
    });

    test('应该能够获取完整游戏状态', () => {
      const gameState = gameEngine.getGameState();
      
      expect(gameState).toBeDefined();
      expect(gameState.currentTurn).toBeDefined();
      expect(gameState.gameState).toBeDefined();
      expect(gameState.players).toBeDefined();
      expect(gameState.map).toBeDefined();
    });

    test('应该能够获取玩家视图', () => {
      const playerView = gameEngine.getPlayerView(PLAYERS.PLAYER1);
      
      expect(playerView).toBeDefined();
      expect(playerView.currentTurn).toBeDefined();
      expect(playerView.player).toBeDefined();
      expect(playerView.map).toBeDefined();
    });
  });

  describe('错误处理测试', () => {
    test('游戏未开始时不应该处理命令', () => {
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: { generalName: '吕布' }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('未进行中');
    });

    test('无效玩家ID应该返回错误', () => {
      gameEngine.startGame();
      
      const result = gameEngine.processPlayerCommand(999, {
        type: COMMANDS.PICK,
        data: { generalName: '吕布' }
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('无效的玩家ID');
    });

    test('无效命令类型应该返回错误', () => {
      gameEngine.startGame();
      
      const result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: 'INVALID_COMMAND',
        data: {}
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('未知命令类型');
    });
  });

  describe('综合测试', () => {
    test('完整游戏流程测试', () => {
      // 开始游戏
      gameEngine.startGame();
      expect(gameEngine.gameState).toBe('running');

      // 玩家1选择武将
      let result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.PICK,
        data: {
          generalName: '刘备',
          position: { x: 10, y: 10 }
        }
      });
      expect(result.success).toBe(true);
      const player1GeneralId = result.generalId;

      // 玩家2选择武将
      result = gameEngine.processPlayerCommand(PLAYERS.PLAYER2, {
        type: COMMANDS.PICK,
        data: {
          generalName: '曹操',
          position: { x: 70, y: 50 }
        }
      });
      expect(result.success).toBe(true);
      const player2GeneralId = result.generalId;

      // 生产小兵
      result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MAKE,
        data: {
          generalId: player1GeneralId,
          archers: 3,
          shields: 3
        }
      });
      expect(result.success).toBe(true);

      // 移动武将
      result = gameEngine.processPlayerCommand(PLAYERS.PLAYER1, {
        type: COMMANDS.MOVE,
        data: {
          generalId: player1GeneralId,
          targetX: 11,
          targetY: 11
        }
      });
      expect(result.success).toBe(true);

      // 推进回合
      result = gameEngine.nextTurn();
      expect(result.success).toBe(true);
      expect(gameEngine.currentTurn).toBe(2);

      // 验证游戏状态
      const gameState = gameEngine.getGameState();
      expect(gameState.currentTurn).toBe(2);
      expect(Object.keys(gameState.players)).toHaveLength(2);
    });
  });
}); 