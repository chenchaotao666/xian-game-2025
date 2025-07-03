import { ActionContext, IAgent, Position } from '../core/types';

/**
 * 攻击动作
 * 执行攻击策略：选择目标、调配兵力、发动攻击
 */
export function ExecuteAttack(context: ActionContext): void {
  const { agent, gameMap } = context;

  const target = selectBestTarget(context);
  if (!target) {
    agent.performIdle();
    return;
  }

  const distance = agent.getDistanceToAgent(gameMap, target);
  if (distance <= 1) {
    agent.performAttack(target);
    agent.log(`段颖近战攻击 ${target.id}`);
  } else if (distance <= 3 && agent.isSkillReady('ranged_attack')) {
    agent.performSkillOnTarget('ranged_attack', target);
    agent.log(`段颖远程攻击 ${target.id}`);
  } else {
    const positions = agent.getReachableMovePositions(gameMap);
    if (positions.length > 0) {
      const bestPos = positions.reduce((best, pos) => {
        const dist = Math.abs(pos.x - target.position.x) + Math.abs(pos.y - target.position.y);
        const bestDist = Math.abs(best.x - target.position.x) + Math.abs(best.y - target.position.y);
        return dist < bestDist ? pos : best;
      }, positions[0]);

      agent.performMove(context, bestPos);
      agent.log(`段颖向目标移动`);
    }
  }

}
function selectBestTarget(context: ActionContext): IAgent | null {
  const { agent } = context;
  if (agent.visibleEnemies.length === 0) return null;

  return agent.visibleEnemies.reduce((best, enemy) => {
    const score = (100 - enemy.health) + (50 - agent.getDistanceToAgent(context.gameMap, enemy) * 5);
    const bestScore = (100 - best.health) + (50 - agent.getDistanceToAgent(context.gameMap, best) * 5);
    return score > bestScore ? enemy : best;
  });
}