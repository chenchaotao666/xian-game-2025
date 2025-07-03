import { ActionContext, Position } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 敌方占领龙旗检查条件
 * 检查敌方是否正在占领龙旗据点
 */
export function enemyCapturingFlag(context: ActionContext): boolean {
  const { agent, gameMap } = context;
  
  // 假设龙旗据点位置
  const dragonFlagPosition: Position = { 
    x: Math.floor(gameMap.width / 2), 
    y: Math.floor(gameMap.height / 2) 
  };
  
  // 检查是否有敌方武将在龙旗据点附近（距离2格内）
  const enemiesNearFlag = agent.visibleEnemies.filter(enemy => {
    const distanceToFlag = Math.abs(enemy.position.x - dragonFlagPosition.x) + 
                          Math.abs(enemy.position.y - dragonFlagPosition.y);
    return distanceToFlag <= 2;
  });
  
  // 如果有敌人在龙旗附近，且敌人血量和法力都比较充足，则认为正在占领
  const isEnemyCapturing = enemiesNearFlag.some(enemy => {
    const maxHealth = 100;
    const maxMana = 100;
    return enemy.health >= (maxHealth * 0.5) && enemy.mana >= (maxMana * 0.3);
  });
  
  return isEnemyCapturing;
} 