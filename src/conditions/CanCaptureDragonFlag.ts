import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';
import { StrategyType } from '../core/StrategyAnalysis';
import { getTeamBlackboard } from './utils';
import { log } from '../index';

/**
 * 检查是否能够占领龙旗
 * =========================
 * 
 * 主要考虑三个因素：
 * 1. 有足够的粮草支持占领行动
 * 2. 判断当前的全局策略是不是"占领龙旗"
 * 3. 我方是否有英雄在龙旗位置上
 * 
 * @param context 行为树上下文
 * @returns 是否能够占领龙旗
 */
export function CanCaptureDragonFlag(context: ActionContext): boolean {
  try {
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      log('[龙旗占领] 无法获取团队黑板，无法占领');
      return false;
    }

    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      log('[龙旗占领] 游戏状态无效，无法占领');
      return false;
    }

    const myPlayer = teamBlackboard.getMyPlayerData();
    if (!myPlayer) {
      log('[龙旗占领] 无我方玩家数据，无法占领');
      return false;
    }

    // 1. 检查粮草是否足够
    const hasEnoughSupplies = checkHasEnoughSupplies(myPlayer);
    
    // 2. 检查当前全局策略是否为占领龙旗
    const isCaptureFlagStrategy = checkIsCaptureFlagStrategy(teamBlackboard);

    // 3. 检查我方是否有英雄在龙旗位置上
    const hasHeroAtFlag = checkHasHeroAtFlagPosition(teamBlackboard);

    // 综合判断
    if (!hasEnoughSupplies) {
      log('[龙旗占领] 粮草不足，无法占领龙旗');
      return false;
    }

    if (!isCaptureFlagStrategy) {
      log('[龙旗占领] 当前策略不是占领龙旗，暂不执行');
      return false;
    }

    if (!hasHeroAtFlag) {
      log('[龙旗占领] 我方没有英雄在龙旗位置上，无法占领');
      return false;
    }

    log('[龙旗占领] 粮草充足、策略匹配且有英雄在龙旗位置，可以占领龙旗');
    return true;

  } catch (error) {
    log(`[龙旗占领] 检查龙旗占领能力时发生错误: ${error}`);
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
 * 检查我方是否有英雄在龙旗位置上
 */
function checkHasHeroAtFlagPosition(teamBlackboard: TeamBlackboard): boolean {
  const stronghold = teamBlackboard.getStronghold();
  const myHeroes = teamBlackboard.getMyAliveHeroes();
  
  if (!stronghold || !stronghold.position || myHeroes.length === 0) {
    log('[龙旗占领] 缺少龙旗位置或英雄数据');
    return false;
  }

  // 检查是否有我方英雄在龙旗位置上
  const heroesAtFlag = myHeroes.filter(hero => {
    if (!hero.position || !hero.isAlive) return false;
    
    // 检查英雄是否在龙旗位置上（使用切比雪夫距离，距离为0表示在同一位置）
    const distance = Math.max(
      Math.abs(hero.position.x - stronghold.position!.x),
      Math.abs(hero.position.y - stronghold.position!.y)
    );
    
    return distance === 0;
  });

  if (heroesAtFlag.length > 0) {
    const heroIds = heroesAtFlag.map(hero => hero.roleId);
    log(`[龙旗占领] 我方英雄 ${heroIds.join(', ')} 在龙旗位置上`);
    return true;
  }

  log('[龙旗占领] 我方没有英雄在龙旗位置上');
  return false;
}


