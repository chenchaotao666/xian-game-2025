import { BehaviourTree } from 'mistreevous';
import { 
  COMMANDS, 
  GAME_RULES,
  ECONOMY,
  calculateDistance,
  TERRAIN_TYPES,
  CITIES
} from '../core/GameConstants';

/**
 * AI行为树类
 * 使用mistreevous库实现基于行为树的AI决策系统
 */
export default class AIBehaviorTree {
  constructor(playerId, gameEngine) {
    this.playerId = playerId;
    this.gameEngine = gameEngine;
    this.blackboard = new Map(); // 黑板数据，用于存储AI状态
    
    // 初始化黑板数据
    this.initializeBlackboard();
    
    // 创建行为树
    this.tree = this.createBehaviorTree();
    
    console.log(`AI行为树初始化完成 - 玩家${playerId}`);
  }

  /**
   * 初始化黑板数据
   * 黑板用于存储AI的状态信息和决策数据
   */
  initializeBlackboard() {
    this.blackboard.set('playerId', this.playerId);
    this.blackboard.set('strategy', 'balanced'); // 策略类型：aggressive, defensive, balanced
    this.blackboard.set('priorityTarget', null); // 优先攻击目标
    this.blackboard.set('lastAction', null); // 上次执行的操作
    this.blackboard.set('threatLevel', 0); // 威胁等级
    this.blackboard.set('economyFocus', false); // 是否专注经济发展
    this.blackboard.set('flagPriority', false); // 是否优先争夺据点
    this.blackboard.set('formations', []); // 可用阵型
    this.blackboard.set('generalPriorities', new Map()); // 武将优先级
  }

  /**
   * 创建主行为树
   * 使用MDSL格式定义行为树结构
   * @returns {BehaviourTree} 行为树实例
   */
  createBehaviorTree() {
    const treeDefinition = `
      root {
        sequence {
          action [analyzeGameState]
          selector {
            sequence {
              condition [isEarlyGame]
              action [executeEarlyGameStrategy]
            }
            sequence {
              condition [isMidGame]
              action [executeMidGameStrategy]
            }
            sequence {
              condition [isLateGame]
              action [executeLateGameStrategy]
            }
          }
        }
      }
    `;

    return new BehaviourTree(treeDefinition, {
      // 条件节点
      isEarlyGame: () => this.isEarlyGame(),
      isMidGame: () => this.isMidGame(),
      isLateGame: () => this.isLateGame(),
      
      // 行动节点
      analyzeGameState: () => this.analyzeGameState(),
      executeEarlyGameStrategy: () => this.executeEarlyGameStrategy(),
      executeMidGameStrategy: () => this.executeMidGameStrategy(),
      executeLateGameStrategy: () => this.executeLateGameStrategy()
    });
  }

  /**
   * 执行AI决策
   * @returns {Array} 执行的命令列表
   */
  step() {
    const commands = [];
    
    // 重置执行状态
    this.blackboard.set('commands', commands);
    this.blackboard.set('currentTurn', this.gameEngine.currentTurn);
    
    // 执行行为树
    this.tree.step();
    
    return commands;
  }

  /**
   * 分析游戏状态
   * 更新黑板中的关键信息
   * @returns {string} 执行结果
   */
  analyzeGameState() {
    const gameState = this.gameEngine.getPlayerView(this.playerId);
    const player = gameState.player;
    const currentTurn = gameState.currentTurn;
    
    // 分析己方状态
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    const totalTroops = myGenerals.reduce((sum, g) => sum + g.troops.archers + g.troops.shields, 0);
    
    // 分析敌方状态
    const enemyId = this.playerId === 1 ? 2 : 1;
    const enemyGenerals = this.getEnemyGenerals();
    const enemyTroops = enemyGenerals.reduce((sum, g) => sum + (g.troops?.archers || 0) + (g.troops?.shields || 0), 0);
    
    // 计算威胁等级
    const threatLevel = this.calculateThreatLevel(myGenerals, enemyGenerals);
    this.blackboard.set('threatLevel', threatLevel);
    
    // 更新策略
    this.updateStrategy(player, myGenerals, enemyGenerals, currentTurn);
    
    // 更新优先级
    this.updatePriorities(gameState);
    
    console.log(`AI分析完成 - 回合${currentTurn}, 威胁等级:${threatLevel}, 策略:${this.blackboard.get('strategy')}`);
    
    return 'SUCCESS';
  }

