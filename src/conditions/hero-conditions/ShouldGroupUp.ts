import { State } from 'mistreevous';
import { ActionContext } from '../../core/types';
import { StrategyType } from '../../core/StrategyAnalysis';
import { log } from '../../index';

/**
 * 判断是否应该集合（组队）
 * ====================
 * 
 * 该条件用于判断当前是否需要英雄集合：
 * - 检查全局策略是否是 CAPTURE_FLAG（占领龙旗）
 * - 如果是占领龙旗策略，返回 true，表示需要集合
 * - 如果不是，返回 false
 * 
 * 使用场景：
 * - 在占领龙旗时，通常需要多个英雄协同作战
 * - 集合后可以形成更强的战斗力
 */
export function ShouldGroupUp(context: ActionContext): State {
  try {
    const { teamBlackboard } = context;
    
    if (!teamBlackboard) {
      log('[英雄条件] ShouldGroupUp: 团队黑板不存在');
      return State.FAILED;
    }

    // 获取当前全局策略
    const currentStrategy = teamBlackboard.getCurrentStrategy();
    
    if (!currentStrategy) {
      log('[英雄条件] ShouldGroupUp: 当前无全局策略');
      return State.FAILED;
    }

    // 判断是否是占领龙旗策略
    const shouldGroupUp = currentStrategy === StrategyType.CAPTURE_FLAG;
    
    log(`[英雄条件] ShouldGroupUp: 当前策略=${currentStrategy}, 是否需要集合=${shouldGroupUp}`);
    
    return shouldGroupUp ? State.SUCCEEDED : State.FAILED;

  } catch (error) {
    log(`[英雄条件] ShouldGroupUp 执行失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 检查是否应该集合的辅助函数
 * @param context 动作上下文
 * @returns 是否应该集合
 */
export function shouldGroupUpForStrategy(context: ActionContext): boolean {
  try {
    const { teamBlackboard } = context;
    
    if (!teamBlackboard) {
      return false;
    }

    const currentStrategy = teamBlackboard.getCurrentStrategy();
    return currentStrategy === StrategyType.CAPTURE_FLAG;
    
  } catch (error) {
    log(`[英雄条件] shouldGroupUpForStrategy 执行失败: ${error}`);
    return false;
  }
}

/**
 * 获取集合的原因说明
 * @param context 动作上下文
 * @returns 集合原因的文字说明
 */
export function getGroupUpReason(context: ActionContext): string {
  try {
    const { teamBlackboard } = context;
    
    if (!teamBlackboard) {
      return '无法获取团队信息';
    }

    const currentStrategy = teamBlackboard.getCurrentStrategy();
    
    switch (currentStrategy) {
      case StrategyType.CAPTURE_FLAG:
        return '占领龙旗需要多英雄协同作战';
      default:
        return '当前策略不需要集合';
    }
    
  } catch (error) {
    return `获取集合原因失败: ${error}`;
  }
}
