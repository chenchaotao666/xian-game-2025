import { BehaviorTreeBuilder } from "../bt/BehaviorTree";
import { Agent } from "../core/Agent";
import { TeamBlackboard } from "../core/TeamBlackboard";
import { sunquan, zhaoyun, zhugeliang } from "../models/heros";
import { BehaviorTreeController } from "../bt/BehaviorTreeController";

function gameInit(food: number = 100) {
  const teamBlackboard = new TeamBlackboard(food);

  // 1. 选择3个英雄
  const warrior = new Agent(zhaoyun, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
  const leader = new Agent(sunquan, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
  const support = new Agent(zhugeliang, { x: 0, y: 0 }, 'TeamA', teamBlackboard);

  teamBlackboard.setTeam(warrior, support, leader);

  return {}
}

class GameController {
  private warrior: Agent;
  private leader: Agent;
  private support: Agent;

  constructor(food: number = 100) {
    const teamBlackboard = new TeamBlackboard(food);
    this.warrior = new Agent(zhaoyun, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
    this.leader = new Agent(sunquan, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
    this.support = new Agent(zhugeliang, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
    teamBlackboard.setTeam(this.warrior, this.support, this.leader);

    // 行为树
    const bt = BehaviorTreeBuilder.buildTree();
    this.warrior
  }

  // 每回合执行
  step() {

    
  }
}