/**
 * 目标准备Debuff考量因素
 * ========================
 * 
 * 检查目标是否拥有特定debuff，用于协同作战
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 目标准备Debuff考量因素类
 * 
 * 用于检查目标是否有特定的debuff状态，常用于技能连击：
 * - 破甲 + 重创的组合
 * - 中毒 + 引爆的组合
 * - 其他状态的利用
 */
export class TargetHasSetupDebuffConsideration implements IConsideration {
  readonly name = '目标是否有特定准备Debuff';

  /**
   * 构造函数
   * @param requiredDebuffType 需要的debuff类型
   * @param scoreIfPresent 有debuff时的得分
   * @param minRemainingTurns 最少剩余回合数
   */
  constructor(
    private requiredDebuffType: string,
    private scoreIfPresent: number = 1.0,
    private minRemainingTurns: number = 0
  ) {}

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    if (!context.potentialTarget?.id) {
      return 0;
    }

    // 从团队黑板获取目标的debuff信息
    const debuffInfo = context.agent.teamBlackboard.getTargetDebuffInfo(
      context.potentialTarget.id,
      this.requiredDebuffType,
      context.agent.currentTurn
    );

    if (debuffInfo) {
      const remainingTurns = debuffInfo.expiresTurn - context.agent.currentTurn;
      if (remainingTurns >= this.minRemainingTurns) {
        return this.scoreIfPresent;
      }
    }

    return 0;
  }
} 