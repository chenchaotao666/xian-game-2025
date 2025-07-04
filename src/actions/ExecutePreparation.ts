import { ActionContext, IAgent, Position } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 准备动作
 * 执行准备策略：移动到龙旗附近、集结兵力、等待时机
 */
export function ExecutePreparation(context: ActionContext): void {
  const { agent, gameMap } = context;

  // 需要基本的移动能力
  if (agent.movementRange <= 0) {
    agent.performIdle();
    agent.log(`段颖无法移动，原地待命`);
    return;
  }
  
  // 龙旗据点位置
  const dragonFlagPosition: Position = { 
    x: Math.floor(gameMap.width / 2), 
    y: Math.floor(gameMap.height / 2) 
  };

  const distanceToFlag = Math.abs(agent.position.x - dragonFlagPosition.x) + 
                        Math.abs(agent.position.y - dragonFlagPosition.y);

  // 如果距离龙旗太远，先靠近
  if (distanceToFlag > 8) {
    moveCloserToFlag(context, dragonFlagPosition);
  }
  // 如果距离合适（5-8格），执行准备行为
  else if (distanceToFlag >= 5 && distanceToFlag <= 8) {
    performPreparation(context);
  }
  // 如果距离太近，稍微后退到合适距离
  else {
    moveToOptimalDistance(context, dragonFlagPosition);
  }
}

/**
 * 向龙旗据点靠近
 */
function moveCloserToFlag(context: ActionContext, flagPosition: Position): void {
  const { agent, gameMap } = context;
  
  const bestPosition = findBestMoveTowardsFlag(context, flagPosition);
  
  if (bestPosition) {
    agent.performMove(context, bestPosition);
    agent.log(`段颖向龙旗据点靠近，移动到 (${bestPosition.x}, ${bestPosition.y})`);
  } else {
    agent.performIdle();
    agent.log(`段颖无法向龙旗据点靠近，原地待命`);
  }
}

/**
 * 执行准备行为
 */
function performPreparation(context: ActionContext): void {
  const { agent } = context;
  
  // 优先使用恢复类技能
  if (agent.health < 80 && agent.isSkillReady('heal_skill')) {
    agent.performSelfSkill('heal_skill');
    agent.log(`段颖使用治疗技能，恢复血量准备占领`);
    return;
  }

  // 检查是否有buff技能可以使用
  if (agent.isSkillReady('strength_buff')) {
    agent.performSelfSkill('strength_buff');
    agent.log(`段颖使用力量增强技能，提升战斗力`);
    return;
  }

  // 观察敌人动向，如果有敌人靠近龙旗，进行骚扰
  const enemiesNearFlag = findEnemiesNearFlag(context);
  if (enemiesNearFlag.length > 0) {
    const target = enemiesNearFlag[0];
    if (agent.getDistanceToAgent(context.gameMap, target) <= 3) {
      // 使用远程技能骚扰
      if (agent.isSkillReady('ranged_attack')) {
        agent.performSkillOnTarget('ranged_attack', target);
        agent.log(`段颖使用远程攻击骚扰接近龙旗的敌人 ${target.id}`);
        return;
      } else {
        agent.performAttack(target);
        agent.log(`段颖攻击接近龙旗的敌人 ${target.id}`);
        return;
      }
    }
  }

  // 没有特殊情况，原地等待
  agent.performIdle();
  agent.log(`段颖在龙旗附近待命，等待最佳占领时机`);
}

/**
 * 移动到最佳距离
 */
function moveToOptimalDistance(context: ActionContext, flagPosition: Position): void {
  const { agent, gameMap } = context;
  
  // 寻找距离龙旗5-8格的最佳位置
  const optimalPosition = findOptimalWaitingPosition(context, flagPosition);
  
  if (optimalPosition) {
    agent.performMove(context, optimalPosition);
    agent.log(`段颖调整到最佳准备位置 (${optimalPosition.x}, ${optimalPosition.y})`);
  } else {
    agent.performIdle();
    agent.log(`段颖保持当前位置继续准备`);
  }
}

/**
 * 寻找向龙旗移动的最佳位置
 */
function findBestMoveTowardsFlag(context: ActionContext, flagPosition: Position): Position | null {
  const { agent, gameMap } = context;
  const availablePositions = agent.getReachableMovePositions(gameMap);
  
  if (availablePositions.length === 0) {
    return null;
  }

  // 选择距离龙旗最近的安全位置
  let bestPosition = availablePositions[0];
  let bestScore = calculatePositionScore(context, bestPosition, flagPosition, true);

  for (const position of availablePositions) {
    const score = calculatePositionScore(context, position, flagPosition, true);
    if (score > bestScore) {
      bestScore = score;
      bestPosition = position;
    }
  }

  return bestPosition;
}

/**
 * 寻找最佳等待位置
 */
function findOptimalWaitingPosition(context: ActionContext, flagPosition: Position): Position | null {
  const { agent, gameMap } = context;
  const availablePositions = agent.getReachableMovePositions(gameMap);
  
  if (availablePositions.length === 0) {
    return null;
  }

  // 筛选出距离龙旗5-8格的位置
  const optimalDistancePositions = availablePositions.filter(pos => {
    const distance = Math.abs(pos.x - flagPosition.x) + Math.abs(pos.y - flagPosition.y);
    return distance >= 5 && distance <= 8;
  });

  if (optimalDistancePositions.length === 0) {
    return null;
  }

  // 在合适距离的位置中选择最安全的
  let bestPosition = optimalDistancePositions[0];
  let bestScore = calculatePositionScore(context, bestPosition, flagPosition, false);

  for (const position of optimalDistancePositions) {
    const score = calculatePositionScore(context, position, flagPosition, false);
    if (score > bestScore) {
      bestScore = score;
      bestPosition = position;
    }
  }

  return bestPosition;
}

/**
 * 计算位置分数
 */
function calculatePositionScore(context: ActionContext, position: Position, flagPosition: Position, preferCloser: boolean): number {
  const { agent } = context;
  let score = 0;

  const distanceToFlag = Math.abs(position.x - flagPosition.x) + Math.abs(position.y - flagPosition.y);
  
  if (preferCloser) {
    // 越接近龙旗越好
    score += Math.max(0, 100 - distanceToFlag * 5);
  } else {
    // 在5-8格距离内，距离适中最好
    if (distanceToFlag >= 5 && distanceToFlag <= 8) {
      score += 100;
    }
  }

  // 远离敌人更安全
  for (const enemy of agent.visibleEnemies) {
    const distanceToEnemy = Math.abs(position.x - enemy.position.x) + Math.abs(position.y - enemy.position.y);
    score += distanceToEnemy * 3;
  }

  // 靠近友军更好
  for (const ally of agent.visibleAllies) {
    const distanceToAlly = Math.abs(position.x - ally.position.x) + Math.abs(position.y - ally.position.y);
    score += Math.max(0, 30 - distanceToAlly * 2);
  }

  return score;
}

/**
 * 寻找龙旗附近的敌人
 */
function findEnemiesNearFlag(context: ActionContext): IAgent[] {
  const { agent, gameMap } = context;
  
  const dragonFlagPosition: Position = { 
    x: Math.floor(gameMap.width / 2), 
    y: Math.floor(gameMap.height / 2) 
  };

  return agent.visibleEnemies.filter(enemy => {
    const distanceToFlag = Math.abs(enemy.position.x - dragonFlagPosition.x) + 
                          Math.abs(enemy.position.y - dragonFlagPosition.y);
    return distanceToFlag <= 4;
  });
} 