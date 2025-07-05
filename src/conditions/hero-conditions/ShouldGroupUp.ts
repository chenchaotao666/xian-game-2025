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
export function ShouldGroupUp(context: ActionContext): boolean {
  try {
    const { teamBlackboard } = context;
    
    if (!teamBlackboard) {
      log('[英雄条件] ShouldGroupUp: 团队黑板不存在');
      return false;
    }

    // 获取当前全局策略
    const currentStrategy = teamBlackboard.getCurrentStrategy();
    
    if (!currentStrategy) {
      log('[英雄条件] ShouldGroupUp: 当前无全局策略');
      return false;
    }

    // 判断是否是占领龙旗策略
    const shouldGroupUp = currentStrategy === StrategyType.CAPTURE_FLAG;
    
    log(`[英雄条件] ShouldGroupUp: 当前策略=${currentStrategy}, 是否需要集合=${shouldGroupUp}`);
    
    return shouldGroupUp;

  } catch (error) {
    log(`[英雄条件] ShouldGroupUp 执行失败: ${error}`);
    return false;
  }
}
