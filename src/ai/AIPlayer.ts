import { BehaviourTree, State } from 'mistreevous';
import { 
  GENERALS, 
  GENERAL_TYPES, 
  COMMANDS, 
  DISTANCE,
  GAME_RULES 
} from '../core/GameConstants.js';

/**
 * AI玩家类
 * 使用行为树进行智能决策和战术执行
 */
export class AIPlayer {
  constructor(playerId, gameEngine, difficulty = 'normal') {
    this.playerId = playerId;
    this.game = gameEngine;
    this.difficulty = difficulty;
    
    // AI状态和记忆
    this.memory = {
      enemyPositions: new Map(),
      threatAssessment: new Map(),
      strategicTargets: [],
      lastAction: null,
      currentStrategy: 'aggressive', // aggressive, defensive, economic
      turnsSinceLastKill: 0,
      flagPriority: 0
    };

    // 创建行为树
    this.behaviorTree = this.createBehaviorTree();
    
    // 性能参数（根据难度调整）
    this.setupDifficultyParameters();
  }

  /**
   * 根据难度设置AI参数
   */
  setupDifficultyParameters() {
    switch (this.difficulty) {
      case 'easy':
        this.reactionSpeed = 0.7;    // 反应速度
        this.planningDepth = 2;      // 规划深度
        this.riskTolerance = 0.8;    // 风险承受度
        this.economicFocus = 0.6;    // 经济关注度
        break;
      case 'normal':
        this.reactionSpeed = 0.85;
        this.planningDepth = 3;
        this.riskTolerance = 0.6;
        this.economicFocus = 0.8;
        break;
      case 'hard':
        this.reactionSpeed = 1.0;
        this.planningDepth = 4;
        this.riskTolerance = 0.4;
        this.economicFocus = 1.0;
        break;
    }
  }

  /**
   * 创建行为树
   */
  createBehaviorTree() {
    // 定义行为树结构（使用MDSL格式）
    const treeDefinition = `
      root {
        selector {
          // 紧急情况处理
          sequence {
            condition [IsInDanger]
            selector {
              action [Retreat]
              action [UseDefensiveSkill]
              action [CallForHelp]
            }
          }
          
          // 战斗决策
          sequence {
            condition [HasEnemyInRange]
            selector {
              sequence {
                condition [CanUseSkill]
                action [UseOffensiveSkill]
              }
              action [AttackEnemy]
            }
          }
          
          // 战略目标
          selector {
            // 据点争夺
            sequence {
              condition [IsFlagAvailable]
              condition [ShouldCaptureFlag]
              action [MoveToFlag]
            }
            
            // 城寨攻击
            sequence {
              condition [HasNearbyCity]
              condition [CanAttackCity]
              action [AttackCity]
            }
            
            // 经济发展
            sequence {
              condition [NeedsTroops]
              action [ProduceTroops]
            }
            
            // 武将招募
            sequence {
              condition [CanPickGeneral]
              action [PickBestGeneral]
            }
          }
          
          // 默认行为：战术移动
          action [TacticalMove]
        }
      }
    `;

    // 创建行为树实例
    return new BehaviourTree(treeDefinition, this);
  }

  /**
   * 执行AI回合
   */
  executeTurn() {
    try {
      // 更新感知和记忆
      this.updatePerception();
      
      // 评估当前形势
      this.assessSituation();
      
      // 执行行为树决策
      this.behaviorTree.step();
      
      // 更新策略
      this.updateStrategy();
      
    } catch (error) {
      console.error(`AI玩家 ${this.playerId} 执行出错:`, error);
      // 备用简单行为
      this.fallbackBehavior();
    }
  }

  /**
   * 更新感知信息
   */
  updatePerception() {
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    
    // 清空旧的感知信息
    this.memory.enemyPositions.clear();
    this.memory.threatAssessment.clear();
    
    // 扫描敌方单位
    for (const [enemyId, enemyPlayer] of Object.entries(gameState.players)) {
      if (parseInt(enemyId) === this.playerId) continue;
      
      for (const [generalId, general] of Object.entries(enemyPlayer.generals)) {
        if (general.isAlive && general.position) {
          this.memory.enemyPositions.set(generalId, {
            position: general.position,
            threatLevel: general.threatLevel,
            type: general.type,
            hp: general.hp,
            troops: general.troops
          });
        }
      }
    }
    
    // 更新战略目标
    this.updateStrategicTargets();
  }

