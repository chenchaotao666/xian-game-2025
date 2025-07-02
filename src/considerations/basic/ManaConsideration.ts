/**
 * 法力值考量因素
 * ==============
 * 
 * 根据代理的法力值情况评估技能使用的合适程度
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 法力值考量因素类
 * 
 * 评估是否有足够的法力值执行特定技能或行为
 * 用于确保AI不会尝试使用无法负担的技能
 */
export class ManaConsideration implements IConsideration {
  name = '法力值考量';

  /**
   * 构造函数
   * @param requiredMana 执行行为所需的法力值
   */
  constructor(private requiredMana: number) {
    this.requiredMana = requiredMana;
  }

  /**
   * 计算基于法力值的得分
   * @param context 行为上下文
   * @returns 0或1（简单的二元判断：有足够法力值为1，否则为0）
   */
  score(context: ActionContext): number {
    return context.agent.mana >= this.requiredMana ? 1.0 : 0.0;
  }
} 