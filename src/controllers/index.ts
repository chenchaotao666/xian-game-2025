import { Agent } from "../core/Agent";
import { TeamBlackboard } from "../core/TeamBlackboard";
import { sunquan, zhaoyun, zhugeliang } from "../models/heros";

function gameInit() {

  const teamBlackboard = new TeamBlackboard();
  
  // 1. 选择3个英雄
  const warrior = new Agent(zhaoyun, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
  const leader = new Agent(sunquan, { x: 0, y: 0 }, 'TeamA', teamBlackboard);
  const support = new Agent(zhugeliang, { x: 0, y: 0 }, 'TeamA', teamBlackboard);


  
}

function step() {
  const 