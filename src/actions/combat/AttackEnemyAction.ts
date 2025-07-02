/**
 * 攻击敌人行为
 * =============
 * 
 * 基础的攻击行为，选择最优敌人进行攻击
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext } from '../../core/types';
import { GameMap } from '../../gameMap';
import { getAverageAggregate } from '../../aggregators';
import { 
  DistanceConsideration, 
  HealthConsideration,
  IsTeamFocusTargetConsideration,
  TargetUnderAttackConsideration
} from '../../considerations';

/**
 * 攻击敌人行为类
 * 
 * 基础攻击行为，特点：
 * - 射程1格（近战攻击）
 * - 优先攻击集火目标
 * - 优先攻击低血量敌人
 * - 无法力消耗，无冷却时间
 */
export class AttackEnemyAction extends BaseUtilityAction {
  name = '攻击敌人';

  constructor() {
    super(
      [
        new DistanceConsideration(1, 1), // 近战攻击，射程1格
        new IsTeamFocusTargetConsideration(1.5, 0.5), // 优先集火目标
        new TargetUnderAttackConsideration(), // 优先攻击残血目标
        new HealthConsideration(false, true, 120) // 低血量目标优先
      ],
      getAverageAggregate()
    );
  }

  /**
   * 检查是否可以执行攻击
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  canExecute(agent: IAgent, context: ActionContext): boolean {
    if (!context?.potentialTarget) return false;
    
    // 检查距离是否在攻击范围内
    const distance = agent.getDistanceToAgent(context.gameMap, context.potentialTarget);
    return distance <= 1; // 近战攻击射程
  }

  /**
   * 执行攻击行为
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    if (!context.potentialTarget?.id) return;
    
    const actualTarget = realAgent.visibleEnemies.find(e => e.id === context.potentialTarget!.id);
    if (actualTarget) {
      realAgent.performAttack(actualTarget);
    } else {
      realAgent.log(`攻击错误: 目标 ${context.potentialTarget.id} 不可达或不存在。`);
    }
  }

  /**
   * 生成所有可能的攻击上下文
   * @param agent 代理对象
   * @param gameMap 游戏地图
   * @returns 上下文数组
   */
  generateContexts(agent: IAgent, gameMap: GameMap): ActionContext[] {
    const enemies = agent.visibleEnemies;
    return enemies
      .filter(enemy => agent.getDistanceToAgent(gameMap, enemy) <= 1) // 预过滤射程内敌人
      .map(enemy => ({
        agent,
        gameMap,
        potentialTarget: enemy
      }));
  }
} 