  /**
   * 更新战略目标
   */
  updateStrategicTargets() {
    this.memory.strategicTargets = [];
    
    const gameState = this.game.getGameState();
    
    // 据点目标
    if (this.game.currentTurn >= GAME_RULES.FLAG_OPEN_TURN) {
      this.memory.strategicTargets.push({
        type: 'flag',
        position: this.game.map.flagPosition,
        priority: this.calculateFlagPriority(),
        description: '龙旗据点'
      });
    }
    
    // 城寨目标
    for (const [pos, city] of this.game.map.cities.entries()) {
      if (city.hp > 0) {
        const [x, y] = pos.split(',').map(Number);
        this.memory.strategicTargets.push({
          type: 'city',
          position: { x, y },
          priority: this.calculateCityPriority(city),
          level: city.level,
          description: `${city.level}级城寨`
        });
      }
    }
    
    // 敌方基地
    const enemyBasePos = this.playerId === 1 ? 
      { x: this.game.map.width - 1, y: 0 } : 
      { x: 0, y: this.game.map.height - 1 };
    
    this.memory.strategicTargets.push({
      type: 'enemy_base',
      position: enemyBasePos,
      priority: 0.3,
      description: '敌方基地'
    });
    
    // 按优先级排序
    this.memory.strategicTargets.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 评估当前形势
   */
  assessSituation() {
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    
    // 评估军事实力
    const myPower = this.calculateMilitaryPower(player);
    const enemyPower = this.calculateEnemyPower(gameState);
    
    // 评估经济状况
    const economicRatio = player.food / 1500; // 相对于最大粮草的比例
    
    // 评估战略态势
    const flagControlRatio = this.game.flagControlTurns / GAME_RULES.WIN_CONDITION;
    
    // 调整策略
    if (myPower < enemyPower * 0.7) {
      this.memory.currentStrategy = 'defensive';
    } else if (economicRatio < 0.3 && myPower < enemyPower * 1.2) {
      this.memory.currentStrategy = 'economic';
    } else {
      this.memory.currentStrategy = 'aggressive';
    }
    
    // 更新据点优先级
    if (flagControlRatio > 0.8 || this.game.currentTurn > 800) {
      this.memory.flagPriority = 1.0;
    } else if (flagControlRatio > 0.5) {
      this.memory.flagPriority = 0.8;
    } else {
      this.memory.flagPriority = 0.4;
    }
  }

  /**
   * 计算军事实力
   */
  calculateMilitaryPower(player) {
    let power = 0;
    for (const general of Object.values(player.generals)) {
      if (general.isAlive) {
        power += general.threatLevel;
      }
    }
    return power;
  }

  /**
   * 计算敌方实力
   */
  calculateEnemyPower(gameState) {
    let power = 0;
    for (const [playerId, player] of Object.entries(gameState.players)) {
      if (parseInt(playerId) !== this.playerId) {
        power += this.calculateMilitaryPower(player);
      }
    }
    return power;
  }

  /**
   * 计算据点优先级
   */
  calculateFlagPriority() {
    const basePriority = this.memory.flagPriority;
    
    // 如果敌方正在控制据点，优先级提高
    if (this.game.flagController && this.game.flagController !== this.playerId) {
      return Math.min(1.0, basepriority + 0.3);
    }
    
    return basePriority;
  }

  /**
   * 计算城寨优先级
   */
  calculateCityPriority(city) {
    // 基础优先级基于等级和奖励
    let priority = city.level * 0.2;
    
    // 根据当前经济状况调整
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    const foodRatio = player.food / 1500;
    
    if (foodRatio < 0.3) {
      priority += 0.4; // 急需资源时提高城寨优先级
    } else if (foodRatio > 0.8) {
      priority -= 0.2; // 资源充足时降低优先级
    }
    
    return Math.max(0.1, Math.min(1.0, priority));
  }

  /**
   * 更新策略
   */
  updateStrategy() {
    this.memory.turnsSinceLastKill++;
    
    // 记录上次行动
    this.memory.lastAction = this.game.currentTurn;
  }

  // =================================
  // 行为树条件节点 (Condition Nodes)
  // =================================

  /**
   * 检查是否处于危险中
   */
  IsInDanger() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      const enemiesInRange = this.getEnemiesInRange(general.position, 3);
      const totalEnemyThreat = enemiesInRange.reduce((sum, enemy) => sum + enemy.threatLevel, 0);
      const myThreat = general.threatLevel;
      
      if (totalEnemyThreat > myThreat * 1.5) {
        return true; // 敌方威胁过大
      }
      
      if (general.hp < general.maxHp * 0.3) {
        return true; // 血量过低
      }
    }
    
