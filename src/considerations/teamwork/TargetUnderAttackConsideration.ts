/**
 * 目标受攻击考量因素
 * ==================
 * 
 * 评估目标是否处于低血量状态（暗示正在被集火）
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext } from '../../core/types';

/**
 * 目标受攻击考量因素类
 * 
 * 优先攻击低血量目标，完成击杀
 */
export class TargetUnderAttackConsideration implements IConsideration {
  name = '目标是否低血量(暗示被集火)';

  /**
   * 计算目标受攻击状态得分
   * @param context 行为上下文
   * @returns 基于目标血量的得分（血量越低得分越高）
   */
  score(context: ActionContext): number {
    if (!context.potentialTarget) {
      return 0;
    }

    const targetHealth = context.potentialTarget.health;
    // 假设最大血量为100，可以根据实际情况调整
    const maxHealth = 120; // 战士血量可能更高
    const healthRatio = targetHealth / maxHealth;
    
    // 血量越低，得分越高（更倾向于攻击残血目标）
    return 1.0 - healthRatio;
  }
} 