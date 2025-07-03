import { 
  GENERALS, 
  TROOPS, 
  BATTLE_STATES, 
  GAME_RULES,
  calculateDistance 
} from '../core/GameConstants';

/**
 * 武将类
 * 负责武将的属性管理、技能释放、小兵管理、战斗计算等
 */
export default class General {
  constructor(name, playerId) {
    // 基础信息
    this.name = name;
    this.playerId = playerId;
    this.id = `${playerId}_${name}_${Date.now()}`;
    
    // 从常量中获取武将数据
    const generalData = GENERALS[name];
    if (!generalData) {
      throw new Error(`未找到武将数据: ${name}`);
    }
    
    // 武将属性
    this.type = generalData.type;
    this.baseForcePower = generalData.武力;    // 基础武力值
    this.currentForcePower = generalData.武力; // 当前武力值（可能受BUFF影响）
    this.commandPower = generalData.统帅;       // 统帅值
    this.maxHealth = generalData.体力;         // 最大体力
    this.currentHealth = generalData.体力;     // 当前体力
    this.attackRange = generalData.攻击距离;    // 攻击距离
    
    // 位置信息
    this.x = -1;
    this.y = -1;
    
    // 技能系统
    this.skills = {
      skill1: {
        ...generalData.技能1,
        currentCooldown: 0,
        lastUsedTurn: -1
      },
      skill2: {
        ...generalData.技能2,
        currentCooldown: 0,
        lastUsedTurn: -1
      },
      teleport: {
        name: '瞬移',
        cooldown: GAME_RULES.TELEPORT_COOLDOWN,
        currentCooldown: 0,
        lastUsedTurn: -1,
        range: GAME_RULES.TELEPORT_RANGE
      }
    };
    
    // 小兵配置（按统帅值分配）
    this.troops = {
      archers: 0,    // 弓兵数量
      shields: 0,    // 盾兵数量
      maxTroops: this.commandPower
    };
    
    // 战斗状态
    this.battleState = BATTLE_STATES.NORMAL;
    this.stateEffects = new Map(); // 存储各种状态效果
    
    // 死亡和复活
    this.isAlive = true;
    this.deathTurn = -1;
    this.revivalTurn = -1;
    
    // 战斗统计
    this.stats = {
      damageDealt: 0,
      damageTaken: 0,
      killCount: 0,
      skillUsageCount: 0
    };
    
    console.log(`武将 ${name} (玩家${playerId}) 创建成功`);
  }

  /**
   * 更新武将状态（每回合调用）
   * @param {number} currentTurn - 当前回合数
   */
  updateTurn(currentTurn) {
    // 更新技能冷却
    this._updateSkillCooldowns(currentTurn);
    
    // 更新状态效果
    this._updateStateEffects(currentTurn);
    
    // 检查复活
    if (!this.isAlive && currentTurn >= this.revivalTurn) {
      this.revive();
    }
  }

  /**
   * 更新技能冷却时间
   * @param {number} currentTurn - 当前回合数
   * @private
   */
  _updateSkillCooldowns(currentTurn) {
    for (const skillKey in this.skills) {
      const skill = this.skills[skillKey];
      if (skill.lastUsedTurn >= 0) {
        skill.currentCooldown = Math.max(0, 
          skill.cooldown - (currentTurn - skill.lastUsedTurn)
        );
      }
    }
  }

  /**
   * 更新状态效果
   * @param {number} currentTurn - 当前回合数
   * @private
   */
  _updateStateEffects(currentTurn) {
    const expiredEffects = [];
    
    for (const [effectName, effect] of this.stateEffects) {
      if (effect.endTurn && currentTurn >= effect.endTurn) {
        expiredEffects.push(effectName);
      }
    }
    
    // 移除过期效果
    expiredEffects.forEach(effectName => {
      this.removeStateEffect(effectName);
    });
  }

  /**
   * 配置小兵
   * @param {number} archerCount - 弓兵数量
   * @param {number} shieldCount - 盾兵数量
   * @returns {boolean} 是否配置成功
   */
  configureTroops(archerCount, shieldCount) {
    const totalTroops = archerCount + shieldCount;
    
    if (totalTroops > this.troops.maxTroops) {
      console.warn(`小兵总数(${totalTroops})超过统帅值上限(${this.troops.maxTroops})`);
      return false;
    }
    
    this.troops.archers = archerCount;
    this.troops.shields = shieldCount;
    
    console.log(`${this.name} 配置小兵: ${archerCount}弓兵, ${shieldCount}盾兵`);
    return true;
  }

