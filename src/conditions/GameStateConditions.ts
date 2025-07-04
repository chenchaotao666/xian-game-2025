import { ActionContext } from '../core/types';

/**
 * 游戏状态相关条件
 * ================
 * 
 * 包含武将选择、BUFF选择、技能使用等游戏状态判断
 */

/**
 * 检查是否需要选择武将
 * 第1回合或武将复活前1回合可以选择武将
 */
export function shouldPickGeneral(context: ActionContext): boolean {
  const { agent } = context;
  
  // 第1回合需要选择武将
  if (agent.currentTurn === 1) {
    return true;
  }
  
  // 检查是否有武将即将复活（死亡后5回合复活，复活前1回合可以选择）
  // 这里需要根据实际的武将状态来判断
  // 简化处理：假设agent有相关状态信息
  if ((agent as any).hasGeneralReviving && (agent as any).generalReviveCountdown === 1) {
    return true;
  }
  
  return false;
}

/**
 * 检查是否可以选择BUFF
 * 每100回合可以选择一个增益效果
 */
export function canChooseBuff(context: ActionContext): boolean {
  const { agent } = context;
  
  // 每100回合可以选择BUFF（100, 200, 300...）
  return agent.currentTurn > 0 && agent.currentTurn % 100 === 0;
}

/**
 * 检查是否可以使用技能
 * 根据技能冷却时间判断
 */
export function canUseSkill(context: ActionContext): boolean {
  const { agent } = context;
  
  // 检查是否有可用的技能（冷却完成）
  // 这里需要根据实际的技能系统来判断
  // 简化处理：假设agent有技能状态信息
  const skills = (agent as any).skills;
  if (!skills || skills.length === 0) {
    return false;
  }
  
  // 检查是否有任何技能可以使用
  return skills.some((skill: any) => 
    skill.cooldownRemaining === 0 && (agent as any).mana >= skill.manaCost
  );
}

/**
 * 检查是否可以使用逃脱技能
 * 特定的逃脱或防御技能是否可用
 */
export function canUseEscapeSkill(context: ActionContext): boolean {
  const { agent } = context;
  
  const skills = (agent as any).skills;
  if (!skills) {
    return false;
  }
  
  // 查找逃脱类技能（如瞬移、防御技能等）
  const escapeSkills = skills.filter((skill: any) => 
    skill.type === 'escape' || skill.type === 'defensive'
  );
  
  return escapeSkills.some((skill: any) => 
    skill.cooldownRemaining === 0 && (agent as any).mana >= skill.manaCost
  );
}

/**
 * 检查是否可以瞬移
 * 瞬移技能冷却60回合
 */
export function canTeleport(context: ActionContext): boolean {
  const { agent } = context;
  
  // 检查瞬移技能是否可用
  const skills = (agent as any).skills;
  if (!skills) {
    return false;
  }
  
  const teleportSkill = skills.find((skill: any) => skill.id === 'teleport');
  
  if (!teleportSkill) {
    return false;
  }
  
  return teleportSkill.cooldownRemaining === 0;
} 