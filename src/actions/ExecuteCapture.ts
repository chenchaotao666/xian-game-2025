import { ActionContext, IAgent, Position } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 占领动作
 * 执行占领策略：集结兵力、占领龙旗据点
 */
export function ExecuteCapture(context: ActionContext): void {
  const { agent, gameMap } = context;

  // 需要有足够的血量和法力值
  const maxHealth = 100;
  const maxMana = 100;
  const minHealthForCapture = maxHealth * 0.6;
  const minManaForCapture = maxMana * 0.4;

  if (agent.health < minHealthForCapture || agent.mana < minManaForCapture) {
    agent.performIdle();
    agent.log(`段颖状态不足，无法执行占领任务`);
    return;
  }

  // 龙旗据点位置（通常在地图中央）
  const dragonFlagPosition: Position = {
    x: Math.floor(gameMap.width / 2),
    y: Math.floor(gameMap.height / 2)
  };

  const distanceToFlag = Math.abs(agent.position.x - dragonFlagPosition.x) +
    Math.abs(agent.position.y - dragonFlagPosition.y);

  if (distanceToFlag <= 1) {
    // 已经在龙旗据点，执行占领行为
    performCapture(context, dragonFlagPosition);
  } else {
    // 移动向龙旗据点
    moveTowardsDragonFlag(context, dragonFlagPosition);
  }
}

/**
 * 执行实际的占领行为
 */
function performCapture(context: ActionContext, flagPosition: Position): void {
  const { agent } = context;

  // 检查是否有技能可以用于占领
  if (agent.isSkillReady('capture_skill')) {
    // 使用占领技能
    agent.performSelfSkill('capture_skill');
    agent.log(`段颖使用占领技能，开始占领龙旗据点！`);
  } else {
    // 没有技能就原地等待，保持占领状态
    agent.performIdle();
    agent.log(`段颖在龙旗据点等待，保持占领状态`);
  }

  // 如果附近有敌人威胁，优先处理威胁
  const nearbyEnemies = agent.visibleEnemies.filter(enemy =>
    agent.getDistanceToAgent(context.gameMap, enemy) <= 3
  );

  if (nearbyEnemies.length > 0) {
    const closestEnemy = findClosestEnemy(context, nearbyEnemies);
    if (closestEnemy && agent.getDistanceToAgent(context.gameMap, closestEnemy) <= 2) {
      // 攻击最近的敌人
      agent.performAttack(closestEnemy);
      agent.log(`段颖在占领过程中攻击威胁敌人 ${closestEnemy.id}`);
    }
  }
}

/**
 * 向龙旗据点移动
 */
function moveTowardsDragonFlag(context: ActionContext, flagPosition: Position): void {
  const { agent, gameMap } = context;

  // 寻找最优路径向龙旗移动
  const bestMovePosition = findBestMoveTowardsFlag(context, flagPosition);

  if (bestMovePosition) {
    agent.performMove(context, bestMovePosition);
    agent.log(`段颖向龙旗据点移动，目标位置 (${bestMovePosition.x}, ${bestMovePosition.y})`);
  } else {
    agent.performIdle();
    agent.log(`段颖无法向龙旗据点移动，原地待命`);
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

  // 选择距离龙旗最近的位置
  let bestPosition = availablePositions[0];
  let minDistance = calculateDistance(bestPosition, flagPosition);

  for (const position of availablePositions) {
    const distance = calculateDistance(position, flagPosition);
    if (distance < minDistance) {
      minDistance = distance;
      bestPosition = position;
    }
  }

  return bestPosition;
}

/**
 * 寻找最近的敌人
 */
function findClosestEnemy(context: ActionContext, enemies: IAgent[]): IAgent | null {
  const { agent } = context;
  if (enemies.length === 0) return null;

  let closestEnemy = enemies[0];
  let minDistance = agent.getDistanceToAgent(context.gameMap, closestEnemy);

  for (const enemy of enemies) {
    const distance = agent.getDistanceToAgent(context.gameMap, enemy);
    if (distance < minDistance) {
      minDistance = distance;
      closestEnemy = enemy;
    }
  }

  return closestEnemy;
}

/**
 * 计算两点间的曼哈顿距离
 */
function calculateDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
} 