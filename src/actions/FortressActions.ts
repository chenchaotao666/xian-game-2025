import { State } from 'mistreevous';
import { ActionContext } from '../core/types';
import ActionBuilder from '../network/ActionBuilder';
import { AnalysisTools } from '../core/AnalysisTools';
import { log } from '../index';

/**
 * 城寨相关动作
 * ============
 * 
 * 包含城寨攻击、寻路到城寨等动作
 */

/**
 * 执行寻找城寨
 * 从团队黑板中读取城寨目标，然后使用寻路方法前往目标
 */
export function ExecuteSeekFortress(context: ActionContext): State {
  try {
    const { agent, teamBlackboard } = context;
    
    if (!agent || !teamBlackboard) {
      log('[寻找城寨] 缺少必要的上下文信息');
      return State.FAILED;
    }

    // 获取当前英雄信息
    const currentHero = teamBlackboard.getHeroById(agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      log('[寻找城寨] 当前英雄无效、已阵亡或位置未知');
      return State.FAILED;
    }

    // 从团队黑板中获取城寨攻击目标
    const cityTarget = teamBlackboard.getCityAttackTarget();
    if (!cityTarget) {
      log('[寻找城寨] 团队黑板中没有城寨目标');
      return State.FAILED;
    }

    if (!cityTarget.position) {
      log('[寻找城寨] 城寨目标位置未知');
      return State.FAILED;
    }

    // 计算到城寨的最短路径
    const distanceResult = AnalysisTools.calculateShortestDistance(
      currentHero.position,
      cityTarget.position
    );

    if (!distanceResult.isReachable) {
      log(`[寻找城寨] 无法到达城寨目标 ${cityTarget.cityType}(${cityTarget.cityId})`);
      return State.FAILED;
    }

    // 如果已经在攻击范围内，不需要移动
    const attackRange = 3; // 默认攻击范围
    if (distanceResult.realDistance <= attackRange) {
      log(`[寻找城寨] 英雄${currentHero.roleId}已在城寨${cityTarget.cityType}攻击范围内`);
      return State.SUCCEEDED;
    }

    // 计算移动目标位置（尽可能靠近城寨，但在攻击范围内）
    let targetPosition = cityTarget.position;
    
    // 如果路径存在，选择路径上距离城寨攻击范围内的最近点
    if (distanceResult.path && distanceResult.path.length > 0) {
      // 从路径末尾开始向前查找，找到距离城寨攻击范围内的点
      for (let i = distanceResult.path.length - 1; i >= 0; i--) {
        const pathPoint = distanceResult.path[i];
        const distanceToTarget = AnalysisTools.calculateShortestDistance(
          pathPoint,
          cityTarget.position
        );
        
        if (distanceToTarget.realDistance <= attackRange) {
          targetPosition = pathPoint;
          break;
        }
      }
    }

    // 构建移动命令
    ActionBuilder.buildMoveAction(currentHero.roleId, targetPosition);
    
    log(`[寻找城寨] 英雄${currentHero.roleId}向城寨${cityTarget.cityType}(${cityTarget.cityId})移动到位置(${targetPosition.x}, ${targetPosition.y})`);
    
    return State.SUCCEEDED;
    
  } catch (error) {
    log(`[寻找城寨] 执行失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行攻击城寨
 * 对城寨目标发起攻击
 */
export function ExecuteAttackFortress(context: ActionContext): State {
  try {
    const { agent, teamBlackboard } = context;
    
    if (!agent || !teamBlackboard) {
      log('[攻击城寨] 缺少必要的上下文信息');
      return State.FAILED;
    }

    // 获取当前英雄信息
    const currentHero = teamBlackboard.getHeroById(agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      log('[攻击城寨] 当前英雄无效、已阵亡或位置未知');
      return State.FAILED;
    }

    // 从团队黑板中获取城寨攻击目标
    const cityTarget = teamBlackboard.getCityAttackTarget();
    if (!cityTarget || !cityTarget.position) {
      log('[攻击城寨] 没有有效的城寨目标');
      return State.FAILED;
    }

    // 构建攻击城寨命令
    ActionBuilder.buildSiegeAction(currentHero.roleId, cityTarget.position);
    
    log(`[攻击城寨] 英雄${currentHero.roleId}攻击城寨${cityTarget.cityType}(${cityTarget.cityId})`);
    
    return State.SUCCEEDED;
    
  } catch (error) {
    log(`[攻击城寨] 执行失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行寻找敌人
 * 从团队黑板中读取敌人目标，然后使用寻路方法前往目标
 */
export function ExecuteSeekEnemy(context: ActionContext): State {
  try {
    const { agent, teamBlackboard } = context;
    
    if (!agent || !teamBlackboard) {
      log('[寻找敌人] 缺少必要的上下文信息');
      return State.FAILED;
    }

    // 获取当前英雄信息
    const currentHero = teamBlackboard.getHeroById(agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      log('[寻找敌人] 当前英雄无效、已阵亡或位置未知');
      return State.FAILED;
    }

    // 从团队黑板中获取集火目标
    const focusTarget = teamBlackboard.getFocusTarget();
    if (!focusTarget || focusTarget.targetType !== 'enemy_hero' || !focusTarget.heroTarget) {
      log('[寻找敌人] 团队黑板中没有敌人目标');
      return State.FAILED;
    }

    const enemyTarget = focusTarget.heroTarget;
    if (!enemyTarget.position) {
      log('[寻找敌人] 敌人目标位置未知');
      return State.FAILED;
    }

    // 计算到敌人的最短路径
    const distanceResult = AnalysisTools.calculateShortestDistance(
      currentHero.position,
      enemyTarget.position
    );

    if (!distanceResult.isReachable) {
      log(`[寻找敌人] 无法到达敌人目标 英雄${enemyTarget.roleId}`);
      return State.FAILED;
    }

    // 如果已经在攻击范围内，不需要移动
    const attackRange = 3; // 默认攻击范围
    if (distanceResult.realDistance <= attackRange) {
      log(`[寻找敌人] 英雄${currentHero.roleId}已在敌人${enemyTarget.roleId}攻击范围内`);
      return State.SUCCEEDED;
    }

    // 计算移动目标位置（尽可能靠近敌人，但在攻击范围内）
    let targetPosition = enemyTarget.position;
    
    // 如果路径存在，选择路径上距离敌人攻击范围内的最近点
    if (distanceResult.path && distanceResult.path.length > 0) {
      // 从路径末尾开始向前查找，找到距离敌人攻击范围内的点
      for (let i = distanceResult.path.length - 1; i >= 0; i--) {
        const pathPoint = distanceResult.path[i];
        const distanceToTarget = AnalysisTools.calculateShortestDistance(
          pathPoint,
          enemyTarget.position
        );
        
        if (distanceToTarget.realDistance <= attackRange) {
          targetPosition = pathPoint;
          break;
        }
      }
    }

    // 构建移动命令
    ActionBuilder.buildMoveAction(currentHero.roleId, targetPosition);
    
    log(`[寻找敌人] 英雄${currentHero.roleId}向敌人${enemyTarget.roleId}移动到位置(${targetPosition.x}, ${targetPosition.y})`);
    
    return State.SUCCEEDED;
    
  } catch (error) {
    log(`[寻找敌人] 执行失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行移动到龙旗
 * 从团队黑板中读取龙旗目标，然后使用寻路方法前往目标
 */
export function ExecuteMoveToFlag(context: ActionContext): State {
  try {
    const { agent, teamBlackboard } = context;
    
    if (!agent || !teamBlackboard) {
      log('[移动到龙旗] 缺少必要的上下文信息');
      return State.FAILED;
    }

    // 获取当前英雄信息
    const currentHero = teamBlackboard.getHeroById(agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      log('[移动到龙旗] 当前英雄无效、已阵亡或位置未知');
      return State.FAILED;
    }

    // 从团队黑板中获取龙旗目标
    const stronghold = teamBlackboard.getStronghold();
    if (!stronghold || !stronghold.position) {
      log('[移动到龙旗] 没有有效的龙旗目标');
      return State.FAILED;
    }

    // 计算到龙旗的最短路径
    const distanceResult = AnalysisTools.calculateShortestDistance(
      currentHero.position,
      stronghold.position
    );

    if (!distanceResult.isReachable) {
      log(`[移动到龙旗] 无法到达龙旗位置(${stronghold.position.x}, ${stronghold.position.y})`);
      return State.FAILED;
    }

    // 如果已经在龙旗位置，不需要移动
    if (distanceResult.realDistance === 0) {
      log(`[移动到龙旗] 英雄${currentHero.roleId}已在龙旗位置`);
      return State.SUCCEEDED;
    }

    // 移动到龙旗位置
    ActionBuilder.buildMoveAction(currentHero.roleId, stronghold.position);
    
    log(`[移动到龙旗] 英雄${currentHero.roleId}向龙旗位置(${stronghold.position.x}, ${stronghold.position.y})移动`);
    
    return State.SUCCEEDED;
    
  } catch (error) {
    log(`[移动到龙旗] 执行失败: ${error}`);
    return State.FAILED;
  }
}

/**
 * 执行攻击敌人
 * 对敌人目标发起攻击
 */
export function ExecuteAttackEnemy(context: ActionContext): State {
  try {
    const { agent, teamBlackboard } = context;
    
    if (!agent || !teamBlackboard) {
      log('[攻击敌人] 缺少必要的上下文信息');
      return State.FAILED;
    }

    // 获取当前英雄信息
    const currentHero = teamBlackboard.getHeroById(agent.id);
    if (!currentHero || !currentHero.isAlive || !currentHero.position) {
      log('[攻击敌人] 当前英雄无效、已阵亡或位置未知');
      return State.FAILED;
    }

    // 从团队黑板中获取集火目标
    const focusTarget = teamBlackboard.getFocusTarget();
    if (!focusTarget || focusTarget.targetType !== 'enemy_hero' || !focusTarget.heroTarget) {
      log('[攻击敌人] 团队黑板中没有敌人目标');
      return State.FAILED;
    }

    const enemyTarget = focusTarget.heroTarget;
    if (!enemyTarget.position) {
      log('[攻击敌人] 敌人目标位置未知');
      return State.FAILED;
    }

    // 构建攻击命令
    ActionBuilder.buildAttackAction(currentHero.roleId, enemyTarget.position);
    
    log(`[攻击敌人] 英雄${currentHero.roleId}攻击敌人${enemyTarget.roleId}`);
    
    return State.SUCCEEDED;
    
  } catch (error) {
    log(`[攻击敌人] 执行失败: ${error}`);
    return State.FAILED;
  }
}
