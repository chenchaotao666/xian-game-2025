import { ActionContext } from '../core/types';

/**
 * 早期游戏检查条件
 * 检查是否为早期游戏阶段（龙旗据点开放前，即前100回合）
 */
export function isEarlyGame(context: ActionContext): boolean {
  const { agent } = context;
  
  // 根据游戏规则：龙旗据点在100回合后开放，所以早期游戏是0-99回合
  const earlyGameEndTurn = 100;
  
  return agent.currentTurn < earlyGameEndTurn;
} 