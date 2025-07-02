/**
 * 重创技能行为
 * ==============
 * 
 * 强力攻击技能，对有破甲debuff的目标造成额外伤害
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext } from '../../core/types';
import { GameMap } from '../../gameMap';
import { getWeightedAverageAggregate } from '../../aggregators';
import { 
  SkillReadyConsideration, 
  ManaConsideration, 
  DistanceConsideration, 
  HealthConsideration,
  TargetHasSetupDebuffConsideration
} from '../../considerations';

/**
 * 重创技能行为类
 * 
 * 这是一个强力的近战技能，特点：
 * - 需要25法力值
 * - 射程2格
 * - 对有破甲debuff的目标造成额外伤害
 * - 优先攻击低血量目标
 */
export class ExecuteHeavyBlowAction extends BaseUtilityAction {
  name = '使用重创';
  private skillId = 'HeavyBlow';

  constructor() {
    super(
      [
        new SkillReadyConsideration('HeavyBlow'), 
        new ManaConsideration(25),
        new DistanceConsideration(1, 2), // 近距离技能
        new TargetHasSetupDebuffConsideration('破甲', 1.2, 0), // 破甲目标奖励
        new HealthConsideration(false, true, 120) // 优先攻击低血量目标
      ],
      getWeightedAverageAggregate([0.8, 0.7, 0.5, 1.2, 0.6])
    );
  }

  /**
   * 检查是否可以执行重创技能
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  canExecute(agent: IAgent, context: ActionContext): boolean {
    if (!context?.potentialTarget) return false;
    if (!agent.isSkillReady(this.skillId) || agent.mana < 25) return false;
    const dist = agent.getDistanceToAgent(context.gameMap, context.potentialTarget);
    return dist <= 2; // 技能射程
  }

  /**
   * 执行重创技能
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    if (!context.potentialTarget?.id) return;
    
    const actualTarget = realAgent.visibleEnemies.find(e => e.id === context.potentialTarget!.id);
    if (actualTarget) {
      realAgent.performSkillOnTarget(this.skillId, actualTarget);
    } else {
      realAgent.log(`${this.name} 错误: 目标 ${context.potentialTarget.id} 不可达或不存在。`);
    }
  }

  /**
   * 生成所有可能的重创上下文
   * @param agent 代理对象
   * @param gameMap 游戏地图
   * @returns 上下文数组
   */
  generateContexts(agent: IAgent, gameMap: GameMap): ActionContext[] {
    const enemies = agent.visibleEnemies;
    return enemies
      .filter(enemy => agent.getDistanceToAgent(gameMap, enemy) <= 2) // 预过滤射程内敌人
      .map(enemy => ({
        agent,
        gameMap,
        potentialTarget: enemy,
        skillId: this.skillId
      }));
  }
} 