  /**
   * 计算威胁等级
   * @param {Array} myGenerals - 己方武将
   * @param {Array} enemyGenerals - 敌方武将
   * @returns {number} 威胁等级 0-10
   */
  calculateThreatLevel(myGenerals, enemyGenerals) {
    if (enemyGenerals.length === 0) return 0;
    if (myGenerals.length === 0) return 10;
    
    // 计算双方实力对比
    const myPower = myGenerals.reduce((sum, g) => 
      sum + g.attackPower + (g.troops?.archers || 0) * 25 + (g.troops?.shields || 0) * 15, 0);
    const enemyPower = enemyGenerals.reduce((sum, g) => 
      sum + (g.attackPower || 50) + (g.troops?.archers || 0) * 25 + (g.troops?.shields || 0) * 15, 0);
    
    const powerRatio = enemyPower / Math.max(myPower, 1);
    
    // 威胁等级：0-10
    return Math.min(10, Math.max(0, Math.floor(powerRatio * 5)));
  }

  /**
   * 更新AI策略
   * @param {Object} player - 玩家数据
   * @param {Array} myGenerals - 己方武将
   * @param {Array} enemyGenerals - 敌方武将
   * @param {number} currentTurn - 当前回合
   */
  updateStrategy(player, myGenerals, enemyGenerals, currentTurn) {
    const threatLevel = this.blackboard.get('threatLevel');
    
    // 根据威胁等级和游戏阶段调整策略
    if (currentTurn < 50) {
      // 早期：发展优先
      if (threatLevel > 7) {
        this.blackboard.set('strategy', 'defensive');
      } else if (player.food > 300 && myGenerals.length >= 2) {
        this.blackboard.set('strategy', 'aggressive');
      } else {
        this.blackboard.set('strategy', 'balanced');
      }
    } else if (currentTurn < 200) {
      // 中期：开始争夺
      if (threatLevel > 6) {
        this.blackboard.set('strategy', 'defensive');
      } else {
        this.blackboard.set('strategy', 'aggressive');
      }
    } else {
      // 后期：决战时刻
      this.blackboard.set('strategy', 'aggressive');
      this.blackboard.set('flagPriority', true);
    }
  }

  /**
   * 更新优先级
   * @param {Object} gameState - 游戏状态
   */
  updatePriorities(gameState) {
    const player = gameState.player;
    const currentTurn = gameState.currentTurn;
    
    // 据点优先级
    if (currentTurn >= GAME_RULES.FLAG_OPEN_TURN) {
      this.blackboard.set('flagPriority', true);
    }
    
    // 经济优先级
    if (player.food < 100) {
      this.blackboard.set('economyFocus', true);
    } else if (player.food > 500) {
      this.blackboard.set('economyFocus', false);
    }
  }

  /**
   * 判断是否为游戏早期
   * @returns {boolean}
   */
  isEarlyGame() {
    return this.gameEngine.currentTurn < 50;
  }

  /**
   * 判断是否为游戏中期
   * @returns {boolean}
   */
  isMidGame() {
    return this.gameEngine.currentTurn >= 50 && this.gameEngine.currentTurn < 200;
  }

  /**
   * 判断是否为游戏后期
   * @returns {boolean}
   */
  isLateGame() {
    return this.gameEngine.currentTurn >= 200;
  }

