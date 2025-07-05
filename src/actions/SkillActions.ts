import { State } from "mistreevous";
import { ActionContext } from "src/core/types";
import ActionBuilder from "../network/ActionBuilder";

/**
 * 技能使用策略模块
 * 根据不同武将的特点和策略来决定技能使用
 */

/**
 * 孙权技能使用策略
 * 1. 优先使用技能1（江东水师）进行治疗
 * 2. 然后使用技能2（制衡）进行配兵
 */
export function executeSkillSunquan(context: ActionContext): State {
  const { agent, teamBlackboard } = context;
  
  if (!agent || !teamBlackboard) {
    return State.FAILED;
  }
  
  try {
    // 从团队黑板获取孙权的技能信息
    const myHeroes = teamBlackboard.getMyAliveHeroes();
    const sunquanHero = myHeroes.find(hero => hero.roleId === 45);
    
    if (!sunquanHero || !sunquanHero.skills) {
      return State.FAILED;
    }

    // 获取技能信息 - 技能ID规律：英雄ID*100+技能编号
    const skill1 = sunquanHero.skills.find(skill => skill.skillId === 4501); // 江东水师
    const skill2 = sunquanHero.skills.find(skill => skill.skillId === 4502); // 制衡
    
    // 检查是否需要治疗（队伍总血量低于70%）
    const needHealing = checkTeamNeedHealing(teamBlackboard);
    
    // 优先使用技能1治疗
    if (skill1 && skill1.isReady && needHealing) {
      (ActionBuilder as any).buildSkillAction(45, 4501);
      agent.log(`孙权使用技能1：江东水师 - 为团队治疗`);
      return State.SUCCEEDED;
    }
    
    // 然后使用技能2配兵
    if (skill2 && skill2.isReady) {
      (ActionBuilder as any).buildSkillAction(45, 4502);
      agent.log(`孙权使用技能2：制衡 - 额外配兵`);
      return State.SUCCEEDED;
    }
    
    return State.FAILED;
    
  } catch (error) {
    agent.log(`孙权技能使用失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 诸葛亮技能使用策略
 * 1. 有敌人在附近时优先使用技能1（锦囊妙计）
 * 2. 否则使用技能2（斗转星移）给最低血量的武将加血和设阵型
 */
export function executeSkillZhugeliang(context: ActionContext): State {
  const { agent, teamBlackboard } = context;
  
  if (!agent || !teamBlackboard) {
    return State.FAILED;
  }
  
  try {
    // 从团队黑板获取诸葛亮的技能信息
    const myHeroes = teamBlackboard.getMyAliveHeroes();
    const zhugeliangHero = myHeroes.find(hero => hero.roleId === 46);
    
    if (!zhugeliangHero || !zhugeliangHero.skills) {
      return State.FAILED;
    }

    // 获取技能信息 - 根据协议，4601是诸葛亮的二技能（斗转星移）
    const skill1 = zhugeliangHero.skills.find(skill => skill.skillId === 4600); // 锦囊妙计（一技能）
    const skill2 = zhugeliangHero.skills.find(skill => skill.skillId === 4601); // 斗转星移（二技能）
    
    // 检查是否有敌人在附近（距离5以内）
    const hasNearbyEnemies = checkNearbyEnemies(teamBlackboard, zhugeliangHero.position, 5);
    
    // 有敌人在附近时优先使用技能1（锦囊妙计）
    if (skill1 && skill1.isReady && hasNearbyEnemies) {
      (ActionBuilder as any).buildSkillAction(46, 4600);
      agent.log(`诸葛亮使用技能1：锦囊妙计 - 获得免疫效果`);
      return State.SUCCEEDED;
    }
    
    // 否则使用技能2（斗转星移）给最低血量的武将加血和设阵型
    if (skill2 && skill2.isReady) {
      const lowestHealthHero = findLowestHealthHero(teamBlackboard);
      if (lowestHealthHero) {
        // 选择攻击阵型（1）或防守阵型（2）
        const formType = lowestHealthHero.healthPercentage < 50 ? 2 : 1; // 血量低于50%选择防守阵型
        (ActionBuilder as any).buildSkillAction(46, 4601, null, formType, null);
        agent.log(`诸葛亮使用技能2：斗转星移 - 为英雄${lowestHealthHero.roleId}恢复血量并设置阵型${formType}`);
        return State.SUCCEEDED;
      }
    }
    
    return State.FAILED;
    
  } catch (error) {
    agent.log(`诸葛亮技能使用失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 赵云技能使用策略
 * 只在战斗时使用，根据游戏规则制定策略
 */
export function executeSkillZhaoyun(context: ActionContext): State {
  const { agent, teamBlackboard } = context;
  
  if (!agent || !teamBlackboard) {
    return State.FAILED;
  }
  
  try {
    // 从团队黑板获取赵云的技能信息
    const myHeroes = teamBlackboard.getMyAliveHeroes();
    const zhaoyunHero = myHeroes.find(hero => hero.roleId === 41);
    
    if (!zhaoyunHero || !zhaoyunHero.skills) {
      return State.FAILED;
    }

    // 获取技能信息
    const skill1 = zhaoyunHero.skills.find(skill => skill.skillId === 4101); // 龙胆突刺
    const skill2 = zhaoyunHero.skills.find(skill => skill.skillId === 4102); // 冲锋陷阵
    
    // 检查是否在战斗中（有敌人在攻击距离内）
    const enemiesInRange = getEnemiesInRange(teamBlackboard, zhaoyunHero.position, 3);
    
    if (enemiesInRange.length === 0) {
      return State.FAILED; // 不在战斗中，不使用技能
    }
    
    // 优先使用技能1（龙胆突刺）对低血量敌人
    if (skill1 && skill1.isReady) {
      const lowHealthEnemy = enemiesInRange.find(enemy => enemy.healthPercentage <= 25);
      if (lowHealthEnemy) {
        (ActionBuilder as any).buildSkillAction(41, 4101, lowHealthEnemy.position);
        agent.log(`赵云使用技能1：龙胆突刺 - 击杀低血量敌人${lowHealthEnemy.roleId}`);
        return State.SUCCEEDED;
      }
      
      // 如果没有低血量敌人，对最近的敌人使用
      const nearestEnemy = findNearestEnemy(enemiesInRange, zhaoyunHero.position);
      if (nearestEnemy) {
        (ActionBuilder as any).buildSkillAction(41, 4101, nearestEnemy.position);
        agent.log(`赵云使用技能1：龙胆突刺 - 攻击敌人${nearestEnemy.roleId}`);
        return State.SUCCEEDED;
      }
    }
    
    // 使用技能2（冲锋陷阵）清理小兵或攻击武将
    if (skill2 && skill2.isReady) {
      // 检查范围内是否有小兵
      const hasSoldiers = checkEnemySoldiersInRange(teamBlackboard, zhaoyunHero.position, 3);
      
      if (hasSoldiers || enemiesInRange.length > 0) {
        (ActionBuilder as any).buildSkillAction(41, 4102);
        agent.log(`赵云使用技能2：冲锋陷阵 - 攻击范围内的敌人`);
        return State.SUCCEEDED;
      }
    }
    
    return State.FAILED;
    
  } catch (error) {
    agent.log(`赵云技能使用失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 通用技能使用入口
 * 根据武将类型选择对应的技能策略
 */
export function TryUseSkill(context: ActionContext): State {
  const { agent } = context;
  
  if (!agent || !agent.hero) {
    return State.FAILED;
  }
  
  // 根据武将ID选择对应的技能策略
  switch (agent.hero.id) {
    case 45: // 孙权
      return executeSkillSunquan(context);
    case 46: // 诸葛亮
      return executeSkillZhugeliang(context);
    case 41: // 赵云
      return executeSkillZhaoyun(context);
    default:
      return State.FAILED;
  }
}

// ===== 辅助函数 =====

/**
 * 检查团队是否需要治疗
 */
function checkTeamNeedHealing(teamBlackboard: any): boolean {
  const myHeroes = teamBlackboard.getMyAliveHeroes();
  if (!myHeroes || myHeroes.length === 0) return false;
  
  const totalHealth = myHeroes.reduce((sum: number, hero: any) => sum + hero.healthPercentage, 0);
  const averageHealth = totalHealth / myHeroes.length;
  
  return averageHealth < 70; // 平均血量低于70%时需要治疗
}

/**
 * 检查附近是否有敌人
 */
function checkNearbyEnemies(teamBlackboard: any, position: any, range: number): boolean {
  const enemyHeroes = teamBlackboard.getEnemyHeroes();
  if (!enemyHeroes || !position) return false;
  
  return enemyHeroes.some((enemy: any) => {
    if (!enemy.position) return false;
    const distance = Math.max(Math.abs(enemy.position.x - position.x), Math.abs(enemy.position.y - position.y));
    return distance <= range;
  });
}

/**
 * 找到血量最低的友方英雄
 */
function findLowestHealthHero(teamBlackboard: any): any {
  const myHeroes = teamBlackboard.getMyAliveHeroes();
  if (!myHeroes || myHeroes.length === 0) return null;
  
  return myHeroes.reduce((lowest: any, hero: any) => {
    return hero.healthPercentage < lowest.healthPercentage ? hero : lowest;
  });
}

/**
 * 获取攻击范围内的敌人
 */
function getEnemiesInRange(teamBlackboard: any, position: any, range: number): any[] {
  const enemyHeroes = teamBlackboard.getEnemyHeroes();
  if (!enemyHeroes || !position) return [];
  
  return enemyHeroes.filter((enemy: any) => {
    if (!enemy.position) return false;
    const distance = Math.max(Math.abs(enemy.position.x - position.x), Math.abs(enemy.position.y - position.y));
    return distance <= range;
  });
}

/**
 * 找到最近的敌人
 */
function findNearestEnemy(enemies: any[], position: any): any {
  if (!enemies || enemies.length === 0 || !position) return null;
  
  return enemies.reduce((nearest: any, enemy: any) => {
    if (!enemy.position) return nearest;
    
    const nearestDistance = Math.max(Math.abs(nearest.position.x - position.x), Math.abs(nearest.position.y - position.y));
    const enemyDistance = Math.max(Math.abs(enemy.position.x - position.x), Math.abs(enemy.position.y - position.y));
    
    return enemyDistance < nearestDistance ? enemy : nearest;
  });
}

/**
 * 检查范围内是否有敌方小兵
 */
function checkEnemySoldiersInRange(teamBlackboard: any, position: any, range: number): boolean {
  const enemyHeroes = teamBlackboard.getEnemyHeroes();
  if (!enemyHeroes || !position) return false;
  
  return enemyHeroes.some((enemy: any) => {
    if (!enemy.position || !enemy.soldiers) return false;
    const distance = Math.max(Math.abs(enemy.position.x - position.x), Math.abs(enemy.position.y - position.y));
    return distance <= range && enemy.soldiers.length > 0;
  });
}