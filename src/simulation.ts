/**
 * 游戏AI模拟系统
 * ================
 * 
 * 这是效用AI游戏框架的主要模拟入口，负责：
 * - 初始化游戏环境（地图、代理、AI控制器）
 * - 管理回合制游戏循环
 * - 处理团队目标和集火逻辑
 * - 监控胜利条件和游戏状态
 * - 输出详细的游戏过程日志
 * 
 * 模拟特点：
 * - 4v4团队对战（可扩展）
 * - 混合目标系统（占领+消灭）
 * - 动态集火目标分配
 * - 完整的AI决策链追踪
 * - 多种胜利条件判断
 * 
 * 代理配置：
 * - Team A: 英雄(近战坦克) + 法师(远程支援)
 * - Team B: 战士(近战DPS) + 弓箭手(远程DPS)
 * - 每个代理都有独特的技能组合和行为权重
 * 
 * @author AI模拟团队
 * @version 1.0.0
 */

import { GameMap } from './gameMap';
import {
  GlobalGoalType,
  GlobalObjective,
  IAgent,
  IUtilityAction,
} from './core/types';
import { Agent } from './core/Agent';
import { TeamBlackboard } from './core/TeamBlackboard';

// 导入AI控制器和所有行为类
import { AIController } from './controllers/AIController';
import { MoveAction } from './actions/basic/MoveAction';
import { AttackEnemyAction } from './actions/combat/AttackEnemyAction';
import { FleeAction } from './actions/basic/FleeAction';
import { IdleTurnAction } from './actions/basic/IdleTurnAction';
import { HealSelfAction } from './actions/skills/HealSelfAction';
import { ApplyArmorBreakAction } from './actions/skills/ApplyArmorBreakAction';
import { ExecuteHeavyBlowAction } from './actions/skills/ExecuteHeavyBlowAction';
import { MapLayout } from './mapData';

// =============== 主模拟循环 ===============

/**
 * 运行完整的游戏模拟
 * 
 * 这是主要的模拟函数，包含以下阶段：
 * 1. 环境初始化：创建地图、代理、AI控制器
 * 2. 目标设定：为两个团队分配不同的战略目标
 * 3. 游戏循环：执行回合制战斗，最多50回合
 * 4. 胜利判断：检查各种胜利条件
 * 
 * 团队配置：
 * - Team A：攻击方，目标是占领(10,10)点 + 消灭敌人
 * - Team B：防守方，目标是消灭所有敌人
 * 
 * AI行为配置：
 * - 英雄：全能战士，拥有完整的技能树
 * - 法师：破甲专家，优先使用控制技能
 * - 战士：简化AI，专注基础战斗
 * - 弓箭手：简化AI，专注基础战斗
 */
