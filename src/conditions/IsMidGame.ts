import { ActionContext } from '../core/types';

/**
 * 中期游戏检查条件
 * 检查是否为中期游戏阶段（通常在30-100回合之间）
 */
export function isMidGame(context: ActionContext): boolean {
  const { agent } = context;
  
  // 定义中期游戏的回合范围
  const midGameStartTurn = 30;
  const midGameEndTurn = 100;
  
  return agent.currentTurn >= midGameStartTurn && agent.currentTurn < midGameEndTurn;
} 