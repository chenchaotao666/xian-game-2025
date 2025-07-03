import { ActionContext, Position } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 准备占领检查条件
 * 检查是否应该准备占领龙旗据点：兵力接近足够、粮草充足
 */
export function shouldPrepareForCapture(context: ActionContext): boolean {
  const { agent, gameMap } = context;
  
  // 假设龙旗据点位置
  const dragonFlagPosition: Position = { 
    x: Math.floor(gameMap.width / 2), 
    y: Math.floor(gameMap.height / 2) 
  };
  
  // 检查是否在龙旗据点中等距离内（距离5-8格）
  const distanceToFlag = Math.abs(agent.position.x - dragonFlagPosition.x) + 
                        Math.abs(agent.position.y - dragonFlagPosition.y);
  const isInPreparationRange = distanceToFlag >= 5 && distanceToFlag <= 8;
  
  // 检查血量是否在准备阶段的合理范围（至少60%）
  const maxHealth = 100;
  const healthThreshold = 0.6;
  const hasReasonableHealth = agent.health >= (maxHealth * healthThreshold);
  
  // 检查法力值是否在准备阶段的合理范围（至少40%）
  const maxMana = 100;
  const manaThreshold = 0.4;
  const hasReasonableMana = agent.mana >= (maxMana * manaThreshold);
  
  // 检查友军支援情况（附近有友军更好）
  const nearbyAllies = agent.visibleAllies.filter(ally => 
    agent.getDistanceToAgent(gameMap, ally) <= 6
  );
  const hasAlliesSupport = nearbyAllies.length >= 1;
  
  return isInPreparationRange && hasReasonableHealth && hasReasonableMana && hasAlliesSupport;
} 