function runFullSimulation() {
  console.log('🎮 AI游戏模拟开始...');
  
  // 初始化游戏地图
  const gameMapInstance = new GameMap(MapLayout.flat().join(), MapLayout[0].length, MapLayout.length);

  // 创建团队黑板用于信息共享
  const teamABlackboard = new TeamBlackboard();
  const teamBBlackboard = new TeamBlackboard();

  // 创建游戏代理（角色）
  const hero = new Agent('英雄-阿尔法', 100, 100, { x: 1, y: 1 }, 'TeamA', teamABlackboard, 4);
  const allyWizard = new Agent('法师-贝塔', 80, 120, { x: 0, y: 2 }, 'TeamA', teamABlackboard, 3);
  const enemyWarrior = new Agent('战士-X', 120, 50, { x: 13, y: 14 }, 'TeamB', teamBBlackboard, 3);
  const enemyArcher = new Agent('弓箭手-Y', 70, 60, { x: 14, y: 12 }, 'TeamB', teamBBlackboard, 4);
  const gameAgents = [hero, allyWizard, enemyWarrior, enemyArcher];

  // 设置A队的全局目标
  const captureGoal: GlobalObjective = {
    type: GlobalGoalType.CAPTURE_POINT,
    targetPosition: { x: 10, y: 10 },
    priority: 0.7,
    id: 'cap1010'
  };
  teamABlackboard.addObjective(captureGoal);
  teamABlackboard.addObjective({ type: GlobalGoalType.ELIMINATE_ALL_ENEMIES, priority: 0.5, id: 'elimAll' });
  
  // 设置B队的全局目标
  teamBBlackboard.addObjective({ type: GlobalGoalType.ELIMINATE_ALL_ENEMIES, priority: 1.0, id: 'enemyElim' });

  // 为A队英雄配置可用行为
  const teamAActions: IUtilityAction[] = [
    new MoveAction(),              // 战略移动
    new AttackEnemyAction(),       // 攻击敌人
    new HealSelfAction(),          // 治疗自己
    new ApplyArmorBreakAction(),   // 破甲打击
    new ExecuteHeavyBlowAction(),  // 重创
    new FleeAction(),              // 逃跑（恐慌/高效用行为）
    new IdleTurnAction(),          // 待命
  ];
  const heroAI = new AIController(hero, teamAActions, gameMapInstance, true);

  // 为A队法师配置可用行为
  const wizardActions: IUtilityAction[] = [
    new MoveAction(),              // 战略移动
    new ApplyArmorBreakAction(),   // 破甲打击（法师优先级高于攻击）
    new AttackEnemyAction(),       // 攻击敌人（法师优先级较低）
    new HealSelfAction(),          // 治疗自己（法师也可能治疗）
    new FleeAction(),              // 逃跑
    new IdleTurnAction(),          // 待命
  ];
  const wizardAI = new AIController(allyWizard, wizardActions, gameMapInstance);

  // 为B队配置可用行为
  const teamBActions: IUtilityAction[] = [
    new MoveAction(),              // 战略移动
    new AttackEnemyAction(),       // 攻击敌人
    new FleeAction(),              // 逃跑
    new IdleTurnAction()           // 待命
  ];
  const warriorAI = new AIController(enemyWarrior, teamBActions, gameMapInstance);
  const archerAI = new AIController(enemyArcher, teamBActions, gameMapInstance);

  console.log('--- AI模拟开始 ---');

  // 主游戏循环：最多50回合
  for (let turn = 1; turn <= 50; turn++) {
    // 更新所有代理的当前回合数
    gameAgents.forEach(ag => ag.currentTurn = turn);
    console.log(`\n回合 ${turn} 开始 `);
    console.log('===================================================');

    // A队集火目标逻辑（每隔一回合重新评估）
    if (turn % 2 === 0) {
      let targetToFocus: IAgent | null = null;
      
      // 优先攻击离占领目标点近的敌人
      if (captureGoal.targetPosition) {
        const enemiesNearGoal = gameAgents.filter(ag => ag.teamId === 'TeamB' && ag.health > 0)
        .map(enemy => ({
          enemy,
          dist: gameMapInstance.getRealDistance(enemy.position.x, enemy.position.y, captureGoal.targetPosition!.x, captureGoal.targetPosition!.y)
        }))
        .filter(item => item.dist < 7) // 目标点7格范围内
        .sort((a, b) => a.dist - b.dist);
        
        if (enemiesNearGoal.length > 0) {
          targetToFocus = enemiesNearGoal[0].enemy;
        }
      }
      
      // 如果没有目标点附近的敌人，则攻击血量最低的敌人
      if (!targetToFocus) {
        const lowestHealthEnemy = gameAgents.filter(ag => ag.teamId === 'TeamB' && ag.health > 0)
        .sort((a, b) => a.health - b.health);
        if (lowestHealthEnemy.length > 0) {
          targetToFocus = lowestHealthEnemy[0];
        }
      }
      
      if (targetToFocus) {
        teamABlackboard.setFocusTarget(targetToFocus.id);
      } else {
        // 如果没有可行目标则清除集火
        teamABlackboard.setFocusTarget(null);
      }
    }

    // 代理回合循环
    for (const currentAgent of gameAgents) {
      if (currentAgent.health <= 0) {
        continue; // 跳过已死亡的代理
      }

      console.log(`\n>>> 轮到 ${currentAgent.id} (Team: ${currentAgent.teamId}, HP: ${currentAgent.health}, Mana: ${currentAgent.mana}, Pos:(${currentAgent.position.x},${currentAgent.position.y}))`);
      
      // 更新感知信息（可见的敌人和盟友）
      currentAgent.simulatePerception(gameAgents, gameMapInstance);

      // 根据代理选择对应的AI控制器
      if (currentAgent.teamId === 'TeamA') {
        if (currentAgent.id === hero.id) heroAI.takeTurn();
        else if (currentAgent.id === allyWizard.id) wizardAI.takeTurn();
      } else { // Team B
        if (currentAgent.id === enemyWarrior.id) warriorAI.takeTurn();
        else if (currentAgent.id === enemyArcher.id) archerAI.takeTurn();
      }

      // 检查游戏结束条件
      const teamAAlive = gameAgents.filter(a => a.teamId === 'TeamA' && a.health > 0).length;
      const teamBAlive = gameAgents.filter(a => a.teamId === 'TeamB' && a.health > 0).length;

      if (teamAAlive === 0) {
        console.log('\nTeam A 被全灭！Team B 胜利！');
        return;
      }
      if (teamBAlive === 0) {
        console.log('\nTeam B 被全灭！Team A 胜利！(消灭目标达成)');
        teamABlackboard.removeObjective('elimAll');
        teamABlackboard.removeObjective('cap1010'); // 同时移除占领目标
        return;
      }

      // 检查A队的占领点目标
      const objective = teamABlackboard.getHighestPriorityObjective();
      if (objective?.type === GlobalGoalType.CAPTURE_POINT && objective.id === 'cap1010' && objective.targetPosition) {
        const teamACapturing = gameAgents.filter(a =>
          a.teamId === 'TeamA' && a.health > 0 &&
          a.position.x === objective.targetPosition!.x &&
          a.position.y === objective.targetPosition!.y
        ).length;
        const enemiesOnPoint = gameAgents.filter(a =>
          a.teamId === 'TeamB' && a.health > 0 &&
          a.position.x === objective.targetPosition!.x &&
          a.position.y === objective.targetPosition!.y
        ).length;

        if (teamACapturing > 0 && enemiesOnPoint === 0) {
          console.log(`\nTeam A 成功占领目标点 (${objective.targetPosition.x}, ${objective.targetPosition.y})！`);
          teamABlackboard.removeObjective(objective.id!);
          // 如果这是唯一目标，A队可能获胜
        }
      }
    } // 代理回合循环结束
    
    console.log('===================================================');
    console.log(`回合 ${turn} 结束`);

    // 检查A队是否完成所有目标
    const objectivesTeamA = teamABlackboard.getAllObjectives();
    if (objectivesTeamA.length === 0 && gameAgents.filter(a => a.teamId === 'TeamA' && a.health > 0).length > 0) {
      console.log('\nTeam A 完成了所有目标！Team A 胜利！');
      return;
    }

  } // 游戏回合循环结束
  
  console.log('\n模拟达到最大回合数，平局！');
}

// 启动模拟
runFullSimulation();