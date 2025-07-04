/**
 * 行为树控制器
 * ============
 * 
 * 使用行为树框架来控制AI代理的决策和行为
 * 
 * @author AI游戏框架开发团队
 * @version 2.0.0
 */

import { BehaviourTree } from 'mistreevous';
import { ActionContext, IAgent } from '../core/types';
import { GameMap } from '../context/gameMap';
import { BehaviorTreeAgent } from './BehaviorTreeAgent';
import { Agent } from 'mistreevous/dist/Agent';
import { teamBehaviorTree } from './BehaviorTree';

/**
 * 行为树控制器类
 * 
 * 负责：
 * - 管理代理的行为树实例
 * - 执行行为树更新
 * - 处理调试和日志
 */
export class BehaviorTreeController {
  private behaviorTreeAgent: BehaviorTreeAgent;
  private behaviorTree: BehaviourTree;

  /**
   * 构造函数
   * @param agent 要控制的代理
   * @param gameMap 游戏地图
   * @param allAgents 所有代理列表（用于感知）
   * @param treeDefinition 行为树定义（MDSL字符串或JSON对象）
   * @param debug 是否开启调试模式
   */
  constructor(
    context: ActionContext,
    private debug: boolean = false
  ) {
    // 创建行为树代理包装器
    this.behaviorTreeAgent = new BehaviorTreeAgent(context);

    // 创建行为树实例
    this.behaviorTree = new BehaviourTree(teamBehaviorTree, this.behaviorTreeAgent as unknown as Agent);

    if (debug) {
      this.log('行为树控制器初始化完成');
    }
  }

  /**
   * 执行AI回合决策
   */
  public takeTurn(): void {

    this.log(`开始执行行为树..`);

    try {
      // 更新感知信息
      this.updateInfo();

      // 执行行为树
      this.behaviorTree.step();

      // 检查行为树是否已完成
      if (!this.behaviorTree.isRunning()) {
        this.log('行为树执行完成，重置树状态');
        this.behaviorTree.reset();
      }

    } catch (error) {
      this.log(`行为树执行出错: ${error}`);
      // 发生错误时重置行为树
      this.behaviorTree.reset();
      // 执行默认行为（空闲）
    }
  }

  /**

  /**
   * 获取当前行为树状态
   */
  public getTreeState(): string {
    return this.behaviorTree.getState().toString();
  }

  /**
   * 检查行为树是否正在运行
   */
  public isTreeRunning(): boolean {
    return this.behaviorTree.isRunning();
  }


  /**
   * 获取行为树详细信息（用于调试）
   */
  public getTreeDetails(): any {
    return this.behaviorTree.getTreeNodeDetails();
  }

  /**
   * 输出日志
   * @param message 日志消息
   */
  private log(message: string): void {
    if (this.debug) {
      this.behaviorTreeAgent.agent.log(`[行为树控制器] ${message}`);
    }
  }
} 