/**
 * 行为树代理
 * ==========
 * 
 * 将游戏代理与行为树框架集成，提供行为树所需的接口
 * 
 * @author AI游戏框架开发团队
 * @version 2.0.0
 */

import { BehaviourTree, State } from 'mistreevous';
import { IAgent, Position, ActionContext } from '../core/types';
import { GameMap } from '../context/gameMap';

// 导入所有条件函数
import * as conditions from '../conditions';

// 导入所有动作类
import * as actions from '../actions';
import { heroBehaviorTree } from './BehaviorTree';
import { Agent } from 'mistreevous/dist/Agent';

/**
 * 行为树节点接口
 * 声明所有可能的条件和动作方法
 */
interface IBehaviorTreeNodes {
  // 条件方法 (返回boolean)
  IsInDanger(): boolean;
  IsDragonFlagOpen(): boolean;
  CanCaptureDragonFlag(): boolean;
  ShouldPrepareForCapture(): boolean;
  EnemyCapturingFlag(): boolean;
  IsMidGame(): boolean;
  ShouldAttackEnemy(): boolean;
  ShouldAttackFortress(): boolean;
  IsEarlyGame(): boolean;
  HasEnemyInRange(): boolean;
  
  // 新增的游戏状态条件
  ShouldPickGeneral(): boolean;
  CanChooseBuff(): boolean;
  CanUseSkill(): boolean;
  CanUseEscapeSkill(): boolean;
  CanTeleport(): boolean;
  
  // 新增的战略条件
  NeedMoreTroops(): boolean;
  ShouldChangeFormation(): boolean;
  HasEnoughFood(): boolean;
  ShouldPrioritizeDevelopment(): boolean;
  
  // 动作方法 (返回State)
  ExecuteEscape(): State;
  ExecuteCapture(): State;
  ExecutePreparation(): State;
  ExecuteAttack(): State;
  ExecuteDevelopment(): State;
  AttackAction(): State;
  
  // 新增的游戏状态动作
  ExecutePickGeneral(): State;
  ExecuteChooseBuff(): State;
  ExecuteSkill(): State;
  ExecuteEscapeSkill(): State;
  ExecuteTeleport(): State;
  
  // 新增的战略动作
  ExecuteProduceTroops(): State;
  ExecuteFormationChange(): State;
  ExecuteAttackFortress(): State;
  ExecuteIdle(): State;
}

/**
 * 行为树代理类
 * 
 * 将现有的游戏代理包装为行为树可用的格式
 * 动态挂载所有actions和conditions方法
 */
export class BehaviorTreeAgent implements IBehaviorTreeNodes {
  constructor(
    public context: ActionContext
  ) {
    // 动态绑定所有条件函数
    this.bindNodes(conditions);
    
    // 动态绑定所有动作类
    this.bindNodes(actions);
  }

  public executeHeroBehaviorTree(agent: IAgent) {
    // 切换上下文武将
    this.context.agent = agent;
    const bt = new BehaviourTree(heroBehaviorTree, this as unknown as Agent);
    bt.step();
    this.context.agent = null;
  }

  public ExecuteWarriorActions(): void {
    this.executeHeroBehaviorTree(this.context.teamBlackboard.warrior);
  }

  public ExecuteLeaderActions(): void {
    this.executeHeroBehaviorTree(this.context.teamBlackboard.leader);
  }
  
  public ExecuteSupportActions(): void {
    this.executeHeroBehaviorTree(this.context.teamBlackboard.support);
  }

  /**
   * 动态绑定条件函数
   */
  private bindNodes(nodes: Record<string, Function>): void {
    Object.keys(nodes).forEach(nodeName => {
      const conditionFn = (nodes as any)[nodeName];
      if (typeof conditionFn === 'function') {
        // 将函数名转换为PascalCase（行为树节点名称格式）
        const treeName = this.toPascalCase(nodeName);
        
        // 绑定到this上，自动传入context
        (this as any)[treeName] = () => {
          if (conditionFn.length === 0) {
            // 无参数的条件函数
            return conditionFn();
          } else {
            // 需要context的条件函数
            return conditionFn(this.context);
          }
        };
      }
    });
  }

  /**
   * 将camelCase转换为PascalCase
   */
  public toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ============== 接口实现（运行时由动态绑定提供） ==============
  
  // 这些方法声明用于TypeScript类型检查，实际实现由动态绑定提供
  IsInDanger!: () => boolean;
  IsDragonFlagOpen!: () => boolean;
  CanCaptureDragonFlag!: () => boolean;
  ShouldPrepareForCapture!: () => boolean;
  EnemyCapturingFlag!: () => boolean;
  IsMidGame!: () => boolean;
  ShouldAttackEnemy!: () => boolean;
  ShouldAttackFortress!: () => boolean;
  IsEarlyGame!: () => boolean;
  HasEnemyInRange!: () => boolean;
  
  // 新增的游戏状态条件
  ShouldPickGeneral!: () => boolean;
  CanChooseBuff!: () => boolean;
  CanUseSkill!: () => boolean;
  CanUseEscapeSkill!: () => boolean;
  CanTeleport!: () => boolean;
  
  // 新增的战略条件
  NeedMoreTroops!: () => boolean;
  ShouldChangeFormation!: () => boolean;
  HasEnoughFood!: () => boolean;
  ShouldPrioritizeDevelopment!: () => boolean;
  
  ExecuteEscape!: () => State;
  ExecuteCapture!: () => State;
  ExecutePreparation!: () => State;
  ExecuteAttack!: () => State;
  ExecuteDevelopment!: () => State;
  AttackAction!: () => State;
  
  // 新增的游戏状态动作
  ExecutePickGeneral!: () => State;
  ExecuteChooseBuff!: () => State;
  ExecuteSkill!: () => State;
  ExecuteEscapeSkill!: () => State;
  ExecuteTeleport!: () => State;
  
  // 新增的战略动作
  ExecuteProduceTroops!: () => State;
  ExecuteFormationChange!: () => State;
  ExecuteAttackFortress!: () => State;
  ExecuteIdle!: () => State;

  // ============== 辅助方法 ==============

  private isAtPosition(position: Position): boolean {
    return this.agent.position.x === position.x && this.agent.position.y === position.y;
  }

  log(message: string): void {
    this.agent.log(`[行为树] ${message}`);
  }
} 