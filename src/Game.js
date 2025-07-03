import GameEngine from './core/GameEngine.js';
import AIController from './ai/AIController.js';
import { PLAYERS } from './core/GameConstants.js';

/**
 * 三国策略对战游戏主类
 * 集成游戏引擎和AI控制器，提供完整的游戏体验
 */
export default class XianGame {
  constructor(config = {}) {
    // 游戏配置
    this.config = {
      player1Type: config.player1Type || 'ai',     // 'human' | 'ai'
      player2Type: config.player2Type || 'ai',     // 'human' | 'ai'
      ai1Difficulty: config.ai1Difficulty || 'normal',  // 'easy' | 'normal' | 'hard' | 'expert'
      ai2Difficulty: config.ai2Difficulty || 'hard',    // 'easy' | 'normal' | 'hard' | 'expert'
      autoPlay: config.autoPlay !== false,         // 是否自动进行游戏
      maxTurns: config.maxTurns || 1000,          // 最大回合数
      logLevel: config.logLevel || 'info',        // 'debug' | 'info' | 'warn' | 'error'
      renderMode: config.renderMode || 'console', // 'console' | 'web' | 'headless'
      gameSpeed: config.gameSpeed || 'normal'     // 'slow' | 'normal' | 'fast' | 'instant'
    };

    // 初始化游戏引擎
    this.gameEngine = new GameEngine();
    
    // 初始化AI控制器
    this.aiControllers = {};
    this.initializeAI();
    
    // 游戏状态
    this.isRunning = false;
    this.isPaused = false;
    this.gameResult = null;
    
    // 统计数据
    this.gameStats = {
      startTime: null,
      endTime: null,
      totalDuration: 0,
      turnsPlayed: 0,
      winner: null,
      winReason: null,
      player1Stats: {
        totalCommands: 0,
        successfulCommands: 0,
        averageThinkTime: 0
      },
      player2Stats: {
        totalCommands: 0,
        successfulCommands: 0,
        averageThinkTime: 0
      }
    };

    this.log('三国策略对战游戏初始化完成', 'info');
  }

  /**
   * 初始化AI控制器
   */
  initializeAI() {
    if (this.config.player1Type === 'ai') {
      this.aiControllers[PLAYERS.PLAYER1] = new AIController(
        PLAYERS.PLAYER1, 
        this.gameEngine, 
        this.config.ai1Difficulty
      );
    }

    if (this.config.player2Type === 'ai') {
      this.aiControllers[PLAYERS.PLAYER2] = new AIController(
        PLAYERS.PLAYER2, 
        this.gameEngine, 
        this.config.ai2Difficulty
      );
    }
  }

