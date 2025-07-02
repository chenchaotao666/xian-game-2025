/**
 * 原地不动奖励考量因素
 * =====================
 * 
 * 给原地不动的选择一个小的奖励分数，作为其他行为的后备选择
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 原地不动奖励考量因素类
 * 
 * 提供移动行为的保底选择：
 * - 当所有移动选项都不理想时，提供原地待命的选项
 * - 给予小幅奖励分数，确保总是有一个可选的行为
 * - 用于平衡激进移动和保守策略
 * - 专用于移动行为
 */
export class StayPutConsideration implements IConsideration {
  readonly name = '原地不动奖励';

  /**
   * 构造函数
   * @param bonusIfStaying 如果原地不动的奖励分数
   */
  constructor(private bonusIfStaying: number = 0.2) {}

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    if (!context.destination) return 0;

    const dest = context.destination;
    const currentPos = context.agent.position;

    // 如果目的地就是当前位置，给予小奖励
    if (dest.x === currentPos.x && dest.y === currentPos.y) {
      return this.bonusIfStaying;
    }

    return 0; // 移动到其他位置不给奖励
  }
} 