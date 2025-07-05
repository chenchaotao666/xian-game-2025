import { ActionContext } from '../../core/types';
import { StrategyType } from '../../core/StrategyAnalysis';
import { log } from '../../index';
import { calculateDistance } from 'src/core/GameConstants';

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

export function HasFortressInRange(context: ActionContext): boolean {
  try {
    const { teamBlackboard, agent } = context;
    
    if (!teamBlackboard) {
      log('[英雄条件] HasFortressInRange: 团队黑板不存在');
      return false;
    }

    if (!agent) {
      log('[英雄条件] HasFortressInRange: 代理不存在');
      return false;
    }

    // 获取当前英雄信息
    const currentHero = teamBlackboard.getHeroById(agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      log('[英雄条件] HasFortressInRange: 当前英雄无效、已阵亡或位置未知');
      return false;
    }

    // 获取团队黑板中的集火目标
    const focusTarget = teamBlackboard.getFocusTarget();
    if (!focusTarget) {
      log('[英雄条件] HasFortressInRange: 没有集火目标');
      return false;
    }

    // 检查集火目标是否是城寨
    if (focusTarget.targetType !== 'city' || !focusTarget.cityTarget) {
      log('[英雄条件] HasFortressInRange: 集火目标不是城寨');
      return false;
    }

    const targetCity = focusTarget.cityTarget;
    if (!targetCity.position) {
      log('[英雄条件] HasFortressInRange: 目标城寨位置未知');
      return false;
    }

    // 获取英雄的攻击范围（默认为3）
    const attackRange = 3;

    // 使用切比雪夫距离计算（允许对角线移动）
    const distance = calculateDistance(currentHero.position.x, currentHero.position.y, targetCity.position.x, targetCity.position.y);

    const isInRange = distance <= attackRange;
    
    if (isInRange) {
      log(`[英雄条件] HasFortressInRange: 英雄${currentHero.roleId}攻击范围内有目标城寨${targetCity.cityType}，距离=${distance}`);
    } else {
      log(`[英雄条件] HasFortressInRange: 英雄${currentHero.roleId}攻击范围内没有目标城寨，距离=${distance}，攻击范围=${attackRange}`);
    }

    return isInRange;

  } catch (error) {
    log(`[英雄条件] HasFortressInRange 执行失败: ${error}`);
    return false;
  }
}