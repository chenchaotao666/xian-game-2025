/**
 * 移动目的地追击集火目标考量因素
 * =================================
 * 
 * 鼓励移动到更接近团队集火目标的位置
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext, IAgent } from '../../core/types';

/**
 * 移动目的地追击集火目标考量因素类
 * 
 * 用于追击团队集火目标的移动决策：
 * - 鼓励移动到距离集火目标更近的位置
 * - 理想攻击距离约1-2格
 * - 只在有集火目标时生效
 * - 专用于移动行为
 */
export class DestinationChaseFocusTargetConsideration implements IConsideration {
  readonly name = '移动目的地追击集火目标';

  /**
   * 构造函数
   * @param maxChaseDistance 最大追击距离
   */
  constructor(private maxChaseDistance: number = 10) {}

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    if (!context.destination) return 0;

    const focusTargetId = context.agent.teamBlackboard.getFocusTargetId();
    if (!focusTargetId) {
      return 0.1; // 没有集火目标
    }

    // 找到集火目标的实际位置
    const enemies = context.agent.visibleEnemies;
    const focusTarget = enemies.find(enemy => enemy.id === focusTargetId);

    if (!focusTarget) {
      return 0.1; // 集火目标不可见
    }

    const dest = context.destination;
    const target = focusTarget.position;
    const dx = dest.x - target.x;
    const dy = dest.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.maxChaseDistance) return 0;

    // 理想攻击距离大约是1-2格
    const idealAttackDistance = 1.5;
    if (distance <= idealAttackDistance) {
      return 1.0; // 已在理想攻击距离内
    }

    // 距离越近得分越高
    const score = 1 - ((distance - idealAttackDistance) / (this.maxChaseDistance - idealAttackDistance));
    return Math.max(0, score);
  }
} 