  /**
   * 开始游戏
   * @returns {Promise<Object>} 游戏结果
   */
  async startGame() {
    if (this.isRunning) {
      throw new Error('游戏已经在运行中');
    }

    this.isRunning = true;
    this.gameStats.startTime = Date.now();
    
    this.log('=== 三国策略对战游戏开始 ===', 'info');
    this.log(`玩家1: ${this.config.player1Type} (${this.config.ai1Difficulty})`, 'info');
    this.log(`玩家2: ${this.config.player2Type} (${this.config.ai2Difficulty})`, 'info');
    
    // 启动游戏引擎
    this.gameEngine.startGame();
    
    try {
      if (this.config.autoPlay) {
        // 自动进行游戏
        this.gameResult = await this.autoPlayGame();
      } else {
        // 手动控制游戏
        this.log('游戏已启动，等待手动操作', 'info');
      }
      
      return this.gameResult;
      
    } catch (error) {
      this.log(`游戏执行错误: ${error.message}`, 'error');
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * 自动进行游戏
   * @returns {Promise<Object>} 游戏结果
   */
  async autoPlayGame() {
    let turnCount = 0;
    const maxTurns = this.config.maxTurns;
    
    while (this.gameEngine.gameState === 'running' && turnCount < maxTurns) {
      if (this.isPaused) {
        await this.sleep(100);
        continue;
      }

      turnCount++;
      this.log(`\n=== 第 ${this.gameEngine.currentTurn} 回合 ===`, 'info');
      
      // 执行玩家1回合
      if (this.config.player1Type === 'ai') {
        await this.executeAITurn(PLAYERS.PLAYER1);
      }
      
      // 执行玩家2回合
      if (this.config.player2Type === 'ai') {
        await this.executeAITurn(PLAYERS.PLAYER2);
      }
      
      // 推进回合
      const turnResult = this.gameEngine.nextTurn();
      
      if (turnResult.success && turnResult.message.includes('获胜')) {
        this.log(turnResult.message, 'info');
        break;
      }
      
      // 渲染游戏状态
      this.renderGameState();
      
      // 控制游戏速度
      await this.applyGameSpeed();
      
      this.gameStats.turnsPlayed++;
    }
    
    return this.endGame();
  }

  /**
   * 执行AI回合
   * @param {number} playerId - 玩家ID
   */
  async executeAITurn(playerId) {
    const aiController = this.aiControllers[playerId];
    
    if (!aiController) {
      this.log(`玩家${playerId}没有AI控制器`, 'warn');
      return;
    }

    try {
      const startTime = Date.now();
      const result = await aiController.executeTurn();
      const thinkTime = Date.now() - startTime;
      
      // 更新统计
      const playerStats = playerId === PLAYERS.PLAYER1 ? 
        this.gameStats.player1Stats : this.gameStats.player2Stats;
      
      playerStats.totalCommands += result.commandsExecuted || 0;
      if (result.success) {
        playerStats.successfulCommands += result.commandsExecuted || 0;
      }
      playerStats.averageThinkTime = 
        (playerStats.averageThinkTime + thinkTime) / 2;
      
      this.log(`AI玩家${playerId}执行完成: ${result.commandsExecuted}个命令, 用时${thinkTime}ms`, 'debug');
      
    } catch (error) {
      this.log(`AI玩家${playerId}执行错误: ${error.message}`, 'error');
    }
  }

  /**
   * 结束游戏
   * @returns {Object} 游戏结果
   */
  endGame() {
    this.isRunning = false;
    this.gameStats.endTime = Date.now();
    this.gameStats.totalDuration = this.gameStats.endTime - this.gameStats.startTime;
    
    const finalState = this.gameEngine.getGameState();
    
    this.gameResult = {
      winner: finalState.winner,
      winReason: this.determineWinReason(finalState),
      totalTurns: finalState.currentTurn,
      duration: this.gameStats.totalDuration,
      playerStats: {
        [PLAYERS.PLAYER1]: this.getPlayerFinalStats(PLAYERS.PLAYER1),
        [PLAYERS.PLAYER2]: this.getPlayerFinalStats(PLAYERS.PLAYER2)
      },
      gameStats: finalState.stats
    };
    
    this.log('=== 游戏结束 ===', 'info');
    this.printGameSummary();
    
    return this.gameResult;
  }

  /**
   * 确定胜利原因
   * @param {Object} gameState - 游戏状态
   * @returns {string} 胜利原因
   */
  determineWinReason(gameState) {
    if (gameState.currentTurn >= this.config.maxTurns) {
      return 'max_turns_reached';
    }
    
    const winner = gameState.winner;
    if (winner && winner.flagControlTurns >= 60) {
      return 'flag_control';
    }
    
    return 'elimination';
  }

  /**
   * 获取玩家最终统计
   * @param {number} playerId - 玩家ID
   * @returns {Object} 玩家统计数据
   */
  getPlayerFinalStats(playerId) {
    const gameState = this.gameEngine.getGameState();
    const player = gameState.players[playerId];
    const aiController = this.aiControllers[playerId];
    const playerStats = playerId === PLAYERS.PLAYER1 ? 
      this.gameStats.player1Stats : this.gameStats.player2Stats;
    
    return {
      type: this.config[`player${playerId}Type`],
      difficulty: playerId === PLAYERS.PLAYER1 ? 
        this.config.ai1Difficulty : this.config.ai2Difficulty,
      generals: player.generals.length,
      aliveGenerals: player.generals.filter(g => g.isAlive).length,
      food: player.food,
      morale: player.morale,
      flagControlTurns: player.flagControlTurns,
      commands: playerStats,
      aiStats: aiController ? aiController.getStatus().performance : null
    };
  }

  /**
   * 打印游戏总结
   */
  printGameSummary() {
    const result = this.gameResult;
    
    this.log(`游戏时长: ${(result.duration / 1000).toFixed(2)}秒`, 'info');
    this.log(`总回合数: ${result.totalTurns}`, 'info');
    
    if (result.winner) {
      this.log(`获胜者: 玩家${result.winner.id} (${result.winReason})`, 'info');
    } else {
      this.log('游戏平局', 'info');
    }
    
    // 打印详细统计
    this.log('\n=== 详细统计 ===', 'info');
    Object.entries(result.playerStats).forEach(([playerId, stats]) => {
      this.log(`玩家${playerId}:`, 'info');
      this.log(`  类型: ${stats.type} (${stats.difficulty})`, 'info');
      this.log(`  武将: ${stats.aliveGenerals}/${stats.generals} 存活`, 'info');
      this.log(`  资源: 粮草${stats.food}, 士气${stats.morale}`, 'info');
      this.log(`  据点控制: ${stats.flagControlTurns}回合`, 'info');
      
      if (stats.aiStats) {
        this.log(`  AI表现: ${stats.commands.successfulCommands}/${stats.commands.totalCommands} 成功命令`, 'info');
        this.log(`  平均思考时间: ${stats.commands.averageThinkTime.toFixed(0)}ms`, 'info');
      }
    });
  }

  /**
   * 渲染游戏状态
   */
  renderGameState() {
    if (this.config.renderMode === 'headless') {
      return;
    }
    
    if (this.config.renderMode === 'console') {
      this.renderConsoleState();
    } else if (this.config.renderMode === 'web') {
      this.renderWebState();
    }
  }

  /**
   * 控制台渲染
   */
  renderConsoleState() {
    const gameState = this.gameEngine.getGameState();
    
    // 简化的控制台显示
    this.log(`回合${gameState.currentTurn} | `, 'info', false);
    
    Object.entries(gameState.players).forEach(([playerId, player]) => {
      const aliveGenerals = player.generals.filter(g => g.isAlive).length;
      this.log(`P${playerId}:${aliveGenerals}将/${player.food}粮/${player.flagControlTurns}据点 | `, 'info', false);
    });
    
    this.log('', 'info'); // 换行
  }

  /**
   * Web渲染（占位符）
   */
  renderWebState() {
    // 这里可以实现Web界面的渲染
    // 例如更新HTML元素、Canvas绘制等
    this.log('Web渲染模式暂未实现', 'debug');
  }

  /**
   * 应用游戏速度延迟
   */
  async applyGameSpeed() {
    const delays = {
      slow: 2000,
      normal: 500,
      fast: 100,
      instant: 0
    };
    
    const delay = delays[this.config.gameSpeed] || delays.normal;
    
    if (delay > 0) {
      await this.sleep(delay);
    }
  }

  /**
   * 暂停游戏
   */
  pauseGame() {
    this.isPaused = true;
    this.log('游戏已暂停', 'info');
  }

  /**
   * 恢复游戏
   */
  resumeGame() {
    this.isPaused = false;
    this.log('游戏已恢复', 'info');
  }

  /**
   * 停止游戏
   */
  stopGame() {
    this.isRunning = false;
    this.isPaused = false;
    this.log('游戏已停止', 'info');
  }

  /**
   * 重置游戏
   */
  resetGame() {
    this.stopGame();
    this.gameEngine = new GameEngine();
    this.initializeAI();
    this.gameResult = null;
    this.gameStats = {
      startTime: null,
      endTime: null,
      totalDuration: 0,
      turnsPlayed: 0,
      winner: null,
      winReason: null,
      player1Stats: { totalCommands: 0, successfulCommands: 0, averageThinkTime: 0 },
      player2Stats: { totalCommands: 0, successfulCommands: 0, averageThinkTime: 0 }
    };
    this.log('游戏已重置', 'info');
  }

  /**
   * 获取游戏状态
   * @returns {Object} 当前游戏状态
   */
  getGameState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      config: this.config,
      gameEngine: this.gameEngine.getGameState(),
      aiStatus: Object.fromEntries(
        Object.entries(this.aiControllers).map(([id, ai]) => [id, ai.getStatus()])
      ),
      statistics: this.gameStats,
      result: this.gameResult
    };
  }

