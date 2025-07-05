import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';

/**
 * 从上下文获取TeamBlackboard实例
 * 通用工具函数，避免在多个条件文件中重复定义
 * 
 * @param context 行为树上下文
 * @returns TeamBlackboard实例，如果无法获取则返回null
 */
export function getTeamBlackboard(context: ActionContext): TeamBlackboard | null {
  if (context.teamBlackboard) {
    return context.teamBlackboard as TeamBlackboard;
  }
  
  if (context.agent && (context.agent as any).teamBlackboard) {
    return (context.agent as any).teamBlackboard as TeamBlackboard;
  }
  
  if (!context.agent && context.teamBlackboard) {
    const tb = context.teamBlackboard as TeamBlackboard;
    if (tb.warrior || tb.support || tb.leader) {
      return tb;
    }
  }
  
  return null;
} 