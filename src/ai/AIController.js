import AIBehaviorTree from './BehaviorTree.js';

/**
 * AI控制器类
 * 负责管理AI行为树实例和与游戏引擎的交互
 */
export default class AIController {
  constructor(playerId, gameEngine, difficulty = 'normal') {
    this.playerId = playerId;
    this.gameEngine = gameEngine;
    this.difficulty = difficulty; // easy, normal, hard, expert
    
    // 创建行为树
    this.behaviorTree = new AIBehaviorTree(playerId, gameEngine);
    
    // AI配置参数
    this.config = this.getConfigByDifficulty(difficulty);
    
    // 执行状态
    this.isActive = true;
    this.lastExecutionTime = 0;
    this.executionCount = 0;
    
    // 性能统计
    this.stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageExecutionTime: 0,
      winRate: 0
    };
    
    console.log(`AI控制器初始化完成 - 玩家${playerId}, 难度:${difficulty}`);
  }

  /**
   * 根据难度获取AI配置
   * @param {string} difficulty - 难度等级
   * @returns {Object} AI配置对象
   */
  getConfigByDifficulty(difficulty) {
    const configs = {
      easy: {
        name: '简单',
        reactionTime: 2000,      // 反应时间(ms)
        errorRate: 0.15,         // 错误率
        planningDepth: 1,        // 计划深度
        aggressiveness: 0.3,     // 攻击性
        resourceManagement: 0.6, // 资源管理能力
        microManagement: 0.4     // 微操能力
      },
      normal: {
        name: '普通',
        reactionTime: 1000,
        errorRate: 0.08,
        planningDepth: 2,
        aggressiveness: 0.5,
        resourceManagement: 0.8,
        microManagement: 0.6
      },
      hard: {
        name: '困难',
        reactionTime: 500,
        errorRate: 0.03,
        planningDepth: 3,
        aggressiveness: 0.7,
        resourceManagement: 0.9,
        microManagement: 0.8
      },
      expert: {
        name: '专家',
        reactionTime: 100,
        errorRate: 0.01,
        planningDepth: 4,
        aggressiveness: 0.9,
        resourceManagement: 1.0,
        microManagement: 1.0
      }
    };
    
    return configs[difficulty] || configs.normal;
  }

  /**
   * 执行AI回合
   * 这是AI的主要执行入口点
   * @returns {Promise<Object>} 执行结果
   */
  async executeTurn() {
    if (!this.isActive) {
      return { success: false, message: 'AI未激活' };
    }

    const startTime = Date.now();
    const results = [];
    
    try {
      console.log(`\n=== AI玩家${this.playerId} 第${this.gameEngine.currentTurn}回合开始 ===`);
      
      // 1. 执行行为树获取决策
      const commands = this.behaviorTree.step();
      console.log(`AI生成了${commands.length}个命令`);
      
      // 2. 应用难度调整
      const adjustedCommands = this.applyDifficultyAdjustments(commands);
      
      // 3. 执行命令
      for (const command of adjustedCommands) {
        const result = await this.executeCommand(command);
        results.push(result);
        
        // 统计成功/失败
        if (result.success) {
          this.stats.successfulCommands++;
        } else {
          this.stats.failedCommands++;
        }
        this.stats.totalCommands++;
        
        // 模拟反应时间
        if (this.config.reactionTime > 0) {
          await this.sleep(this.config.reactionTime / adjustedCommands.length);
        }
      }
      
      // 4. 更新统计信息
      const executionTime = Date.now() - startTime;
      this.updateStats(executionTime);
      
      console.log(`AI回合完成 - 执行${adjustedCommands.length}个命令, 用时${executionTime}ms`);
      
      return {
        success: true,
        commandsExecuted: adjustedCommands.length,
        results: results,
        executionTime: executionTime
      };
      
    } catch (error) {
      console.error(`AI执行错误: ${error.message}`);
      return {
        success: false,
        message: error.message,
        results: results
      };
    }
  }

  /**
   * 应用难度调整
   * 根据难度设置调整AI的决策质量
   * @param {Array} commands - 原始命令列表
   * @returns {Array} 调整后的命令列表
   */
  applyDifficultyAdjustments(commands) {
    let adjustedCommands = [...commands];
    
    // 1. 应用错误率（移除一些命令或替换为错误命令）
    if (this.config.errorRate > 0) {
      adjustedCommands = this.applyErrorRate(adjustedCommands);
    }
    
    // 2. 应用计划深度限制（限制复杂策略）
    if (this.config.planningDepth < 4) {
      adjustedCommands = this.limitPlanningDepth(adjustedCommands);
    }
    
    // 3. 应用资源管理能力
    if (this.config.resourceManagement < 1.0) {
      adjustedCommands = this.adjustResourceManagement(adjustedCommands);
    }
    
    return adjustedCommands;
  }

  /**
   * 应用错误率
   * @param {Array} commands - 命令列表
   * @returns {Array} 调整后的命令列表
   */
  applyErrorRate(commands) {
    return commands.filter(() => Math.random() > this.config.errorRate);
  }

  /**
   * 限制计划深度
   * @param {Array} commands - 命令列表
   * @returns {Array} 调整后的命令列表
   */
  limitPlanningDepth(commands) {
    // 根据计划深度限制复杂操作的数量
    const maxComplexCommands = this.config.planningDepth * 2;
    const complexTypes = ['SK', 'FORM', 'AC', 'BUFF'];
    
    let complexCount = 0;
    return commands.filter(cmd => {
      if (complexTypes.includes(cmd.type)) {
        if (complexCount >= maxComplexCommands) {
          return false;
        }
        complexCount++;
      }
      return true;
    });
  }

  /**
   * 调整资源管理
   * @param {Array} commands - 命令列表
   * @returns {Array} 调整后的命令列表
   */
  adjustResourceManagement(commands) {
    // 降低资源管理能力：减少生产和经济相关决策的效率
    return commands.map(cmd => {
      if (cmd.type === 'MAKE') {
        // 减少小兵生产数量
        const reduction = 1 - this.config.resourceManagement;
        cmd.data.archers = Math.floor(cmd.data.archers * (1 - reduction * 0.5));
        cmd.data.shields = Math.floor(cmd.data.shields * (1 - reduction * 0.5));
      }
      return cmd;
    });
  }

  /**
   * 执行单个命令
   * @param {Object} command - 命令对象
   * @returns {Promise<Object>} 执行结果
   */
  async executeCommand(command) {
    try {
      console.log(`执行命令: ${command.type}`, command.data);
      
      const result = this.gameEngine.processPlayerCommand(this.playerId, command);
      
      if (result.success) {
        console.log(`✓ 命令成功: ${result.message}`);
      } else {
        console.log(`✗ 命令失败: ${result.message}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`命令执行异常: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 更新统计信息
   * @param {number} executionTime - 执行时间
   */
  updateStats(executionTime) {
    this.executionCount++;
    this.lastExecutionTime = executionTime;
    
    // 更新平均执行时间
    this.stats.averageExecutionTime = 
      (this.stats.averageExecutionTime * (this.executionCount - 1) + executionTime) / this.executionCount;
  }

  /**
   * 获取AI状态信息
   * @returns {Object} AI状态对象
   */
  getStatus() {
    const gameState = this.gameEngine.getPlayerView(this.playerId);
    
    return {
      playerId: this.playerId,
      difficulty: this.difficulty,
      config: this.config,
      isActive: this.isActive,
      gameState: {
        currentTurn: gameState.currentTurn,
        gameStatus: gameState.gameState,
        playerData: gameState.player
      },
      performance: {
        executionCount: this.executionCount,
        lastExecutionTime: this.lastExecutionTime,
        stats: this.stats
      },
      behaviorTree: {
        strategy: this.behaviorTree.blackboard.get('strategy'),
        threatLevel: this.behaviorTree.blackboard.get('threatLevel'),
        economyFocus: this.behaviorTree.blackboard.get('economyFocus'),
        flagPriority: this.behaviorTree.blackboard.get('flagPriority')
      }
    };
  }

  /**
   * 设置AI难度
   * @param {string} difficulty - 新的难度等级
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.config = this.getConfigByDifficulty(difficulty);
    console.log(`AI难度已调整为: ${this.config.name}`);
  }

  /**
   * 激活/停用AI
   * @param {boolean} active - 是否激活
   */
  setActive(active) {
    this.isActive = active;
    console.log(`AI${active ? '已激活' : '已停用'}`);
  }

  /**
   * 重置AI状态
   */
  reset() {
    this.executionCount = 0;
    this.lastExecutionTime = 0;
    this.stats = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageExecutionTime: 0,
      winRate: 0
    };
    
    // 重新初始化行为树
    this.behaviorTree = new AIBehaviorTree(this.playerId, this.gameEngine);
    
    console.log(`AI状态已重置`);
  }

  /**
   * 获取AI决策解释
   * 用于调试和分析AI的决策过程
   * @returns {Object} 决策解释对象
   */
  getDecisionExplanation() {
    const blackboard = this.behaviorTree.blackboard;
    
    return {
      currentStrategy: blackboard.get('strategy'),
      threatAssessment: {
        level: blackboard.get('threatLevel'),
        description: this.getThreatDescription(blackboard.get('threatLevel'))
      },
      priorities: {
        economy: blackboard.get('economyFocus'),
        flag: blackboard.get('flagPriority'),
        lastAction: blackboard.get('lastAction')
      },
      gamePhase: this.getCurrentGamePhase(),
      strategicGoals: this.getStrategicGoals()
    };
  }

  /**
   * 获取威胁等级描述
   * @param {number} threatLevel - 威胁等级
   * @returns {string} 威胁描述
   */
  getThreatDescription(threatLevel) {
    if (threatLevel <= 2) return '威胁很低，可以专注发展';
    if (threatLevel <= 4) return '威胁较低，可以适度扩张';
    if (threatLevel <= 6) return '威胁中等，需要谨慎行动';
    if (threatLevel <= 8) return '威胁较高，应当防守优先';
    return '威胁极高，必须全力防御';
  }

  /**
   * 获取当前游戏阶段
   * @returns {string} 游戏阶段
   */
  getCurrentGamePhase() {
    const turn = this.gameEngine.currentTurn;
    
    if (turn < 50) return '早期发展阶段';
    if (turn < 200) return '中期争夺阶段';
    return '后期决战阶段';
  }

  /**
   * 获取战略目标
   * @returns {Array} 战略目标列表
   */
  getStrategicGoals() {
    const goals = [];
    const blackboard = this.behaviorTree.blackboard;
    
    if (blackboard.get('economyFocus')) {
      goals.push('发展经济，积累资源');
    }
    
    if (blackboard.get('flagPriority')) {
      goals.push('争夺龙旗据点');
    }
    
    const strategy = blackboard.get('strategy');
    switch (strategy) {
      case 'aggressive':
        goals.push('主动进攻，削弱敌军');
        break;
      case 'defensive':
        goals.push('巩固防线，保存实力');
        break;
      case 'balanced':
        goals.push('平衡发展，伺机而动');
        break;
    }
    
    return goals;
  }

  /**
   * 模拟延迟
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 保存AI学习数据
   * 为未来的机器学习优化保留接口
   * @param {Object} gameResult - 游戏结果
   */
  saveTrainingData(gameResult) {
    const trainingData = {
      playerId: this.playerId,
      difficulty: this.difficulty,
      gameResult: gameResult,
      performance: this.stats,
      decisionHistory: this.behaviorTree.blackboard.get('decisionHistory') || [],
      timestamp: Date.now()
    };
    
    // 这里可以实现数据持久化
    console.log('AI训练数据已记录', trainingData);
  }

  /**
   * 从训练数据中学习
   * 为未来的机器学习优化保留接口
   * @param {Array} trainingDataSet - 训练数据集
   */
  learnFromData(trainingDataSet) {
    // 这里可以实现机器学习算法
    console.log(`加载${trainingDataSet.length}条训练数据进行学习`);
    
    // 简单的胜率统计
    const wins = trainingDataSet.filter(data => data.gameResult.winner === this.playerId).length;
    this.stats.winRate = wins / trainingDataSet.length;
    
    console.log(`AI胜率: ${(this.stats.winRate * 100).toFixed(1)}%`);
  }
} 