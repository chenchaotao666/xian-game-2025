/**
 * 逃跑行为
 * =========
 * 
 * 在危险情况下远离敌人的行为
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext } from '../../core/types';
import { GameMap } from '../../gameMap';
import { getAverageAggregate } from '../../aggregators';
import { HealthConsideration } from '../../considerations';

/**
 * 逃跑行为类
 * 
 * 紧急逃生行为，特点：
 * - 生命值越低效用越高
 * - 自动寻找最安全的位置
 * - 优先远离最近的敌人
 * - 无法力消耗
 */
export class FleeAction extends BaseUtilityAction {
  name = '逃跑';

  constructor() {
    super(
      [
        new HealthConsideration(true, false, 100) // 血量越低逃跑意愿越强
      ],
      getAverageAggregate()
    );
  }

  /**
   * 检查是否可以执行逃跑
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  canExecute(agent: IAgent, context: ActionContext): boolean {
    // 有敌人在附近且自身血量不满时才需要逃跑
    return agent.visibleEnemies.length > 0 && agent.health < 100;
  }

  /**
   * 执行逃跑行为
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    // 寻找最安全的移动位置
    const safePosition = this.findSafestPosition(realAgent, context.gameMap);
    
    if (safePosition && (safePosition.x !== realAgent.position.x || safePosition.y !== realAgent.position.y)) {
      realAgent.performMove(context, safePosition);
      realAgent.log(`紧急逃跑至安全位置: (${safePosition.x}, ${safePosition.y})`);
    } else {
      realAgent.log('无法找到安全的逃跑位置，原地待命');
      realAgent.performIdle();
    }
  }

  /**
   * 寻找最安全的位置
   * @param agent 代理对象
   * @param gameMap 游戏地图
   * @returns 最安全的位置
   */
  private findSafestPosition(agent: IAgent, gameMap: GameMap): { x: number; y: number } | null {
    const reachablePositions = agent.getReachableMovePositions(gameMap);
    
    if (reachablePositions.length === 0) {
      return null;
    }

    // 计算每个位置到最近敌人的距离，选择最远的位置
    let bestPosition = reachablePositions[0];
    let maxMinDistance = 0;

    for (const position of reachablePositions) {
      let minDistanceToEnemy = Infinity;

      for (const enemy of agent.visibleEnemies) {
        const distance = gameMap.getRealDistance(position.x, position.y, enemy.position.x, enemy.position.y);
        if (distance < minDistanceToEnemy) {
          minDistanceToEnemy = distance;
        }
      }

      if (minDistanceToEnemy > maxMinDistance) {
        maxMinDistance = minDistanceToEnemy;
        bestPosition = position;
      }
    }

    return bestPosition;
  }
} 