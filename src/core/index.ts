import { GameMap, GameState } from "@/types";
import { BehaviorTreeController } from "../bt/BehaviorTreeController";
import { ActionContext, IAgent } from "./types";
import { Agent } from "./Agent";
import { sunquan, zhaoyun, zhugeliang } from "@/models/heros";
import ActionBuilder from "@/network/ActionBuilder";
import { TeamBlackboard } from "./TeamBlackboard";
import NetworkClient from "../network/NetworkClient";

const context: ActionContext = {
    agent: null,
    gameMap: null,
    allAgents: [],
    treeDefinition: null,
    debug: false
}

export function init(client: NetworkClient, playerId: number) {
    // 选择武将
    pickGenerals(playerId);
    // 创建团队黑板
    const teamBlackboard = new TeamBlackboard();
    
    const warrior = new Agent(zhaoyun, { x: 0, y: 0 }, playerId, teamBlackboard);
    const support = new Agent(sunquan, { x: 0, y: 0 }, playerId, teamBlackboard);
    const leader = new Agent(zhugeliang, { x: 0, y: 0 }, playerId, teamBlackboard);
    teamBlackboard.setTeam(warrior, support, leader);
    // 初始化上下文
    context.teamBlackboard = teamBlackboard;
    // 关联网络客户端，让网络客户端可以更新团队黑板的数据
    client.setTeamBlackboard(teamBlackboard);
}


function pickGenerals(playerId: number): void {
    ActionBuilder.buildPickAction([zhaoyun.id, sunquan.id, zhugeliang.id], playerId);
}

// 调用行为树，处理每回合的行动
function handleTurn() {
    // 新建行为树控制器
    const behaviorTreeController = new BehaviorTreeController(context);

    // 执行行为树
    behaviorTreeController.takeTurn();
}

export { handleTurn };