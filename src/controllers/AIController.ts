/**
 * AI控制器
 * =========
 * 
 * 负责代理的AI决策和行为选择
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { IAgent, IUtilityAction, ActionContext, GlobalGoalType } from '../core/types';
import { GameMap } from '../gameMap';
import { MIN_SCORE } from '../aggregators';
import { FleeAction } from '../actions/basic/FleeAction';

/**
 * AI控制器类
 * 
 * 实现效用AI的决策逻辑，包括：
 * - 行为效用值计算
 * - 全局目标影响
 * - 紧急逃跑覆盖
 * - 最优行为选择
 */
export class AIController {
  private readonly agent: IAgent;
  private readonly availableMainActions: IUtilityAction[];
  private readonly gameMap: GameMap;

  // AI 行为配置参数
  private static readonly W_GLOBAL_GOAL_ON_ACTION_DIRECT_INFLUENCE = 0.3;
  private static readonly FLEE_UTILITY_THRESHOLD = 0.75;
  private static readonly FLEE_HEALTH_RATIO_THRESHOLD = 0.35;

  /**
   * 构造函数
   * @param agent 控制的代理对象
   * @param mainActions 可用的行为列表
   * @param gameMap 游戏地图
   * @param debug 是否开启调试模式
   */
  constructor(agent: IAgent, mainActions: IUtilityAction[], gameMap: GameMap, private debug?: boolean) {
    this.agent = agent;
    this.availableMainActions = mainActions;
    this.gameMap = gameMap;
  }

  /**
   * 输出调试日志
   * @param message 日志消息
   */
  private log(message: string): void {
    this.agent.log(`[AIController] ${message}`);
  }

  /**
   * 尝试紧急逃跑覆盖
   * @returns 是否执行了逃跑
   */
  private attemptFleeOverride(): boolean {
    const fleeActionInstance = this.availableMainActions.find(a => a.name === '逃跑') as FleeAction;
    if (fleeActionInstance) {
      const fleeContext: ActionContext = { agent: this.agent, gameMap: this.gameMap };
      if (fleeActionInstance.canExecute(this.agent, fleeContext)) {
        const fleeUtilityScore = fleeActionInstance.calculateUtility(this.agent, fleeContext, this.debug);
        const healthRatio = this.agent.health / 100;

        if (fleeUtilityScore > AIController.FLEE_UTILITY_THRESHOLD && 
            healthRatio < AIController.FLEE_HEALTH_RATIO_THRESHOLD) {
          this.log(`紧急情况：生命值 (${(healthRatio * 100).toFixed(0)}%), 高逃跑意愿 (${fleeUtilityScore.toFixed(2)})。优先执行逃跑！`);
          fleeActionInstance.execute(this.agent, fleeContext);
          this.agent.log(`${this.agent.id} 的回合结束 (因执行逃跑覆盖)。\n`);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 执行AI回合决策
   */
  public takeTurn(): void {
    this.log(`开始为 ${this.agent.id} 的回合决策... (当前位置: ${this.agent.position.x},${this.agent.position.y} 生命: ${this.agent.health})`);

    // 检查紧急逃跑
    if (this.attemptFleeOverride()) {
      return;
    }

    let bestActionOverall: IUtilityAction | null = null;
    let bestContextOverall: ActionContext | null = null;
    let highestUtilityOverall = -Infinity;

    const currentGlobalObjective = this.agent.teamBlackboard.getHighestPriorityObjective();
    const actionUtility: { actionName: string, utility: number, target?: string, destination?: { x: number, y: number } }[] = [];

    // 遍历所有可用行为
    for (const action of this.availableMainActions) {
      let currentActionIterationUtility = -Infinity;
      let currentActionIterationContext: ActionContext | null = null;

      if (action.generateContexts) {
        // 对于有多个上下文的行为（如移动、攻击）
        const contexts = action.generateContexts(this.agent, this.gameMap);
        
        for (const generatedCtx of contexts) {
          const contextForScoring: ActionContext = { ...generatedCtx, agent: this.agent };

          if (action.canExecute(this.agent, contextForScoring)) {
            let utility = action.calculateUtility(this.agent, contextForScoring, this.debug);

            // 应用全局目标分数调整
            if (currentGlobalObjective && action.name !== '战略移动') {
              if (currentGlobalObjective.type === GlobalGoalType.ELIMINATE_ALL_ENEMIES &&
                (action.name.toLowerCase().includes('attack') || 
                 action.name.toLowerCase().includes('重创') || 
                 action.name.toLowerCase().includes('破甲'))) {
                utility *= (1 + AIController.W_GLOBAL_GOAL_ON_ACTION_DIRECT_INFLUENCE * currentGlobalObjective.priority);
              }
            }

            // 确保效用值不低于最小阈值
            utility = Math.max(MIN_SCORE, utility);

            if (this.debug) {
              const debugInfo: any = { actionName: action.name, utility };
              if (contextForScoring.destination) {
                debugInfo.destination = contextForScoring.destination;
              }
              if (contextForScoring.potentialTarget) {
                debugInfo.target = contextForScoring.potentialTarget.id;
              }
              actionUtility.push(debugInfo);
            }

            if (utility > currentActionIterationUtility) {
              currentActionIterationUtility = utility;
              currentActionIterationContext = contextForScoring;
            }
          }
        }
      } else {
        // 对于单一上下文的行为（如治疗、待命）
        const context: ActionContext = { agent: this.agent, gameMap: this.gameMap };
        if (action.canExecute(this.agent, context)) {
          let utility = action.calculateUtility(this.agent, context, this.debug);
          utility = Math.max(MIN_SCORE, utility);

          if (this.debug) {
            actionUtility.push({ actionName: action.name, utility });
          }

          currentActionIterationUtility = utility;
          currentActionIterationContext = context;
        }
      }

      // 更新全局最佳行为
      if (currentActionIterationUtility > highestUtilityOverall) {
        highestUtilityOverall = currentActionIterationUtility;
        bestActionOverall = action;
        bestContextOverall = currentActionIterationContext;
      }
    }

    // 执行最佳行为
    if (bestActionOverall && bestContextOverall) {
      this.log(`选择行为: ${bestActionOverall.name} (效用: ${highestUtilityOverall.toFixed(3)})`);
      
      if (this.debug) {
        console.log('=== 行为效用详情 ===');
        actionUtility.forEach(item => {
          console.log(`${item.actionName}: ${item.utility.toFixed(3)}${item.target ? ` -> ${item.target}` : ''}${item.destination ? ` -> (${item.destination.x},${item.destination.y})` : ''}`);
        });
        console.log('==================');
      }

      bestActionOverall.execute(this.agent, bestContextOverall);
    } else {
      this.log('没有找到可执行的行为！');
    }

    this.agent.log(`${this.agent.id} 的回合结束。\n`);
  }
} 