  /**
   * 执行早期游戏策略
   * 专注于发展和基础建设
   * @returns {string}
   */
  executeEarlyGameStrategy() {
    const commands = this.blackboard.get('commands');
    const gameState = this.gameEngine.getPlayerView(this.playerId);
    const player = gameState.player;
    
    // 1. 选择武将（如果还没有足够的武将）
    if (player.generals.length < 2) {
      this.pickOptimalGeneral(commands, player);
    }
    
    // 2. 生产小兵
    this.productTroops(commands, player);
    
    // 3. 攻击城寨获取资源
    this.attackNearestCity(commands, player);
    
    // 4. 移动到有利位置
    this.moveToStrategicPositions(commands, player);
    
    console.log(`执行早期策略 - 生成${commands.length}个命令`);
    return 'SUCCESS';
  }

  /**
   * 执行中期游戏策略
   * 开始进攻和争夺
   * @returns {string}
   */
  executeMidGameStrategy() {
    const commands = this.blackboard.get('commands');
    const gameState = this.gameEngine.getPlayerView(this.playerId);
    const player = gameState.player;
    
    // 1. 完善武将配置
    if (player.generals.length < 3) {
      this.pickOptimalGeneral(commands, player);
    }
    
    // 2. 继续生产小兵
    this.productTroops(commands, player);
    
    // 3. 开始进攻敌方武将
    this.attackEnemyGenerals(commands, player);
    
    // 4. 争夺据点（如果已开放）
    if (this.gameEngine.currentTurn >= GAME_RULES.FLAG_OPEN_TURN) {
      this.contestFlag(commands, player);
    }
    
    // 5. 使用技能
    this.useSkills(commands, player);
    
    console.log(`执行中期策略 - 生成${commands.length}个命令`);
    return 'SUCCESS';
  }

  /**
   * 执行后期游戏策略
   * 全力争夺胜利
   * @returns {string}
   */
  executeLateGameStrategy() {
    const commands = this.blackboard.get('commands');
    const gameState = this.gameEngine.getPlayerView(this.playerId);
    const player = gameState.player;
    
    // 1. 全力争夺据点
    this.contestFlag(commands, player);
    
    // 2. 集中火力攻击
    this.focusFireAttack(commands, player);
    
    // 3. 使用所有可用技能
    this.useSkills(commands, player);
    
    // 4. 切换到攻击阵型
    this.switchToAggressiveFormation(commands, player);
    
    console.log(`执行后期策略 - 生成${commands.length}个命令`);
    return 'SUCCESS';
  }

  /**
   * 选择最优武将
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  pickOptimalGeneral(commands, player) {
    const availableGenerals = this.getAvailableGenerals();
    
    if (availableGenerals.length === 0) return;
    
    // 根据当前策略选择武将
    const strategy = this.blackboard.get('strategy');
    let bestGeneral = null;
    
    if (strategy === 'aggressive') {
      // 选择攻击力最高的武将
      bestGeneral = availableGenerals.reduce((best, current) => 
        current.attackPower > best.attackPower ? current : best
      );
    } else if (strategy === 'defensive') {
      // 选择体力最高的武将
      bestGeneral = availableGenerals.reduce((best, current) => 
        current.health > best.health ? current : best
      );
    } else {
      // 平衡策略：选择统帅值最高的武将
      bestGeneral = availableGenerals.reduce((best, current) => 
        current.commandPower > best.commandPower ? current : best
      );
    }
    
    if (bestGeneral) {
      commands.push({
        type: COMMANDS.PICK,
        data: {
          generalName: bestGeneral.name,
          position: this.getOptimalSpawnPosition(player)
        }
      });
      
      console.log(`AI选择武将: ${bestGeneral.name}`);
    }
  }

  /**
   * 获取可选择的武将列表
   * @returns {Array} 可用武将数组
   */
  getAvailableGenerals() {
    // 这里应该从游戏常量中获取所有武将，并过滤掉已选择的
    // 简化实现：返回基础武将列表
    const allGenerals = [
      { name: '吕布', attackPower: 100, health: 1500, commandPower: 6 },
      { name: '赵云', attackPower: 100, health: 1500, commandPower: 6 },
      { name: '关羽', attackPower: 100, health: 1500, commandPower: 6 },
      { name: '刘备', attackPower: 60, health: 1600, commandPower: 12 },
      { name: '曹操', attackPower: 60, health: 1600, commandPower: 12 },
      { name: '孙权', attackPower: 60, health: 1600, commandPower: 12 },
      { name: '诸葛亮', attackPower: 50, health: 1200, commandPower: 8 },
      { name: '周瑜', attackPower: 50, health: 1200, commandPower: 8 },
      { name: '司马懿', attackPower: 50, health: 1200, commandPower: 8 }
    ];
    
    // 过滤掉已选择的武将
    const selectedGenerals = this.getAllSelectedGenerals();
    return allGenerals.filter(g => !selectedGenerals.includes(g.name));
  }

