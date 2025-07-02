/**
 * 技能就绪考量因素
 * ================
 * 
 * 检查特定技能是否可用（冷却时间结束）
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 技能就绪考量因素类
 * 
 * 评估特定技能是否已准备就绪可以使用
 * 这是技能类行为的基础前提条件
 */
export class SkillReadyConsideration implements IConsideration {
  name = '技能就绪考量';

  /**
   * 构造函数
   * @param skillId 要检查的技能ID
   */
  constructor(private skillId: string) {
    this.skillId = skillId;
  }

  /**
   * 计算技能就绪状态得分
   * @param context 行为上下文
   * @returns 0或1（技能就绪为1，否则为0）
   */
  score(context: ActionContext): number {
    return context.agent.isSkillReady(this.skillId) ? 1.0 : 0.0;
  }
} 