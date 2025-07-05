import { State } from 'mistreevous';
import { ActionContext } from '../core/types';
import { StrategyType } from '../core/StrategyAnalysis';
import { AnalysisTools } from '../core/AnalysisTools';
import { log } from '../index';

/**
 * 战略动作模块
 * =============
 * 
 * 实现具体的战略执行动作：
 * - ExecuteAttackEnemy: 执行攻击敌方英雄
 * - ExecuteAttackFortress: 执行攻击城寨
 * 
 * 每个动作都会：
 * 1. 检查全局策略是否匹配
 * 2. 从TeamBlackboard获取相应目标
 * 3. 判断目标是否在攻击范围内
 * 4. 在范围内则攻击，不在范围内则移动
 */

/**
 * 执行攻击敌方英雄动作
 * ===================
 * 
 * 检查当前策略是否为攻击敌方，如果是则：
 * - 获取敌方攻击目标
 * - 判断目标是否在攻击范围内
 * - 在范围内则发起攻击，否则向目标移动
 */
export function ExecuteAttackEnemy(context: ActionContext): boolean {
  try {
    const { teamBlackboard, agent } = context;
    
    if (!teamBlackboard || !agent) {
      log('[战略动作] ExecuteAttackEnemy: 缺少必要的上下文信息');
      return false;
    }

    // 检查全局策略是否为攻击敌方
    const currentStrategy = teamBlackboard.getCurrentStrategy();
    if (currentStrategy !== StrategyType.FOCUS_FIRE && currentStrategy !== StrategyType.ATTACK_ENEMY) {
      log(`[战略动作] ExecuteAttackEnemy: 当前策略(${currentStrategy})不是攻击敌方，跳过执行`);
      return false;
    }

    // 从TeamBlackboard获取敌方攻击目标
    const enemyTarget = teamBlackboard.getEnemyTarget();
    if (!enemyTarget) {
      log('[战略动作] ExecuteAttackEnemy: 未找到敌方攻击目标');
      return false;
    }

    // 获取目标英雄的详细信息
    const targetHero = teamBlackboard.getHeroById(enemyTarget.targetEnemyId);
    if (!targetHero || !targetHero.isAlive || !targetHero.position) {
      log(`[战略动作] ExecuteAttackEnemy: 目标英雄${enemyTarget.targetEnemyId}无效或已阵亡`);
      return false;
    }

    // 检查当前英雄是否有效
    if (!agent.position) {
      log('[战略动作] ExecuteAttackEnemy: 当前英雄位置无效');
      return false;
    }

    // 计算到目标的距离
    const distance = AnalysisTools.calculateShortestDistance(agent.position, targetHero.position);
    if (!distance.isReachable) {
      log(`[战略动作] ExecuteAttackEnemy: 目标英雄${targetHero.roleId}不可达`);
      return false;
    }

    // 获取攻击范围（默认为3）
    const attackRange = 3;
    
    log(`[战略动作] ExecuteAttackEnemy: 目标英雄${targetHero.roleId}, 距离: ${distance.realDistance}, 攻击范围: ${attackRange}`);

    // 判断是否在攻击范围内
    if (distance.realDistance <= attackRange) {
      // 在攻击范围内，发起攻击
      if (agent.visibleEnemies.length > 0) {
        const targetAgent = agent.visibleEnemies.find(enemy => enemy.id === targetHero.roleId);
        if (targetAgent) {
          agent.performAttack(targetAgent);
          log(`[战略动作] ExecuteAttackEnemy: 成功攻击敌方英雄${targetHero.roleId}`);
          return true;
        }
      }
      // 如果找不到目标Agent，使用空闲动作
      agent.performIdle();
      log(`[战略动作] ExecuteAttackEnemy: 目标不在可见范围内，执行空闲动作`);
      return true;
    } else {
      // 不在攻击范围内，向目标移动
      const moveResult = moveTowardsTarget(context, targetHero.position);
      if (moveResult) {
        log(`[战略动作] ExecuteAttackEnemy: 向敌方英雄${targetHero.roleId}移动`);
        return true;
      } else {
        log(`[战略动作] ExecuteAttackEnemy: 向敌方英雄${targetHero.roleId}移动失败`);
        return false;
      }
    }

  } catch (error) {
    log(`[战略动作] ExecuteAttackEnemy 执行失败: ${error}`);
    return false;
  }
}