  /**
   * 检查技能是否可用
   * @param {string} skillKey - 技能键名
   * @returns {boolean} 技能是否可用
   */
  canUseSkill(skillKey) {
    if (!this.isAlive) return false;
    
    const skill = this.skills[skillKey];
    if (!skill) return false;
    
    // 检查冷却时间
    if (skill.currentCooldown > 0) return false;
    
    // 检查状态限制
    if (this.battleState === BATTLE_STATES.SILENCED && skillKey !== 'teleport') {
      return false;
    }
    
    if (this.battleState === BATTLE_STATES.IMPRISONED) {
      return false;
    }
    
    // 特殊技能条件检查
    if (skillKey === 'skill2' && this.name === '吕布') {
      // 大杀四方需要体力低于1000
      return this.currentHealth < 1000;
    }
    
    return true;
  }

  /**
   * 使用技能
   * @param {string} skillKey - 技能键名
   * @param {Array} targets - 目标数组
   * @param {number} currentTurn - 当前回合数
   * @param {Object} gameMap - 游戏地图对象
   * @returns {Object} 技能使用结果
   */
  useSkill(skillKey, targets, currentTurn, gameMap) {
    if (!this.canUseSkill(skillKey)) {
      return { success: false, message: '技能无法使用' };
    }
    
    const skill = this.skills[skillKey];
    skill.lastUsedTurn = currentTurn;
    skill.currentCooldown = skill.cooldown;
    
    this.stats.skillUsageCount++;
    
    // 根据武将和技能类型执行不同的技能效果
    const result = this._executeSkill(skillKey, targets, gameMap);
    
    console.log(`${this.name} 使用技能: ${skill.name}`);
    return { success: true, ...result };
  }

  /**
   * 执行具体的技能效果
   * @param {string} skillKey - 技能键名
   * @param {Array} targets - 目标数组
   * @param {Object} gameMap - 游戏地图对象
   * @returns {Object} 技能执行结果
   * @private
   */
  _executeSkill(skillKey, targets, gameMap) {
    const skillName = this.skills[skillKey].name;
    const results = { damage: [], effects: [], message: '' };
    
    // 根据武将名称和技能执行不同逻辑
    switch (this.name) {
      case '吕布':
        return this._executeLvbuSkills(skillKey, targets, gameMap);
      case '赵云':
        return this._executeZhaoyunSkills(skillKey, targets, gameMap);
      case '关羽':
        return this._executeGuanyuSkills(skillKey, targets, gameMap);
      case '刘备':
        return this._executeLiubeiSkills(skillKey, targets, gameMap);
      case '曹操':
        return this._executeCaocaoSkills(skillKey, targets, gameMap);
      case '孙权':
        return this._executeSunquanSkills(skillKey, targets, gameMap);
      case '诸葛亮':
        return this._executeZhugeliangSkills(skillKey, targets, gameMap);
      case '周瑜':
        return this._executeZhouyuSkills(skillKey, targets, gameMap);
      case '司马懿':
        return this._executeSimayiSkills(skillKey, targets, gameMap);
      default:
        if (skillKey === 'teleport') {
          return this._executeTeleport(targets[0], gameMap);
        }
        break;
    }
    
    return results;
  }

  /**
   * 吕布技能实现
   * @param {string} skillKey - 技能键名
   * @param {Array} targets - 目标数组
   * @param {Object} gameMap - 游戏地图对象
   * @returns {Object} 技能结果
   * @private
   */
  _executeLvbuSkills(skillKey, targets, gameMap) {
    const results = { damage: [], effects: [], message: '' };
    
    if (skillKey === 'skill1') {
      // 无双乱舞：对攻击距离内所有敌方单位造成2×武力值伤害
      const unitsInRange = gameMap.getUnitsInRange(this.x, this.y, this.attackRange);
      const enemies = unitsInRange.filter(unit => unit.playerId !== this.playerId);
      
      enemies.forEach(enemy => {
        const damage = this.currentForcePower * 2;
        const actualDamage = enemy.takeDamage(damage, this);
        results.damage.push({ target: enemy.name, damage: actualDamage });
      });
      
      results.message = `无双乱舞命中${enemies.length}个敌方单位`;
      
    } else if (skillKey === 'skill2') {
      // 大杀四方：3回合内对敌方武将伤害提升50%，结束后2回合虚弱状态
      this.addStateEffect('大杀四方', {
        type: 'attack_boost',
        multiplier: 1.5,
        endTurn: null, // 手动管理结束时间
        duration: 3
      });
      
      results.effects.push('获得大杀四方状态，3回合内攻击力提升50%');
      results.message = '大杀四方激活！';
    }
    
    return results;
  }

