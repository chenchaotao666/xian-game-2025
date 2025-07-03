import { ActionContext } from '../core/types';

/**
 * 龙旗据点开放检查条件
 * 检查龙旗据点是否已开放（通常在游戏100回合后开放）
 */
export function isDragonFlagOpen(context: ActionContext): boolean {
  const { agent } = context;
  
  // 龙旗据点通常在100回合后开放
  const dragonFlagOpenTurn = 100;
  
  return agent.currentTurn >= dragonFlagOpenTurn;
} 