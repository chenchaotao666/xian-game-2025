/**
 * 行为树演示
 * ==========
 * 
 * 演示如何使用新的行为树框架来控制AI代理
 * 
 * @author AI游戏框架开发团队
 * @version 2.0.0
 */

import { GameMap } from '../context/gameMap';
import { Agent } from '../core/Agent';
import { TeamBlackboard } from '../core/TeamBlackboard';
import { GlobalGoalType } from '../core/types';
import { BehaviorTreeController } from './BehaviorTreeController';
import { BehaviorTreeBuilder } from './BehaviorTree';


/**
 * 行为树演示类
 */
export class BehaviorTreeDemo {
  private gameMap: GameMap;
  private agents: Agent[] = [];
  private behaviorTreeControllers: BehaviorTreeController[] = [];

  constructor() {
    // 创建一个简单的10x10地图，全部为空地
    const mapData = Array(100).fill(0).join(',');
    this.gameMap = new GameMap(mapData, 10, 10);
    this.setupDemo();
  }

  /**
   * 设置演示环境
   */
  private setupDemo(): void {
    console.log('=== 行为树AI演示开始 ===\n');

    // 创建队伍黑板
    const teamABlackboard = new TeamBlackboard();
    const teamBBlackboard = new TeamBlackboard();

    // 设置目标
    teamABlackboard.addObjective({
      type: GlobalGoalType.ELIMINATE_ALL_ENEMIES,
      priority: 1.0,
      id: 'eliminate_enemies'
    });

    teamBBlackboard.addObjective({
      type: GlobalGoalType.DEFEND_POINT,
      priority: 1.0,
      id: 'defend_position'
    });

    // 创建代理
    const agentA1 = new Agent('A1', 100, 100, { x: 2, y: 2 }, 'TeamA', teamABlackboard, 3);
    const agentB1 = new Agent('B1', 100, 100, { x: 8, y: 8 }, 'TeamB', teamBBlackboard, 3);

    this.agents = [agentA1, agentB1];

    // 创建行为树控制器
    this.behaviorTreeControllers = [
      new BehaviorTreeController(
        agentA1,
        this.gameMap,
        this.agents,
        BehaviorTreeBuilder.buildSimpleAI(),
        true
      ),
      new BehaviorTreeController(
        agentB1,
        this.gameMap,
        this.agents,
        BehaviorTreeBuilder.buildSimpleAI(),
        true
      )
    ];

    console.log('演示环境设置完成');
  }

  /**
   * 运行演示
   */
  public runDemo(): void {
    console.log('开始运行行为树演示...\n');

    for (let turn = 1; turn <= 3; turn++) {
      console.log(`=== 回合 ${turn} ===`);

      for (let i = 0; i < this.behaviorTreeControllers.length; i++) {
        const controller = this.behaviorTreeControllers[i];
        const agent = this.agents[i];

        if (agent.health > 0) {
          console.log(`\n--- ${agent.id} 的回合 ---`);
          agent.currentTurn = turn;
          controller.takeTurn();
        }
      }

      console.log('\n');
    }

    console.log('=== 行为树演示结束 ===');
  }

  /**
   * 演示不同AI类型
   */
  public demonstrateAITypes(): void {
    console.log('=== AI类型演示 ===\n');

    console.log('1. 简单AI行为树:');
    console.log(BehaviorTreeBuilder.buildSimpleAI());
    console.log('\n');

    console.log('2. 攻击型AI行为树:');
    console.log(BehaviorTreeBuilder.buildAggressiveAI());
    console.log('\n');

    console.log('3. 防御型AI行为树:');
    console.log(BehaviorTreeBuilder.buildDefensiveAI());
    console.log('\n');
  }

  /**
   * 演示动态绑定功能
   */
  public demonstrateDynamicBinding(): void {
    console.log('=== 动态绑定功能演示 ===\n');
    
    // 创建一个BehaviorTreeAgent实例来演示动态绑定
    const testAgent = this.agents[0];
    if (testAgent) {
      const treeAgent = new (require('./BehaviorTreeAgent').BehaviorTreeAgent)(
        testAgent, this.gameMap, this.agents
      );
      
      console.log('动态绑定的条件方法:');
      console.log('- IsInDanger:', (treeAgent as any).IsInDanger());
      console.log('- IsEarlyGame:', (treeAgent as any).IsEarlyGame());
      console.log('- HasEnemyInRange:', (treeAgent as any).HasEnemyInRange());
      
      console.log('\n所有条件和动作已成功动态绑定到BehaviorTreeAgent');
    }
  }

  /**
   * 运行完整演示
   */
  public runFullDemo(): void {
    this.demonstrateDynamicBinding();
    console.log('\n');
    this.demonstrateAITypes();
    console.log('\n');
    this.runDemo();
  }
} 

// 导出演示函数供外部调用
export function runBehaviorTreeDemo(): void {
  const demo = new BehaviorTreeDemo();
  demo.runFullDemo();
} 