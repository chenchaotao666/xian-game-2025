import { ActionContext } from '../core/types';

/**
 * 早期游戏检查条件
 * 检查是否为早期游戏阶段（通常在前30回合）
 */
export function isEarlyGame(context: ActionContext): boolean {
  const { agent } = context;
  
  // 定义早期游戏的回合数上限
  const earlyGameEndTurn = 30;
  
  return agent.currentTurn < earlyGameEndTurn;
} 