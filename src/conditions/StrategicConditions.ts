import { ActionContext } from '../core/types';

/**
 * 战略决策相关条件
 * ================
 * 
 * 包含兵力、阵型、资源等战略层面的条件判断
 */

/**
 * 检查是否需要更多士兵
 * 根据统帅值和当前兵力判断
 */
export function needMoreTroops(context: ActionContext): boolean {
  const { agent } = context;
  
  // 检查当前兵力是否达到统帅上限
  const troops = (agent as any).troops;
  const generalStats = (agent as any).generalStats;
  
  if (!troops || !generalStats) {
    return true; // 没有兵力信息时默认需要
  }
  
  const currentTroops = troops.length;
  const maxTroops = generalStats.leadership; // 统帅值决定带兵上限
  
  // 如果当前兵力少于统帅上限的80%，则需要补充
  return currentTroops < maxTroops * 0.8;
}

/**
 * 检查是否应该切换阵型
 * 根据当前局势和兵力数量判断
 */
export function shouldChangeFormation(context: ActionContext): boolean {
  const { agent } = context;
  
  // 检查是否有足够的士气和粮草切换阵型
  const morale = (agent as any).morale || 0;
  const food = (agent as any).food || 0;
  
  if (morale < 50 || food < 100) {
    return false;
  }
  
  // 检查当前兵力数量是否适合使用阵型
  const troops = (agent as any).troops;
  const currentTroops = troops?.length || 0;
  if (currentTroops < 5) {
    return false; // 兵力太少不值得用阵型
  }
  
  // 简化判断：如果即将进行大规模战斗或占领据点，考虑切换阵型
  const nearbyEnemies = agent.visibleEnemies?.filter(enemy => 
    agent.getDistanceToAgent(context.gameMap, enemy) <= 5
  ) || [];
  
  // 如果附近敌人较多，考虑切换到防御阵型
  if (nearbyEnemies.length >= 2) {
    return (agent as any).currentFormation !== 'defensive';
  }
  
  // 如果准备攻击，考虑切换到攻击阵型
  if (nearbyEnemies.length === 1) {
    return (agent as any).currentFormation !== 'offensive';
  }
  
  return false;
}

/**
 * 检查是否有足够粮草
 * 用于各种需要消耗粮草的行为
 */
export function hasEnoughFood(context: ActionContext, required: number = 100): boolean {
  const { agent } = context;
  const food = (agent as any).food || 0;
  return food >= required;
}

/**
 * 检查是否应该优先发育
 * 根据当前实力和敌我对比判断
 */
export function shouldPrioritizeDevelopment(context: ActionContext): boolean {
  const { agent } = context;
  
  const food = (agent as any).food || 0;
  const troops = (agent as any).troops;
  const maxHealth = (agent as any).maxHealth || 100;
  
  // 如果粮草不足，优先发育获取资源
  if (food < 200) {
    return true;
  }
  
  // 如果兵力不足，优先发育
  const currentTroops = troops?.length || 0;
  if (currentTroops < 8) {
    return true;
  }
  
  // 如果血量过低，优先发育恢复
  if (agent.health < maxHealth * 0.6) {
    return true;
  }
  
  return false;
} 