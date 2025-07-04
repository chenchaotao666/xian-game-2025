import { State } from 'mistreevous';
import { ActionContext } from '../core/types';

/**
 * 战略动作
 * ========
 * 
 * 包含士兵生产、阵型切换、城寨攻击等战略层面的动作
 */

/**
 * 执行士兵生产
 * 根据统帅值和当前需求生产士兵
 */
export function executeProduceTroops(context: ActionContext): State {
  const { agent } = context;
  
  try {
    const food = (agent as any).food || 0;
    const troops = (agent as any).troops || [];
    const generalStats = (agent as any).generalStats;
    
    // 检查是否有足够粮草（每名士兵20粮草）
    if (food < 20) {
      agent.log('粮草不足，无法生产士兵');
      return State.FAILED;
    }
    
    // 检查是否还能容纳更多士兵
    if (!generalStats || troops.length >= generalStats.leadership) {
      agent.log('已达到统帅上限，无法生产更多士兵');
      return State.FAILED;
    }
    
    // 决定生产什么类型的士兵
    const troopType = decideTroopType(context);
    
    // 计算要生产的数量（不超过统帅上限和粮草限制）
    const maxByLeadership = generalStats.leadership - troops.length;
    const maxByFood = Math.floor(food / 20);
    const maxToProduce = Math.min(maxByLeadership, maxByFood, 3); // 一次最多生产3个
    
    if (maxToProduce <= 0) {
      return State.FAILED;
    }
    
    // 发送生产指令
    const troopNumbers = decideTroopNumbers(context, maxToProduce, troopType);
    (agent as any).sendCommand(`MAKE ${troopNumbers.archers} ${troopNumbers.shields}`);
    agent.log(`生产士兵: ${troopNumbers.archers}弓兵 ${troopNumbers.shields}盾兵`);
    
    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`士兵生产失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行阵型切换
 * 根据当前战况切换到合适的阵型
 */
export function executeFormationChange(context: ActionContext): State {
  const { agent } = context;
  
  try {
    const morale = (agent as any).morale || 0;
    const food = (agent as any).food || 0;
    
    // 检查是否有足够资源切换阵型
    if (morale < 50 || food < 100) {
      agent.log('士气或粮草不足，无法切换阵型');
      return State.FAILED;
    }
    
    // 决定切换到什么阵型
    const newFormation = decideFormation(context);
    if (!newFormation) {
      return State.FAILED;
    }
    
    // 发送阵型切换指令
    (agent as any).sendCommand(`FORM ${newFormation}`);
    agent.log(`切换阵型: ${newFormation}`);
    
    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`阵型切换失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行攻打城寨
 * 攻打附近的城寨获取粮草
 */
export function executeAttackFortress(context: ActionContext): State {
  const { agent, gameMap } = context;
  
  try {
    // 找到最近的可攻打城寨
    const targetFortress = findNearestFortress(context);
    if (!targetFortress) {
      agent.log('附近没有可攻打的城寨');
      return State.FAILED;
    }
    
    // 检查距离是否在攻击范围内
    const distance = agent.getDistanceToAgent(gameMap, { position: targetFortress });
    if (distance > 5) { // 假设最大攻击距离是5
      agent.log('目标城寨距离过远');
      return State.FAILED;
    }
    
    // 发送攻击城寨指令
    (agent as any).sendCommand(`SG ${targetFortress.x} ${targetFortress.y}`);
    agent.log(`攻击城寨: (${targetFortress.x}, ${targetFortress.y})`);
    
    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`攻击城寨失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行空闲/发育动作
 * 当没有明确目标时的默认行为
 */
export function executeIdle(context: ActionContext): State {
  const { agent } = context;
  
  try {
    // 执行一些基础的发育行为
    // 例如：移动到安全位置、寻找资源等
    
    // 简化处理：记录日志
    agent.log('执行发育行为：待机观察局势');
    
    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`发育行为失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行发育策略
 * 综合的发育行为，包括生产、移动等
 */
export function executeDevelopment(context: ActionContext): State {
  const { agent } = context;
  
  try {
    // 优先检查是否需要生产士兵
    const needTroops = needMoreTroops(context);
    if (needTroops) {
      const result = executeProduceTroops(context);
      if (result === State.SUCCEEDED) {
        return State.SUCCEEDED;
      }
    }
    
    // 检查是否需要寻找资源
    const food = (agent as any).food || 0;
    if (food < 300) {
      // 寻找并移动到最近的资源点
      const resourcePosition = findNearestResource(context);
      if (resourcePosition) {
        agent.log(`移动到资源点: (${resourcePosition.x}, ${resourcePosition.y})`);
        return State.SUCCEEDED;
      }
    }
    
    // 默认发育行为
    return executeIdle(context);
  } catch (error) {
    agent.log(`发育策略失败: ${error}`);
    return State.FAILED;
  }
}

// ============== 辅助函数 ==============

/**
 * 决定要生产的士兵类型
 */
function decideTroopType(context: ActionContext): 'balanced' | 'archer' | 'shield' {
  const { agent } = context;
  
  // 根据当前局势决定士兵配比
  const nearbyEnemies = agent.visibleEnemies?.length || 0;
  
  if (nearbyEnemies >= 2) {
    // 敌人较多时优先生产盾兵
    return 'shield';
  } else if (nearbyEnemies === 1) {
    // 有单个敌人时优先生产弓兵
    return 'archer';
  } else {
    // 安全时平衡生产
    return 'balanced';
  }
}

/**
 * 决定具体的士兵数量分配
 * 优先为warrior配兵4弓兵2盾兵
 */
function decideTroopNumbers(context: ActionContext, maxTotal: number, type: string): { archers: number; shields: number } {
  const { agent } = context;
  const generalType = (agent as any).generalType || 'balanced';
  
  // 如果是warrior类型，优先配置4弓兵2盾兵
  if (generalType === 'warrior') {
    const targetArchers = 4;
    const targetShields = 2;
    const totalTarget = targetArchers + targetShields;
    
    if (maxTotal >= totalTarget) {
      // 可以配置完整的4弓兵2盾兵
      return { archers: targetArchers, shields: targetShields };
    } else {
      // 空位不足时，按4:2比例分配
      const archersRatio = 4 / 6; // 4/6 = 2/3
      const archers = Math.round(maxTotal * archersRatio);
      const shields = maxTotal - archers;
      return { archers, shields };
    }
  }
  
  // 其他类型武将的配兵逻辑
  switch (type) {
    case 'archer':
      return { archers: maxTotal, shields: 0 };
    case 'shield':
      return { archers: 0, shields: maxTotal };
    case 'balanced':
    default:
      const archers = Math.ceil(maxTotal / 2);
      const shields = maxTotal - archers;
      return { archers, shields };
  }
}

/**
 * 决定要切换的阵型
 */
function decideFormation(context: ActionContext): string | null {
  const { agent } = context;
  
  const nearbyEnemies = agent.visibleEnemies?.filter(enemy => 
    agent.getDistanceToAgent(context.gameMap, enemy) <= 5
  ) || [];
  
  if (nearbyEnemies.length >= 2) {
    // 多个敌人时切换到防御阵型
    return '八卦阵';
  } else if (nearbyEnemies.length === 1) {
    // 单个敌人时切换到攻击阵型
    return '鹤翼阵';
  }
  
  return null;
}

/**
 * 找到最近的城寨
 */
function findNearestFortress(context: ActionContext): { x: number; y: number } | null {
  const { agent, gameMap } = context;
  
  // 这里需要根据实际的地图数据来查找城寨
  // 简化处理：假设有一些固定的城寨位置
  const fortresses = [
    { x: 20, y: 20 },
    { x: 60, y: 40 },
    { x: 40, y: 10 }
  ];
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const fortress of fortresses) {
    const distance = Math.max(
      Math.abs(agent.position.x - fortress.x),
      Math.abs(agent.position.y - fortress.y)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = fortress;
    }
  }
  
  return nearest;
}

/**
 * 找到最近的资源点
 */
function findNearestResource(context: ActionContext): { x: number; y: number } | null {
  // 简化处理：资源点就是城寨位置
  return findNearestFortress(context);
}

/**
 * 检查是否需要更多士兵
 */
function needMoreTroops(context: ActionContext): boolean {
  const { agent } = context;
  const troops = (agent as any).troops;
  const generalStats = (agent as any).generalStats;
  
  if (!troops || !generalStats) {
    return true;
  }
  
  const currentTroops = troops.length;
  const maxTroops = generalStats.leadership;
  
  return currentTroops < maxTroops * 0.8;
} 