/**
 * 执行攻击城寨动作
 * ================
 * 
 * 检查当前策略是否为攻击城寨，如果是则：
 * - 获取城寨攻击目标
 * - 判断目标是否在攻击范围内
 * - 在范围内则发起攻击，否则向目标移动
 */
export function ExecuteAttackFortress(context: ActionContext): boolean {
  try {
    const { teamBlackboard, agent } = context;
    
    if (!teamBlackboard || !agent) {
      log('[战略动作] ExecuteAttackFortress: 缺少必要的上下文信息');
      return false;
    }

    // 检查全局策略是否为攻击城寨
    const currentStrategy = teamBlackboard.getCurrentStrategy();
    if (currentStrategy !== StrategyType.ATTACK_CITY) {
      log(`[战略动作] ExecuteAttackFortress: 当前策略(${currentStrategy})不是攻击城寨，跳过执行`);
      return false;
    }

    // 从TeamBlackboard获取城寨攻击目标
    const cityTarget = teamBlackboard.getCityTarget();
    if (!cityTarget) {
      log('[战略动作] ExecuteAttackFortress: 未找到城寨攻击目标');
      return false;
    }

    // 获取目标城寨的详细信息
    const targetCity = teamBlackboard.getCities().find(city => city.roleId === cityTarget.cityId);
    if (!targetCity || !targetCity.position) {
      log(`[战略动作] ExecuteAttackFortress: 目标城寨${cityTarget.cityId}无效或位置未知`);
      return false;
    }

    // 检查当前英雄是否有效
    if (!agent.position) {
      log('[战略动作] ExecuteAttackFortress: 当前英雄位置无效');
      return false;
    }

    // 计算到目标的距离
    const distance = AnalysisTools.calculateShortestDistance(agent.position, targetCity.position);
    if (!distance.isReachable) {
      log(`[战略动作] ExecuteAttackFortress: 目标城寨${targetCity.roleId}不可达`);
      return false;
    }

    // 获取攻击范围（默认为3）
    const attackRange = 3;
    
    log(`[战略动作] ExecuteAttackFortress: 目标城寨${targetCity.cityType}(${targetCity.roleId}), 距离: ${distance.realDistance}, 攻击范围: ${attackRange}`);

    // 判断是否在攻击范围内
    if (distance.realDistance <= attackRange) {
      // 在攻击范围内，执行攻击动作（对城寨使用空闲动作）
      agent.performIdle();
      log(`[战略动作] ExecuteAttackFortress: 对城寨${targetCity.cityType}(${targetCity.roleId})执行攻击`);
      return true;
    } else {
      // 不在攻击范围内，向目标移动
      const moveResult = moveTowardsTarget(context, targetCity.position);
      if (moveResult) {
        log(`[战略动作] ExecuteAttackFortress: 向城寨${targetCity.cityType}(${targetCity.roleId})移动`);
        return true;
      } else {
        log(`[战略动作] ExecuteAttackFortress: 向城寨${targetCity.cityType}(${targetCity.roleId})移动失败`);
        return false;
      }
    }

  } catch (error) {
    log(`[战略动作] ExecuteAttackFortress 执行失败: ${error}`);
    return false;
  }
}

/**
 * 向目标移动
 * @param context 动作上下文
 * @param targetPosition 目标位置
 * @returns 是否移动成功
 */
function moveTowardsTarget(context: ActionContext, targetPosition: { x: number; y: number }): boolean {
  try {
    const { agent } = context;
    
    if (!agent || !agent.position || !targetPosition) {
      return false;
    }

    // 计算目标方向
    const deltaX = targetPosition.x - agent.position.x;
    const deltaY = targetPosition.y - agent.position.y;
    
    // 计算移动的目标位置（向目标方向移动一格）
    const moveX = agent.position.x + (deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0);
    const moveY = agent.position.y + (deltaY > 0 ? 1 : deltaY < 0 ? -1 : 0);
    
    const movePosition = { x: moveX, y: moveY };

    // 执行移动
    agent.performMove(context, movePosition);
    return true;

  } catch (error) {
    log(`[战略动作] moveTowardsTarget 执行失败: ${error}`);
    return false;
  }
}