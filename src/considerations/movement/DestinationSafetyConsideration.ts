/**
 * 移动目的地安全度考量因素
 * =========================
 * 
 * 评估移动到某个位置的安全性，避开敌人威胁范围
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IConsideration, ActionContext, IAgent } from '../../core/types';

/**
 * 移动目的地安全度考量因素类
 * 
 * 用于评估移动目的地的安全性：
 * - 计算目的地附近的敌人威胁
 * - 距离敌人越远越安全
 * - 敌人血量越高威胁越大
 * - 专用于移动行为决策
 */
export class DestinationSafetyConsideration implements IConsideration {
  readonly name = '移动目的地安全度';

  /**
   * 构造函数
   * @param maxThreatDistance 最大威胁距离
   */
  constructor(private maxThreatDistance: number = 5) {}

  /**
   * 计算考量分数
   * @param context 行为上下文
   * @returns 0-1之间的分数
   */
  score(context: ActionContext): number {
    if (!context.destination) return 0;

    const destination = context.destination;
    const enemies = context.agent.visibleEnemies;

    if (enemies.length === 0) {
      return 1.0; // 没有可见敌人，完全安全
    }

    let totalThreat = 0;
    let threatCount = 0;

    for (const enemy of enemies) {
      const dx = destination.x - enemy.position.x;
      const dy = destination.y - enemy.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.maxThreatDistance) {
        // 距离越近威胁越大，血量越高威胁越大
        const distanceThreat = 1 - (distance / this.maxThreatDistance);
        const healthThreat = enemy.health / 100; // 假设最大血量100
        totalThreat += distanceThreat * healthThreat;
        threatCount++;
      }
    }

    if (threatCount === 0) {
      return 1.0; // 没有威胁
    }

    const averageThreat = totalThreat / threatCount;
    return Math.max(0, 1 - averageThreat); // 威胁越大，安全得分越低
  }
} 