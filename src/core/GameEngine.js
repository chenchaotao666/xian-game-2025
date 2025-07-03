import GameMap from './GameMap.js';
import General from '../entities/General.js';
import {
  GAME_RULES,
  ECONOMY,
  PLAYERS,
  COMMANDS,
  TERRAIN_TYPES,
  CITIES,
  FORMATIONS,
  BUFFS,
  calculateDistance
} from './GameConstants.js';

/**
 * 游戏引擎类
 * 负责游戏状态管理、回合系统、玩家操作处理和胜负判定
 */
export default class GameEngine {
  constructor() {
    // 游戏基础状态
    this.currentTurn = 1;
    this.gameState = 'preparing'; // preparing, running, finished
    this.winner = null;
    
    // 初始化地图
    this.map = new GameMap();
    
    // 玩家数据
    this.players = {
      [PLAYERS.PLAYER1]: {
        id: PLAYERS.PLAYER1,
        name: '玩家1',
        generals: new Map(),        // 武将列表
        food: ECONOMY.INITIAL_FOOD, // 粮草
        morale: 0,                  // 士气
        formation: null,            // 当前阵型
        flagControlTurns: 0,        // 控制龙旗据点的回合数
        basePosition: { x: 5, y: 5 }, // 基地位置
        availableBuffs: [],         // 可选择的BUFF
        nextBuffTurn: 100           // 下次可选择BUFF的回合
      },
      [PLAYERS.PLAYER2]: {
        id: PLAYERS.PLAYER2,
        name: '玩家2',
        generals: new Map(),
        food: ECONOMY.INITIAL_FOOD,
        morale: 0,
        formation: null,
        flagControlTurns: 0,
        basePosition: { x: this.map.width - 6, y: this.map.height - 6 },
        availableBuffs: [],
        nextBuffTurn: 100
      }
    };
    
    // 战斗日志
    this.battleLog = [];
    
    // 游戏统计
    this.gameStats = {
      totalTurns: 0,
      totalBattles: 0,
      playerStats: {
        [PLAYERS.PLAYER1]: { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0 },
        [PLAYERS.PLAYER2]: { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0 }
      }
    };
    
    console.log('游戏引擎初始化完成');
  }

  /**
   * 开始游戏
   */
  startGame() {
    if (this.gameState !== 'preparing') {
      throw new Error('游戏已经开始或已结束');
    }
    
    this.gameState = 'running';
    this.currentTurn = 1;
    
    this.addToLog('游戏开始！', 'system');
    console.log('游戏正式开始！');
  }

