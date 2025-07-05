import { State } from 'mistreevous';
import { ActionContext } from '../core/types';
import ActionBuilder from '../network/ActionBuilder';
import { sunquan, zhaoyun, zhugeliang } from '@/models/heros';
import { getBuffSelectionPriority, getBestHeroForSummonBuff, isBuffApplicable } from '../conditions/CanChooseBuff';
import { log } from '..';

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
export function ExecutePickGenerals(context: ActionContext): State {
  try {
    ActionBuilder.buildPickAction([zhaoyun.id, sunquan.id, zhugeliang.id], context.playerId);
    return State.SUCCEEDED;
  } catch (error) {
    log(`武将选择失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行BUFF选择
 * 根据团队情况智能选择最合适的BUFF
 */
export function ExecuteChooseBuff(context: ActionContext): State {
  const { agent } = context;

  try {
    // 检查 agent 是否存在
    if (!agent) {
      console.log('ExecuteChooseBuff: agent 为 null，无法执行BUFF选择');
      return State.FAILED;
    }

    // 获取团队黑板
    const teamBlackboard = context.teamBlackboard;

    // 获取BUFF选择优先级建议
    const buffPriorities = getBuffSelectionPriority(context);

    if (buffPriorities.length === 0) {
      log('无法获取BUFF优先级建议，使用默认BUFF选择');
      ActionBuilder.buildBuffAction(1003, null); // 默认选择青龙护体
      return State.SUCCEEDED;
    }

    // 按优先级选择最合适的BUFF
    let selectedBuff: number | null = null;
    let targetRoleId: number | null = null;
    let selectedReason: string = '';

    for (const buffOption of buffPriorities) {
      const { buffId, priority, reason } = buffOption;

      // 检查BUFF是否适用
      if (isBuffApplicable(buffId, context)) {
        selectedBuff = buffId;
        selectedReason = reason;

        // 如果是传国玉玺，需要选择目标英雄
        if (buffId === 1001) {
          targetRoleId = getBestHeroForSummonBuff(context);
          if (!targetRoleId) {
            log(`传国玉玺无法找到合适的目标英雄，跳过`);
            continue; // 跳过这个BUFF选项
          }
        }

        log(`选择BUFF: ${getBuffName(buffId)} (优先级: ${priority})`);
        log(`选择理由: ${selectedReason}`);
        break;
      } else {
        log(`BUFF ${getBuffName(buffId)} 不适用，跳过`);
      }
    }

    // 如果没有找到合适的BUFF，使用默认选择
    if (!selectedBuff) {
      selectedBuff = 1003; // 青龙护体
      selectedReason = '无其他合适选项，使用默认防护BUFF';
      log(`使用默认BUFF选择: ${getBuffName(selectedBuff)}`);
      log(`选择理由: ${selectedReason}`);
    }

    // 构建并发送BUFF动作
    ActionBuilder.buildBuffAction(selectedBuff, targetRoleId);

    // 获取当前回合数，处理可能的方法不存在问题
    let currentRound = 0;
    try {
      currentRound = (teamBlackboard as any).getCurrentRound();
    } catch (e) {
      // 如果方法不存在，使用默认值
      currentRound = 0;
    }

    // 记录团队BUFF选择到黑板
    teamBlackboard.setData('last_buff_selection', {
      buffId: selectedBuff,
      targetRoleId,
      reason: selectedReason,
      round: currentRound,
      selectedBy: context.playerId
    });

    log(`成功选择BUFF: ${getBuffName(selectedBuff)}${targetRoleId ? ` (目标英雄: ${targetRoleId})` : ''}`);

    return State.SUCCEEDED;
  } catch (error) {
    if (agent) {
      log(`BUFF选择失败: ${error}`);
    } else {
      console.log(`ExecuteChooseBuff BUFF选择失败: ${error}`);
    }
    return State.FAILED;
  }
}

/**
 * 执行士兵生产
 * 按照用户需求的逻辑：
 * 1. 优先给每个武将配两个盾兵
 * 2. 然后按战士，统帅，辅助的优先顺序去加兵，保持弓兵盾兵6：4的比例
 * 3. 要把粮草用完
 */
export function ExecuteTroopProduction(context: ActionContext): State {
  if (!context.agent) {
    console.log('ExecuteTroopProduction: agent 为 null，无法执行士兵生产');
    return State.FAILED;
  }

  try {
    // 从团队黑板获取游戏状态信息
    const teamBlackboard = context.teamBlackboard;
    if (!teamBlackboard) {
      log('无法获取团队黑板信息');
      return State.FAILED;
    }

    // 获取当前玩家的游戏状态
    const gameState = teamBlackboard.getData('gameState');
    if (!gameState || !gameState.players) {
      log('无法从团队黑板获取游戏状态');
      return State.FAILED;
    }

    const playerId = context.playerId;
    const player = gameState.players.find((p: any) => p.playerId === playerId);
    if (!player) {
      log(`找不到玩家 ${playerId} 的信息`);
      return State.FAILED;
    }

    const currentFood = player.supplies; // 当前粮草
    const generals = player.roles; // 武将列表

    if (currentFood < 20) {
      log('粮草不足20，无法生产士兵');
      return State.FAILED;
    }

    // 计算生产计划
    const productionPlan = calculateOptimalTroopProduction(generals, currentFood);
    
    if (productionPlan.length === 0) {
      log('没有可执行的生产计划');
      return State.FAILED;
    }

    // 执行生产
    ActionBuilder.buildMakeAction(productionPlan);
    
    // 记录生产信息
    const totalCost = productionPlan.reduce((sum, plan) => sum + plan.soldiers.length * 20, 0);
    log(`执行士兵生产计划，总成本: ${totalCost} 粮草`);
    
    return State.SUCCEEDED;
  } catch (error) {
    log(`士兵生产执行失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行阵型调整
 */
export function ExecuteFormationChange(context: ActionContext): State {
  if (!context.agent) {
    console.log('ExecuteFormationChange: agent 为 null，无法执行阵型调整');
    return State.FAILED;
  }
  // 先不开阵型调整
  // ActionBuilder.buildFormAction(context.agent.id, 'offensive');
  return State.SUCCEEDED;
}

/**
 * 执行占领据点
 */
export function ExecuteCaptureFlag(context: ActionContext): State {
  try {
    ActionBuilder.buildOccupyAction();
    return State.SUCCEEDED;
  } catch (error) {
    log(`占领据点失败: ${error}`);
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
  if (!agent) return true;

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
  if (!agent) return false;

  const visibleEnemies = (agent as any).visibleEnemies;
  return visibleEnemies && visibleEnemies.length > 0;
}

/**
 * 选择最佳技能
 */
function selectBestSkill(context: ActionContext): any {
  const { agent } = context;
  if (!agent) return null;

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
  if (!agent) return null;

  // 如果有可见敌人，优先攻击最近的敌人
  const visibleEnemies = (agent as any).visibleEnemies;
  if (visibleEnemies && visibleEnemies.length > 0) {
    const nearestEnemy = visibleEnemies.reduce((nearest: any, enemy: any) => {
      const nearestDistance = Math.abs(nearest.position.x - agent.position.x) + Math.abs(nearest.position.y - agent.position.y);
      const enemyDistance = Math.abs(enemy.position.x - agent.position.x) + Math.abs(enemy.position.y - agent.position.y);
      return enemyDistance < nearestDistance ? enemy : nearest;
    });

    return nearestEnemy.position;
  }

  return null;
}

/**
 * 获取BUFF名称
 */
function getBuffName(buffId: number): string {
  const buffNames = {
    1001: '传国玉玺',
    1002: '华佗再世',
    1003: '青龙护体',
    1004: '酒狂'
  };
  return buffNames[buffId as keyof typeof buffNames] || `未知BUFF(${buffId})`;
}

/**
 * 计算最优士兵生产计划
 * 按照需求实现：
 * 1. 优先给每个武将配两个盾兵
 * 2. 然后按战士，统帅，辅助的优先顺序去加兵，保持弓兵盾兵6：4的比例
 * 3. 要把粮草用完
 */
function calculateOptimalTroopProduction(generals: any[], currentFood: number): any[] {
  const TROOP_COST = 20; // 每个士兵成本
  const ARCHER_TYPE = 7; // 弓兵类型
  const SHIELD_TYPE = 8; // 盾兵类型
  
  const productionPlan: any[] = [];
  let remainingFood = currentFood;
  
  // 过滤出存活的武将
  const aliveGenerals = generals.filter(general => 
    general.life > 0 && general.reviveRound === 0
  );
  
  if (aliveGenerals.length === 0) {
    log('没有存活的武将，无法生产士兵');
    return [];
  }
  
  // 第一阶段：优先给每个武将配两个盾兵
  log('第一阶段：优先为每个武将配置2个盾兵');
  for (const general of aliveGenerals) {
    const currentShields = general.solderProps?.filter((s: any) => s.roleId === SHIELD_TYPE).length || 0;
    const maxTroops = general.commander; // 统帅值限制
    const currentTotalTroops = general.solderProps?.length || 0;
    
    // 计算需要补充的盾兵数量（最多2个）
    const neededShields = Math.min(2 - currentShields, maxTroops - currentTotalTroops);
    
    if (neededShields > 0 && remainingFood >= neededShields * TROOP_COST) {
      const shields = Array(neededShields).fill(SHIELD_TYPE);
      productionPlan.push({
        roleId: general.roleId,
        soldiers: shields
      });
      
      remainingFood -= neededShields * TROOP_COST;
      log(`为武将 ${general.roleId} 配置 ${neededShields} 个盾兵`);
    }
  }
  
  // 第二阶段：按优先级顺序加兵，保持6:4比例
  log('第二阶段：按优先级顺序加兵（战士>统帅>辅助），保持弓兵盾兵6:4比例');
  
  // 按武将类型排序：战士(warrior) > 统帅(commander) > 辅助(strategist)
  const sortedGenerals = [...aliveGenerals].sort((a, b) => {
    const typeOrder = getGeneralTypeOrder(a.roleId);
    const typeOrderB = getGeneralTypeOrder(b.roleId);
    return typeOrder - typeOrderB;
  });
  
  // 继续为武将配兵直到粮草用完
  while (remainingFood >= TROOP_COST) {
    let anyGeneralCanAddTroops = false;
    
    for (const general of sortedGenerals) {
      if (remainingFood < TROOP_COST) break;
      
      const currentTroops = general.solderProps?.length || 0;
      const maxTroops = general.commander;
      
      if (currentTroops >= maxTroops) {
        continue; // 已达到统帅上限
      }
      
      // 计算当前弓兵和盾兵数量
      const currentArchers = general.solderProps?.filter((s: any) => s.roleId === ARCHER_TYPE).length || 0;
      const currentShields = general.solderProps?.filter((s: any) => s.roleId === SHIELD_TYPE).length || 0;
      
      // 按6:4比例决定下一个兵种
      const totalCurrent = currentArchers + currentShields;
      const expectedArchers = Math.round(totalCurrent * 0.6);
      const expectedShields = Math.round(totalCurrent * 0.4);
      
      let soldierType: number;
      if (currentArchers < expectedArchers) {
        soldierType = ARCHER_TYPE;
      } else if (currentShields < expectedShields) {
        soldierType = SHIELD_TYPE;
      } else {
        // 如果比例已经平衡，优先选择弓兵
        soldierType = ARCHER_TYPE;
      }
      
      // 检查是否已有该武将的生产计划
      let existingPlan = productionPlan.find(p => p.roleId === general.roleId);
      if (!existingPlan) {
        existingPlan = {
          roleId: general.roleId,
          soldiers: []
        };
        productionPlan.push(existingPlan);
      }
      
      // 检查加上新兵后是否超过统帅上限
      const plannedTroops = existingPlan.soldiers.length;
      if (currentTroops + plannedTroops >= maxTroops) {
        continue;
      }
      
      existingPlan.soldiers.push(soldierType);
      remainingFood -= TROOP_COST;
      anyGeneralCanAddTroops = true;
      
      const soldierTypeName = soldierType === ARCHER_TYPE ? '弓兵' : '盾兵';
      log(`为武将 ${general.roleId} 追加 1 个${soldierTypeName}`);
    }
    
    if (!anyGeneralCanAddTroops) {
      log('所有武将都已达到统帅上限，停止生产');
      break;
    }
  }
  
  log(`生产计划完成，剩余粮草: ${remainingFood}`);
  return productionPlan;
}

/**
 * 获取武将类型的优先级顺序
 * 战士(warrior) = 1, 统帅(commander) = 2, 辅助(strategist) = 3
 */
function getGeneralTypeOrder(roleId: number): number {
  // 根据roleId判断武将类型
  // 40-42: 战士类 (吕布、赵云、关羽)
  // 43-45: 统帅类 (刘备、曹操、孙权)  
  // 46-48: 辅助类 (诸葛亮、周瑜、司马懿)
  
  if (roleId >= 40 && roleId <= 42) {
    return 1; // 战士优先级最高
  } else if (roleId >= 43 && roleId <= 45) {
    return 2; // 统帅优先级中等
  } else if (roleId >= 46 && roleId <= 48) {
    return 3; // 辅助优先级最低
  }
  
  return 4; // 未知类型，优先级最低
}

