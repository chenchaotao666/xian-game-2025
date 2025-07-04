/**
 * 核心类型定义模块
 * ===================
 * 
 * 定义效用AI游戏框架的核心接口、类型和枚举
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { Hero } from '../models/heros';
import { GameMap } from '../context/gameMap';
import { Soldier } from '..';

/**
 * 全局目标类型枚举
 * 定义游戏中不同类型的战略目标
 */
export enum GlobalGoalType {
  CAPTURE_POINT = 'CAPTURE_POINT',       // 占领特定位置
  ELIMINATE_ALL_ENEMIES = 'ELIMINATE_ALL_ENEMIES', // 消灭所有敌人
  DEFEND_POINT = 'DEFEND_POINT',         // 防守特定位置
  SURVIVE_TURNS = 'SURVIVE_TURNS',       // 生存指定回合数
}

/**
 * 位置坐标接口
 * 表示二维网格中的位置
 */
export interface Position {
  x: number; // X坐标
  y: number; // Y坐标
}

/**
 * 全局目标对象接口
 * 描述团队的战略目标，包含目标类型、位置、优先级等信息
 */
export interface GlobalObjective {
  type: GlobalGoalType; // 目标类型
  targetPosition?: Position; // 目标位置 (例如，占领/防守点)
  remainingTurns?: number; // 剩余回合数 (例如，生存目标)
  priority: number; // 目标优先级 (0.0 - 1.0)，用于多目标时的权衡
  id?: string; // 唯一ID，方便管理
}

/**
 * Agent状态快照接口，用于模拟和AI决策
 * 包含代理的基本状态信息，不包含复杂的行为方法
 */
export interface IAgentState {
  id: string;           // 代理唯一标识符
  health: number;       // 当前生命值
  mana: number;         // 当前法力值
  position: Position;   // 当前位置坐标
  // 根据需要，可以添加更多用于模拟的状态属性
}

/**
 * 辅助类型：除了指定属性外，其他属性都是可选的
 * 用于创建部分对象类型，常用于函数参数传递
 */
export type PartialExcept<T, K extends keyof T> = Pick<T, K> & { [P in Exclude<keyof T, K>]?: T[P] }

// 前向声明，避免循环依赖
export interface TeamBlackboard {
  warrior: IAgent;
  support: IAgent;
  leader: IAgent;
  setFocusTarget(targetId: string | null): void;
  getFocusTargetId(): string | undefined;
  setTargetDebuff(targetId: string, debuffType: string, sourceSkill: string, durationTurns: number, currentTurn: number): void;
  getTargetDebuffInfo(targetId: string, debuffType: string, currentTurn: number): { sourceSkill: string, appliedTurn: number, expiresTurn: number } | undefined;
  addObjective(objective: GlobalObjective): void;
  removeObjective(objectiveId: string): void;
  getHighestPriorityObjective(): GlobalObjective | null;
  getAllObjectives(): GlobalObjective[];
}

/**
 * 游戏代理（角色）接口
 * 定义游戏中AI控制角色的所有属性和行为
 */
export interface IAgent {
  // === 基本属性 ===
  id: number;                    // 唯一标识符
  health: number;                // 当前生命值
  position: Position;            // 当前位置坐标
  teamId: string;                // 所属队伍ID
  movementRange: number;         // 每回合最大移动范围/点数
  hero: Hero;                    // 武将
  // 弓兵数量
  bowmen: number;                // 弓兵数量
  // 盾兵数量
  shieldmen: number;             // 盾兵数量

  // === 感知与状态 ===
  visibleEnemies: IAgent[];      // 可见的敌方代理列表
  visibleAllies: IAgent[];       // 可见的友方代理列表
  currentTarget: IAgent | null;  // AI可能设置的当前关注目标
  teamBlackboard: TeamBlackboard;// 所属队伍的黑板，用于共享信息
  currentTurn: number;           // 当前游戏回合数

  // === 日志与辅助方法 ===
  log: (message: string) => void; // 输出日志信息
  getDistanceToAgent: (gameMap: GameMap, otherAgent: IAgent | IAgentState) => number; // 计算与另一Agent或状态的距离
  canSeeAgent: (gameMap: GameMap, otherAgent: IAgent | IAgentState, fromPosition?: Position) => boolean; // 视线检查

  // === 实际执行的动作 (在AI决策做出后，由游戏逻辑调用) ===
  performMove: (context: ActionContext, newPosition: Position) => void;     // 执行移动
  performAttack: (target: IAgent) => void;                                 // 执行攻击
  performSkillOnTarget: (skillId: string, target: IAgent) => void;         // 对目标使用技能
  performSelfSkill: (skillId: string) => void;                             // 对自己使用技能
  performIdle: () => void;                                                  // 执行空闲动作

  // === 技能与状态检查 ===
  isSkillReady: (skillId: string) => boolean; // 检查技能是否就绪
  getTargetDebuffs(target: IAgent): Array<{ type: string; remainingTurns: number; sourceSkill: string }>; // 获取目标身上的debuff

  // === 模拟相关方法 ===
  getSimulatedStateAfterMove(newPosition: Position): IAgentState; // 获取移动后的模拟状态
  getReachableMovePositions(map: GameMap): Position[];            // 获取所有可达的移动位置
}

/**
 * 行为上下文接口
 */
export interface ActionContext {
  playerId: number;                          // 玩家ID
  agent: IAgent | null;                       // 当前执行行为的代理（或其模拟状态）
  gameMap: GameMap;                           // 方便动作和考量因素访问地图信息
  potentialTarget?: IAgentState;              // 行为的潜在目标（或其模拟状态）
  skillId?: string;                           // 涉及的技能ID（如果适用）
  destination?: { x: number, y: number };    // 潜在的目的地 (用于移动行为)
  teamBlackboard: TeamBlackboard;            // 所属队伍的黑板，用于共享信息
}