    return false;
  }

  /**
   * 检查是否有敌人在攻击范围内
   */
  HasEnemyInRange() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      const enemiesInRange = this.getEnemiesInRange(general.position, general.attackRange);
      if (enemiesInRange.length > 0) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查是否可以使用技能
   */
  CanUseSkill() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      if (general.skills.skill1.available || general.skills.skill2.available) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查据点是否可用
   */
  IsFlagAvailable() {
    return this.game.currentTurn >= GAME_RULES.FLAG_OPEN_TURN;
  }

  /**
   * 检查是否应该争夺据点
   */
  ShouldCaptureFlag() {
    const flagTarget = this.memory.strategicTargets.find(t => t.type === 'flag');
    return flagTarget && flagTarget.priority > 0.6;
  }

  /**
   * 检查是否有附近的城寨
   */
  HasNearbyCity() {
    const myGenerals = this.getMyGenerals();
    const cityTargets = this.memory.strategicTargets.filter(t => t.type === 'city');
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      for (const city of cityTargets) {
        const distance = DISTANCE.chebyshev(general.position, city.position);
        if (distance <= 5) { // 5格范围内认为是附近
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 检查是否可以攻击城寨
   */
  CanAttackCity() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      // 检查是否有足够实力攻打城寨
      if (general.threatLevel > 200) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查是否需要生产士兵
   */
  NeedsTroops() {
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    
    // 检查是否有足够粮草
    if (player.food < 40) return false;
    
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      const currentTroops = general.troops.archers + general.troops.shields;
      const maxTroops = general.command;
      
      if (currentTroops < maxTroops * 0.7) {
        return true; // 兵力不足70%时需要补充
      }
    }
    
    return false;
  }

  /**
   * 检查是否可以选择武将
   */
  CanPickGeneral() {
    const availableActions = this.game.getAvailableActions(this.playerId);
    return availableActions.includes(COMMANDS.PICK);
  }

  // =================================
  // 行为树行动节点 (Action Nodes)
  // =================================

  /**
   * 撤退行动
   */
  Retreat() {
    const myGenerals = this.getMyGenerals();
    const dangerousGenerals = myGenerals.filter(general => {
      if (!general.isAlive) return false;
      
      const enemiesInRange = this.getEnemiesInRange(general.position, 3);
      return enemiesInRange.length > 0;
    });

    if (dangerousGenerals.length === 0) {
      return State.FAILED;
    }

    // 选择最危险的武将进行撤退
    const general = dangerousGenerals[0];
    const safePosition = this.findSafePosition(general.position);
    
    if (safePosition) {
      try {
        this.game.moveGeneral(this.playerId, general.id, safePosition.x, safePosition.y);
        return State.SUCCEEDED;
      } catch (error) {
        return State.FAILED;
      }
    }
    
    return State.FAILED;
  }

  /**
   * 使用防御技能
   */
  UseDefensiveSkill() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      // 根据武将类型选择合适的防御技能
      let skillKey = null;
      
      if (general.generalKey === 'LIUBEI' && general.skills.skill1.available) {
        skillKey = 'skill1'; // 仁德之君（护盾）
      } else if (general.generalKey === 'ZHUGELIANG' && general.skills.skill1.available) {
        skillKey = 'skill1'; // 锦囊妙计（免疫）
      }
      
      if (skillKey) {
        try {
          this.game.useSkill(this.playerId, general.id, skillKey);
          return State.SUCCEEDED;
        } catch (error) {
          continue;
        }
      }
    }
    
    return State.FAILED;
  }

  /**
   * 请求支援（移动其他武将到危险武将附近）
   */
  CallForHelp() {
    // 简化实现：尝试集结部队
    const myGenerals = this.getMyGenerals().filter(g => g.isAlive);
    
    if (myGenerals.length < 2) {
      return State.FAILED;
    }
    
    // 找到最需要支援的武将
    const needHelpGeneral = myGenerals.find(general => {
      const enemiesInRange = this.getEnemiesInRange(general.position, 2);
      return enemiesInRange.length > 0;
    });
    
    if (!needHelpGeneral) {
      return State.FAILED;
    }
    
    // 移动其他武将靠近
    const supportGeneral = myGenerals.find(g => g.id !== needHelpGeneral.id);
    if (supportGeneral) {
      const supportPosition = this.findNearestSafePosition(
        supportGeneral.position, 
        needHelpGeneral.position
      );
      
      if (supportPosition) {
        try {
          this.game.moveGeneral(this.playerId, supportGeneral.id, supportPosition.x, supportPosition.y);
          return State.SUCCEEDED;
        } catch (error) {
          return State.FAILED;
        }
      }
    }
    
    return State.FAILED;
  }

  /**
   * 使用攻击技能
   */
  UseOffensiveSkill() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      const enemiesInRange = this.getEnemiesInRange(general.position, general.attackRange);
      if (enemiesInRange.length === 0) continue;
      
      // 选择最佳攻击技能
      let skillKey = null;
      let target = null;
      
      if (general.generalKey === 'LVBU' && general.skills.skill1.available) {
        skillKey = 'skill1'; // 无双乱舞（AOE）
      } else if (general.generalKey === 'GUANYU' && general.skills.skill1.available) {
        skillKey = 'skill1'; // 一骑当千（单体高伤害）
        target = enemiesInRange.reduce((best, current) => 
          current.threatLevel > best.threatLevel ? current : best
        );
      } else if (general.generalKey === 'ZHAOYUN' && general.skills.skill1.available) {
        // 龙胆突刺：优先攻击低血量敌人
        const lowHpEnemies = enemiesInRange.filter(enemy => 
          enemy.hp < enemy.maxHp * 0.25
        );
        if (lowHpEnemies.length > 0) {
          skillKey = 'skill1';
          target = lowHpEnemies[0];
        }
      }
      
      if (skillKey) {
        try {
          const targetPos = target ? target.position : null;
          this.game.useSkill(
            this.playerId, 
            general.id, 
            skillKey, 
            targetPos?.x, 
            targetPos?.y
          );
          return State.SUCCEEDED;
        } catch (error) {
          continue;
        }
      }
    }
    
    return State.FAILED;
  }

  /**
   * 攻击敌人
   */
  AttackEnemy() {
    const myGenerals = this.getMyGenerals();
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      const enemiesInRange = this.getEnemiesInRange(general.position, general.attackRange);
      if (enemiesInRange.length === 0) continue;
      
      // 选择最佳攻击目标
      const target = this.selectBestTarget(enemiesInRange);
      
      if (target) {
        try {
          this.game.attack(this.playerId, general.id, target.position.x, target.position.y);
          return State.SUCCEEDED;
        } catch (error) {
          continue;
        }
      }
    }
    
    return State.FAILED;
  }

  /**
   * 移动到据点
   */
  MoveToFlag() {
    const flagPosition = this.game.map.flagPosition;
    const myGenerals = this.getMyGenerals().filter(g => g.isAlive);
    
    // 选择最适合占领据点的武将
    const bestGeneral = myGenerals.reduce((best, current) => {
      const currentDist = DISTANCE.chebyshev(current.position, flagPosition);
      const bestDist = best ? DISTANCE.chebyshev(best.position, flagPosition) : Infinity;
      
      return currentDist < bestDist ? current : best;
    }, null);
    
    if (!bestGeneral) {
      return State.FAILED;
    }
    
    // 计算移动目标
    const moveTarget = this.findPathToTarget(bestGeneral.position, flagPosition);
    
    if (moveTarget) {
      try {
        this.game.moveGeneral(this.playerId, bestGeneral.id, moveTarget.x, moveTarget.y);
        return State.SUCCEEDED;
      } catch (error) {
        return State.FAILED;
      }
    }
    
    return State.FAILED;
  }

  /**
   * 攻击城寨
   */
  AttackCity() {
    const myGenerals = this.getMyGenerals();
    const cityTargets = this.memory.strategicTargets.filter(t => t.type === 'city');
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      // 找到范围内的城寨
      for (const city of cityTargets) {
        const distance = DISTANCE.chebyshev(general.position, city.position);
        
        if (distance <= general.attackRange) {
          try {
            this.game.attackCity(this.playerId, general.id, city.position.x, city.position.y);
            return State.SUCCEEDED;
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    return State.FAILED;
  }

  /**
   * 生产士兵
   */
  ProduceTroops() {
    const myGenerals = this.getMyGenerals();
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    
    for (const general of myGenerals) {
      if (!general.isAlive) continue;
      
      const currentTroops = general.troops.archers + general.troops.shields;
      const availableSlots = general.command - currentTroops;
      
      if (availableSlots > 0 && player.food >= 40) {
        // 根据武将类型和当前策略决定兵种配比
        let archers = 0;
        let shields = 0;
        
        if (general.type === GENERAL_TYPES.WARRIOR) {
          // 猛将：均衡配置，略偏弓兵
          archers = Math.min(availableSlots, Math.floor(player.food / 40));
          shields = Math.min(availableSlots - archers, Math.floor((player.food - archers * 20) / 20));
        } else if (general.type === GENERAL_TYPES.COMMANDER) {
          // 统帅：偏向盾兵
          shields = Math.min(availableSlots, Math.floor(player.food / 30));
          archers = Math.min(availableSlots - shields, Math.floor((player.food - shields * 20) / 20));
        } else {
          // 谋士：偏向弓兵
          archers = Math.min(availableSlots, Math.floor(player.food / 25));
          shields = Math.min(availableSlots - archers, Math.floor((player.food - archers * 20) / 20));
        }
        
        if (archers > 0 || shields > 0) {
          try {
            this.game.makeTroops(this.playerId, general.id, archers, shields);
            return State.SUCCEEDED;
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    return State.FAILED;
  }

  /**
   * 选择最佳武将
   */
  PickBestGeneral() {
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    
    // 分析当前局势选择最合适的武将
    const currentGeneralTypes = Object.values(player.generals)
      .filter(g => g.isAlive)
      .map(g => g.type);
    
    let bestGeneral = null;
    
    // 策略：保持武将类型平衡
    if (!currentGeneralTypes.includes(GENERAL_TYPES.COMMANDER)) {
      // 优先选择统帅类
      bestGeneral = 'LIUBEI'; // 刘备有很好的团队辅助能力
    } else if (!currentGeneralTypes.includes(GENERAL_TYPES.WARRIOR)) {
      // 然后选择猛将类
      bestGeneral = 'ZHAOYUN'; // 赵云有执行击杀能力
    } else if (!currentGeneralTypes.includes(GENERAL_TYPES.STRATEGIST)) {
      // 最后选择谋士类
      bestGeneral = 'ZHUGELIANG'; // 诸葛亮有很强的生存能力
    } else {
      // 已有各类型，选择最强的猛将
      bestGeneral = 'LVBU';
    }
    
    if (bestGeneral) {
      try {
        this.game.pickGeneral(this.playerId, bestGeneral);
        return State.SUCCEEDED;
      } catch (error) {
        return State.FAILED;
      }
    }
    
    return State.FAILED;
  }

  /**
   * 战术移动
   */
  TacticalMove() {
    const myGenerals = this.getMyGenerals().filter(g => g.isAlive);
    
    if (myGenerals.length === 0) {
      return State.FAILED;
    }
    
    // 为每个武将计算最佳移动位置
    for (const general of myGenerals) {
      const bestMove = this.calculateBestMove(general);
      
      if (bestMove) {
        try {
          this.game.moveGeneral(this.playerId, general.id, bestMove.x, bestMove.y);
          return State.SUCCEEDED;
        } catch (error) {
          continue;
        }
      }
    }
    
    return State.FAILED;
  }

  // =================================
  // 辅助方法
  // =================================

  /**
   * 获取己方武将
   */
  getMyGenerals() {
    const gameState = this.game.getGameState();
    const player = gameState.players[this.playerId];
    return Object.values(player.generals);
  }

  /**
   * 获取指定范围内的敌人
   */
  getEnemiesInRange(position, range) {
    const enemies = [];
    
    for (const [generalId, enemyInfo] of this.memory.enemyPositions.entries()) {
      const distance = DISTANCE.chebyshev(position, enemyInfo.position);
      if (distance <= range) {
        enemies.push({
          id: generalId,
          ...enemyInfo
        });
      }
    }
    
    return enemies;
  }

  /**
   * 选择最佳攻击目标
   */
  selectBestTarget(enemies) {
    if (enemies.length === 0) return null;
    
    // 优先级：血量低的 > 威胁高的 > 距离近的
    return enemies.reduce((best, current) => {
      const currentScore = this.calculateTargetScore(current);
      const bestScore = this.calculateTargetScore(best);
      
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * 计算目标分数
   */
  calculateTargetScore(enemy) {
    let score = 0;
    
    // 血量越低分数越高
    const hpRatio = enemy.hp / (enemy.maxHp || 1500);
    score += (1 - hpRatio) * 50;
    
    // 威胁等级越高分数越高
    score += (enemy.threatLevel / 500) * 30;
    
    // 武将类型权重
    if (enemy.type === GENERAL_TYPES.STRATEGIST) {
      score += 20; // 优先攻击谋士（通常血量较低）
    } else if (enemy.type === GENERAL_TYPES.WARRIOR) {
      score += 15; // 其次攻击猛将
    }
    
    return score;
  }

  /**
   * 寻找安全位置
   */
  findSafePosition(currentPosition) {
    const possibleMoves = [];
    
    // 检查周围8个方向
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const newX = currentPosition.x + dx;
        const newY = currentPosition.y + dy;
        
        if (this.game.map.canMoveTo(newX, newY)) {
          const enemiesInRange = this.getEnemiesInRange({ x: newX, y: newY }, 3);
          const threatLevel = enemiesInRange.reduce((sum, enemy) => sum + enemy.threatLevel, 0);
          
          possibleMoves.push({
            x: newX,
            y: newY,
            threatLevel: threatLevel
          });
        }
      }
    }
    
    if (possibleMoves.length === 0) return null;
    
    // 选择威胁最小的位置
    return possibleMoves.reduce((safest, current) => 
      current.threatLevel < safest.threatLevel ? current : safest
    );
  }

  /**
   * 寻找最近的安全位置
   */
  findNearestSafePosition(fromPosition, targetPosition) {
    const possibleMoves = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const newX = fromPosition.x + dx;
        const newY = fromPosition.y + dy;
        
        if (this.game.map.canMoveTo(newX, newY)) {
          const distance = DISTANCE.chebyshev({ x: newX, y: newY }, targetPosition);
          const enemiesInRange = this.getEnemiesInRange({ x: newX, y: newY }, 2);
          
          possibleMoves.push({
            x: newX,
            y: newY,
            distance: distance,
            threatLevel: enemiesInRange.length
          });
        }
      }
    }
    
    if (possibleMoves.length === 0) return null;
    
    // 选择距离目标最近且相对安全的位置
    return possibleMoves
      .filter(move => move.threatLevel === 0) // 优先选择无威胁位置
      .reduce((best, current) => 
        !best || current.distance < best.distance ? current : best
      ) || possibleMoves[0];
  }

  /**
   * 寻找到目标的路径
   */
  findPathToTarget(fromPosition, targetPosition) {
    const dx = targetPosition.x - fromPosition.x;
    const dy = targetPosition.y - fromPosition.y;
    
    // 计算移动方向（限制为1格）
    const moveX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const moveY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    
    const newX = fromPosition.x + moveX;
    const newY = fromPosition.y + moveY;
    
    if (this.game.map.canMoveTo(newX, newY)) {
      return { x: newX, y: newY };
    }
    
    // 如果直线路径被阻挡，尝试其他方向
    const alternatives = [
      { x: fromPosition.x + moveX, y: fromPosition.y },
      { x: fromPosition.x, y: fromPosition.y + moveY }
    ];
    
    for (const alt of alternatives) {
      if (this.game.map.canMoveTo(alt.x, alt.y)) {
        return alt;
      }
    }
    
    return null;
  }

  /**
   * 计算最佳移动位置
   */
  calculateBestMove(general) {
    const possibleMoves = general.getPossibleMoves();
    
    if (possibleMoves.length === 0) return null;
    
    // 根据当前策略评分每个可能的移动
    const scoredMoves = possibleMoves.map(move => ({
      ...move,
      score: this.calculateMoveScore(general, move)
    }));
    
    // 选择分数最高的移动
    return scoredMoves.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  /**
   * 计算移动分数
   */
  calculateMoveScore(general, position) {
    let score = 0;
    
    // 基于当前策略的移动评分
    if (this.memory.currentStrategy === 'aggressive') {
      // 攻击策略：靠近敌人
      const nearestEnemy = this.findNearestEnemy(position);
      if (nearestEnemy) {
        const distance = DISTANCE.chebyshev(position, nearestEnemy.position);
        score += Math.max(0, 10 - distance); // 距离越近分数越高
      }
      
      // 靠近战略目标
      if (this.memory.strategicTargets.length > 0) {
        const target = this.memory.strategicTargets[0];
        const distance = DISTANCE.chebyshev(position, target.position);
        score += (target.priority * 10) / (distance + 1);
      }
      
    } else if (this.memory.currentStrategy === 'defensive') {
      // 防御策略：远离敌人，靠近己方基地
      const nearestEnemy = this.findNearestEnemy(position);
      if (nearestEnemy) {
        const distance = DISTANCE.chebyshev(position, nearestEnemy.position);
        score += distance; // 距离越远分数越高
      }
      
      // 靠近己方基地
      const basePosition = this.playerId === 1 ? 
        { x: 0, y: this.game.map.height - 1 } : 
        { x: this.game.map.width - 1, y: 0 };
      const baseDistance = DISTANCE.chebyshev(position, basePosition);
      score += Math.max(0, 20 - baseDistance);
      
    } else if (this.memory.currentStrategy === 'economic') {
      // 经济策略：靠近城寨
      const cityTargets = this.memory.strategicTargets.filter(t => t.type === 'city');
      for (const city of cityTargets) {
        const distance = DISTANCE.chebyshev(position, city.position);
        score += (city.priority * 5) / (distance + 1);
      }
    }
    
    // 安全性考虑
    const enemiesInRange = this.getEnemiesInRange(position, 3);
    const threatLevel = enemiesInRange.reduce((sum, enemy) => sum + enemy.threatLevel, 0);
    score -= threatLevel / 100; // 威胁越大分数越低
    
    return score;
  }

  /**
   * 寻找最近的敌人
   */
  findNearestEnemy(position) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const [generalId, enemyInfo] of this.memory.enemyPositions.entries()) {
      const distance = DISTANCE.chebyshev(position, enemyInfo.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = enemyInfo;
      }
    }
    
    return nearest;
  }

  /**
   * 备用简单行为（当行为树出错时使用）
   */
  fallbackBehavior() {
    try {
      const myGenerals = this.getMyGenerals().filter(g => g.isAlive);
      
      if (myGenerals.length === 0) {
        // 尝试选择武将
        if (this.game.getAvailableActions(this.playerId).includes(COMMANDS.PICK)) {
          this.game.pickGeneral(this.playerId, 'ZHAOYUN');
        }
        return;
      }
      
      // 简单的攻击逻辑
      for (const general of myGenerals) {
        const enemies = general.getEnemiesInRange();
        if (enemies.length > 0) {
          const target = enemies[0];
          this.game.attack(this.playerId, general.id, target.position.x, target.position.y);
          return;
        }
      }
      
      // 简单的移动逻辑：向地图中心移动
      const general = myGenerals[0];
      const centerX = Math.floor(this.game.map.width / 2);
      const centerY = Math.floor(this.game.map.height / 2);
      
      const path = this.findPathToTarget(general.position, { x: centerX, y: centerY });
      if (path) {
        this.game.moveGeneral(this.playerId, general.id, path.x, path.y);
      }
      
    } catch (error) {
      console.error('备用行为也执行失败:', error);
    }
  }
} 