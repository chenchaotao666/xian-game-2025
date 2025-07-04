import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';
import { StrategyType } from '../core/StrategyAnalysis';

/**
 * 检查是否能够占领龙旗
 * =========================
 * 
 * 主要考虑两个因素：
 * 1. 有足够的粮草支持占领行动
 * 2. 判断当前的全局策略是不是"占领龙旗"
 * 
 * @param context 行为树上下文
 * @returns 是否能够占领龙旗
 */
export function CanCaptureDragonFlag(context: ActionContext): boolean {
  try {
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      console.log('[龙旗占领] 无法获取团队黑板，无法占领');
      return false;
    }

    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      console.log('[龙旗占领] 游戏状态无效，无法占领');
      return false;
    }

    const myPlayer = teamBlackboard.getMyPlayerData();
    if (!myPlayer) {
      console.log('[龙旗占领] 无我方玩家数据，无法占领');
      return false;
    }

    // 1. 检查粮草是否足够
    const hasEnoughSupplies = checkHasEnoughSupplies(myPlayer);
    
    // 2. 检查当前全局策略是否为占领龙旗
    const isCaptureFlagStrategy = checkIsCaptureFlagStrategy(teamBlackboard);

    // 综合判断
    if (!hasEnoughSupplies) {
      console.log('[龙旗占领] 粮草不足，无法占领龙旗');
      return false;
    }

    if (!isCaptureFlagStrategy) {
      console.log('[龙旗占领] 当前策略不是占领龙旗，暂不执行');
      return false;
    }

    console.log('[龙旗占领] 粮草充足且策略匹配，可以占领龙旗');
    return true;

  } catch (error) {
    console.error(`[龙旗占领] 检查龙旗占领能力时发生错误: ${error}`);
    return false;
  }
}

/**
 * 检查粮草是否足够
 */
function checkHasEnoughSupplies(player: any): boolean {
  const FLAG_CAPTURE_COST = 50;        // 占领龙旗的粮草消耗
  const MIN_SUPPLY_THRESHOLD = 100;    // 最低粮草阈值（占领后至少保留的粮草）
  
  const requiredSupplies = FLAG_CAPTURE_COST + MIN_SUPPLY_THRESHOLD;
  
  return player.supplies >= requiredSupplies;
}

/**
 * 检查当前全局策略是否为占领龙旗
 */
function checkIsCaptureFlagStrategy(teamBlackboard: TeamBlackboard): boolean {
  const currentStrategy = teamBlackboard.getCurrentStrategy();
  
  return currentStrategy === StrategyType.CAPTURE_FLAG;
}

/**
 * 检查特定位置是否适合占领龙旗
 * @param heroId 英雄ID
 * @param context 行为树上下文
 * @returns 该英雄是否适合占领龙旗
 */
export function canHeroCaptureDragonFlag(heroId: number, context: ActionContext): boolean {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return false;

  const hero = teamBlackboard.getHeroById(heroId);
  if (!hero || !hero.isAlive || !hero.position) return false;

  // 检查英雄的基本状态
  const isHealthy = hero.healthPercentage > 50; // 生命值要求
  const isAvailable = hero.isAlive && !hero.isReviving; // 存活且未复活中

  return isHealthy && isAvailable;
}

/**
 * 获取最适合占领龙旗的英雄ID
 * @param context 行为树上下文
 * @returns 最适合占领龙旗的英雄ID，如果没有则返回null
 */
export function getBestHeroForDragonFlagCapture(context: ActionContext): number | null {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return null;

  const myHeroes = teamBlackboard.getMyAliveHeroes();
  const stronghold = teamBlackboard.getStronghold();

  if (myHeroes.length === 0 || !stronghold || !stronghold.position) return null;

  // 筛选出适合占领的英雄
  const suitableHeroes = myHeroes.filter(hero => 
    hero.position && 
    hero.isAlive && 
    hero.healthPercentage > 50 &&
    !hero.isReviving
  );

  if (suitableHeroes.length === 0) return null;

  // 选择距离龙旗最近且实力较强的英雄
  return suitableHeroes.reduce((best, current) => {
    if (!best) return current;
    
    const bestDistance = Math.max(
      Math.abs(best.position!.x - stronghold.position!.x),
      Math.abs(best.position!.y - stronghold.position!.y)
    );
    
    const currentDistance = Math.max(
      Math.abs(current.position!.x - stronghold.position!.x),
      Math.abs(current.position!.y - stronghold.position!.y)
    );
    
    // 优先选择距离更近的英雄
    if (currentDistance < bestDistance) return current;
    if (currentDistance === bestDistance) {
      // 距离相同时，选择生命值更高的英雄
      if (current.healthPercentage > best.healthPercentage) return current;
      // 生命值相同时，选择攻击力更高的英雄
      if (current.healthPercentage === best.healthPercentage && current.attack > best.attack) {
        return current;
      }
    }
    
    return best;
  }).roleId;
}

/**
 * 检查占领龙旗的紧急程度
 * @param context 行为树上下文
 * @returns 紧急程度级别: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 */
export function getDragonFlagCaptureUrgency(context: ActionContext): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return 'LOW';

  const stronghold = teamBlackboard.getStronghold();
  const myPlayer = teamBlackboard.getMyPlayerData();
  
  if (!stronghold || !myPlayer) return 'LOW';

  // 如果敌方控制龙旗，紧急程度很高
  if (stronghold.camp !== 0 && stronghold.camp !== myPlayer.playerId) {
    return 'CRITICAL';
  }

  // 如果我方控制龙旗，紧急程度很低
  if (stronghold.camp === myPlayer.playerId) {
    return 'LOW';
  }

  // 龙旗中立状态，根据其他因素判断
  const currentRound = teamBlackboard.getCurrentRound();
  const enemyHeroes = teamBlackboard.getEnemyAliveHeroes();

  // 检查敌方英雄距离龙旗的远近
  let enemyNearFlag = 0;
  if (stronghold.position) {
    for (const enemy of enemyHeroes) {
      if (enemy.position) {
        const distance = Math.max(
          Math.abs(enemy.position.x - stronghold.position.x),
          Math.abs(enemy.position.y - stronghold.position.y)
        );
        if (distance <= 5) enemyNearFlag++;
      }
    }
  }

  // 游戏后期且有敌人接近龙旗
  if (currentRound > 500 && enemyNearFlag > 0) {
    return 'HIGH';
  }

  // 游戏中期，中等紧急程度
  if (currentRound > 200) {
    return 'MEDIUM';
  }

  return 'LOW';
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
