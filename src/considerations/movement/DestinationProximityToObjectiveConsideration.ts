/**
 * 移动目的地与目标点接近度考量因素
 * =================================
 * 
 * 评估移动到某个位置后与全局目标点的距离
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext, GlobalGoalType } from '../../core/types';

/**
 * 移动目的地与目标点接近度考量因素类
 * 
 * 专门用于移动行为的目标导向考量：
 * - 评估移动目的地与全局目标的距离
 * - 鼓励向目标点移动
 * - 只在移动行为中使用（需要context.destination）
 */
export class DestinationProximityToObjectiveConsideration implements IConsideration {
  readonly name = '移动目的地与目标点接近度';

  /**
   * 构造函数
   * @param objectiveType 目标类型
   * @param maxDistance 最大相关距离
   * @param noObjectiveScore 没有目标时的默认得分
   */
  constructor(
    private objectiveType: GlobalGoalType, 
    private maxDistance: number = 20, 
    private noObjectiveScore: number = 0.1
  ) {}

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    if (!context.destination) return 0; // 此考量因素专用于移动行为

    const objective = context.agent.teamBlackboard.getHighestPriorityObjective();
    if (!objective || objective.type !== this.objectiveType || !objective.targetPosition) {
      return this.noObjectiveScore; // 没有相关目标或目标没有位置
    }

    const dest = context.destination;
    const goal = objective.targetPosition;
    const dx = dest.x - goal.x;
    const dy = dest.y - goal.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.maxDistance) return 0;
    if (distance < 0.5) return 1.0;
    const score = 1 - (distance / this.maxDistance);
    return Math.max(0, score);
  }
} 