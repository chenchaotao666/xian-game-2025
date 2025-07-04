import { State } from 'mistreevous';
import { ActionContext } from '../core/types';
import ActionBuilder from '../network/ActionBuilder';
import { sunquan, zhaoyun, zhugeliang } from '@/models/heros';

/**
 * 游戏状态相关动作
 * ================
 * 
 * 包含武将选择、BUFF选择、技能使用等动作
 */

/**
 * 执行武将选择
 * 根据当前游戏状态选择最合适的武将
 */
export function executePickGeneral(context: ActionContext): void {
  ActionBuilder.buildPickAction([zhaoyun.id, sunquan.id, zhugeliang.id], context.playerId);
}

/**
 * 执行BUFF选择
 * 根据当前需求选择最合适的BUFF
 */
export function executeChooseBuff(context: ActionContext): State {
  const { agent } = context;
  
  try {
    let selectedBuff: number;
    let roleId: number | null = null;
    const maxHealth = (agent as any).maxHealth || 100;
    
    // 根据当前状态选择BUFF
    if (agent.health < maxHealth * 0.7) {
      // 血量不足时选择华佗再世
      selectedBuff = 1002;
    } else if (needMoreTroops(context)) {
      // 需要兵力时选择传国玉玺
      selectedBuff = 1001;
      roleId = context.agent.id;
    } else if (isInCombatSituation(context)) {
      // 战斗情况下选择青龙护体或酒狂
      selectedBuff = Math.random() > 0.5 ? 1003 : 1004;
    } else {
      // 默认选择青龙护体
      selectedBuff = 1003;
    }
    
    Commander.buildBuffAction(selectedBuff, roleId);
    // 发送BUFF指令
    (agent as any).sendCommand(`BUFF ${selectedBuff}`);
    agent.log(`选择BUFF: ${selectedBuff}`);
    
    return State.SUCCEEDED;
  } catch (error) {
    agent.log(`BUFF选择失败: ${error}`);
    return State.FAILED;
  }
}

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

// ============== 辅助函数 ==============

/**
 * 选择发育型武将（统帅类）
 */
function selectDevelopmentGeneral(context: ActionContext): string {
  // 优先选择统帅类武将：曹操、刘备、孙权
  const developmentGenerals = ['曹操', '刘备', '孙权'];
  return developmentGenerals[Math.floor(Math.random() * developmentGenerals.length)];
}

/**
 * 选择平衡型武将
 */
function selectBalancedGeneral(context: ActionContext): string {
  // 中期可以选择谋士类或统帅类
  const balancedGenerals = ['诸葛亮', '周瑜', '司马懿', '刘备'];
  return balancedGenerals[Math.floor(Math.random() * balancedGenerals.length)];
}

/**
 * 选择战斗型武将（猛将类）
 */
function selectCombatGeneral(context: ActionContext): string {
  // 后期选择猛将类：吕布、赵云、关羽
  const combatGenerals = ['吕布', '赵云', '关羽'];
  return combatGenerals[Math.floor(Math.random() * combatGenerals.length)];
}

/**
 * 检查是否需要更多士兵（从StrategicConditions导入的逻辑）
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

/**
 * 检查是否处于战斗情况
 */
function isInCombatSituation(context: ActionContext): boolean {
  const { agent } = context;
  return agent.visibleEnemies && agent.visibleEnemies.length > 0;
}

/**
 * 选择最佳技能
 */
function selectBestSkill(context: ActionContext): any {
  const { agent } = context;
  const skills = (agent as any).skills;
  
  if (!skills) return null;
  
  // 优先选择攻击技能
  const attackSkills = skills.filter((skill: any) => skill.type === 'attack');
  if (attackSkills.length > 0) {
    return attackSkills[0];
  }
  
  // 其次选择可用的技能
  const availableSkills = skills.filter((skill: any) => skill.cooldownRemaining === 0);
  return availableSkills.length > 0 ? availableSkills[0] : null;
}

/**
 * 选择技能目标
 */
function selectSkillTarget(context: ActionContext, skill: any): { x: number; y: number } | null {
  const { agent } = context;
  
  // 如果有可见敌人，优先攻击最近的敌人
  if (agent.visibleEnemies && agent.visibleEnemies.length > 0) {
    const nearestEnemy = agent.visibleEnemies.reduce((nearest, enemy) => {
      const nearestDistance = agent.getDistanceToAgent(context.gameMap, nearest);
      const enemyDistance = agent.getDistanceToAgent(context.gameMap, enemy);
      return enemyDistance < nearestDistance ? enemy : nearest;
    });
    
    return nearestEnemy.position;
  }
  
  return null;
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