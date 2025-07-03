import { ActionContext } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 危险状态检查条件
 * 检查武将是否处于危险状态：血量低、被多方围攻等
 */
export function isInDanger(context: ActionContext): boolean {
  const { agent, gameMap } = context;
  
  // 检查血量是否过低（低于50%）
  const maxHealth = 100; // 假设最大血量为100
  const healthThreshold = 0.5;
  const isLowHealth = agent.health < (maxHealth * healthThreshold);
  
  // 检查是否被多个敌人包围
  const nearbyEnemies = agent.visibleEnemies.filter(enemy => 
    agent.getDistanceToAgent(gameMap, enemy) <= 2
  );
  const isSurrounded = nearbyEnemies.length >= 2;
  
  // 检查是否孤立无援（附近没有友军）
  const nearbyAllies = agent.visibleAllies.filter(ally => 
    agent.getDistanceToAgent(gameMap, ally) <= 3
  );
  const isIsolated = nearbyAllies.length === 0;
  
  // 综合判断：血量低且（被围攻或孤立）
  return isLowHealth && (isSurrounded || isIsolated);
} 