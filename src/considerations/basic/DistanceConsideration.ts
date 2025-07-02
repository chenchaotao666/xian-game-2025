/**
 * 距离考量因素
 * ============
 * 
 * 根据代理与目标之间的距离评估行为的合适程度
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 距离考量因素类
 * 
 * 评估基于距离的行为合适程度，支持：
 * - 理想距离匹配（近战/远程攻击）
 * - 距离衰减函数
 * - 超出范围的行为过滤
 */
export class DistanceConsideration implements IConsideration {
  name = '距离考量';

  /**
   * 构造函数
   * @param idealDistance 理想距离（最高得分的距离）
   * @param maxRelevantDistance 最大相关距离（超出此距离得分为0）
   */
  constructor(private idealDistance: number, private maxRelevantDistance: number) {
    this.idealDistance = idealDistance;
    this.maxRelevantDistance = maxRelevantDistance;
  }

  /**
   * 计算基于距离的得分
   * @param context 行为上下文
   * @returns 0-1之间的得分
   */
  score(context: ActionContext): number {
    if (!context.potentialTarget) {
      return 0; // 没有目标则无法评估距离
    }

    const distance = context.gameMap.getRealDistance(
      context.agent.position.x,
      context.agent.position.y,
      context.potentialTarget.position.x,
      context.potentialTarget.position.y
    );

    // 距离无效（无法到达）
    if (distance < 0) {
      return 0;
    }

    // 超出最大相关距离
    if (distance > this.maxRelevantDistance) {
      return 0;
    }

    // 在理想距离时得分最高
    if (distance <= this.idealDistance) {
      return 1.0;
    }

    // 距离越远得分越低，使用线性衰减
    const distanceFromIdeal = distance - this.idealDistance;
    const maxDistanceFromIdeal = this.maxRelevantDistance - this.idealDistance;
    return Math.max(0, 1.0 - (distanceFromIdeal / maxDistanceFromIdeal));
  }
} 