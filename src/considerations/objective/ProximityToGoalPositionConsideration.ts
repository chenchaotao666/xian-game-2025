/**
 * 目标点接近度考量因素
 * =====================
 * 
 * 评估代理当前位置与全局目标点的接近程度
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext, GlobalGoalType } from '../../core/types';

/**
 * 目标点接近度考量因素类
 * 
 * 用于评估代理当前位置与全局目标的距离：
 * - 距离越近得分越高
 * - 支持不同类型的全局目标（占领、防守等）
 * - 当没有相关目标时返回低分
 */
export class ProximityToGoalPositionConsideration implements IConsideration {
  readonly name = '与目标点接近度 (当前位置)';
  private goalPosition: { x: number; y: number } | undefined;
  private readonly maxDistance: number;
  private readonly objectiveType: GlobalGoalType;

  /**
   * 构造函数
   * @param objectiveType 目标类型
   * @param maxDistance 最大相关距离
   */
  constructor(objectiveType: GlobalGoalType, maxDistance: number = 20) {
    this.objectiveType = objectiveType;
    this.maxDistance = maxDistance;
  }

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    const objective = context.agent.teamBlackboard.getHighestPriorityObjective();
    if (!objective || objective.type !== this.objectiveType || !objective.targetPosition) {
      return 0.1; // 没有相关目标或目标没有位置
    }
    this.goalPosition = objective.targetPosition;

    const agentPos = context.agent.position; // 代理当前位置
    const dx = agentPos.x - this.goalPosition.x;
    const dy = agentPos.y - this.goalPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.maxDistance) return 0;
    if (distance < 0.5) return 1.0;
    const score = 1 - (distance / this.maxDistance);
    return Math.max(0, score);
  }
} 