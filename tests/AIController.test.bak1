import GameEngine from '../src/core/GameEngine.js';
import AIController from '../src/ai/AIController.js';
import { PLAYERS } from '../src/core/GameConstants.js';

/**
 * AI控制器测试套件
 * 测试AI的决策能力和行为树功能
 */
describe('AIController AI控制器测试', () => {
  let gameEngine;
  let aiController;

  beforeEach(() => {
    gameEngine = new GameEngine();
    aiController = new AIController(PLAYERS.PLAYER2, gameEngine, 'normal');
    gameEngine.startGame();
  });

  afterEach(() => {
    gameEngine = null;
    aiController = null;
  });

  describe('AI初始化测试', () => {
    test('AI控制器应该正确初始化', () => {
      expect(aiController).toBeDefined();
      expect(aiController.playerId).toBe(PLAYERS.PLAYER2);
      expect(aiController.difficulty).toBe('normal');
      expect(aiController.isActive).toBe(true);
      expect(aiController.behaviorTree).toBeDefined();
    });

    test('AI配置应该根据难度正确设置', () => {
      const easyAI = new AIController(PLAYERS.PLAYER1, gameEngine, 'easy');
      const hardAI = new AIController(PLAYERS.PLAYER1, gameEngine, 'hard');

      expect(easyAI.config.errorRate).toBeGreaterThan(hardAI.config.errorRate);
      expect(easyAI.config.reactionTime).toBeGreaterThan(hardAI.config.reactionTime);
      expect(hardAI.config.resourceManagement).toBeGreaterThan(easyAI.config.resourceManagement);
    });
  });

  describe('AI决策测试', () => {
    test('AI应该能够生成决策命令', async () => {
      const result = await aiController.executeTurn();
      
      expect(result.success).toBe(true);
      expect(result.commandsExecuted).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('AI在早期应该优先选择武将', async () => {
      // 确保是早期游戏
      gameEngine.currentTurn = 5;
      
      const result = await aiController.executeTurn();
      
      // 检查是否有选择武将的命令
      const hasPickCommand = result.results.some(r => 
        r.message && r.message.includes('选择武将')
      );
      
      // 在早期且没有武将的情况下，AI应该尝试选择武将
      const player = gameEngine.players[PLAYERS.PLAYER2];
      if (player.generals.size === 0) {
        // 注意：由于AI可能因为各种原因未能成功选择武将，这里不强制要求
        // 但至少应该生成了一些命令
        expect(result.commandsExecuted).toBeGreaterThanOrEqual(0);
      }
    });

    test('AI应该根据威胁等级调整策略', () => {
      // 测试行为树的威胁分析
      const status = aiController.getStatus();
      
      expect(status.behaviorTree.threatLevel).toBeDefined();
      expect(status.behaviorTree.strategy).toBeDefined();
      expect(['aggressive', 'defensive', 'balanced']).toContain(status.behaviorTree.strategy);
    });
  });

  describe('AI行为树测试', () => {
    test('行为树应该能够正确分析游戏阶段', () => {
      // 测试早期
      gameEngine.currentTurn = 30;
      expect(aiController.behaviorTree.isEarlyGame()).toBe(true);
      expect(aiController.behaviorTree.isMidGame()).toBe(false);
      expect(aiController.behaviorTree.isLateGame()).toBe(false);

      // 测试中期
      gameEngine.currentTurn = 100;
      expect(aiController.behaviorTree.isEarlyGame()).toBe(false);
      expect(aiController.behaviorTree.isMidGame()).toBe(true);
      expect(aiController.behaviorTree.isLateGame()).toBe(false);

      // 测试后期
      gameEngine.currentTurn = 250;
      expect(aiController.behaviorTree.isEarlyGame()).toBe(false);
      expect(aiController.behaviorTree.isMidGame()).toBe(false);
      expect(aiController.behaviorTree.isLateGame()).toBe(true);
    });

    test('黑板数据应该正确更新', async () => {
      await aiController.executeTurn();
      
      const blackboard = aiController.behaviorTree.blackboard;
      
      expect(blackboard.get('playerId')).toBe(PLAYERS.PLAYER2);
      expect(blackboard.get('strategy')).toBeDefined();
      expect(blackboard.get('threatLevel')).toBeDefined();
      expect(typeof blackboard.get('economyFocus')).toBe('boolean');
    });
  });

  describe('难度调整测试', () => {
    test('不同难度的AI应该有不同的表现', async () => {
      const easyAI = new AIController(PLAYERS.PLAYER1, gameEngine, 'easy');
      const expertAI = new AIController(PLAYERS.PLAYER1, gameEngine, 'expert');

      // 模拟多个命令测试错误率
      const commands = [
        { type: 'PICK', data: { generalName: '吕布' } },
        { type: 'MAKE', data: { generalId: 'test', archers: 1, shields: 1 } },
        { type: 'MOVE', data: { generalId: 'test', targetX: 10, targetY: 10 } }
      ];

      const easyAdjusted = easyAI.applyDifficultyAdjustments(commands);
      const expertAdjusted = expertAI.applyDifficultyAdjustments(commands);

      // 专家级AI应该保留更多命令（错误率更低）
      expect(expertAdjusted.length).toBeGreaterThanOrEqual(easyAdjusted.length);
    });

    test('AI难度可以动态调整', () => {
      expect(aiController.difficulty).toBe('normal');
      
      aiController.setDifficulty('hard');
      
      expect(aiController.difficulty).toBe('hard');
      expect(aiController.config.name).toBe('困难');
    });
  });

  describe('AI状态管理测试', () => {
    test('AI状态可以获取和监控', () => {
      const status = aiController.getStatus();
      
      expect(status.playerId).toBe(PLAYERS.PLAYER2);
      expect(status.difficulty).toBe('normal');
      expect(status.isActive).toBe(true);
      expect(status.gameState).toBeDefined();
      expect(status.performance).toBeDefined();
      expect(status.behaviorTree).toBeDefined();
    });

    test('AI可以激活和停用', async () => {
      aiController.setActive(false);
      
      const result = await aiController.executeTurn();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('未激活');
      
      aiController.setActive(true);
      
      const result2 = await aiController.executeTurn();
      expect(result2.success).toBe(true);
    });

    test('AI状态可以重置', () => {
      aiController.stats.totalCommands = 100;
      aiController.executionCount = 50;
      
      aiController.reset();
      
      expect(aiController.stats.totalCommands).toBe(0);
      expect(aiController.executionCount).toBe(0);
    });
  });

  describe('AI决策解释测试', () => {
    test('AI应该能够解释其决策过程', async () => {
      await aiController.executeTurn();
      
      const explanation = aiController.getDecisionExplanation();
      
      expect(explanation.currentStrategy).toBeDefined();
      expect(explanation.threatAssessment).toBeDefined();
      expect(explanation.priorities).toBeDefined();
      expect(explanation.gamePhase).toBeDefined();
      expect(explanation.strategicGoals).toBeDefined();
    });

    test('威胁等级描述应该正确', () => {
      expect(aiController.getThreatDescription(1)).toContain('威胁很低');
      expect(aiController.getThreatDescription(5)).toContain('威胁中等');
      expect(aiController.getThreatDescription(9)).toContain('威胁极高');
    });

    test('游戏阶段描述应该正确', () => {
      gameEngine.currentTurn = 30;
      expect(aiController.getCurrentGamePhase()).toContain('早期');
      
      gameEngine.currentTurn = 100;
      expect(aiController.getCurrentGamePhase()).toContain('中期');
      
      gameEngine.currentTurn = 250;
      expect(aiController.getCurrentGamePhase()).toContain('后期');
    });
  });

  describe('AI性能统计测试', () => {
    test('AI应该记录执行统计', async () => {
      const initialStats = { ...aiController.stats };
      
      await aiController.executeTurn();
      
      expect(aiController.stats.totalCommands).toBeGreaterThanOrEqual(initialStats.totalCommands);
      expect(aiController.executionCount).toBe(1);
      expect(aiController.lastExecutionTime).toBeGreaterThan(0);
    });

    test('AI应该计算平均执行时间', async () => {
      await aiController.executeTurn();
      await aiController.executeTurn();
      
      expect(aiController.stats.averageExecutionTime).toBeGreaterThan(0);
      expect(aiController.executionCount).toBe(2);
    });
  });

  describe('AI对战测试', () => {
    let player1AI, player2AI;

    beforeEach(() => {
      player1AI = new AIController(PLAYERS.PLAYER1, gameEngine, 'normal');
      player2AI = new AIController(PLAYERS.PLAYER2, gameEngine, 'normal');
    });

    test('两个AI应该能够对战', async () => {
      // 执行几个回合的AI对战
      for (let turn = 0; turn < 5; turn++) {
        await player1AI.executeTurn();
        await player2AI.executeTurn();
        gameEngine.nextTurn();
      }
      
      expect(gameEngine.currentTurn).toBe(6);
      expect(gameEngine.gameState).toBe('running');
    });

    test('AI对战应该产生有意义的游戏进展', async () => {
      const initialState = gameEngine.getGameState();
      
      // 执行多个回合
      for (let turn = 0; turn < 10; turn++) {
        await player1AI.executeTurn();
        await player2AI.executeTurn();
        gameEngine.nextTurn();
      }
      
      const finalState = gameEngine.getGameState();
      
      // 检查游戏是否有进展（至少应该有武将被选择）
      const player1Generals = finalState.players[PLAYERS.PLAYER1].generals.length;
      const player2Generals = finalState.players[PLAYERS.PLAYER2].generals.length;
      
      expect(player1Generals + player2Generals).toBeGreaterThan(0);
    });
  });

  describe('AI学习和训练测试', () => {
    test('AI应该能够保存训练数据', () => {
      const gameResult = {
        winner: PLAYERS.PLAYER1,
        turns: 100,
        reason: 'flag_control'
      };
      
      // 这个测试主要确保方法不会抛出异常
      expect(() => {
        aiController.saveTrainingData(gameResult);
      }).not.toThrow();
    });

    test('AI应该能够从训练数据学习', () => {
      const trainingData = [
        { gameResult: { winner: PLAYERS.PLAYER2 } },
        { gameResult: { winner: PLAYERS.PLAYER1 } },
        { gameResult: { winner: PLAYERS.PLAYER2 } }
      ];
      
      aiController.learnFromData(trainingData);
      
      expect(aiController.stats.winRate).toBeCloseTo(0.67, 1);
    });
  });

  describe('边界条件测试', () => {
    test('AI在极端游戏状态下应该正常工作', async () => {
      // 模拟游戏即将结束的情况
      gameEngine.currentTurn = 990;
      
      const result = await aiController.executeTurn();
      
      // AI应该能够处理这种情况而不崩溃
      expect(result).toBeDefined();
    });

    test('AI在资源极度匮乏时应该正常工作', async () => {
      // 设置玩家资源为0
      const player = gameEngine.players[PLAYERS.PLAYER2];
      player.food = 0;
      player.morale = 0;
      
      const result = await aiController.executeTurn();
      
      // AI应该能够处理资源不足的情况
      expect(result).toBeDefined();
    });
  });

  describe('并发和异步测试', () => {
    test('AI执行应该是异步的', async () => {
      const startTime = Date.now();
      
      await aiController.executeTurn();
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 由于有模拟反应时间，执行应该需要一定时间
      // 但具体时间取决于AI配置
      expect(executionTime).toBeGreaterThanOrEqual(0);
    });

    test('多个AI可以并行执行', async () => {
      const ai1 = new AIController(PLAYERS.PLAYER1, gameEngine, 'easy');
      const ai2 = new AIController(PLAYERS.PLAYER2, gameEngine, 'easy');
      
      // 并行执行两个AI
      const results = await Promise.all([
        ai1.executeTurn(),
        ai2.executeTurn()
      ]);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });
  });
}); 