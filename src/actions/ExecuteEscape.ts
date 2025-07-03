import { ActionContext, IAgent, Position } from '../core/types';
import { GameMap } from '../context/gameMap';

/**
 * 逃跑动作
 * 执行逃跑策略：撤退、分散、寻找安全位置
 */
export function ExecuteEscape(context: ActionContext): void {
  const { agent, gameMap } = context;

  // 只要有移动能力就可以尝试逃跑
  if (agent.movementRange <= 0) {
    agent.performIdle();
    agent.log(`段颖无法移动，原地防御`);
    return;
  }
  
  // 寻找最安全的逃跑位置
  const safestPosition = findSafestPosition(context);
  
  if (safestPosition) {
    // 移动到安全位置
    agent.performMove(context, safestPosition);
    agent.log(`段颖执行逃跑策略，移动到安全位置 (${safestPosition.x}, ${safestPosition.y})`);
  } else {
    // 如果找不到安全位置，就随机移动
    const availablePositions = agent.getReachableMovePositions(gameMap);
    if (availablePositions.length > 0) {
      const randomPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      agent.performMove(context, randomPosition);
      agent.log(`段颖无法找到安全位置，随机移动到 (${randomPosition.x}, ${randomPosition.y})`);
    } else {
      // 完全无法移动，执行原地防御
      agent.performIdle();
      agent.log(`段颖被困无法移动，执行原地防御`);
    }
  }
}

/**
 * 寻找最安全的位置
 */
function findSafestPosition(context: ActionContext): Position | null {
  const { agent, gameMap } = context;
  const availablePositions = agent.getReachableMovePositions(gameMap);
  
  if (availablePositions.length === 0) {
    return null;
  }

  let safestPosition = availablePositions[0];
  let maxSafetyScore = -1;

  for (const position of availablePositions) {
    const safetyScore = calculateSafetyScore(context, position);
    if (safetyScore > maxSafetyScore) {
      maxSafetyScore = safetyScore;
      safestPosition = position;
    }
  }

  return safestPosition;
}

/**
 * 计算位置的安全分数
 */
function calculateSafetyScore(context: ActionContext, position: Position): number {
  const { agent } = context;
  let safetyScore = 0;

  // 距离敌人越远越安全
  for (const enemy of agent.visibleEnemies) {
    const distance = Math.abs(position.x - enemy.position.x) + Math.abs(position.y - enemy.position.y);
    safetyScore += distance * 10; // 每格距离增加10分
  }

  // 距离友军越近越安全
  for (const ally of agent.visibleAllies) {
    const distance = Math.abs(position.x - ally.position.x) + Math.abs(position.y - ally.position.y);
    safetyScore += Math.max(0, 50 - distance * 5); // 距离友军3格内有额外安全分
  }

  return safetyScore;
} 