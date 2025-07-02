/**
 * 生命值考量因素
 * ==============
 * 
 * 根据代理或目标的生命值情况评估行为的合适程度
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 生命值考量因素类
 * 
 * 评估基于生命值的行为合适程度，支持：
 * - 自身生命值评估（治疗、逃跑等）
 * - 目标生命值评估（攻击优先级等）
 * - 高血量优先 vs 低血量优先模式
 */
export class HealthConsideration implements IConsideration {
  name = '生命值考量';

  /**
   * 构造函数
   * @param isSelf 是否评估自身生命值（true）还是目标生命值（false）
   * @param isLowBetter 是否低血量更好（true用于攻击优先级，false用于治疗判断）
   * @param maxHealth 最大生命值，用于计算百分比
   */
  constructor(private isSelf: boolean, private isLowBetter: boolean, private maxHealth: number = 100) {
    this.isSelf = isSelf;
    this.isLowBetter = isLowBetter;
    this.maxHealth = maxHealth;
  }

  /**
   * 计算基于生命值的得分
   * @param context 行为上下文
   * @returns 0-1之间的得分
   */
  score(context: ActionContext): number {
    let currentHealth: number;
    
    if (this.isSelf) {
      currentHealth = context.agent.health;
    } else if (context.potentialTarget) {
      currentHealth = context.potentialTarget.health;
    } else {
      return 0; // 没有目标则无法评估
    }

    const healthRatio = currentHealth / this.maxHealth;
    return this.isLowBetter ? (1 - healthRatio) : healthRatio;
  }
} 