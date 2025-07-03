import { ActionContext } from '../core/types';

/**
 * 攻打城寨检查条件
 * 检查是否应该攻打城寨：需要粮草、有能力攻破
 */
export function shouldAttackFortress(context: ActionContext): boolean {
  const { agent, gameMap } = context;
  
  // 检查自身血量和法力是否充足攻打城寨
  const maxHealth = 100;
  const maxMana = 100;
  const healthThreshold = 0.7; // 攻打城寨需要更高血量
  const manaThreshold = 0.6;   // 攻打城寨需要更多法力
  
  const hasSufficientHealth = agent.health >= (maxHealth * healthThreshold);
  const hasSufficientMana = agent.mana >= (maxMana * manaThreshold);
  
  // 检查附近是否有城寨可以攻打（简化处理，假设有城寨位置信息）
  // 在实际实现中，这里应该检查地图上的城寨位置
  const hasNearbyFortress = true; // 简化假设
  
  // 检查是否真的需要粮草（可以通过某种资源系统来判断）
  // 这里简化处理，假设中期总是需要更多资源
  const needsResources = agent.currentTurn >= 20;
  
  // 检查周围敌人情况，确保攻打城寨时相对安全
  const nearbyEnemies = agent.visibleEnemies.filter(enemy => 
    agent.getDistanceToAgent(gameMap, enemy) <= 4
  );
  const isSafeToAttackFortress = nearbyEnemies.length <= 1;
  
  return hasSufficientHealth && hasSufficientMana && hasNearbyFortress && 
         needsResources && isSafeToAttackFortress;
} 