/**
 * 团队集火目标考量因素
 * ====================
 * 
 * 评估目标是否为团队当前的集火目标
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 团队集火目标考量因素类
 * 
 * 鼓励团队成员优先攻击集火目标，实现协同作战
 */
export class IsTeamFocusTargetConsideration implements IConsideration {
  name = '是否团队集火目标';

  /**
   * 构造函数
   * @param weightIfFocusTarget 如果是集火目标的权重
   * @param weightIfNotFocusTarget 如果不是集火目标的权重
   */
  constructor(private weightIfFocusTarget: number = 1.0, private weightIfNotFocusTarget: number = 0.1) {
    this.weightIfFocusTarget = weightIfFocusTarget;
    this.weightIfNotFocusTarget = weightIfNotFocusTarget;
  }

  /**
   * 计算集火目标得分
   * @param context 行为上下文
   * @returns 权重得分
   */
  score(context: ActionContext): number {
    if (!context.potentialTarget) {
      return this.weightIfNotFocusTarget;
    }

    const focusTargetId = context.agent.teamBlackboard.getFocusTargetId();
    
    if (focusTargetId && context.potentialTarget.id === focusTargetId) {
      return this.weightIfFocusTarget;
    } else {
      return this.weightIfNotFocusTarget;
    }
  }
} 