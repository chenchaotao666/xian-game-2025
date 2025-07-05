import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';
import { AnalysisTools } from '../core/AnalysisTools';
import { getTeamBlackboard } from './utils';

/**
 * 检查是否应该变换阵形
 * =========================
 * 
 * 主要考虑两个因素：
 * 1. 只有正在战斗时才考虑变阵
 * 2. 我方的士气和粮草需要比较充裕才实用
 * 
 * 注意：战斗距离使用切比雪夫距离计算，适合快速判断战斗范围
 * 虽然导入了AnalysisTools.calculateShortestDistance，但为了性能考虑，
 * 战斗判断使用简单的切比雪夫距离即可满足需求
 * 
 * @param context 行为树上下文
 * @returns 是否应该变换阵形
 */
export function ShouldChangeFormation(context: ActionContext): boolean {
  try {
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      console.log('[阵形检查] 无法获取团队黑板，不变阵');
      return false;
    }

    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      console.log('[阵形检查] 游戏状态无效，不变阵');
      return false;
    }

    const myPlayer = teamBlackboard.getMyPlayerData();
    const myHeroes = teamBlackboard.getMyAliveHeroes();

    if (!myPlayer || myHeroes.length === 0) {
      console.log('[阵形检查] 无我方数据或无存活英雄，不变阵');
      return false;
    }

    // 1. 检查是否正在战斗
    const isInCombat = checkIsInCombat(myHeroes, teamBlackboard);
    
    // 2. 检查资源是否充裕
    const hasAbundantResources = checkResourcesAbundant(myPlayer);

    // 综合判断
    if (!isInCombat) {
      console.log('[阵形检查] 未处于战斗状态，无需变阵');
      return false;
    }

    if (!hasAbundantResources) {
      console.log('[阵形检查] 资源不够充裕，暂不变阵');
      return false;
    }

    console.log('[阵形检查] 正在战斗且资源充裕，可以考虑变阵');
    return true;

  } catch (error) {
    console.error(`[阵形检查] 检查变阵需求时发生错误: ${error}`);
    return false;
  }
}

/**
 * 检查是否正在战斗
 */
function checkIsInCombat(myHeroes: any[], teamBlackboard: TeamBlackboard): boolean {
  const enemyHeroes = teamBlackboard.getEnemyAliveHeroes();
  
  if (enemyHeroes.length === 0) {
    return false; // 没有敌人，不算战斗
  }

  // 检查是否有英雄在战斗范围内
  const COMBAT_DISTANCE = 3; // 战斗距离阈值
  
  for (const myHero of myHeroes) {
    if (!myHero.position) continue;
    
    for (const enemy of enemyHeroes) {
      if (!enemy.position) continue;
      
      // 使用切比雪夫距离进行战斗范围判断（允许对角线移动）
      const distance = Math.max(
        Math.abs(myHero.position.x - enemy.position.x),
        Math.abs(myHero.position.y - enemy.position.y)
      );
      if (distance <= COMBAT_DISTANCE) {
        return true; // 有英雄在战斗范围内
      }
    }
  }
  
  return false;
}

/**
 * 检查资源是否充裕（士气和粮草）
 */
function checkResourcesAbundant(player: any): boolean {
  const MIN_ABUNDANT_SUPPLIES = 500; // 充裕粮草阈值
  const MIN_ABUNDANT_MORALE = 70;    // 充裕士气阈值
  
  const hasAbundantSupplies = player.supplies >= MIN_ABUNDANT_SUPPLIES;
  const hasAbundantMorale = player.morale >= MIN_ABUNDANT_MORALE;
  
  return hasAbundantSupplies && hasAbundantMorale;
}



/**
 * 检查特定英雄是否应该变阵
 */
export function shouldHeroChangeFormation(heroId: number, context: ActionContext): boolean {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return false;

  const hero = teamBlackboard.getHeroById(heroId);
  if (!hero || !hero.isAlive || !hero.position) return false;

  // 检查该英雄是否在战斗中
  const enemyHeroes = teamBlackboard.getEnemyAliveHeroes();
  const COMBAT_DISTANCE = 3;
  
  const isHeroInCombat = enemyHeroes.some(enemy => {
    if (!enemy.position || !hero.position) return false;
    const distance = Math.max(
      Math.abs(hero.position.x - enemy.position.x),
      Math.abs(hero.position.y - enemy.position.y)
    );
    return distance <= COMBAT_DISTANCE;
  });

  return isHeroInCombat;
}

/**
 * 获取最适合变阵的英雄ID
 */
export function getMostSuitableHeroForFormationChange(context: ActionContext): number | null {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return null;

  const myHeroes = teamBlackboard.getMyAliveHeroes();
  const enemyHeroes = teamBlackboard.getEnemyAliveHeroes();
  
  if (enemyHeroes.length === 0) return null;

  const COMBAT_DISTANCE = 3;
  const combatHeroes = myHeroes.filter(hero => {
    if (!hero.position) return false;
    
    return enemyHeroes.some(enemy => {
      if (!enemy.position || !hero.position) return false;
      const distance = Math.max(
        Math.abs(hero.position.x - enemy.position.x),
        Math.abs(hero.position.y - enemy.position.y)
      );
      return distance <= COMBAT_DISTANCE;
    });
  });

  if (combatHeroes.length === 0) return null;

  // 选择生命值比例最低的战斗英雄，优先变阵
  return combatHeroes.reduce((most, current) => {
    const mostHealthPercentage = most.life / most.maxLife;
    const currentHealthPercentage = current.life / current.maxLife;
    
    if (currentHealthPercentage < mostHealthPercentage) return current;
    if (currentHealthPercentage === mostHealthPercentage && current.attack > most.attack) return current;
    return most;
  }).roleId;
}


