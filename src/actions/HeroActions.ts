import { ActionContext } from "@/core/types";
import { State } from "mistreevous";

/**
 * 执行技能释放
 * 选择并释放最合适的技能
 */
export function executeSkill(context: ActionContext): State {
  const { agent } = context;

  try {
    const skills = (agent as any).skills;
    if (!skills || skills.length === 0) {
      return State.FAILED;
    }

    // 找到最合适的技能
    const bestSkill = selectBestSkill(context);
    if (!bestSkill) {
      return State.FAILED;
    }

    // 找到最佳目标
    const target = selectSkillTarget(context, bestSkill);

    // 发送技能指令
    if (target) {
      (agent as any).sendCommand(`SK ${bestSkill.id} ${target.x} ${target.y}`);
      agent.log(`对 (${target.x},${target.y}) 释放技能: ${bestSkill.name}`);
    } else {
      (agent as any).sendCommand(`SK ${bestSkill.id}`);
      agent.log(`释放技能: ${bestSkill.name}`);
    }

    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`技能释放失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行逃脱技能
 * 使用防御或逃脱技能
 */
export function executeEscapeSkill(context: ActionContext): State {
  const { agent } = context;

  try {
    const skills = (agent as any).skills;
    const escapeSkills = skills?.filter((skill: any) =>
      skill.type === 'escape' || skill.type === 'defensive'
    ) || [];

    if (escapeSkills.length === 0) {
      return State.FAILED;
    }

    // 优先选择防御技能
    const defensiveSkill = escapeSkills.find((skill: any) => skill.type === 'defensive');
    const selectedSkill = defensiveSkill || escapeSkills[0];

    (agent as any).sendCommand(`SK ${selectedSkill.id}`);
    agent.log(`使用逃脱技能: ${selectedSkill.name}`);

    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`逃脱技能使用失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行瞬移
 * 瞬移到安全位置
 */
export function executeTeleport(context: ActionContext): State {
  const { agent } = context;

  try {
    // 找到安全的瞬移目标位置
    const safePosition = findSafeTeleportPosition(context);
    if (!safePosition) {
      return State.FAILED;
    }

    // 发送瞬移指令
    (agent as any).sendCommand(`SP ${safePosition.x} ${safePosition.y}`);
    agent.log(`瞬移到安全位置: (${safePosition.x},${safePosition.y})`);

    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`瞬移失败: ${error}`);
    return State.FAILED;
  }
}


/**
* 找到安全的瞬移位置
*/
function findSafeTeleportPosition(context: ActionContext): { x: number; y: number } | null {
  const { agent, gameMap } = context;

  // 简化处理：瞬移到距离敌人较远的位置
  // 在实际实现中应该考虑地形、障碍物等因素

  // 瞬移范围是10格
  const teleportRange = 10;
  const safePositions = [];

  for (let dx = -teleportRange; dx <= teleportRange; dx++) {
    for (let dy = -teleportRange; dy <= teleportRange; dy++) {
      const newX = agent.position.x + dx;
      const newY = agent.position.y + dy;

      if (gameMap.isValidPosition(newX, newY) && !gameMap.isObstacle(newX, newY)) {
        // 检查这个位置是否远离敌人
        const distanceToNearestEnemy = agent.visibleEnemies?.reduce((minDist, enemy) => {
          const dist = Math.max(Math.abs(newX - enemy.position.x), Math.abs(newY - enemy.position.y));
          return Math.min(minDist, dist);
        }, Infinity) || Infinity;

        if (distanceToNearestEnemy >= 5) { // 至少距离敌人5格
          safePositions.push({ x: newX, y: newY });
        }
      }
    }
  }

  // 随机选择一个安全位置
  return safePositions.length > 0 ? safePositions[Math.floor(Math.random() * safePositions.length)] : null;
} 