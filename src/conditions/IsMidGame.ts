import { ActionContext } from '../core/types';

/**
 * 中期游戏检查条件
 * 检查是否为中期游戏阶段（通常在30-100回合之间）
 */
export function isMidGame(context: ActionContext): boolean {
  const { agent } = context;

  const midGameEndTurn = 100;

  return agent.currentTurn < midGameEndTurn;
} 