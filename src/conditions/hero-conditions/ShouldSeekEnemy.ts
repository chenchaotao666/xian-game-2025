import { ActionContext } from '../../core/types';
import { TeamBlackboard } from '../../core/TeamBlackboard';
import { StrategyType } from '../../core/StrategyAnalysis';
import { getTeamBlackboard } from '../utils';

/**
 * 检查是否应该寻找敌人
 * =========================
 * 
 * 主要判断全局策略是否为集火攻击或攻击敌方
 * 当策略为这两种时，英雄应该主动寻找并攻击敌人
 * 
 * @param context 行为树上下文
 * @returns 是否应该寻找敌人
 */
export function ShouldSeekEnemy(context: ActionContext): boolean {
  try {
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      console.log('[寻敌检查] 无法获取团队黑板，不寻找敌人');
      return false;
    }

    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      console.log('[寻敌检查] 游戏状态无效，不寻找敌人');
      return false;
    }

    // 检查当前全局策略是否为集火攻击或攻击敌方
    const shouldSeekEnemy = checkShouldSeekEnemyStrategy(teamBlackboard);

    if (!shouldSeekEnemy) {
      console.log('[寻敌检查] 当前策略不需要主动寻找敌人');
      return false;
    }

    console.log('[寻敌检查] 当前策略需要主动寻找敌人');
    return true;

  } catch (error) {
    console.error(`[寻敌检查] 检查寻敌需求时发生错误: ${error}`);
    return false;
  }
}

/**
 * 检查当前全局策略是否需要寻找敌人
 * 包括集火攻击和攻击敌方两种策略
 */
function checkShouldSeekEnemyStrategy(teamBlackboard: TeamBlackboard): boolean {
  const currentStrategy = teamBlackboard.getCurrentStrategy();
  
  return currentStrategy === StrategyType.FOCUS_FIRE || 
         currentStrategy === StrategyType.ATTACK_ENEMY;
}