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
export function ExecutePickGenerals(context: ActionContext): void {
  ActionBuilder.buildPickAction([zhaoyun.id, sunquan.id, zhugeliang.id], context.playerId);
}

/**
 * 执行BUFF选择
 * 根据当前需求选择最合适的BUFF
 */
export function ExecuteChooseBuff(context: ActionContext): State {
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
    
    ActionBuilder.buildBuffAction(selectedBuff, roleId);
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
 * 执行士兵生产
 */
export function ExecuteTroopProduction(context: ActionContext): void {
  ActionBuilder.buildMakeAction(context.agent.id);
}

/**
 * 执行阵型调整
 */
export function ExecuteFormationChange(context: ActionContext): void {
  ActionBuilder.buildFormAction(context.agent.id, 'offensive');
}

/**
 * 执行占领据点
 */
export function ExecuteCaptureFlag(context: ActionContext): void {
  ActionBuilder.buildOccupyAction();
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