  /**
   * 赵云技能实现
   * @param {string} skillKey - 技能键名
   * @param {Array} targets - 目标数组
   * @param {Object} gameMap - 游戏地图对象
   * @returns {Object} 技能结果
   * @private
   */
  _executeZhaoyunSkills(skillKey, targets, gameMap) {
    const results = { damage: [], effects: [], message: '' };
    
    if (skillKey === 'skill1') {
      // 龙胆突刺：敌方武将体力低于25%直接击杀，否则造成2×武力值伤害
      const target = targets[0];
      if (target && target.playerId !== this.playerId) {
        const healthPercentage = target.currentHealth / target.maxHealth;
        
        if (healthPercentage < 0.25) {
          // 直接击杀
          target.die();
          results.effects.push(`${target.name}被龙胆突刺直接击杀`);
          results.message = '龙胆突刺一击必杀！';
        } else {
          // 造成2×武力值伤害
          const damage = this.currentForcePower * 2;
          const actualDamage = target.takeDamage(damage, this);
          results.damage.push({ target: target.name, damage: actualDamage });
          results.message = '龙胆突刺造成重创！';
        }
      }
      
    } else if (skillKey === 'skill2') {
      // 冲锋陷阵：对范围内所有小兵造成0.5×武力值伤害，无小兵则对敌方武将造成1×武力值伤害
      const unitsInRange = gameMap.getUnitsInRange(this.x, this.y, this.attackRange);
      const enemies = unitsInRange.filter(unit => unit.playerId !== this.playerId);
      
      let hasEnemyTroops = false;
      enemies.forEach(enemy => {
        if (enemy.troops && (enemy.troops.archers > 0 || enemy.troops.shields > 0)) {
          hasEnemyTroops = true;
          // 对小兵造成伤害
          const troopDamage = Math.floor(this.currentForcePower * 0.5);
          enemy.takeTroopDamage(troopDamage);
          results.damage.push({ target: `${enemy.name}的小兵`, damage: troopDamage });
        }
      });
      
      if (!hasEnemyTroops) {
        // 对武将造成伤害
        enemies.forEach(enemy => {
          const damage = this.currentForcePower;
          const actualDamage = enemy.takeDamage(damage, this);
          results.damage.push({ target: enemy.name, damage: actualDamage });
        });
      }
      
      results.message = hasEnemyTroops ? '冲锋陷阵重创敌军！' : '冲锋陷阵直击敌将！';
    }
    
    return results;
  }

  /**
   * 瞬移技能实现
   * @param {Object} target - 目标位置 {x, y}
   * @param {Object} gameMap - 游戏地图对象
   * @returns {Object} 技能结果
   * @private
   */
  _executeTeleport(target, gameMap) {
    const results = { damage: [], effects: [], message: '' };
    
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      results.message = '无效的瞬移目标位置';
      return results;
    }
    
    // 检查瞬移距离
    const distance = calculateDistance(this.x, this.y, target.x, target.y);
    if (distance > this.skills.teleport.range) {
      results.message = `瞬移距离超出范围(最大${this.skills.teleport.range})`;
      return results;
    }
    
    // 执行瞬移
    if (gameMap.moveUnit(this.x, this.y, target.x, target.y)) {
      results.effects.push(`从(${this.x}, ${this.y})瞬移到(${target.x}, ${target.y})`);
      results.message = '瞬移成功！';
    } else {
      results.message = '瞬移失败，目标位置不可用';
    }
    
