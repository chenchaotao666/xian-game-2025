import { ActionContext } from '../core/types';

/**
 * 攻击敌方检查条件
 * 检查是否应该攻击敌方：有优势、能获得粮草奖励
 */
export function shouldAttackEnemy(context: ActionContext): boolean {
  const { agent, gameMap } = context;
  
  // 检查是否有可见的敌方武将
  if (agent.visibleEnemies.length === 0) {
    return false;
  }
  
  // 寻找血量较低或孤立的敌方目标
  const vulnerableEnemies = agent.visibleEnemies.filter(enemy => {
    // 敌人血量低于70%
    const maxHealth = 100;
    const isEnemyWeakened = enemy.health < (maxHealth * 0.7);
    
    // 检查敌人是否孤立（附近没有友军）
    const enemyAllies = agent.visibleEnemies.filter(otherEnemy => 
      otherEnemy.id !== enemy.id && 
      agent.getDistanceToAgent(gameMap, enemy) <= 3
    );
    const isEnemyIsolated = enemyAllies.length === 0;
    
    return isEnemyWeakened || isEnemyIsolated;
  });
  
  // 检查自身状态是否适合攻击
  const maxHealth = 100;
  const maxMana = 100;
  const healthThreshold = 0.6;
  const manaThreshold = 0.4;
  
  const hasSufficientHealth = agent.health >= (maxHealth * healthThreshold);
  const hasSufficientMana = agent.mana >= (maxMana * manaThreshold);
  
  return vulnerableEnemies.length > 0 && hasSufficientHealth && hasSufficientMana;
} 