/**
 * 基础效用行为抽象类
 * ===================
 * 
 * 提供所有具体行为的基础实现
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { getAverageAggregate } from '../aggregators';
import { IUtilityAction, IConsideration, IAgent, ActionContext, PartialExcept } from '../core/types';
import type { AggregationMethod } from '../aggregators';

/**
 * 基础效用行为抽象类
 * 
 * 实现IUtilityAction接口的通用功能，包括：
 * - 效用值计算
 * - 考量因素聚合
 * - 调试日志输出
 */
export abstract class BaseUtilityAction implements IUtilityAction {
  abstract name: string;                    // 行为名称，由子类实现
  considerations: IConsideration[];         // 考量因素列表
  aggregationMethod: AggregationMethod;    // 分数聚合方法

  /**
   * 构造函数
   * @param considerations 考量因素列表
   * @param aggregationMethod 聚合方法，默认为平均值聚合
   */
  protected constructor(
    considerations: IConsideration[],
    aggregationMethod: AggregationMethod = getAverageAggregate(),
  ) {
    this.considerations = considerations;
    this.aggregationMethod = aggregationMethod;
  }

  /**
   * 计算行为的总效用值
   * @param agent 代理对象
   * @param baseContext 基础上下文（可选）
   * @param debug 是否输出调试信息
   * @returns 0-1之间的效用分数
   */
  calculateUtility(agent: IAgent, baseContext?: PartialExcept<ActionContext, 'gameMap'>, debug?: boolean): number {
    const context: ActionContext = {
      agent,
      gameMap: baseContext?.gameMap || agent.teamBlackboard as any, // 临时处理
      ...baseContext,
    };

    const scores = this.considerations.map(consideration => {
      const score = consideration.score(context);
      if (debug) {
        console.log(`  ${consideration.name}: ${score.toFixed(3)}`);
      }
      return score;
    });

    const finalUtility = this.aggregationMethod(scores);
    
    if (debug) {
      console.log(`[${this.name}] 最终效用值: ${finalUtility.toFixed(3)}`);
    }

    return finalUtility;
  }

  /**
   * 检查行为是否可执行
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  abstract canExecute(agent: IAgent, context: ActionContext): boolean;

  /**
   * 执行行为
   * @param realAgent 真实代理对象（非模拟状态）
   * @param context 行为上下文
   */
  abstract execute(realAgent: IAgent, context: ActionContext): void;

  /**
   * 生成多个执行上下文（可选实现）
   * 用于需要评估多个可能目标或位置的行为
   * @param agent 代理对象
   * @param gameMap 游戏地图
   * @returns 上下文数组
   */
  generateContexts?(agent: IAgent, gameMap: any): ActionContext[];
} 