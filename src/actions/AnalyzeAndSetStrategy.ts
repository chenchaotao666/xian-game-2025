import { State } from 'mistreevous';
import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';
import { StrategyAnalysis, StrategyType, StrategyDecision } from '../core/StrategyAnalysis';
import { log } from '../index';
import { AnalysisTools } from '../core/AnalysisTools';

/**
 * 分析并设置策略动作
 * ====================
 * 
 * 该动作负责：
 * 1. 调用 StrategyAnalysis 进行全局策略分析
 * 2. 根据策略类型选择最优目标并设置到 TeamBlackboard 中
 * 3. 为后续的具体动作提供决策依据
 * 
 * 策略优先级：
 * - FOCUS_FIRE/ATTACK_ENEMY：选择距离最近的敌人（距离相同选血量少的）
 * - GATHER_FORCES：选择最优集合位置
 * - ATTACK_CITY：选择最优城寨目标
 * - CAPTURE_FLAG：选择龙旗位置
 */
export function AnalyzeAndSetStrategy(context: ActionContext): State {
  const { agent } = context;
  
  if (!agent) {
    console.error('[策略分析] 错误：agent为空');
    return State.FAILED;
  }
  
  try {
    // 获取团队黑板实例
    const teamBlackboard = context.teamBlackboard as TeamBlackboard;
    if (!teamBlackboard) {
      log('[策略分析] 错误：未找到团队黑板实例');
      return State.FAILED;
    }

    // 检查是否有有效的游戏状态数据
    const gameState = teamBlackboard.getGameStateSnapshot();
    if (!gameState) {
      log('[策略分析] 警告：游戏状态数据为空，跳过策略分析');
      return State.SUCCEEDED;
    }

    log(`[策略分析] 开始策略分析 - 回合: ${gameState.round}`);

    // 创建策略分析器
    const strategyAnalysis = new StrategyAnalysis(teamBlackboard);

    // 执行全局策略分析
    const globalStrategy = analyzeGlobalStrategy(strategyAnalysis, teamBlackboard, agent);

    // 记录策略决策
    log(`[策略分析] 全局策略决策: ${globalStrategy.strategy}`);
    log(`[策略分析] 优先级: ${globalStrategy.priority}, 置信度: ${globalStrategy.confidence}%`);
    log(`[策略分析] 决策理由: ${globalStrategy.reason}`);

    // 将策略信息设置到团队黑板
    teamBlackboard.setGlobalStrategy(
      globalStrategy.strategy,
      globalStrategy.details,
      globalStrategy.priority,
      globalStrategy.confidence,
      globalStrategy.reason
    );

    // 设置其他辅助信息
    setAdditionalStrategyInfo(teamBlackboard, globalStrategy, agent);

    // 记录执行计划
    if (globalStrategy.executionPlan && globalStrategy.executionPlan.length > 0) {
      log(`[策略分析] 执行计划:`);
      globalStrategy.executionPlan.forEach((step, index) => {
        log(`  ${index + 1}. ${step}`);
      });
    }
    // 根据策略类型设置具体目标
    setStrategyTarget(globalStrategy.strategy, teamBlackboard, agent);

    // 输出当前策略信息
    logCurrentStrategyInfo(teamBlackboard, agent);

    return State.SUCCEEDED;

  } catch (error) {
    log(`[策略分析] 分析失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行全局策略分析（简化版，去掉DEFENSIVE和RESOURCE_MANAGEMENT）
 */
function analyzeGlobalStrategy(
  strategyAnalysis: StrategyAnalysis, 
  blackboard: TeamBlackboard, 
  agent: any
): StrategyDecision {
  const currentRound = blackboard.getCurrentRound();
  const myHeroes = blackboard.getMyAliveHeroes();
  
  // 如果没有存活英雄，等待复活
  if (myHeroes.length === 0) {
    return {
      strategy: StrategyType.GATHER_FORCES,
      priority: 20,
      confidence: 100,
      details: {},
      reason: '我方无存活英雄，等待复活',
      executionPlan: ['等待英雄复活']
    };
  }

  // 分析各种策略选项
  const focusFireAssessment = strategyAnalysis.analyzeFocusFireStrategy();
  const enemyAttackAssessment = strategyAnalysis.analyzeEnemyAttackStrategy();
  const cityAttackAssessment = strategyAnalysis.analyzeCityAttackStrategy();
  const flagCaptureAssessment = strategyAnalysis.analyzeFlagCaptureStrategy();

  // 按优先级排序策略
  const strategies: Array<{ type: StrategyType; priority: number; assessment: any; reason: string }> = [];

  // 1. 集火攻击（最高优先级）
  if (focusFireAssessment.shouldFocusFire) {
    strategies.push({
      type: StrategyType.FOCUS_FIRE,
      priority: focusFireAssessment.priority,
      assessment: focusFireAssessment,
      reason: focusFireAssessment.reason
    });
  }

  // 2. 攻击敌方或集合兵力
  if (enemyAttackAssessment.shouldAttack) {
    strategies.push({
      type: enemyAttackAssessment.shouldGatherFirst ? StrategyType.GATHER_FORCES : StrategyType.ATTACK_ENEMY,
      priority: enemyAttackAssessment.priority,
      assessment: enemyAttackAssessment,
      reason: enemyAttackAssessment.reason
    });
  }

  // 3. 占领龙旗
  if (flagCaptureAssessment.shouldCapture) {
    strategies.push({
      type: StrategyType.CAPTURE_FLAG,
      priority: flagCaptureAssessment.priority,
      assessment: flagCaptureAssessment,
      reason: flagCaptureAssessment.reason
    });
  }

  // 4. 攻击城寨
  if (cityAttackAssessment.length > 0) {
    const bestCity = cityAttackAssessment[0];
    if (bestCity.canAttack) {
      strategies.push({
        type: StrategyType.ATTACK_CITY,
        priority: bestCity.attackPriority,
        assessment: bestCity,
        reason: bestCity.reason
      });
    }
  }

  // 按优先级排序并选择最佳策略
  strategies.sort((a, b) => b.priority - a.priority);

  if (strategies.length > 0) {
    const bestStrategy = strategies[0];
    return {
      strategy: bestStrategy.type,
      priority: bestStrategy.priority,
      confidence: 85,
      details: bestStrategy.assessment,
      reason: bestStrategy.reason,
      executionPlan: []
    };
  }

  // 默认策略：集合兵力
  return {
    strategy: StrategyType.GATHER_FORCES,
    priority: 30,
    confidence: 50,
    details: {},
    reason: '无明确目标，集合兵力待命',
    executionPlan: ['集合所有英雄', '等待机会']
  };
}

/**
 * 根据策略类型设置具体目标到TeamBlackboard
 */
function setStrategyTarget(strategy: StrategyType, blackboard: TeamBlackboard, agent: any): void {
  switch (strategy) {
    case StrategyType.FOCUS_FIRE:
    case StrategyType.ATTACK_ENEMY:
      setEnemyTarget(blackboard, agent);
      break;

    case StrategyType.GATHER_FORCES:
      setGatherTarget(blackboard, agent);
      break;

    case StrategyType.ATTACK_CITY:
      setCityTarget(blackboard, agent);
      break;

    case StrategyType.CAPTURE_FLAG:
      setFlagTarget(blackboard, agent);
      break;
  }
}

/**
 * 设置敌方目标（距离最近，距离相同选血量少的）
 */
function setEnemyTarget(blackboard: TeamBlackboard, agent: any): void {
  const myHeroes = blackboard.getMyAliveHeroes();
  const enemyHeroes = blackboard.getEnemyAliveHeroes();
  
  if (myHeroes.length === 0 || enemyHeroes.length === 0) {
    agent.log('[策略分析] 无法设置敌方目标：缺少英雄数据');
    return;
  }

  // 计算所有敌人与我方英雄的平均距离
  const enemyDistances = enemyHeroes.map(enemy => {
    if (!enemy.position) return { enemy, avgDistance: 999, minDistance: 999 };
    
    const distances = myHeroes
      .filter(hero => hero.position)
      .map(hero => {
        const dist = AnalysisTools.calculateShortestDistance(hero.position!, enemy.position!);
        return dist.isReachable ? dist.realDistance : 999;
      });
    
    const avgDistance = distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 999;
    const minDistance = distances.length > 0 ? Math.min(...distances) : 999;
    
    return { enemy, avgDistance, minDistance };
  });

  // 过滤掉不可达的敌人
  const reachableEnemies = enemyDistances.filter(item => item.avgDistance < 999);
  
  if (reachableEnemies.length === 0) {
    agent.log('[策略分析] 无可达的敌方目标');
    return;
  }

  // 按平均距离排序，距离相同按血量排序（血量少的优先）
  reachableEnemies.sort((a, b) => {
    if (Math.abs(a.avgDistance - b.avgDistance) < 0.1) {
      // 距离相同，选血量少的
      return a.enemy.life - b.enemy.life;
    }
    return a.avgDistance - b.avgDistance;
  });

  const targetEnemy = reachableEnemies[0].enemy;
  
  // 使用setFocusTarget设置目标
  blackboard.setFocusTarget(targetEnemy.roleId.toString());
  
  agent.log(`[策略分析] 设置敌方目标: 英雄${targetEnemy.roleId} (血量: ${targetEnemy.life}/${targetEnemy.maxLife}, 距离: ${reachableEnemies[0].avgDistance.toFixed(1)})`);
}

/**
 * 设置集合位置目标
 */
function setGatherTarget(blackboard: TeamBlackboard, agent: any): void {
  const myHeroes = blackboard.getMyAliveHeroes();
  const enemyHeroes = blackboard.getEnemyAliveHeroes();
  
  if (myHeroes.length === 0) {
    agent.log('[策略分析] 无法设置集合目标：无存活英雄');
    return;
  }

  // 计算我方英雄的中心位置
  const validHeroes = myHeroes.filter(hero => hero.position);
  if (validHeroes.length === 0) {
    agent.log('[策略分析] 无法设置集合目标：无有效位置的英雄');
    return;
  }

  const centerX = validHeroes.reduce((sum, hero) => sum + hero.position!.x, 0) / validHeroes.length;
  const centerY = validHeroes.reduce((sum, hero) => sum + hero.position!.y, 0) / validHeroes.length;
  
  // 如果有敌人，选择远离敌人的安全位置
  let gatherPosition = { x: Math.round(centerX), y: Math.round(centerY) };
  
  if (enemyHeroes.length > 0) {
    const enemyCenter = enemyHeroes
      .filter(enemy => enemy.position)
      .reduce((acc, enemy) => {
        acc.x += enemy.position!.x;
        acc.y += enemy.position!.y;
        acc.count++;
        return acc;
      }, { x: 0, y: 0, count: 0 });
    
    if (enemyCenter.count > 0) {
      enemyCenter.x /= enemyCenter.count;
      enemyCenter.y /= enemyCenter.count;
      
      // 选择远离敌人的位置
      const dx = centerX - enemyCenter.x;
      const dy = centerY - enemyCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // 向远离敌人的方向偏移
        const offsetX = (dx / distance) * 3;
        const offsetY = (dy / distance) * 3;
        gatherPosition = {
          x: Math.round(centerX + offsetX),
          y: Math.round(centerY + offsetY)
        };
      }
    }
  }

  // 创建一个虚拟的集合目标ID（使用位置坐标）
  const gatherTargetId = `gather_${gatherPosition.x}_${gatherPosition.y}`;
  blackboard.setFocusTarget(gatherTargetId);
  
  agent.log(`[策略分析] 设置集合目标: 位置(${gatherPosition.x}, ${gatherPosition.y})`);
}

/**
 * 设置城寨攻击目标
 */
function setCityTarget(blackboard: TeamBlackboard, agent: any): void {
  const cities = blackboard.getCities();
  const myHeroes = blackboard.getMyAliveHeroes();
  
  if (cities.length === 0 || myHeroes.length === 0) {
    agent.log('[策略分析] 无法设置城寨目标：缺少城寨或英雄数据');
    return;
  }

  // 计算每个城寨的攻击优先级
  const cityPriorities = cities.map(city => {
    if (!city.position) return { city, priority: 0, avgDistance: 999 };
    
    const distances = myHeroes
      .filter(hero => hero.position)
      .map(hero => {
        const dist = AnalysisTools.calculateShortestDistance(hero.position!, city.position!);
        return dist.isReachable ? dist.realDistance : 999;
      });
    
    const avgDistance = distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 999;
    
    // 优先级 = 血量低 + 距离近
    const healthScore = (1 - city.healthPercentage / 100) * 50; // 血量越低分数越高
    const distanceScore = Math.max(0, 50 - avgDistance); // 距离越近分数越高
    const priority = healthScore + distanceScore;
    
    return { city, priority, avgDistance };
  });

  // 选择优先级最高的城寨
  const bestCity = cityPriorities
    .filter(item => item.avgDistance < 999)
    .sort((a, b) => b.priority - a.priority)[0];
  
  if (!bestCity) {
    agent.log('[策略分析] 无可达的城寨目标');
    return;
  }

  blackboard.setFocusTarget(bestCity.city.roleId.toString());
  
  agent.log(`[策略分析] 设置城寨目标: ${bestCity.city.cityType} (血量: ${bestCity.city.healthPercentage}%, 距离: ${bestCity.avgDistance.toFixed(1)})`);
}

/**
 * 设置龙旗占领目标
 */
function setFlagTarget(blackboard: TeamBlackboard, agent: any): void {
  const stronghold = blackboard.getStronghold();
  const myHeroes = blackboard.getMyAliveHeroes();
  
  if (!stronghold || !stronghold.position || myHeroes.length === 0) {
    agent.log('[策略分析] 无法设置龙旗目标：缺少据点或英雄数据');
    return;
  }

  // 计算到龙旗的距离
  const distances = myHeroes
    .filter(hero => hero.position)
    .map(hero => {
      const dist = AnalysisTools.calculateShortestDistance(hero.position!, stronghold.position!);
      return dist.isReachable ? dist.realDistance : 999;
    });
  
  const avgDistance = distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 999;
  
  if (avgDistance >= 999) {
    agent.log('[策略分析] 龙旗位置不可达');
    return;
  }

  // 创建龙旗目标ID
  const flagTargetId = `flag_${stronghold.position.x}_${stronghold.position.y}`;
  blackboard.setFocusTarget(flagTargetId);
  
  agent.log(`[策略分析] 设置龙旗目标: 位置(${stronghold.position.x}, ${stronghold.position.y}), 距离: ${avgDistance.toFixed(1)}`);
}

/**
 * 输出当前策略信息
 */
function logCurrentStrategyInfo(blackboard: TeamBlackboard, agent: any): void {
  const currentStrategy = blackboard.getCurrentStrategy();
  const focusTargetId = blackboard.getFocusTargetId();
  
  if (currentStrategy) {
    agent.log(`[策略分析] 当前策略: ${currentStrategy}`);
    
    if (focusTargetId) {
      agent.log(`[策略分析] 目标设置: ${focusTargetId}`);
    }

    // 输出策略历史信息
    const recentHistory = blackboard.getRecentStrategyHistory(3);
    if (recentHistory.length > 1) {
      log(`[策略分析] 最近策略变化:`);
      recentHistory.slice(-3).forEach((entry, index) => {
        const result = entry.result ? ` (${entry.result})` : '';
        log(`  回合${entry.round}: ${entry.strategy}${result}`);
      });
    }
  }
}

/**
 * 获取当前策略（供其他动作使用）
 */
export function getCurrentStrategy(blackboard: TeamBlackboard): StrategyType | null {
  return blackboard.getCurrentStrategy();
}

/**
 * 检查策略是否需要更新（供其他动作使用）
 */
export function isStrategyStale(blackboard: TeamBlackboard, maxAgeRounds: number = 3): boolean {
  const updatedRound = blackboard.getData('strategy_updated_round') || 0;
  const currentRound = blackboard.getCurrentRound();
  return (currentRound - updatedRound) >= maxAgeRounds;
}

/**
 * 获取策略执行计划（供其他动作使用）
 */
export function getStrategyExecutionPlan(blackboard: TeamBlackboard): string[] {
  return blackboard.getData('strategy_execution_plan') || [];
}

/**
 * 获取战斗模式（供其他动作使用）
 */
export function getCombatMode(blackboard: TeamBlackboard): string {
  return blackboard.getData('combat_mode') || 'balanced';
}

/**
 * 获取阵型偏好（供其他动作使用）
 */
export function getFormationPreference(blackboard: TeamBlackboard): string {
  return blackboard.getData('formation_preference') || 'balanced';
}

/**
 * 获取当前策略的详细数据（供其他动作使用）
 */
export function getCurrentStrategyData(blackboard: TeamBlackboard): any {
  return blackboard.getCurrentStrategyData();
}

/**
 * 记录策略执行结果（供其他动作使用）
 */
export function recordStrategyResult(blackboard: TeamBlackboard, result: 'SUCCESS' | 'FAILED' | 'INTERRUPTED'): void {
  blackboard.recordStrategyResult(result);
}