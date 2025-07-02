/**
 * 移动行为
 * =========
 * 
 * 实现战略移动行为，AI可以移动到最优位置
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext, IAgentState } from '../../core/types';
import { GameMap } from '../../gameMap';
import { getAverageAggregate } from '../../aggregators';

// 导入移动相关的考量因素
// import { DestinationSafetyConsideration } from '../../considerations/movement/DestinationSafetyConsideration';
// import { DestinationProximityToObjectiveConsideration } from '../../considerations/movement/DestinationProximityToObjectiveConsideration';
// import { StayPutConsideration } from '../../considerations/movement/StayPutConsideration';

/**
 * 移动行为类
 * 
 * 评估所有可达位置，选择最优的移动目标
 * 考虑因素包括：
 * - 目的地安全性
 * - 与目标点的接近度  
 * - 原地不动的奖励
 */
export class MoveAction extends BaseUtilityAction {
  name = '战略移动';

  constructor() {
    super(
      [
        // TODO: 在对应的考量因素创建后取消注释
        // new DestinationSafetyConsideration(5),
        // new DestinationProximityToObjectiveConsideration(GlobalGoalType.CAPTURE_POINT, 20, 0.1),
        // new StayPutConsideration(0.2)
      ],
      getAverageAggregate()
    );
  }

  /**
   * 检查是否可以执行移动
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  canExecute(agent: IAgent, context: ActionContext): boolean {
    // 检查是否有有效的目的地
    if (!context.destination) {
      return false;
    }

    // 检查目的地是否在移动范围内
    const distance = context.gameMap.getRealDistance(
      agent.position.x,
      agent.position.y,
      context.destination.x,
      context.destination.y
    );

    return distance > 0 && distance <= agent.movementRange;
  }

  /**
   * 执行移动行为
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    if (!context.destination) {
      realAgent.log('移动行为执行失败：没有指定目的地');
      return;
    }

    realAgent.performMove(context, context.destination);
  }

  /**
   * 生成所有可能的移动上下文
   * @param agent 代理对象
   * @param gameMap 游戏地图
   * @returns 移动上下文数组
   */
  generateContexts(agent: IAgent | IAgentState, gameMap: GameMap): ActionContext[] {
    const contexts: ActionContext[] = [];
    
    // 确保agent是完整的IAgent对象
    const fullAgent = agent as IAgent;
    if (!fullAgent.getReachableMovePositions) {
      return contexts;
    }

    // 获取所有可达位置
    const reachablePositions = fullAgent.getReachableMovePositions(gameMap);

    // 为每个可达位置创建上下文
    for (const position of reachablePositions) {
      contexts.push({
        agent: fullAgent,
        gameMap,
        destination: position
      });
    }

    // 添加原地不动的选择
    contexts.push({
      agent: fullAgent,
      gameMap,
      destination: fullAgent.position
    });

    return contexts;
  }
} 