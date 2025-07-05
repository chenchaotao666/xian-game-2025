import { State } from 'mistreevous';
import { ActionContext } from '../core/types';
import { TeamBlackboard } from '../core/TeamBlackboard';
import { StrategyAnalysis, StrategyType, StrategyDecision } from '../core/StrategyAnalysis';
import { log } from '../index';

/**
 * 分析并设置策略动作
 * ====================
 * 
 * 该动作负责：
 * 1. 调用 StrategyAnalysis 进行全局策略分析
 * 2. 将分析结果设置到 TeamBlackboard 中
 * 3. 为后续的具体动作提供决策依据
 * 
 * 这是行为树执行的第一步，确保后续所有动作都基于当前最优策略
 */
export function AnalyzeAndSetStrategy(context: ActionContext): State {
  const { agent } = context;

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
      return State.SUCCEEDED; // 数据为空时不算失败，可能是游戏刚开始
    }

    log(`[策略分析] 开始策略分析 - 回合: ${gameState.round}`);

    // 创建策略分析器
    const strategyAnalysis = new StrategyAnalysis(teamBlackboard);

    // 执行全局策略分析
    const globalStrategy = strategyAnalysis.analyzeGlobalStrategy();

    // 记录策略决策
    log(`[策略分析] 全局策略决策: ${globalStrategy.strategy}`);
    log(`[策略分析] 优先级: ${globalStrategy.priority}, 置信度: ${globalStrategy.confidence}%`);
    log(`[策略分析] 决策理由: ${globalStrategy.reason}`);

    // 获取策略对应的详细数据
    const strategyData = getStrategyData(strategyAnalysis, globalStrategy.strategy);

    // 将策略信息设置到团队黑板
    teamBlackboard.setGlobalStrategy(
      globalStrategy.strategy,
      strategyData,
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

    // 输出当前策略信息
    logCurrentStrategyInfo(teamBlackboard, agent);

    return State.SUCCEEDED;

  } catch (error) {
    log(`[策略分析] 分析失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 获取策略对应的详细数据
 */
function getStrategyData(strategyAnalysis: StrategyAnalysis, strategy: StrategyType): any {
  switch (strategy) {
    case StrategyType.FOCUS_FIRE:
      return strategyAnalysis.analyzeFocusFireStrategy();

    case StrategyType.ATTACK_CITY:
      const cityAssessments = strategyAnalysis.analyzeCityAttackStrategy();
      return cityAssessments.length > 0 ? cityAssessments[0] : null;

    case StrategyType.ATTACK_ENEMY:
    case StrategyType.GATHER_FORCES:
      return strategyAnalysis.analyzeEnemyAttackStrategy();

    case StrategyType.CAPTURE_FLAG:
      return strategyAnalysis.analyzeFlagCaptureStrategy();

    default:
      return {};
  }
}

/**
 * 设置其他辅助策略信息
 */
function setAdditionalStrategyInfo(
  blackboard: TeamBlackboard,
  strategy: StrategyDecision,
  agent: any
): void {

  // 设置策略相关的元数据
  blackboard.setData('strategy_priority', strategy.priority);
  blackboard.setData('strategy_confidence', strategy.confidence);
  blackboard.setData('strategy_reason', strategy.reason);
  blackboard.setData('strategy_details', strategy.details);
  blackboard.setData('strategy_execution_plan', strategy.executionPlan);

  // 设置策略更新时间
  blackboard.setData('strategy_updated_at', Date.now());
  blackboard.setData('strategy_updated_round', blackboard.getCurrentRound());

  // 根据策略类型设置特定的行为指导
  switch (strategy.strategy) {
    case StrategyType.FOCUS_FIRE:
      blackboard.setData('combat_mode', 'aggressive');
      blackboard.setData('formation_preference', 'concentrated');
      break;

    case StrategyType.ATTACK_ENEMY:
      blackboard.setData('combat_mode', 'offensive');
      blackboard.setData('formation_preference', 'balanced');
      break;

    case StrategyType.GATHER_FORCES:
      blackboard.setData('combat_mode', 'gathering');
      blackboard.setData('formation_preference', 'defensive');
      break;

    case StrategyType.ATTACK_CITY:
      blackboard.setData('combat_mode', 'siege');
      blackboard.setData('formation_preference', 'siege');
      break;

    case StrategyType.CAPTURE_FLAG:
      blackboard.setData('combat_mode', 'territorial');
      blackboard.setData('formation_preference', 'mobile');
      break;

    case StrategyType.DEFENSIVE:
      blackboard.setData('combat_mode', 'defensive');
      blackboard.setData('formation_preference', 'defensive');
      break;

    case StrategyType.RESOURCE_MANAGEMENT:
      blackboard.setData('combat_mode', 'economic');
      blackboard.setData('formation_preference', 'conservative');
      break;
  }

  log(`[策略分析] 策略信息已设置到团队黑板: ${strategy.strategy}`);
}

/**
 * 输出当前策略信息
 */
function logCurrentStrategyInfo(blackboard: TeamBlackboard, agent: any): void {
  const currentStrategy = blackboard.getCurrentStrategy();

  if (currentStrategy) {
    log(`[策略分析] 当前策略: ${currentStrategy}`);

    // 根据策略类型输出相应的目标信息
    switch (currentStrategy) {
      case StrategyType.FOCUS_FIRE:
        const focusTarget = blackboard.getFocusTarget();
        if (focusTarget) {
          log(`[策略分析] 集火目标: 英雄${focusTarget.targetId} (优先级: ${focusTarget.priority})`);
          log(`[策略分析] 集火理由: ${focusTarget.reason}`);
        }
        break;

      case StrategyType.ATTACK_CITY:
        const cityTarget = blackboard.getCityAttackTarget();
        if (cityTarget) {
          log(`[策略分析] 城寨目标: ${cityTarget.cityType} (ID: ${cityTarget.cityId})`);
          log(`[策略分析] 城寨血量: ${cityTarget.healthPercentage}%, 距离: ${cityTarget.distance}`);
          log(`[策略分析] 攻击理由: ${cityTarget.reason}`);
        }
        break;

      case StrategyType.ATTACK_ENEMY:
        const enemyTarget = blackboard.getEnemyAttackTarget();
        if (enemyTarget) {
          log(`[策略分析] 敌方目标: 英雄${enemyTarget.targetEnemyId}`);
          log(`[策略分析] 实力对比: ${enemyTarget.powerComparison.toFixed(2)}, 风险等级: ${enemyTarget.riskLevel}`);
          log(`[策略分析] 攻击理由: ${enemyTarget.reason}`);
        }
        break;

      case StrategyType.GATHER_FORCES:
        const gatherPos = blackboard.getGatherPosition();
        if (gatherPos) {
          log(`[策略分析] 集合位置: (${gatherPos.position.x}, ${gatherPos.position.y})`);
          log(`[策略分析] 集合目的: ${gatherPos.purpose}`);
          log(`[策略分析] 预计时间: ${gatherPos.estimatedTime}回合`);
        }
        break;

      case StrategyType.CAPTURE_FLAG:
        const flagTarget = blackboard.getFlagCaptureTarget();
        if (flagTarget) {
          log(`[策略分析] 龙旗位置: (${flagTarget.flagPosition.x}, ${flagTarget.flagPosition.y})`);
          log(`[策略分析] 控制状态: ${flagTarget.controlStatus}, 风险: ${flagTarget.risk}`);
          log(`[策略分析] 占领理由: ${flagTarget.reason}`);
        }
        break;
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