  /**
   * 处理玩家操作
   * @param {number} playerId - 玩家ID
   * @param {Object} command - 命令对象
   * @returns {Object} 操作结果
   */
  processPlayerCommand(playerId, command) {
    if (this.gameState !== 'running') {
      return { success: false, message: '游戏未进行中' };
    }
    
    const player = this.players[playerId];
    if (!player) {
      return { success: false, message: '无效的玩家ID' };
    }
    
    try {
      const result = this._executeCommand(playerId, command);
      
      if (result.success) {
        this.addToLog(`${player.name}: ${result.message}`, 'action');
      }
      
      return result;
    } catch (error) {
      console.error('处理玩家命令时发生错误:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 执行具体的命令
   * @param {number} playerId - 玩家ID
   * @param {Object} command - 命令对象
   * @returns {Object} 执行结果
   * @private
   */
  _executeCommand(playerId, command) {
    const { type, data } = command;
    
    switch (type) {
      case COMMANDS.PICK:
        return this._handlePickGeneral(playerId, data);
        
      case COMMANDS.MAKE:
        return this._handleMakeTroops(playerId, data);
        
      case COMMANDS.MOVE:
        return this._handleMove(playerId, data);
        
      case COMMANDS.AD:
        return this._handleAttack(playerId, data);
        
      case COMMANDS.SK:
        return this._handleSkill(playerId, data);
        
      case COMMANDS.SP:
        return this._handleTeleport(playerId, data);
        
      case COMMANDS.AC:
        return this._handleOccupyFlag(playerId, data);
        
      case COMMANDS.SG:
        return this._handleAttackCity(playerId, data);
        
      case COMMANDS.FORM:
        return this._handleFormation(playerId, data);
        
      case COMMANDS.BUFF:
        return this._handleBuff(playerId, data);
        
      default:
        return { success: false, message: `未知命令类型: ${type}` };
    }
  }

  /**
   * 处理选择武将命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handlePickGeneral(playerId, data) {
    const { generalName, position } = data;
    const player = this.players[playerId];
    
    // 检查是否可以选择武将
    if (player.generals.size >= GAME_RULES.MAX_GENERALS_PER_PLAYER) {
      return { success: false, message: '已达到武将数量上限' };
    }
    
    // 检查武将是否已被选择
    for (const [, otherPlayer] of Object.entries(this.players)) {
      for (const [, general] of otherPlayer.generals) {
        if (general.name === generalName) {
          return { success: false, message: '该武将已被选择' };
        }
      }
    }
    
    // 创建武将
    const general = new General(generalName, playerId);
    
    // 设置位置
    let targetX, targetY;
    if (position) {
      targetX = position.x;
      targetY = position.y;
    } else {
      // 默认放置在基地附近
      const basePos = player.basePosition;
      targetX = basePos.x;
      targetY = basePos.y;
    }
    
    // 放置武将
    if (this.map.placeUnit(targetX, targetY, general)) {
      player.generals.set(general.id, general);
      return { 
        success: true, 
        message: `成功选择武将 ${generalName}`,
        generalId: general.id
      };
    } else {
      return { success: false, message: '无法在指定位置放置武将' };
    }
  }

  /**
   * 处理生产士兵命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleMakeTroops(playerId, data) {
    const { generalId, archers, shields } = data;
    const player = this.players[playerId];
    
    const general = player.generals.get(generalId);
    if (!general || !general.isAlive) {
      return { success: false, message: '武将不存在或已阵亡' };
    }
    
    const totalTroops = archers + shields;
    const cost = totalTroops * ECONOMY.TROOP_COST;
    
    // 检查粮草是否足够
    if (player.food < cost) {
      return { success: false, message: '粮草不足' };
    }
    
    // 检查统帅值上限
    const currentTroops = general.troops.archers + general.troops.shields;
    if (currentTroops + totalTroops > general.commandPower) {
      return { success: false, message: '超过统帅值上限' };
    }
    
    // 配置小兵
    if (general.configureTroops(
      general.troops.archers + archers,
      general.troops.shields + shields
    )) {
      player.food -= cost;
      return { 
        success: true, 
        message: `成功为 ${general.name} 生产 ${archers} 弓兵, ${shields} 盾兵`
      };
    } else {
      return { success: false, message: '小兵配置失败' };
    }
  }

  /**
   * 处理移动命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleMove(playerId, data) {
    const { generalId, targetX, targetY } = data;
    const player = this.players[playerId];
    
    const general = player.generals.get(generalId);
    if (!general || !general.isAlive) {
      return { success: false, message: '武将不存在或已阵亡' };
    }
    
    // 检查移动距离
    const distance = calculateDistance(general.x, general.y, targetX, targetY);
    if (distance > GAME_RULES.MOVE_DISTANCE) {
      return { success: false, message: '移动距离超过限制' };
    }
    
    // 执行移动
    if (this.map.moveUnit(general.x, general.y, targetX, targetY)) {
      return { 
        success: true, 
        message: `${general.name} 移动到 (${targetX}, ${targetY})`
      };
    } else {
      return { success: false, message: '移动失败，目标位置不可用' };
    }
  }

  /**
   * 处理攻击命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleAttack(playerId, data) {
    const { generalId, targetX, targetY } = data;
    const player = this.players[playerId];
    
    const attacker = player.generals.get(generalId);
    if (!attacker || !attacker.isAlive) {
      return { success: false, message: '攻击者不存在或已阵亡' };
    }
    
    const target = this.map.getUnitAt(targetX, targetY);
    if (!target) {
      return { success: false, message: '目标位置没有单位' };
    }
    
    if (target.playerId === playerId) {
      return { success: false, message: '不能攻击自己的单位' };
    }
    
    // 执行攻击
    const attackResult = attacker.attack(target);
    
    if (attackResult.success) {
      // 更新统计数据
      this.gameStats.playerStats[playerId].damageDealt += attackResult.damage;
      this.gameStats.playerStats[target.playerId].damageTaken += attackResult.damage;
      
      // 检查击杀奖励
      if (!target.isAlive) {
        this.gameStats.playerStats[playerId].kills++;
        this.gameStats.playerStats[target.playerId].deaths++;
        
        // 给予粮草奖励
        player.food = Math.min(ECONOMY.MAX_FOOD, 
          player.food + ECONOMY.KILL_GENERAL_REWARD);
        
        // 给予士气奖励
        player.morale = Math.min(GAME_RULES.MAX_MORALE,
          player.morale + GAME_RULES.KILL_GENERAL_MORALE);
        
        // 从地图移除阵亡武将
        this.map.removeUnit(target.x, target.y);
        
        this.addToLog(`${attacker.name} 击杀了 ${target.name}！`, 'battle');
      }
      
      this.gameStats.totalBattles++;
    }
    
    return attackResult;
  }

  /**
   * 处理技能命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleSkill(playerId, data) {
    const { generalId, skillKey, targets } = data;
    const player = this.players[playerId];
    
    const general = player.generals.get(generalId);
    if (!general || !general.isAlive) {
      return { success: false, message: '武将不存在或已阵亡' };
    }
    
    // 解析目标
    const skillTargets = [];
    if (targets) {
      targets.forEach(target => {
        if (target.type === 'position') {
          skillTargets.push({ x: target.x, y: target.y });
        } else if (target.type === 'unit') {
          const unit = this.map.getUnitAt(target.x, target.y);
          if (unit) {
            skillTargets.push(unit);
          }
        }
      });
    }
    
    // 使用技能
    const skillResult = general.useSkill(skillKey, skillTargets, this.currentTurn, this.map);
    
    if (skillResult.success) {
      this.addToLog(`${general.name} 使用技能: ${skillResult.message}`, 'skill');
    }
    
    return skillResult;
  }

  /**
   * 处理瞬移命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleTeleport(playerId, data) {
    const { generalId, targetX, targetY } = data;
    
    return this._handleSkill(playerId, {
      generalId,
      skillKey: 'teleport',
      targets: [{ type: 'position', x: targetX, y: targetY }]
    });
  }

  /**
   * 处理占领龙旗据点命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleOccupyFlag(playerId, data) {
    const player = this.players[playerId];
    
    // 检查龙旗据点是否开放
    if (!this.map.isFlagZoneOpen(this.currentTurn)) {
      return { success: false, message: '龙旗据点尚未开放' };
    }
    
    // 获取据点内的己方武将
    const flagUnits = this._getUnitsInFlagZone();
    const playerUnits = flagUnits.filter(unit => unit.playerId === playerId);
    
    if (playerUnits.length === 0) {
      return { success: false, message: '据点内没有己方武将' };
    }
    
    // 检查粮草是否足够维持
    const maintainCost = this._calculateFlagMaintainCost(playerUnits);
    if (player.food < maintainCost) {
      return { success: false, message: '粮草不足以维持据点控制' };
    }
    
    return { success: true, message: '正在争夺龙旗据点控制权' };
  }

  /**
   * 处理攻城命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleAttackCity(playerId, data) {
    const { generalId, targetX, targetY } = data;
    const player = this.players[playerId];
    
    const attacker = player.generals.get(generalId);
    if (!attacker || !attacker.isAlive) {
      return { success: false, message: '攻击者不存在或已阵亡' };
    }
    
    const terrainType = this.map.getTerrainType(targetX, targetY);
    const cityData = CITIES[terrainType];
    
    if (!cityData) {
      return { success: false, message: '目标不是城寨' };
    }
    
    // 检查攻击距离
    const distance = calculateDistance(attacker.x, attacker.y, targetX, targetY);
    if (distance > attacker.attackRange) {
      return { success: false, message: '攻击距离不足' };
    }
    
    // 计算攻击伤害（简化处理，直接摧毁城寨）
    this.map.destroyCity(targetX, targetY, this.currentTurn);
    
    // 给予奖励
    player.food = Math.min(ECONOMY.MAX_FOOD, 
      player.food + cityData.food_reward);
    
    this.addToLog(`${attacker.name} 攻陷了 ${cityData.level} 级城寨，获得 ${cityData.food_reward} 粮草`, 'battle');
    
    return { 
      success: true, 
      message: `成功攻陷城寨，获得 ${cityData.food_reward} 粮草`
    };
  }

  /**
   * 处理阵型命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleFormation(playerId, data) {
    const { formationType } = data;
    const player = this.players[playerId];
    
    const formation = FORMATIONS[formationType];
    if (!formation) {
      return { success: false, message: '无效的阵型类型' };
    }
    
    // 检查士气和粮草
    if (player.morale < formation.morale_cost) {
      return { success: false, message: '士气不足' };
    }
    
    if (player.food < formation.food_cost) {
      return { success: false, message: '粮草不足' };
    }
    
    // 消耗资源
    player.morale -= formation.morale_cost;
    player.food -= formation.food_cost;
    player.formation = formationType;
    
    return { 
      success: true, 
      message: `成功切换到 ${formationType}`
    };
  }

  /**
   * 处理BUFF命令
   * @param {number} playerId - 玩家ID
   * @param {Object} data - 命令数据
   * @returns {Object} 处理结果
   * @private
   */
  _handleBuff(playerId, data) {
    const { buffType, targetGeneralId } = data;
    const player = this.players[playerId];
    
    // 检查是否到了可选择BUFF的回合
    if (this.currentTurn < player.nextBuffTurn) {
      return { success: false, message: '尚未到选择BUFF的时间' };
    }
    
    const buff = BUFFS[buffType];
    if (!buff) {
      return { success: false, message: '无效的BUFF类型' };
    }
    
    // 应用BUFF效果
    if (buff.type === 'instant') {
      this._applyInstantBuff(playerId, buff, targetGeneralId);
    } else if (buff.type === 'duration') {
      this._applyDurationBuff(playerId, buff, targetGeneralId);
    }
    
    // 设置下次BUFF时间
    player.nextBuffTurn = this.currentTurn + 100;
    
    return { success: true, message: `成功获得BUFF: ${buff.effect}` };
  }

  /**
   * 应用立即生效的BUFF
   * @param {number} playerId - 玩家ID
   * @param {Object} buff - BUFF数据
   * @param {string} targetGeneralId - 目标武将ID
   * @private
   */
  _applyInstantBuff(playerId, buff, targetGeneralId) {
    const player = this.players[playerId];
    
    switch (buff.id) {
      case 1001: // 传国玉玺
        if (targetGeneralId) {
          const general = player.generals.get(targetGeneralId);
          if (general && general.isAlive) {
            general.configureTroops(
              general.troops.archers + buff.archers,
              general.troops.shields + buff.shields
            );
          }
        }
        break;
        
      case 1002: // 华佗再世
        for (const [, general] of player.generals) {
          if (general.isAlive) {
            const healAmount = Math.floor(general.maxHealth * buff.heal_percent);
            general.heal(healAmount);
          }
        }
        break;
    }
  }

  /**
   * 应用持续生效的BUFF
   * @param {number} playerId - 玩家ID
   * @param {Object} buff - BUFF数据
   * @param {string} targetGeneralId - 目标武将ID
   * @private
   */
  _applyDurationBuff(playerId, buff, targetGeneralId) {
    const player = this.players[playerId];
    
    if (targetGeneralId) {
      const general = player.generals.get(targetGeneralId);
      if (general && general.isAlive) {
        general.addStateEffect(buff.effect, {
          ...buff,
          endTurn: this.currentTurn + buff.duration
        });
      }
    } else {
      // 应用到所有武将
      for (const [, general] of player.generals) {
        if (general.isAlive) {
          general.addStateEffect(buff.effect, {
            ...buff,
            endTurn: this.currentTurn + buff.duration
          });
        }
      }
    }
  }

  /**
   * 推进到下一回合
   */
  nextTurn() {
    if (this.gameState !== 'running') {
      return { success: false, message: '游戏未进行中' };
    }
    
    this.currentTurn++;
    this.gameStats.totalTurns++;
    
    // 更新所有武将状态
    this._updateAllGenerals();
    
    // 更新地图状态
    this.map.updateCities(this.currentTurn);
    
    // 更新龙旗据点控制
    this._updateFlagControl();
    
    // 检查胜负条件
    const winner = this._checkWinCondition();
    if (winner) {
      this._endGame(winner);
      return { success: true, message: `游戏结束，${winner.name} 获胜！` };
    }
    
    this.addToLog(`第 ${this.currentTurn} 回合开始`, 'system');
    
    return { success: true, message: `进入第 ${this.currentTurn} 回合` };
  }

  /**
   * 更新所有武将状态
   * @private
   */
  _updateAllGenerals() {
    for (const [, player] of Object.entries(this.players)) {
      for (const [, general] of player.generals) {
        general.updateTurn(this.currentTurn);
        
        // 如果武将复活，放置在基地
        if (general.isAlive && general.x === -1) {
          const basePos = player.basePosition;
          this.map.placeUnit(basePos.x, basePos.y, general);
        }
      }
    }
  }

  /**
   * 获取龙旗据点内的所有单位
   * @returns {Array} 单位数组
   * @private
   */
  _getUnitsInFlagZone() {
    const flagZone = this.map.flagZone;
    const units = [];
    
    for (let dx = -Math.floor(flagZone.size/2); dx <= Math.floor(flagZone.size/2); dx++) {
      for (let dy = -Math.floor(flagZone.size/2); dy <= Math.floor(flagZone.size/2); dy++) {
        const x = flagZone.centerX + dx;
        const y = flagZone.centerY + dy;
        
        const unit = this.map.getUnitAt(x, y);
        if (unit && unit.isAlive) {
          units.push(unit);
        }
      }
    }
    
    return units;
  }

  /**
   * 计算龙旗据点维持成本
   * @param {Array} units - 单位数组
   * @returns {number} 维持成本
   * @private
   */
  _calculateFlagMaintainCost(units) {
    let cost = 0;
    
    for (const unit of units) {
      cost += ECONOMY.FLAG_MAINTAIN_COST_GENERAL; // 武将成本
      
      if (unit.troops) {
        cost += unit.troops.archers * ECONOMY.FLAG_MAINTAIN_COST_TROOP;
        cost += unit.troops.shields * ECONOMY.FLAG_MAINTAIN_COST_TROOP;
      }
    }
    
    return cost;
  }

  /**
   * 更新龙旗据点控制状态
   * @private
   */
  _updateFlagControl() {
    if (!this.map.isFlagZoneOpen(this.currentTurn)) {
      return;
    }
    
    const flagUnits = this._getUnitsInFlagZone();
    const player1Units = flagUnits.filter(unit => unit.playerId === PLAYERS.PLAYER1);
    const player2Units = flagUnits.filter(unit => unit.playerId === PLAYERS.PLAYER2);
    
    const controlStatus = this.map.updateFlagControl(player1Units, player2Units);
    
    // 更新玩家的控制回合数
    if (controlStatus.controller) {
      const controller = this.players[controlStatus.controller];
      const opponent = this.players[controlStatus.controller === PLAYERS.PLAYER1 ? PLAYERS.PLAYER2 : PLAYERS.PLAYER1];
      
      controller.flagControlTurns = controlStatus.contestTurns;
      opponent.flagControlTurns = 0;
      
      // 扣除维持成本
      const maintainCost = this._calculateFlagMaintainCost(
        controlStatus.controller === PLAYERS.PLAYER1 ? player1Units : player2Units
      );
      
      if (controller.food >= maintainCost) {
        controller.food -= maintainCost;
      } else {
        // 粮草不足，失去控制权
        this.map.flagZone.controller = null;
        this.map.flagZone.contestTurns = 0;
        controller.flagControlTurns = 0;
        
        this.addToLog(`${controller.name} 因粮草不足失去龙旗据点控制权`, 'system');
      }
    }
  }

  /**
   * 检查胜负条件
   * @returns {Object|null} 获胜玩家或null
   * @private
   */
  _checkWinCondition() {
    // 检查回合数上限
    if (this.currentTurn >= GAME_RULES.MAX_TURNS) {
      // 比较龙旗据点控制回合数
      const player1 = this.players[PLAYERS.PLAYER1];
      const player2 = this.players[PLAYERS.PLAYER2];
      
      if (player1.flagControlTurns > player2.flagControlTurns) {
        return player1;
      } else if (player2.flagControlTurns > player1.flagControlTurns) {
        return player2;
      } else {
        // 平局，比较其他指标
        return this._determineTieBreaker();
      }
    }
    
    // 检查龙旗据点胜利条件
    for (const [, player] of Object.entries(this.players)) {
      if (player.flagControlTurns >= GAME_RULES.WIN_FLAG_TURNS) {
        return player;
      }
    }
    
    return null;
  }

  /**
   * 决定平局胜负
   * @returns {Object} 获胜玩家
   * @private
   */
  _determineTieBreaker() {
    const player1 = this.players[PLAYERS.PLAYER1];
    const player2 = this.players[PLAYERS.PLAYER2];
    
    // 比较存活武将数
    const player1Alive = Array.from(player1.generals.values()).filter(g => g.isAlive).length;
    const player2Alive = Array.from(player2.generals.values()).filter(g => g.isAlive).length;
    
    if (player1Alive > player2Alive) return player1;
    if (player2Alive > player1Alive) return player2;
    
    // 比较击杀数
    const player1Stats = this.gameStats.playerStats[PLAYERS.PLAYER1];
    const player2Stats = this.gameStats.playerStats[PLAYERS.PLAYER2];
    
    if (player1Stats.kills > player2Stats.kills) return player1;
    if (player2Stats.kills > player1Stats.kills) return player2;
    
    // 比较造成伤害
    if (player1Stats.damageDealt > player2Stats.damageDealt) return player1;
    if (player2Stats.damageDealt > player1Stats.damageDealt) return player2;
    
    // 默认返回玩家1
    return player1;
  }

  /**
   * 结束游戏
   * @param {Object} winner - 获胜玩家
   * @private
   */
  _endGame(winner) {
    this.gameState = 'finished';
    this.winner = winner;
    
    this.addToLog(`游戏结束！${winner.name} 获得胜利！`, 'system');
    this.addToLog(`总回合数: ${this.currentTurn}`, 'system');
    this.addToLog(`总战斗次数: ${this.gameStats.totalBattles}`, 'system');
    
    console.log(`游戏结束，${winner.name} 获胜！`);
  }

  /**
   * 添加战斗日志
   * @param {string} message - 日志消息
   * @param {string} type - 日志类型
   */
  addToLog(message, type = 'info') {
    const logEntry = {
      turn: this.currentTurn,
      timestamp: Date.now(),
      type,
      message
    };
    
    this.battleLog.push(logEntry);
    
    // 限制日志数量
    if (this.battleLog.length > 1000) {
      this.battleLog = this.battleLog.slice(-500);
    }
  }

  /**
   * 获取游戏当前状态
   * @returns {Object} 游戏状态对象
   */
  getGameState() {
    return {
      currentTurn: this.currentTurn,
      gameState: this.gameState,
      winner: this.winner,
      players: Object.fromEntries(
        Object.entries(this.players).map(([id, player]) => [
          id,
          {
            ...player,
            generals: Array.from(player.generals.values()).map(g => g.getStatus())
          }
        ])
      ),
      map: {
        width: this.map.width,
        height: this.map.height,
        flagZone: this.map.flagZone,
        unitsCount: this.map.units.size,
        citiesCount: this.map.cities.size
      },
      stats: this.gameStats,
      recentLogs: this.battleLog.slice(-10)
    };
  }

  /**
   * 获取玩家的可见信息
   * @param {number} playerId - 玩家ID
   * @returns {Object} 玩家可见的游戏信息
   */
  getPlayerView(playerId) {
    const gameState = this.getGameState();
    const player = gameState.players[playerId];
    
    return {
      currentTurn: gameState.currentTurn,
      gameState: gameState.gameState,
      player: player,
      map: gameState.map,
      recentLogs: gameState.recentLogs.filter(log => 
        log.type === 'system' || 
        log.message.includes(player.name)
      )
    };
  }
} 