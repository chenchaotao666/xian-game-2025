import { ActionContext, Position } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 龙旗占领能力检查条件
 * 检查是否有能力占领龙旗据点：兵力充足、位置合适
 */
export function canCaptureDragonFlag(context: ActionContext): boolean {
  const { agent, gameMap } = context;
  
  // 假设龙旗据点位置（通常在地图中央）
  const dragonFlagPosition: Position = { 
    x: Math.floor(gameMap.width / 2), 
    y: Math.floor(gameMap.height / 2) 
  };
  
  // 检查是否在龙旗据点附近（距离3格内）
  const distanceToFlag = Math.abs(agent.position.x - dragonFlagPosition.x) + 
                        Math.abs(agent.position.y - dragonFlagPosition.y);
  const isNearFlag = distanceToFlag <= 3;
  
  // 检查血量是否充足（至少70%）
  const maxHealth = 100;
  const healthThreshold = 0.7;
  const hasEnoughHealth = agent.health >= (maxHealth * healthThreshold);
  
  // 检查法力值是否充足（至少50%）
  const maxMana = 100;
  const manaThreshold = 0.5;
  const hasEnoughMana = agent.mana >= (maxMana * manaThreshold);
  
  // 检查附近敌人数量（敌人不能太多）
  const nearbyEnemies = agent.visibleEnemies.filter(enemy => 
    agent.getDistanceToAgent(gameMap, enemy) <= 4
  );
  const notTooManyEnemies = nearbyEnemies.length <= 2;
  
  return isNearFlag && hasEnoughHealth && hasEnoughMana && notTooManyEnemies;
} 