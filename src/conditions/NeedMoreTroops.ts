import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';

/**
 * 检查是否需要更多士兵
 * =========================
 * 
 * 主要考虑三个因素：
 * 1. 英雄是否满兵（统帅值利用率）
 * 2. 是否有足够粮草生产士兵
 * 3. 是否需要预留粮草用于占领据点
 * 
 * @param context 行为树上下文
 * @returns 是否需要更多士兵
 */
export function NeedMoreTroops(context: ActionContext): boolean {
  try {
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      console.log('[兵力检查] 无法获取团队黑板，默认需要补充兵力');
      return true;
    }

    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      console.log('[兵力检查] 游戏状态无效，默认需要补充兵力');
      return true;
    }

    const myPlayer = teamBlackboard.getMyPlayerData();
    const myHeroes = teamBlackboard.getMyAliveHeroes();

    if (!myPlayer || myHeroes.length === 0) {
      console.log('[兵力检查] 无我方数据或无存活英雄，不需要补充兵力');
      return false;
    }

    // 1. 检查英雄是否满兵
    const hasUnderstaffedHero = checkHeroesUnderstaffed(myHeroes);
    
    // 2. 检查粮草是否充足
    const hasEnoughSupplies = checkSuppliesForTroops(myPlayer.supplies);
    
    // 3. 检查是否需要预留粮草占领据点
    // const shouldReserveSupplies = checkShouldReserveSupplies(myPlayer.supplies, teamBlackboard);

    // 综合判断
    if (!hasUnderstaffedHero) {
      console.log('[兵力检查] 所有英雄兵力充足，无需补充');
      return false;
    }

    if (!hasEnoughSupplies) {
      console.log('[兵力检查] 粮草不足，无法生产士兵');
      return false;
    }

    // if (shouldReserveSupplies) {
    //   console.log('[兵力检查] 需要预留粮草占领据点，暂不补充兵力');
    //   return false;
    // }

    console.log('[兵力检查] 有英雄兵力不足且粮草充足，需要补充');
    return true;

  } catch (error) {
    console.error(`[兵力检查] 检查兵力需求时发生错误: ${error}`);
    return true;
  }
}

/**
 * 检查英雄是否有兵力不足的情况
 */
function checkHeroesUnderstaffed(heroes: any[]): boolean {
  const FULL_TROOP_THRESHOLD = 0.9; // 90%以上算满兵
  
  return heroes.some(hero => {
    if (hero.commander === 0) return false; // 统帅值为0的英雄不考虑
    
    const troopPercentage = hero.totalSoldierCount / hero.commander;
    return troopPercentage < FULL_TROOP_THRESHOLD;
  });
}

/**
 * 检查粮草是否足够生产士兵
 */
function checkSuppliesForTroops(supplies: number): boolean {
  const TROOP_COST = 20; // 每个士兵成本20粮草
  const MIN_PRODUCTION_COUNT = 1; // 至少能生产1个士兵才值得
  
  return supplies >= TROOP_COST * MIN_PRODUCTION_COUNT;
}

/**
 * 检查是否应该预留粮草用于占领据点
 */
function checkShouldReserveSupplies(supplies: number, teamBlackboard: TeamBlackboard): boolean {
  const FORTRESS_COST = 100; // 占领据点成本100粮草
  const SUPPLY_BUFFER = 200; // 粮草缓冲量
  
  // 如果粮草少于占领据点成本+缓冲量，应该预留
  if (supplies < FORTRESS_COST + SUPPLY_BUFFER) {
    return true;
  }
  
  // 检查是否有据点可以占领
  const stronghold = teamBlackboard.getStronghold();
  if (stronghold && stronghold.isAvailable) {
    // 如果有可用据点且粮草不是很充足，应该预留
    if (supplies < FORTRESS_COST * 2 + SUPPLY_BUFFER) {
      return true;
    }
  }
  
  return false;
}

/**
 * 检查特定英雄是否需要补充兵力
 */
export function doesHeroNeedTroops(heroId: number, context: ActionContext): boolean {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return false;

  const hero = teamBlackboard.getHeroById(heroId);
  if (!hero || !hero.isAlive || hero.commander === 0) return false;

  const FULL_TROOP_THRESHOLD = 0.9;
  const troopPercentage = hero.totalSoldierCount / hero.commander;
  return troopPercentage < FULL_TROOP_THRESHOLD;
}

/**
 * 获取最需要补充兵力的英雄ID
 */
export function getMostUrgentHeroForTroops(context: ActionContext): number | null {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return null;

  const myHeroes = teamBlackboard.getMyAliveHeroes();
  const FULL_TROOP_THRESHOLD = 0.9;
  
  const urgentHeroes = myHeroes.filter(hero => {
    if (hero.commander === 0) return false;
    const troopPercentage = hero.totalSoldierCount / hero.commander;
    return troopPercentage < FULL_TROOP_THRESHOLD;
  });

  if (urgentHeroes.length === 0) return null;

  // 按兵力缺口比例排序，选择比例最低的英雄
  return urgentHeroes.reduce((most, current) => {
    const mostPercentage = most.totalSoldierCount / most.commander;
    const currentPercentage = current.totalSoldierCount / current.commander;
    
    if (currentPercentage < mostPercentage) return current;
    if (currentPercentage === mostPercentage && current.commander > most.commander) return current;
    return most;
  }).roleId;
}

/**
 * 从上下文获取TeamBlackboard实例
 */
function getTeamBlackboard(context: ActionContext): TeamBlackboard | null {
  if (context.teamBlackboard) {
    return context.teamBlackboard as TeamBlackboard;
  }
  
  if (context.agent && (context.agent as any).teamBlackboard) {
    return (context.agent as any).teamBlackboard as TeamBlackboard;
  }
  
  if (!context.agent && context.teamBlackboard) {
    const tb = context.teamBlackboard as TeamBlackboard;
    if (tb.warrior || tb.support || tb.leader) {
      return tb;
    }
  }
  
  return null;
}
