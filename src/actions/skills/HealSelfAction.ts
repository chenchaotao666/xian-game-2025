/**
 * 自我治疗行为
 * =============
 * 
 * 恢复自身生命值的技能行为
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext } from '../../core/types';
import { getAverageAggregate } from '../../aggregators';
import { 
  SkillReadyConsideration, 
  ManaConsideration, 
  HealthConsideration 
} from '../../considerations';

/**
 * 自我治疗行为类
 * 
 * 治疗技能，特点：
 * - 需要15法力值
 * - 无射程限制（自我施法）
 * - 生命值越低效用越高
 * - 有技能冷却限制
 */
export class HealSelfAction extends BaseUtilityAction {
  name = '治疗自己';
  private skillId = 'HealSelf';

  constructor() {
    super(
      [
        new SkillReadyConsideration('HealSelf'),
        new ManaConsideration(15),
        new HealthConsideration(true, false, 100) // 自身血量越低越需要治疗
      ],
      getAverageAggregate()
    );
  }

  /**
   * 检查是否可以执行治疗
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  canExecute(agent: IAgent, context: ActionContext): boolean {
    return agent.isSkillReady(this.skillId) && 
           agent.mana >= 15 && 
           agent.health < 100; // 只有在受伤时才治疗
  }

  /**
   * 执行治疗行为
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    realAgent.performSelfSkill(this.skillId);
  }
} 