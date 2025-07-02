/**
 * 破甲打击技能行为
 * ==================
 * 
 * 施加破甲debuff的技能，为后续重创技能做准备
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { BaseUtilityAction } from '../BaseUtilityAction';
import { IAgent, ActionContext } from '../../core/types';
import { GameMap } from '../../gameMap';
import { getWeightedAverageAggregate } from '../../aggregators';
import { 
  SkillReadyConsideration, 
  ManaConsideration, 
  DistanceConsideration, 
  IsTeamFocusTargetConsideration 
} from '../../considerations';

/**
 * 破甲打击技能行为类
 * 
 * 这是一个控制类技能，特点：
 * - 需要20法力值
 * - 射程3格
 * - 施加破甲debuff（持续3回合）
 * - 优先对集火目标使用
 */
export class ApplyArmorBreakAction extends BaseUtilityAction {
  name = '使用破甲打击';
  private skillId = 'ArmorBreak';

  constructor() {
    super(
      [
        new SkillReadyConsideration('ArmorBreak'),
        new ManaConsideration(20),
        new DistanceConsideration(1, 3), // 中等射程
        new IsTeamFocusTargetConsideration(1.5, 0.3) // 优先对集火目标使用
      ],
      getWeightedAverageAggregate([0.9, 0.8, 0.6, 1.0])
    );
  }

  /**
   * 检查是否可以执行破甲打击
   * @param agent 代理对象
   * @param context 行为上下文
   * @returns 是否可执行
   */
  canExecute(agent: IAgent, context: ActionContext): boolean {
    if (!context?.potentialTarget) return false;
    if (!agent.isSkillReady(this.skillId) || agent.mana < 20) return false;
    const dist = agent.getDistanceToAgent(context.gameMap, context.potentialTarget);
    return dist <= 3; // 技能射程
  }

  /**
   * 执行破甲打击技能
   * @param realAgent 真实代理对象
   * @param context 行为上下文
   */
  execute(realAgent: IAgent, context: ActionContext): void {
    if (!context.potentialTarget?.id) return;
    
    const actualTarget = realAgent.visibleEnemies.find(e => e.id === context.potentialTarget!.id);
    if (actualTarget) {
      realAgent.performSkillOnTarget(this.skillId, actualTarget);
      // 在团队黑板上记录debuff
      realAgent.teamBlackboard.setTargetDebuff(actualTarget.id, '破甲', this.skillId, 3, realAgent.currentTurn);
    } else {
      realAgent.log(`${this.name} 错误: 目标 ${context.potentialTarget.id} 不可达或不存在。`);
    }
  }

  /**
   * 生成所有可能的破甲打击上下文
   * @param agent 代理对象
   * @param gameMap 游戏地图
   * @returns 上下文数组
   */
  generateContexts(agent: IAgent, gameMap: GameMap): ActionContext[] {
    const enemies = agent.visibleEnemies;
    return enemies
      .filter(enemy => agent.getDistanceToAgent(gameMap, enemy) <= 3) // 预过滤射程内敌人
      .map(enemy => ({
        agent,
        gameMap,
        potentialTarget: enemy,
        skillId: this.skillId
      }));
  }
} 