import { ActionContext } from '../../core/types';
import { StrategyType } from '../../core/StrategyAnalysis';
import { log } from '../../index';

/**
 * 判断是否应该攻击城寨（要塞）
 * ============================
 * 
 * 该条件用于判断当前是否需要攻击城寨：
 * - 检查全局策略是否是 ATTACK_CITY（攻击城寨）
 * - 如果是攻击城寨策略，返回 true，表示需要攻击城寨
 * - 如果不是，返回 false
 * 
 * 使用场景：
 * - 在攻击城寨策略下，英雄需要移动到城寨附近并发起攻击
 * - 城寨攻击通常需要协调多个英雄的行动
 * - 攻击城寨可以获得战略优势和资源
 */
export function ShouldAttackFortress(context: ActionContext): boolean {
  try {
    const { teamBlackboard } = context;
    
    if (!teamBlackboard) {
      log('[英雄条件] ShouldAttackFortress: 团队黑板不存在');
      return false;
    }

    // 获取当前全局策略
    const currentStrategy = teamBlackboard.getCurrentStrategy();
    
    if (!currentStrategy) {
      log('[英雄条件] ShouldAttackFortress: 当前无全局策略');
      return false;
    }

    // 判断是否是攻击城寨策略
    const shouldAttackFortress = currentStrategy === StrategyType.ATTACK_CITY;
    
    log(`[英雄条件] ShouldAttackFortress: 当前策略=${currentStrategy}, 是否需要攻击城寨=${shouldAttackFortress}`);
    
    return shouldAttackFortress ? true : false;

  } catch (error) {
    log(`[英雄条件] ShouldAttackFortress 执行失败: ${error}`);
    return false;
  }
}

