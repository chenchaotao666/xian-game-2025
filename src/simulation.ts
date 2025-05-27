import { GameMap } from './gameMap';
import {
  AIController,
  ApplyArmorBreakAction,
  AttackEnemyAction,
  ExecuteHeavyBlowAction,
  FleeAction,
  GlobalGoalType,
  GlobalObjective,
  HealSelfAction,
  IAgent,
  IdleTurnAction,
  IUtilityAction,
  MoveAction,
  Agent,
  TeamBlackboard
} from './index';
import { MapLayout } from './mapData';

// =============== 主模拟循环 ===============
function runFullSimulation() {
  const gameMapInstance = new GameMap(MapLayout.flat().join(), MapLayout[0].length, MapLayout.length);

  const teamABlackboard = new TeamBlackboard();
  const teamBBlackboard = new TeamBlackboard();

  const hero = new Agent('英雄-阿尔法', 100, 100, { x: 1, y: 1 }, 'TeamA', teamABlackboard, 4);
  const allyWizard = new Agent('法师-贝塔', 80, 120, { x: 0, y: 2 }, 'TeamA', teamABlackboard, 3);
  const enemyWarrior = new Agent('战士-X', 120, 50, { x: 13, y: 14 }, 'TeamB', teamBBlackboard, 3);
  const enemyArcher = new Agent('弓箭手-Y', 70, 60, { x: 14, y: 12 }, 'TeamB', teamBBlackboard, 4);
  const gameAgents = [hero, allyWizard, enemyWarrior, enemyArcher];

  const captureGoal: GlobalObjective = {
    type: GlobalGoalType.CAPTURE_POINT,
    targetPosition: { x: 10, y: 10 },
    priority: 0.7,
    id: 'cap1010'
  };
  teamABlackboard.addObjective(captureGoal);
  teamABlackboard.addObjective({ type: GlobalGoalType.ELIMINATE_ALL_ENEMIES, priority: 0.5, id: 'elimAll' });
  teamBBlackboard.addObjective({ type: GlobalGoalType.ELIMINATE_ALL_ENEMIES, priority: 1.0, id: 'enemyElim' });

  // Add MoveAction to the list of available actions
  const teamAActions: IUtilityAction[] = [
    new MoveAction(), // <-- Added MoveAction
    new AttackEnemyAction(),
    new HealSelfAction(),
    new ApplyArmorBreakAction(),
    new ExecuteHeavyBlowAction(),
    new FleeAction(), // Flee can remain as a specific panic/high-utility action
    new IdleTurnAction(),
  ];
  const heroAI = new AIController(hero, teamAActions, gameMapInstance, true);

  const wizardActions: IUtilityAction[] = [
    new MoveAction(), // <-- Added MoveAction
    new ApplyArmorBreakAction(),
    new AttackEnemyAction(), // Lower priority than Armor Break for wizard
    new HealSelfAction(), // Wizards might also heal
    new FleeAction(),
    new IdleTurnAction(),
  ];
  const wizardAI = new AIController(allyWizard, wizardActions, gameMapInstance);

  const teamBActions: IUtilityAction[] = [
    new MoveAction(), // <-- Added MoveAction
    new AttackEnemyAction(),
    new FleeAction(),
    new IdleTurnAction()
  ];
  const warriorAI = new AIController(enemyWarrior, teamBActions, gameMapInstance);
  const archerAI = new AIController(enemyArcher, teamBActions, gameMapInstance);

  console.log('--- AI模拟开始 ---');

  for (let turn = 1; turn <= 50; turn++) { // Max 20 turns for testing
    gameAgents.forEach(ag => ag.currentTurn = turn);
    console.log(`\n回合 ${turn} 开始 `);
    console.log('===================================================');

    // Simplified focus target logic for Team A
    if (turn % 2 === 0) { // Every other turn, re-evaluate focus for Team A
      let targetToFocus: IAgent | null = null;
      //优先攻击离 captureGoal 近的敌人
      if (captureGoal.targetPosition) {
        const enemiesNearGoal = gameAgents.filter(ag => ag.teamId === 'TeamB' && ag.health > 0)
        .map(enemy => ({
          enemy,
          dist: gameMapInstance.getRealDistance(enemy.position.x, enemy.position.y, captureGoal.targetPosition!.x, captureGoal.targetPosition!.y)
        }))
        .filter(item => item.dist < 7) // Within 7 units of goal
        .sort((a, b) => a.dist - b.dist);
        if (enemiesNearGoal.length > 0) {
          targetToFocus = enemiesNearGoal[0].enemy;
        }
      }
      // 如果没有目标点附近的敌人，则攻击血量最低的
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
        // Clear focus if no viable target
        teamABlackboard.setFocusTarget(null);
      }
    }


    for (const currentAgent of gameAgents) {
      if (currentAgent.health <= 0) {
        continue;
      }

      console.log(`\n>>> 轮到 ${currentAgent.id} (Team: ${currentAgent.teamId}, HP: ${currentAgent.health}, Mana: ${currentAgent.mana}, Pos:(${currentAgent.position.x},${currentAgent.position.y}))`);
      currentAgent.simulatePerception(gameAgents, gameMapInstance); // Update visible agents

      // Select AI controller based on agent
      if (currentAgent.teamId === 'TeamA') {
        if (currentAgent.id === hero.id) heroAI.takeTurn();
        else if (currentAgent.id === allyWizard.id) wizardAI.takeTurn();
      } else { // Team B
        if (currentAgent.id === enemyWarrior.id) warriorAI.takeTurn();
        else if (currentAgent.id === enemyArcher.id) archerAI.takeTurn();
      }

      // Check for game over conditions
      const teamAAlive = gameAgents.filter(a => a.teamId === 'TeamA' && a.health > 0).length;
      const teamBAlive = gameAgents.filter(a => a.teamId === 'TeamB' && a.health > 0).length;

      if (teamAAlive === 0) {
        console.log('\nTeam A 被全灭！Team B 胜利！');
        return;
      }
      if (teamBAlive === 0) {
        console.log('\nTeam B 被全灭！Team A 胜利！(消灭目标达成)');
        teamABlackboard.removeObjective('elimAll');
        teamABlackboard.removeObjective('cap1010'); // Also remove capture goal
        return;
      }

      // Check capture point objective for Team A
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
          // If this is the only objective, Team A might win.
        }
      }
    } // End agent turn loop
    console.log('===================================================');
    console.log(`回合 ${turn} 结束`);

    const objectivesTeamA = teamABlackboard.getAllObjectives();
    if (objectivesTeamA.length === 0 && gameAgents.filter(a => a.teamId === 'TeamA' && a.health > 0).length > 0) {
      console.log('\nTeam A 完成了所有目标！Team A 胜利！');
      return;
    }

  } // End game turn loop
  console.log('\n模拟达到最大回合数。');
}

runFullSimulation();