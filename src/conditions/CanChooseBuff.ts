import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';

/**
 * 检查是否可以选择BUFF增益效果
 * =================================
 * 
 * 根据游戏规则，每100回合可以选择一个增益效果
 * 此条件函数用于判断当前回合是否到了选择BUFF的时机
 * 
 * @param context 行为树上下文
 * @returns 是否可以选择BUFF
 */
export function CanChooseBuff(context: ActionContext): boolean {
  try {
    // 从TeamBlackboard获取当前回合信息
    const teamBlackboard = getTeamBlackboard(context);
    if (!teamBlackboard) {
      console.log('[BUFF选择] 无法获取团队黑板，跳过BUFF选择');
      return false;
    }

    const currentRound = teamBlackboard.getCurrentRound();
    
    // 游戏规则：每100回合可以选择一个BUFF（100, 200, 300...）
    if (currentRound <= 0 || currentRound % 100 !== 0) {
      return false;
    }

    // 检查是否已经在当前BUFF回合选择过了
    const lastBuffRound = teamBlackboard.getData('last_buff_round') || 0;
    if (lastBuffRound === currentRound) {
      console.log(`[BUFF选择] 回合${currentRound}已经选择过BUFF，跳过`);
      return false;
    }

    // 检查游戏状态是否有效
    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      console.log('[BUFF选择] 游戏状态无效，跳过BUFF选择');
      return false;
    }

    // 检查我方是否有存活的英雄
    const myHeroes = teamBlackboard.getMyAliveHeroes();
    if (myHeroes.length === 0) {
      console.log('[BUFF选择] 我方无存活英雄，跳过BUFF选择');
      return false;
    }

    // 检查我方玩家数据是否有效
    const myPlayer = teamBlackboard.getMyPlayerData();
    if (!myPlayer) {
      console.log('[BUFF选择] 无法获取我方玩家数据，跳过BUFF选择');
      return false;
    }

    // 所有条件满足，可以选择BUFF
    console.log(`[BUFF选择] 回合${currentRound}可以选择BUFF增益效果`);
    return true;

  } catch (error) {
    console.error(`[BUFF选择] 检查BUFF选择条件时发生错误: ${error}`);
    return false;
  }
}

/**
 * 获取BUFF选择的优先级建议
 * 用于辅助决策选择哪种BUFF
 */
export function getBuffSelectionPriority(context: ActionContext): {
  buffId: number;
  priority: number;
  reason: string;
}[] {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) {
    return [];
  }

  const myPlayer = teamBlackboard.getMyPlayerData();
  const myHeroes = teamBlackboard.getMyAliveHeroes();
  const enemyHeroes = teamBlackboard.getEnemyAliveHeroes();
  const currentStrategy = teamBlackboard.getCurrentStrategy();

  if (!myPlayer || myHeroes.length === 0) {
    return [];
  }

  const priorities: { buffId: number; priority: number; reason: string }[] = [];

  // 1. 华佗再世 (1002) - 回复所有单位50%体力
  const avgHealthPercentage = myHeroes.reduce((sum, hero) => sum + hero.healthPercentage, 0) / myHeroes.length;
  if (avgHealthPercentage < 60) {
    priorities.push({
      buffId: 1002,
      priority: 90,
      reason: `我方平均血量${avgHealthPercentage.toFixed(1)}%，急需治疗`
    });
  } else if (avgHealthPercentage < 80) {
    priorities.push({
      buffId: 1002,
      priority: 60,
      reason: `我方平均血量${avgHealthPercentage.toFixed(1)}%，可考虑治疗`
    });
  }

  // 2. 传国玉玺 (1001) - 为某将领召唤4名弓兵+2名盾兵
  const heroesNeedingTroops = myHeroes.filter(hero => hero.totalSoldierCount < hero.commander * 0.8);
  if (heroesNeedingTroops.length > 0) {
    const bestHero = heroesNeedingTroops.reduce((best, current) => 
      current.commander > best.commander ? current : best
    );
    priorities.push({
      buffId: 1001,
      priority: 75,
      reason: `英雄${bestHero.roleId}需要补充兵力 (当前${bestHero.totalSoldierCount}/${bestHero.commander})`
    });
  }

  // 3. 青龙护体 (1003) - 5回合减伤20%
  if (enemyHeroes.length > myHeroes.length || avgHealthPercentage < 70) {
    priorities.push({
      buffId: 1003,
      priority: 70,
      reason: `敌方威胁较大或我方血量偏低，需要防护`
    });
  }

  // 4. 酒狂 (1004) - 3回合武力增加30%，每回合损失5%体力
  if (avgHealthPercentage > 80 && (currentStrategy === 'FOCUS_FIRE' || currentStrategy === 'ATTACK_ENEMY')) {
    priorities.push({
      buffId: 1004,
      priority: 80,
      reason: `我方血量充足且策略为攻击型，适合使用酒狂增强攻击力`
    });
  } else if (avgHealthPercentage > 60) {
    priorities.push({
      buffId: 1004,
      priority: 50,
      reason: `我方血量较好，可考虑使用酒狂提升攻击力`
    });
  }

  // 根据当前策略调整优先级
  switch (currentStrategy) {
    case 'ATTACK_CITY':
      // 攻城时优先考虑兵力和攻击力
      priorities.forEach(p => {
        if (p.buffId === 1001) p.priority += 10; // 传国玉玺
        if (p.buffId === 1004) p.priority += 5;  // 酒狂
      });
      break;
      
    case 'DEFENSIVE':
      // 防守时优先考虑治疗和防护
      priorities.forEach(p => {
        if (p.buffId === 1002) p.priority += 10; // 华佗再世
        if (p.buffId === 1003) p.priority += 10; // 青龙护体
      });
      break;
      
    case 'GATHER_FORCES':
      // 集合时优先考虑兵力补充
      priorities.forEach(p => {
        if (p.buffId === 1001) p.priority += 15; // 传国玉玺
      });
      break;
  }

  // 按优先级排序
  return priorities.sort((a, b) => b.priority - a.priority);
}