  /**
   * 设置AI难度
   * @param {number} playerId - 玩家ID
   * @param {string} difficulty - 难度等级
   */
  setAIDifficulty(playerId, difficulty) {
    const aiController = this.aiControllers[playerId];
    
    if (aiController) {
      aiController.setDifficulty(difficulty);
      
      if (playerId === PLAYERS.PLAYER1) {
        this.config.ai1Difficulty = difficulty;
      } else {
        this.config.ai2Difficulty = difficulty;
      }
      
      this.log(`玩家${playerId}AI难度已设置为: ${difficulty}`, 'info');
    }
  }

  /**
   * 执行单个回合（用于手动控制）
   * @returns {Promise<Object>} 回合执行结果
   */
  async executeSingleTurn() {
    if (!this.isRunning) {
      throw new Error('游戏未运行');
    }

    // 执行AI回合
    if (this.config.player1Type === 'ai') {
      await this.executeAITurn(PLAYERS.PLAYER1);
    }
    
    if (this.config.player2Type === 'ai') {
      await this.executeAITurn(PLAYERS.PLAYER2);
    }
    
    // 推进回合
    const result = this.gameEngine.nextTurn();
    
    // 检查游戏是否结束
    if (this.gameEngine.gameState === 'finished') {
      return this.endGame();
    }
    
    return result;
  }

