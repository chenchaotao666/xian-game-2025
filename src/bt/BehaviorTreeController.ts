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
import { IAgent } from '../core/types';
import { GameMap } from '../context/gameMap';
import { BehaviorTreeAgent } from './BehaviorTreeAgent';
import { Agent } from 'mistreevous/dist/Agent';

/**
 * 行为树控制器类
 * 
 * 负责：
 * - 管理代理的行为树实例
 * - 执行行为树更新
 * - 处理调试和日志
 */
export class BehaviorTreeController{
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
    agent: IAgent,
    gameMap: GameMap,
    allAgents: IAgent[],
    treeDefinition: string,
    private debug: boolean = false
  ) {
    // 创建行为树代理包装器
    this.behaviorTreeAgent = new BehaviorTreeAgent(agent, gameMap, allAgents);
    
    // 创建行为树实例
    this.behaviorTree = new BehaviourTree(treeDefinition, this.behaviorTreeAgent as unknown as Agent);
    
    if (debug) {
      this.log('行为树控制器初始化完成');
    }
  }

  /**
   * 执行AI回合决策
   */
  public takeTurn(): void {
    const agent = this.behaviorTreeAgent.agent;
    
    this.log(`开始为 ${agent.id} 执行行为树... (位置: ${agent.position.x},${agent.position.y} 生命: ${agent.health})`);

    try {
      // 更新感知信息
      this.updateInfo();

      // 执行行为树
      const result = this.behaviorTree.step();
      
      if (this.debug) {
        this.log(`行为树执行结果: ${result.toString()}`);
        
        // 如果需要更详细的调试信息
        const treeDetails = this.behaviorTree.getTreeNodeDetails();
        console.log('行为树节点详情:', treeDetails);
      }

      // 检查行为树是否已完成
      if (!this.behaviorTree.isRunning()) {
        this.log('行为树执行完成，重置树状态');
        this.behaviorTree.reset();
      }

      return result;
    } catch (error) {
      this.log(`行为树执行出错: ${error}`);
      // 发生错误时重置行为树
      this.behaviorTree.reset();
      // 执行默认行为（空闲）
      agent.performIdle();
    }

    agent.log(`${agent.id} 的回合结束。\n`);
  }

  /**
   * 更新代理的感知信息
   */
  private updateInfo(): void {
    const agent = this.behaviorTreeAgent.agent;
    const allAgents = this.behaviorTreeAgent.allAgents;
    const gameMap = this.behaviorTreeAgent.gameMap;

    // 更新可见敌人和盟友
    agent.visibleEnemies = [];
    agent.visibleAllies = [];

    for (const otherAgent of allAgents) {
      if (otherAgent.id === agent.id) continue;

      // 检查是否可以看见
      if (agent.canSeeAgent(gameMap, otherAgent)) {
        if (otherAgent.teamId === agent.teamId) {
          agent.visibleAllies.push(otherAgent);
        } else {
          agent.visibleEnemies.push(otherAgent);
        }
      }
    }

    if (this.debug) {
      this.log(`感知更新: 可见敌人 ${agent.visibleEnemies.length}, 可见盟友 ${agent.visibleAllies.length}`);
    }
  }

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