  /**
   * 获取所有已选择的武将名称
   * @returns {Array} 已选择武将名称数组
   */
  getAllSelectedGenerals() {
    const selected = [];
    
    // 获取所有玩家的武将
    Object.values(this.gameEngine.players).forEach(player => {
      player.generals.forEach(general => {
        selected.push(general.name);
      });
    });
    
    return selected;
  }

  /**
   * 获取最优出生位置
   * @param {Object} player - 玩家数据
   * @returns {Object} 位置坐标
   */
  getOptimalSpawnPosition(player) {
    const basePos = player.basePosition;
    
    // 在基地附近找到空位
    for (let r = 1; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const x = basePos.x + dx;
          const y = basePos.y + dy;
          
          if (this.gameEngine.map.isValidPosition(x, y) && 
              !this.gameEngine.map.getUnitAt(x, y)) {
            return { x, y };
          }
        }
      }
    }
    
    return basePos; // 默认返回基地位置
  }

  /**
   * 生产小兵
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  productTroops(commands, player) {
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    
    myGenerals.forEach(general => {
      if (player.food < ECONOMY.TROOP_COST * 2) return; // 粮草不足
      
      const currentTroops = general.troops.archers + general.troops.shields;
      const maxTroops = general.commandPower;
      
      if (currentTroops < maxTroops) {
        const canAdd = Math.min(
          Math.floor(player.food / ECONOMY.TROOP_COST),
          maxTroops - currentTroops
        );
        
        if (canAdd > 0) {
          // 根据策略分配弓兵和盾兵
          let archers, shields;
          const strategy = this.blackboard.get('strategy');
          
          if (strategy === 'aggressive') {
            archers = Math.ceil(canAdd * 0.7);
            shields = canAdd - archers;
          } else if (strategy === 'defensive') {
            archers = Math.floor(canAdd * 0.3);
            shields = canAdd - archers;
          } else {
            archers = Math.floor(canAdd * 0.5);
            shields = canAdd - archers;
          }
          
          commands.push({
            type: COMMANDS.MAKE,
            data: {
              generalId: general.id,
              archers: archers,
              shields: shields
            }
          });
          
          // 更新可用粮草（用于后续决策）
          player.food -= canAdd * ECONOMY.TROOP_COST;
        }
      }
    });
  }

  /**
   * 攻击最近的城寨
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  attackNearestCity(commands, player) {
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    
    myGenerals.forEach(general => {
      const nearestCity = this.findNearestCity(general);
      
      if (nearestCity && calculateDistance(general.x, general.y, nearestCity.x, nearestCity.y) <= general.attackRange) {
        commands.push({
          type: COMMANDS.SG,
          data: {
            generalId: general.id,
            targetX: nearestCity.x,
            targetY: nearestCity.y
          }
        });
      }
    });
  }

  /**
   * 查找最近的城寨
   * @param {Object} general - 武将对象
   * @returns {Object|null} 最近城寨位置
   */
  findNearestCity(general) {
    let nearest = null;
    let minDistance = Infinity;
    
    // 遍历地图上的城寨
    for (let x = 0; x < this.gameEngine.map.width; x++) {
      for (let y = 0; y < this.gameEngine.map.height; y++) {
        const terrain = this.gameEngine.map.getTerrainType(x, y);
        
        if (CITIES[terrain] && this.gameEngine.map.isCityAlive(x, y)) {
          const distance = calculateDistance(general.x, general.y, x, y);
          
          if (distance < minDistance) {
            minDistance = distance;
            nearest = { x, y, terrain };
          }
        }
      }
    }
    
    return nearest;
  }

  /**
   * 移动到战略位置
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  moveToStrategicPositions(commands, player) {
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    
    myGenerals.forEach(general => {
      const strategicPos = this.getStrategicPosition(general, player);
      
      if (strategicPos && 
          calculateDistance(general.x, general.y, strategicPos.x, strategicPos.y) <= GAME_RULES.MOVE_DISTANCE) {
        commands.push({
          type: COMMANDS.MOVE,
          data: {
            generalId: general.id,
            targetX: strategicPos.x,
            targetY: strategicPos.y
          }
        });
      }
    });
  }

  /**
   * 获取战略位置
   * @param {Object} general - 武将对象
   * @param {Object} player - 玩家数据
   * @returns {Object|null} 目标位置
   */
  getStrategicPosition(general, player) {
    const strategy = this.blackboard.get('strategy');
    
    if (strategy === 'aggressive') {
      // 向敌方基地方向移动
      const enemyBase = this.getEnemyBasePosition();
      return this.getMoveTowardsTarget(general, enemyBase);
    } else if (strategy === 'defensive') {
      // 向己方基地方向移动
      return this.getMoveTowardsTarget(general, player.basePosition);
    } else {
      // 平衡策略：向地图中心移动
      const center = { x: Math.floor(this.gameEngine.map.width / 2), y: Math.floor(this.gameEngine.map.height / 2) };
      return this.getMoveTowardsTarget(general, center);
    }
  }

  /**
   * 获取敌方基地位置
   * @returns {Object} 敌方基地坐标
   */
  getEnemyBasePosition() {
    const enemyId = this.playerId === 1 ? 2 : 1;
    return this.gameEngine.players[enemyId].basePosition;
  }

  /**
   * 计算朝向目标的移动位置
   * @param {Object} general - 武将对象
   * @param {Object} target - 目标位置
   * @returns {Object|null} 移动目标位置
   */
  getMoveTowardsTarget(general, target) {
    const dx = target.x - general.x;
    const dy = target.y - general.y;
    
    // 限制移动距离
    const maxMove = GAME_RULES.MOVE_DISTANCE;
    const moveX = Math.max(-maxMove, Math.min(maxMove, dx));
    const moveY = Math.max(-maxMove, Math.min(maxMove, dy));
    
    const newX = general.x + moveX;
    const newY = general.y + moveY;
    
    // 检查目标位置是否有效
    if (this.gameEngine.map.isValidPosition(newX, newY) && 
        !this.gameEngine.map.getUnitAt(newX, newY)) {
      return { x: newX, y: newY };
    }
    
    return null;
  }

  /**
   * 攻击敌方武将
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  attackEnemyGenerals(commands, player) {
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    const enemyGenerals = this.getEnemyGenerals();
    
    myGenerals.forEach(general => {
      const target = this.selectAttackTarget(general, enemyGenerals);
      
      if (target && calculateDistance(general.x, general.y, target.x, target.y) <= general.attackRange) {
        commands.push({
          type: COMMANDS.AD,
          data: {
            generalId: general.id,
            targetX: target.x,
            targetY: target.y
          }
        });
      }
    });
  }

  /**
   * 获取敌方武将列表
   * @returns {Array} 敌方武将数组
   */
  getEnemyGenerals() {
    const enemyId = this.playerId === 1 ? 2 : 1;
    const enemyPlayer = this.gameEngine.players[enemyId];
    
    return Array.from(enemyPlayer.generals.values()).filter(g => g.isAlive);
  }

  /**
   * 选择攻击目标
   * @param {Object} attacker - 攻击者武将
   * @param {Array} enemies - 敌方武将列表
   * @returns {Object|null} 选定的目标
   */
  selectAttackTarget(attacker, enemies) {
    if (enemies.length === 0) return null;
    
    // 优先攻击血量最低的敌人
    return enemies.reduce((best, current) => {
      const bestDistance = calculateDistance(attacker.x, attacker.y, best.x, best.y);
      const currentDistance = calculateDistance(attacker.x, attacker.y, current.x, current.y);
      
      // 优先级：血量低 > 距离近
      if (current.health < best.health) return current;
      if (current.health === best.health && currentDistance < bestDistance) return current;
      
      return best;
    });
  }

  /**
   * 争夺据点
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  contestFlag(commands, player) {
    if (!this.gameEngine.map.isFlagZoneOpen(this.gameEngine.currentTurn)) {
      return;
    }
    
    const flagZone = this.gameEngine.map.flagZone;
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    
    // 移动武将到据点
    myGenerals.forEach(general => {
      const distanceToFlag = calculateDistance(general.x, general.y, flagZone.centerX, flagZone.centerY);
      
      if (distanceToFlag > flagZone.size / 2) {
        // 移动到据点
        const moveTarget = this.getMoveTowardsTarget(general, { x: flagZone.centerX, y: flagZone.centerY });
        
        if (moveTarget) {
          commands.push({
            type: COMMANDS.MOVE,
            data: {
              generalId: general.id,
              targetX: moveTarget.x,
              targetY: moveTarget.y
            }
          });
        }
      }
    });
    
    // 尝试占领据点
    commands.push({
      type: COMMANDS.AC,
      data: {}
    });
  }

  /**
   * 使用技能
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  useSkills(commands, player) {
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    
    myGenerals.forEach(general => {
      // 简化技能使用逻辑
      const availableSkills = this.getAvailableSkills(general);
      
      availableSkills.forEach(skill => {
        const targets = this.getSkillTargets(general, skill);
        
        if (targets.length > 0) {
          commands.push({
            type: COMMANDS.SK,
            data: {
              generalId: general.id,
              skillKey: skill.key,
              targets: targets
            }
          });
        }
      });
    });
  }

  /**
   * 获取可用技能
   * @param {Object} general - 武将对象
   * @returns {Array} 可用技能数组
   */
  getAvailableSkills(general) {
    // 简化实现：返回基础技能
    return [
      { key: 'basic_attack', name: '基础攻击' },
      { key: 'heal', name: '治疗' },
      { key: 'buff', name: '增益' }
    ];
  }

  /**
   * 获取技能目标
   * @param {Object} general - 武将对象
   * @param {Object} skill - 技能对象
   * @returns {Array} 目标数组
   */
  getSkillTargets(general, skill) {
    // 简化实现：返回空目标
    return [];
  }

  /**
   * 集中火力攻击
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  focusFireAttack(commands, player) {
    const myGenerals = Array.from(player.generals.values()).filter(g => g.isAlive);
    const enemyGenerals = this.getEnemyGenerals();
    
    if (enemyGenerals.length === 0) return;
    
    // 选择血量最低的敌人作为集火目标
    const focusTarget = enemyGenerals.reduce((lowest, current) => 
      current.health < lowest.health ? current : lowest
    );
    
    // 所有武将攻击同一目标
    myGenerals.forEach(general => {
      if (calculateDistance(general.x, general.y, focusTarget.x, focusTarget.y) <= general.attackRange) {
        commands.push({
          type: COMMANDS.AD,
          data: {
            generalId: general.id,
            targetX: focusTarget.x,
            targetY: focusTarget.y
          }
        });
      }
    });
  }

  /**
   * 切换到攻击阵型
   * @param {Array} commands - 命令列表
   * @param {Object} player - 玩家数据
   */
  switchToAggressiveFormation(commands, player) {
    if (player.formation !== 'offensive' && player.morale >= 50 && player.food >= 100) {
      commands.push({
        type: COMMANDS.FORM,
        data: {
          formationType: 'offensive'
        }
      });
    }
  }
} 