  /**
   * 批量运行游戏（用于测试和统计）
   * @param {number} gameCount - 游戏数量
   * @param {Object} config - 游戏配置
   * @returns {Promise<Array>} 游戏结果列表
   */
  static async runBatch(gameCount, config = {}) {
    const results = [];
    
    console.log(`开始批量运行${gameCount}场游戏...`);
    
    for (let i = 0; i < gameCount; i++) {
      const game = new XianGame({
        ...config,
        renderMode: 'headless',
        gameSpeed: 'instant',
        logLevel: 'error'
      });
      
      try {
        const result = await game.startGame();
        results.push({
          gameIndex: i + 1,
          ...result
        });
        
        if ((i + 1) % 10 === 0) {
          console.log(`完成 ${i + 1}/${gameCount} 场游戏`);
        }
        
      } catch (error) {
        console.error(`第${i + 1}场游戏出错:`, error.message);
        results.push({
          gameIndex: i + 1,
          error: error.message
        });
      }
    }
    
    // 统计结果
    XianGame.printBatchStatistics(results);
    
    return results;
  }

  /**
   * 打印批量游戏统计
   * @param {Array} results - 游戏结果列表
   */
  static printBatchStatistics(results) {
    const validResults = results.filter(r => !r.error);
    const totalGames = validResults.length;
    
    if (totalGames === 0) {
      console.log('没有有效的游戏结果');
      return;
    }
    
    const player1Wins = validResults.filter(r => r.winner && r.winner.id === PLAYERS.PLAYER1).length;
    const player2Wins = validResults.filter(r => r.winner && r.winner.id === PLAYERS.PLAYER2).length;
    const draws = totalGames - player1Wins - player2Wins;
    
    const avgTurns = validResults.reduce((sum, r) => sum + r.totalTurns, 0) / totalGames;
    const avgDuration = validResults.reduce((sum, r) => sum + r.duration, 0) / totalGames;
    
    console.log('\n=== 批量游戏统计 ===');
    console.log(`总游戏数: ${totalGames}`);
    console.log(`玩家1胜率: ${(player1Wins / totalGames * 100).toFixed(1)}% (${player1Wins}胜)`);
    console.log(`玩家2胜率: ${(player2Wins / totalGames * 100).toFixed(1)}% (${player2Wins}胜)`);
    console.log(`平局率: ${(draws / totalGames * 100).toFixed(1)}% (${draws}场)`);
    console.log(`平均回合数: ${avgTurns.toFixed(1)}`);
    console.log(`平均游戏时长: ${(avgDuration / 1000).toFixed(1)}秒`);
  }

  /**
   * 日志输出
   * @param {string} message - 消息内容
   * @param {string} level - 日志级别
   * @param {boolean} newline - 是否换行
   */
  log(message, level = 'info', newline = true) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel] || 1;
    
    if (levels[level] >= configLevel) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      if (newline) {
        console.log(`${prefix} ${message}`);
      } else {
        process.stdout.write(`${prefix} ${message}`);
      }
    }
  }

  /**
   * 休眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise} Promise对象
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 