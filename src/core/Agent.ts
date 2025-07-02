/**
 * 游戏代理类
 * ===========
 * 
 * 实现IAgent接口的具体代理类
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { GameMap } from '../gameMap';
import { IAgent, IAgentState, Position, ActionContext } from './types';
import { TeamBlackboard } from './TeamBlackboard';

/**
 * 游戏代理实现类
 * 
 * 表示游戏中的一个AI控制的角色，包含：
 * - 基本属性（生命值、法力值、位置等）
 * - 感知系统（可见敌人、盟友）
 * - 行为执行（移动、攻击、技能）
 * - 状态模拟（用于AI决策预测）
 */
export class Agent implements IAgent {
  id: string;
  health: number;
  mana: number;
  position: { x: number; y: number };
  teamId: string;
  teamBlackboard: TeamBlackboard;
  currentTurn: number = 0;
  movementRange: number = 1;
  visibleEnemies: IAgent[] = [];
  visibleAllies: IAgent[] = [];
  currentTarget: IAgent | null = null;

  /**
   * 构造函数
   * @param id 代理唯一标识符
   * @param health 初始生命值
   * @param mana 初始法力值
   * @param position 初始位置
   * @param teamId 所属队伍ID
   * @param teamBlackboard 团队黑板
   * @param movementRange 移动范围
   */
  constructor(
    id: string, health: number, mana: number, position: Position,
    teamId: string, teamBlackboard: TeamBlackboard, movementRange: number = 3,
  ) {
    this.id = id;
    this.health = health;
    this.mana = mana;
    this.position = position;
    this.teamId = teamId;
    this.teamBlackboard = teamBlackboard;
    this.movementRange = movementRange;
  }

  /**
   * 输出日志信息
   * @param message 日志消息
   */
  log(message: string): void {
    console.log(`[${this.id} (${this.teamId})]: ${message}`);
  }

  /**
   * 计算与另一Agent或状态的距离
   * @param gameMap 游戏地图实例
   * @param otherAgent 目标代理或其状态
   * @returns 两者间的实际距离
   */
  getDistanceToAgent(gameMap: GameMap, otherAgent: IAgent | IAgentState): number {
    return gameMap.getRealDistance(this.position.x, this.position.y, otherAgent.position.x, otherAgent.position.y);
  }

  /**
   * 检查是否能看到另一个代理
   * @param gameMap 游戏地图
   * @param otherAgent 目标代理
   * @param fromPosition 观察位置（可选，默认为当前位置）
   * @returns 是否可见
   */
  canSeeAgent(gameMap: GameMap, otherAgent: IAgent | IAgentState, fromPosition?: Position): boolean {
    const from = fromPosition || this.position;
    return gameMap.canDirectMove(from.x, from.y, otherAgent.position.x, otherAgent.position.y);
  }

  /**
   * 执行移动
   * @param context 行为上下文
   * @param position 目标位置
   */
  performMove(context: ActionContext, position: Position): void {
    const oldPos = { ...this.position };
    this.position = position;
    this.log(`执行移动: 从 (${oldPos.x},${oldPos.y}) 到 (${position.x},${position.y})`);
  }

  /**
   * 执行攻击
   * @param target 攻击目标
   */
  performAttack(target: IAgent): void {
    const damage = Math.floor(Math.random() * 20) + 10; // 10-29点随机伤害
    target.health -= damage;
    target.health = Math.max(0, target.health);
    
    this.log(`执行攻击: 目标 ${target.id}! 造成 ${damage} 点伤害。`);
    this.log(`${target.id} 受到 ${damage} 点伤害, 剩余生命: ${target.health}。`);
  }