    return results;
  }

  /**
   * 承受伤害
   * @param {number} damage - 伤害值
   * @param {Object} attacker - 攻击者
   * @returns {number} 实际承受的伤害
   */
  takeDamage(damage, attacker = null) {
    if (!this.isAlive) return 0;
    
    // 小兵承伤逻辑：盾兵 → 弓兵 → 武将
    let actualDamage = damage;
    
    // 先让盾兵承受伤害
    if (this.troops.shields > 0) {
      const shieldHealth = TROOPS.盾兵.体力;
      const shieldsKilled = Math.min(
        this.troops.shields,
        Math.ceil(actualDamage / shieldHealth)
      );
      
      const shieldDamageAbsorbed = shieldsKilled * shieldHealth;
      this.troops.shields -= shieldsKilled;
      actualDamage = Math.max(0, actualDamage - shieldDamageAbsorbed);
      
      if (shieldsKilled > 0) {
        console.log(`${this.name} 失去 ${shieldsKilled} 个盾兵`);
      }
    }
    
    // 再让弓兵承受剩余伤害
    if (actualDamage > 0 && this.troops.archers > 0) {
      const archerHealth = TROOPS.弓兵.体力;
      const archersKilled = Math.min(
        this.troops.archers,
        Math.ceil(actualDamage / archerHealth)
      );
      
      const archerDamageAbsorbed = archersKilled * archerHealth;
      this.troops.archers -= archersKilled;
      actualDamage = Math.max(0, actualDamage - archerDamageAbsorbed);
      
      if (archersKilled > 0) {
        console.log(`${this.name} 失去 ${archersKilled} 个弓兵`);
      }
    }
    
    // 最后武将承受剩余伤害
    if (actualDamage > 0) {
      // 应用状态效果修正
      actualDamage = this._applyDamageReduction(actualDamage);
      
      this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
      this.stats.damageTaken += actualDamage;
      
      console.log(`${this.name} 受到 ${actualDamage} 点伤害，剩余体力: ${this.currentHealth}`);
      
      // 检查是否死亡
      if (this.currentHealth <= 0) {
        this.die();
      }
    }
    
    return damage; // 返回原始伤害值
  }

  /**
   * 小兵受到伤害
   * @param {number} damage - 伤害值
   */
  takeTroopDamage(damage) {
    let remainingDamage = damage;
    
    // 盾兵先承受伤害
    if (this.troops.shields > 0 && remainingDamage > 0) {
      const shieldHealth = TROOPS.盾兵.体力;
      const shieldsKilled = Math.min(
        this.troops.shields,
        Math.ceil(remainingDamage / shieldHealth)
      );
      
      this.troops.shields -= shieldsKilled;
      remainingDamage -= shieldsKilled * shieldHealth;
      
      console.log(`${this.name} 的 ${shieldsKilled} 个盾兵被击杀`);
    }
    
    // 弓兵承受剩余伤害
    if (this.troops.archers > 0 && remainingDamage > 0) {
      const archerHealth = TROOPS.弓兵.体力;
      const archersKilled = Math.min(
        this.troops.archers,
        Math.ceil(remainingDamage / archerHealth)
      );
      
      this.troops.archers -= archersKilled;
      
      console.log(`${this.name} 的 ${archersKilled} 个弓兵被击杀`);
    }
  }

  /**
   * 应用减伤效果
   * @param {number} damage - 原始伤害
   * @returns {number} 减伤后的伤害
   * @private
   */
  _applyDamageReduction(damage) {
    let finalDamage = damage;
    
    // 应用各种减伤状态
    if (this.stateEffects.has('护盾')) {
      const shieldEffect = this.stateEffects.get('护盾');
      finalDamage *= (1 - shieldEffect.reduction);
    }
    
    if (this.stateEffects.has('青龙护体')) {
      const protectionEffect = this.stateEffects.get('青龙护体');
      finalDamage *= (1 - protectionEffect.reduction);
    }
    
    if (this.battleState === BATTLE_STATES.IMMUNE) {
      finalDamage = 0; // 免疫所有伤害
    }
    
    return Math.floor(finalDamage);
  }

  /**
   * 武将死亡
   */
  die() {
    if (!this.isAlive) return;
    
    this.isAlive = false;
    this.currentHealth = 0;
    this.deathTurn = Date.now(); // 简化处理，实际应该用游戏回合数
    this.revivalTurn = this.deathTurn + GAME_RULES.REVIVAL_TURNS;
    
    // 清除所有状态效果
    this.stateEffects.clear();
    this.battleState = BATTLE_STATES.NORMAL;
    
    console.log(`${this.name} 阵亡，将在 ${GAME_RULES.REVIVAL_TURNS} 回合后复活`);
  }

  /**
   * 武将复活
   */
  revive() {
    this.isAlive = true;
    this.currentHealth = this.maxHealth;
    this.battleState = BATTLE_STATES.NORMAL;
    this.stateEffects.clear();
    
    // 重置技能冷却
    for (const skillKey in this.skills) {
      this.skills[skillKey].currentCooldown = 0;
    }
    
    console.log(`${this.name} 复活了！`);
  }

  /**
   * 添加状态效果
   * @param {string} name - 状态名称
   * @param {Object} effect - 状态效果对象
   */
  addStateEffect(name, effect) {
    this.stateEffects.set(name, effect);
    console.log(`${this.name} 获得状态效果: ${name}`);
  }

  /**
   * 移除状态效果
   * @param {string} name - 状态名称
   */
  removeStateEffect(name) {
    if (this.stateEffects.has(name)) {
      this.stateEffects.delete(name);
      console.log(`${this.name} 失去状态效果: ${name}`);
    }
  }

  /**
   * 治疗武将
   * @param {number} amount - 治疗量
   */
  heal(amount) {
    if (!this.isAlive) return;
    
    const oldHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    const actualHeal = this.currentHealth - oldHealth;
    
    if (actualHeal > 0) {
      console.log(`${this.name} 恢复了 ${actualHeal} 点体力`);
    }
  }

  /**
   * 获取武将当前状态信息
   * @returns {Object} 状态信息对象
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      playerId: this.playerId,
      type: this.type,
      position: { x: this.x, y: this.y },
      health: {
        current: this.currentHealth,
        max: this.maxHealth,
        percentage: this.currentHealth / this.maxHealth
      },
      forcePower: {
        base: this.baseForcePower,
        current: this.currentForcePower
      },
      commandPower: this.commandPower,
      attackRange: this.attackRange,
      troops: { ...this.troops },
      battleState: this.battleState,
      stateEffects: Array.from(this.stateEffects.keys()),
      skills: Object.fromEntries(
        Object.entries(this.skills).map(([key, skill]) => [
          key,
          {
            name: skill.name,
            cooldown: skill.cooldown,
            currentCooldown: skill.currentCooldown,
            isReady: skill.currentCooldown === 0
          }
        ])
      ),
      isAlive: this.isAlive,
      stats: { ...this.stats }
    };
  }

  /**
   * 检查是否可以攻击目标
   * @param {Object} target - 目标对象
   * @returns {boolean} 是否可以攻击
   */
  canAttack(target) {
    if (!this.isAlive || !target || target.playerId === this.playerId) {
      return false;
    }
    
    if (this.battleState === BATTLE_STATES.IMPRISONED) {
      return false;
    }
    
    const distance = calculateDistance(this.x, this.y, target.x, target.y);
    return distance <= this.attackRange;
  }

  /**
   * 攻击目标
   * @param {Object} target - 目标对象
   * @returns {Object} 攻击结果
   */
  attack(target) {
    if (!this.canAttack(target)) {
      return { success: false, message: '无法攻击目标' };
    }
    
    // 计算基础伤害
    let damage = this.currentForcePower;
    
    // 应用攻击力加成状态
    if (this.stateEffects.has('大杀四方')) {
      damage *= 1.5;
    }
    
    if (this.stateEffects.has('乱世枭雄')) {
      damage += 20;
    }
    
    // 执行攻击
    const actualDamage = target.takeDamage(damage, this);
    this.stats.damageDealt += actualDamage;
    
    // 乱世枭雄回血效果
    if (this.stateEffects.has('乱世枭雄')) {
      const healAmount = Math.floor(actualDamage * 0.1);
      this.heal(healAmount);
    }
    
    // 检查击杀
    if (!target.isAlive) {
      this.stats.killCount++;
    }
    
    console.log(`${this.name} 攻击 ${target.name}，造成 ${actualDamage} 点伤害`);
    
    return {
      success: true,
      damage: actualDamage,
      target: target.name,
      message: `造成 ${actualDamage} 点伤害`
    };
  }

  // 其他武将技能实现方法（为了代码简洁，这里只展示框架）
  _executeGuanyuSkills(skillKey, targets, gameMap) {
    // 关羽技能实现
    return { damage: [], effects: [], message: '关羽技能执行' };
  }

  _executeLiubeiSkills(skillKey, targets, gameMap) {
    // 刘备技能实现
    return { damage: [], effects: [], message: '刘备技能执行' };
  }

  _executeCaocaoSkills(skillKey, targets, gameMap) {
    // 曹操技能实现
    return { damage: [], effects: [], message: '曹操技能执行' };
  }

  _executeSunquanSkills(skillKey, targets, gameMap) {
    // 孙权技能实现
    return { damage: [], effects: [], message: '孙权技能执行' };
  }

  _executeZhugeliangSkills(skillKey, targets, gameMap) {
    // 诸葛亮技能实现
    return { damage: [], effects: [], message: '诸葛亮技能执行' };
  }

  _executeZhouyuSkills(skillKey, targets, gameMap) {
    // 周瑜技能实现
    return { damage: [], effects: [], message: '周瑜技能执行' };
  }

  _executeSimayiSkills(skillKey, targets, gameMap) {
    // 司马懿技能实现
    return { damage: [], effects: [], message: '司马懿技能执行' };
  }
} 