/**
 * 清理目标点防守者考量因素
 * =========================
 * 
 * 鼓励攻击在目标点附近的敌人，用于清理防守者
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext, GlobalGoalType } from '../../core/types';

/**
 * 清理目标点防守者考量因素类
 * 
 * 用于战术清理目标点附近的敌方防守者：
 * - 优先攻击目标点附近的敌人
 * - 目标血量越低得分越高
 * - 支持占领、防守等目标类型
 */
export class ClearDefendersAtGoalConsideration implements IConsideration {
  readonly name = '清理目标点防守者';
  private goalPosition: { x: number; y: number } | undefined;
  private readonly clearanceRadius: number;
  private readonly objectiveType: GlobalGoalType;

  /**
   * 构造函数
   * @param objectiveType 目标类型
   * @param clearanceRadius 清理半径
   */
  constructor(objectiveType: GlobalGoalType, clearanceRadius: number = 3) {
    this.objectiveType = objectiveType;
    this.clearanceRadius = clearanceRadius;
  }

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    if (!context.potentialTarget || !context.potentialTarget.position) {
      return 0;
    }

    const objective = context.agent.teamBlackboard.getHighestPriorityObjective();
    if (!objective || objective.type !== this.objectiveType || !objective.targetPosition) {
      return 0.05; // 没有相关目标
    }
    this.goalPosition = objective.targetPosition;

    const targetPos = context.potentialTarget.position;
    const dx = targetPos.x - this.goalPosition.x;
    const dy = targetPos.y - this.goalPosition.y;
    const distanceToGoal = Math.sqrt(dx * dx + dy * dy);

    if (distanceToGoal <= this.clearanceRadius) {
      // 如果攻击目标点附近的敌人，得分更高
      const healthRatio = Math.max(0, context.potentialTarget.health) / 100;
      return (1 - healthRatio) * 0.8; // 目标点附近低血量敌人得分更高
    }
    return 0.1; // 目标不在目标点附近
  }
} 