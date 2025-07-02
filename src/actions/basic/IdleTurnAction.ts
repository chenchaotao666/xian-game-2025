/**
 * 待命行为
 * =========
 * 
 * 什么都不做，等待更好时机的行为
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext } from '../../core/types';

/**
 * 待命行为类
 * 
 * 保底行为，特点：
 * - 总是可以执行
 * - 效用值很低，只有在其他行为都不可用时才选择
 * - 无任何消耗和副作用
 * - 可用于法力值回复等待
 */
export class IdleTurnAction extends BaseUtilityAction {
  name = '待命';

  constructor() {
    // 待命行为不需要考量因素，直接提供固定的低效用值
    super([]);
  }

  /**
   * 计算待命行为的效用值
   * @param agent 代理对象
   * @returns 固定的低效用值
   */
  calculateUtility(agent: IAgent): number {
    // 待命应该有很低的分数，只有在没有更好选择时才被选中
    let score = 0.01;
    
    // 如果法力值很低且生命值还可以，待命可能稍微更有价值（等待法力恢复）
    if (agent.mana < 10 && agent.health > 50) {
      score = 0.05;
    }
    
    return score;
  }

  /**
   * 检查是否可以执行待命
   * @returns 总是返回true（保底行为）
   */
  canExecute(): boolean {
    return true;
  }

  /**
   * 执行待命行为
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    realAgent.performIdle();
  }
} 