/**
 * 检查特定BUFF是否适用
 */
export function isBuffApplicable(buffId: number, context: ActionContext): boolean {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return false;

  const myHeroes = teamBlackboard.getMyAliveHeroes();
  const myPlayer = teamBlackboard.getMyPlayerData();

  if (!myPlayer || myHeroes.length === 0) return false;

  switch (buffId) {
    case 1001: // 传国玉玺 - 需要有英雄能够接受更多兵力
      return myHeroes.some(hero => hero.totalSoldierCount < hero.commander);
      
    case 1002: // 华佗再世 - 有受伤的单位时才有效
      return myHeroes.some(hero => hero.healthPercentage < 100);
      
    case 1003: // 青龙护体 - 总是适用
      return true;
      
    case 1004: // 酒狂 - 需要足够血量承受体力损失
      const avgHealth = myHeroes.reduce((sum, hero) => sum + hero.healthPercentage, 0) / myHeroes.length;
      return avgHealth > 30; // 至少30%血量才考虑使用
      
    default:
      return false;
  }
}

/**
 * 获取最适合传国玉玺的英雄ID
 */
export function getBestHeroForSummonBuff(context: ActionContext): number | null {
  const teamBlackboard = getTeamBlackboard(context);
  if (!teamBlackboard) return null;

  const myHeroes = teamBlackboard.getMyAliveHeroes();
  const eligibleHeroes = myHeroes.filter(hero => hero.totalSoldierCount < hero.commander);

  if (eligibleHeroes.length === 0) return null;

  // 优先选择统帅值最高且兵力缺口最大的英雄
  return eligibleHeroes.reduce((best, current) => {
    const bestGap = best.commander - best.totalSoldierCount;
    const currentGap = current.commander - current.totalSoldierCount;
    
    if (currentGap > bestGap) return current;
    if (currentGap === bestGap && current.commander > best.commander) return current;
    return best;
  }).roleId;
}

/**
 * 从上下文获取TeamBlackboard实例
 */
function getTeamBlackboard(context: ActionContext): TeamBlackboard | null {
  // 尝试从多个可能的位置获取TeamBlackboard
  if (context.teamBlackboard) {
    return context.teamBlackboard as TeamBlackboard;
  }
  
  if (context.agent && (context.agent as any).teamBlackboard) {
    return (context.agent as any).teamBlackboard as TeamBlackboard;
  }
  
  // 如果context.agent为null，尝试从warrior/support/leader获取
  if (!context.agent && context.teamBlackboard) {
    const tb = context.teamBlackboard as TeamBlackboard;
    if (tb.warrior || tb.support || tb.leader) {
      return tb;
    }
  }
  
  return null;
}

/**
 * 获取BUFF的详细信息
 */
export function getBuffInfo(buffId: number): { name: string; description: string } | null {
  const buffInfoMap = {
    1001: { name: '传国玉玺', description: '为某将领召唤4名弓兵+2名盾兵' },
    1002: { name: '华佗再世', description: '回复所有单位50%体力' },
    1003: { name: '青龙护体', description: '5回合内减伤20%' },
    1004: { name: '酒狂', description: '3回合武力+30%，每回合-5%体力' }
  };
  
  return buffInfoMap[buffId as keyof typeof buffInfoMap] || null;
} 