  /**
   * 对目标使用技能
   * @param skillId 技能ID
   * @param target 目标代理
   */
  performSkillOnTarget(skillId: string, target: IAgent): void {
    this.log(`执行技能: 对 ${target.id} 使用 "${skillId}"`);
    
    switch (skillId) {
      case 'ArmorBreak':
        // 破甲打击：造成伤害并施加debuff
        const damage = Math.floor(Math.random() * 15) + 8;
        target.health -= damage;
        target.health = Math.max(0, target.health);
        
        // 在团队黑板上记录debuff
        this.teamBlackboard.setTargetDebuff(target.id, 'ArmorBroken', 'ArmorBreak', 3, this.currentTurn);
        
        this.log(`${target.id} 受到 ${damage} 点伤害并获得"破甲"debuff, 剩余生命: ${target.health}。`);
        break;
        
      case 'HeavyBlow':
        // 重创：对有破甲debuff的目标造成额外伤害
        const baseHeavyDamage = Math.floor(Math.random() * 25) + 15;
        let heavyDamage = baseHeavyDamage;
        
        const armorBreakInfo = this.teamBlackboard.getTargetDebuffInfo(target.id, 'ArmorBroken', this.currentTurn);
        if (armorBreakInfo) {
          heavyDamage = Math.floor(heavyDamage * 1.5); // 破甲状态下额外50%伤害
          this.log(`目标处于破甲状态，重创伤害提升50%！`);
        }
        
        target.health -= heavyDamage;
        target.health = Math.max(0, target.health);
        this.log(`${target.id} 受到 ${heavyDamage} 点重创伤害, 剩余生命: ${target.health}。`);
        break;
    }
  }

  /**
   * 对自己使用技能
   * @param skillId 技能ID
   */
  performSelfSkill(skillId: string): void {
    this.log(`执行自我技能: "${skillId}"`);
    
    switch (skillId) {
      case 'HealSelf':
        const healAmount = Math.floor(Math.random() * 20) + 15; // 15-34点治疗
        this.health += healAmount;
        this.health = Math.min(120, this.health); // 假设最大生命值120
        this.log(`生命值恢复到 ${this.health}。`);
        break;
    }
  }

  /**
   * 执行空闲动作
   */
  performIdle(): void {
    this.log(`执行"待命"动作。`);
  }

  /**
   * 检查技能是否就绪
   * @param skillId 技能ID
   * @returns 是否就绪
   */
  isSkillReady(skillId: string): boolean {
    // 简化实现：所有技能都视为就绪
    // 实际游戏中会检查冷却时间、法力值等
    return true;
  }

  /**
   * 获取目标身上的debuff列表
   * @param target 目标代理
   * @returns debuff信息数组
   */
  getTargetDebuffs(target: IAgent): Array<{ type: string; remainingTurns: number; sourceSkill: string }> {
    const debuffs = [];
    
    // 检查破甲debuff
    const armorBreakInfo = this.teamBlackboard.getTargetDebuffInfo(target.id, 'ArmorBroken', this.currentTurn);
    if (armorBreakInfo) {
      debuffs.push({
        type: 'ArmorBroken',
        remainingTurns: armorBreakInfo.expiresTurn - this.currentTurn + 1,
        sourceSkill: armorBreakInfo.sourceSkill
      });
    }
    
    return debuffs;
  }

  /**
   * 获取移动后的模拟状态
   * @param newPosition 新位置
   * @returns 模拟状态
   */
  getSimulatedStateAfterMove(newPosition: Position): IAgentState {
    return {
      id: this.id,
      health: this.health,
      mana: this.mana,
      position: newPosition
    };
  }

  /**
   * 获取所有可达的移动位置
   * @param map 游戏地图
   * @returns 可达位置数组
   */
  getReachableMovePositions(map: GameMap): Position[] {
    const reachablePositions: Position[] = [];
    const { x: currentX, y: currentY } = this.position;
    
    // 检查移动范围内的所有位置
    for (let dx = -this.movementRange; dx <= this.movementRange; dx++) {
      for (let dy = -this.movementRange; dy <= this.movementRange; dy++) {
        const newX = currentX + dx;
        const newY = currentY + dy;
        
        // 跳过当前位置
        if (dx === 0 && dy === 0) continue;
        
        // 检查位置是否有效且可达
        if (map.isValidPosition(newX, newY) && !map.isObstacle(newX, newY)) {
          const distance = map.getRealDistance(currentX, currentY, newX, newY);
          if (distance > 0 && distance <= this.movementRange) {
            reachablePositions.push({ x: newX, y: newY });
          }
        }
      }
    }
    
    return reachablePositions;
  }

  /**
   * 模拟感知更新
   * @param allAgents 所有代理列表
   * @param gameMap 游戏地图
   */
  simulatePerception(allAgents: Agent[], gameMap: GameMap): void {
    this.visibleEnemies = allAgents.filter(agent => 
      agent !== this && 
      agent.teamId !== this.teamId && 
      agent.health > 0 &&
      this.canSeeAgent(gameMap, agent)
    );
    
    this.visibleAllies = allAgents.filter(agent => 
      agent !== this && 
      agent.teamId === this.teamId && 
      agent.health > 0 &&
      this.canSeeAgent(gameMap, agent)
    );
  }
} 