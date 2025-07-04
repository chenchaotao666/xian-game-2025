import { BehaviorTreeBuilder } from "../src/bt/BehaviorTree";
import { BehaviorTreeController } from "../src/bt/BehaviorTreeController";
import { GameMap } from "../src/context/gameMap";
import { Agent } from "../src/core/Agent";
import { TeamBlackboard } from "../src/core/TeamBlackboard";
import { zhugeliang } from "../src/models/heros";

const mockAgent = new Agent(zhugeliang, { x: 0, y: 0 }, 'TeamA', new TeamBlackboard());
const mockGameMap = new GameMap('0,0,0,1,0,0,1,0,0', 3, 3)
const bt = BehaviorTreeBuilder.buildTree();

describe('BehaviorTreeController', () => {
  it('should execute the tree', () => {
    mockAgent.health = 10;
    const controller = new BehaviorTreeController(mockAgent, mockGameMap, [], bt, false);
    const result = controller.takeTurn();

    expect(result).toBeDefined();
  });
});