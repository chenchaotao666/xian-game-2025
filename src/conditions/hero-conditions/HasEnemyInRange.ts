import { ActionContext } from '../../core/types';
import { TeamBlackboard } from '../../core/TeamBlackboard';
import { StrategyType } from '../../core/StrategyAnalysis';
import { getTeamBlackboard } from '../utils';

/**
 * 检查当前英雄攻击范围内是否有敌方英雄
 * =========================
 * 
 * 从ActionContext的agent获取当前英雄，判断如果全局策略是FOCUS_FIRE，
 * 查看集火的目标英雄是否在本英雄的攻击范围内。如果在，返回true。
 * 
 * @param context 行为树上下文
 * @returns 集火目标是否在当前英雄攻击范围内
 */
export function HasEnemyInRange(context: ActionContext): boolean {
  try {
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      console.log('[攻击范围检查] 无法获取团队黑板');
      return false;
    }

    // 从agent获取当前英雄
    if (!context.agent) {
      console.log('[攻击范围检查] context中无agent');
      return false;
    }

    const currentHero = teamBlackboard.getHeroById(context.agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      console.log('[攻击范围检查] 当前英雄无效、已阵亡或位置未知');
      return false;
    }

    // 检查全局策略是否为集火攻击
    const currentStrategy = teamBlackboard.getCurrentStrategy();
    if (currentStrategy !== StrategyType.FOCUS_FIRE) {
      console.log('[攻击范围检查] 当前策略不是集火攻击，无需检查攻击范围');
      return false;
    }

    // 获取集火目标
    const focusTarget = teamBlackboard.getFocusTarget();
    if (!focusTarget || !focusTarget.targetId) {
      console.log('[攻击范围检查] 没有集火目标');
      return false;
    }

    // 获取集火目标英雄的信息
    const targetHero = teamBlackboard.getHeroById(focusTarget.targetId);
    if (!targetHero || !targetHero.isAlive || !targetHero.position) {
      console.log('[攻击范围检查] 集火目标英雄无效、已阵亡或位置未知');
      return false;
    }

    // 检查集火目标是否在当前英雄的攻击范围内
    const isTargetInRange = checkTargetInAttackRange(currentHero, targetHero);

    if (isTargetInRange) {
      console.log(`[攻击范围检查] 英雄${currentHero.roleId}可以攻击集火目标${targetHero.roleId}`);
    } else {
      console.log(`[攻击范围检查] 英雄${currentHero.roleId}无法攻击集火目标${targetHero.roleId}，距离过远`);
    }

    return isTargetInRange;

  } catch (error) {
    console.error(`[攻击范围检查] 检查攻击范围时发生错误: ${error}`);
    return false;
  }
}

/**
 * 检查目标英雄是否在当前英雄的攻击范围内
 * @param currentHero 当前英雄
 * @param targetHero 目标英雄
 * @returns 目标英雄是否在攻击范围内
 */
function checkTargetInAttackRange(currentHero: any, targetHero: any): boolean {
  if (!currentHero.position || !targetHero.position) return false;

  // 获取英雄的攻击范围（默认为3）
  const attackRange = getHeroAttackRange(currentHero);

  // 使用切比雪夫距离计算（允许对角线移动）
  const distance = Math.max(
    Math.abs(currentHero.position.x - targetHero.position.x),
    Math.abs(currentHero.position.y - targetHero.position.y)
  );

  return distance <= attackRange;
}

/**
 * 获取英雄的攻击范围
 * @param hero 英雄对象
 * @returns 攻击范围
 */
function getHeroAttackRange(hero: any): number {
  // 如果英雄对象中有攻击范围属性，使用该值
  if (hero.attackRange !== undefined) {
    return hero.attackRange;
  }

  // 根据英雄类型或ID推断攻击范围
  // 根据代码分析，所有英雄的攻击范围都是3
  return 3;
}
