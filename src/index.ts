/**
 * 效用AI游戏框架 - 重构后的主模块
 * ====================================
 * 
 * 这是重构后的主入口文件，提供所有模块的统一导出
 * 
 * 重构改进：
 * - 模块化结构：按功能划分为独立的文件夹和模块
 * - 清晰的依赖关系：避免循环依赖，提高可维护性
 * - 更好的可扩展性：新增考量因素和行为更加容易
 * - 便于测试：每个模块都可以独立测试
 * 
 * 模块结构：
 * ├── core/           - 核心类型、接口和基础类
 * ├── considerations/ - 所有考量因素实现
 * ├── actions/        - 所有行为实现
 * ├── controllers/    - AI控制器
 * └── utils/          - 工具函数
 * 
 * @author AI游戏框架开发团队
 * @version 2.0.0
 */

// ==================== 核心模块导出 ====================

// 核心类型和接口
export {
  GlobalGoalType,
  type GlobalObjective,
  type IAgentState,
  type Position,
  type PartialExcept,
  type IAgent,
  type ActionContext,
  type IConsideration,
  type IUtilityAction,
} from './core/types';

// 团队黑板
export { TeamBlackboard } from './core/TeamBlackboard';

// 代理类
export { Agent } from './core/Agent';

// ==================== 考量因素导出 ====================

// 基础考量因素
export {
  HealthConsideration,
  ManaConsideration,
  DistanceConsideration,
  SkillReadyConsideration,
} from './considerations';

// 协作考量因素
export {
  IsTeamFocusTargetConsideration,
  TargetUnderAttackConsideration,
  TargetHasSetupDebuffConsideration,
} from './considerations';

// 目标导向考量因素
export {
  ProximityToGoalPositionConsideration,
  ClearDefendersAtGoalConsideration,
} from './considerations';

// 移动专用考量因素
export {
  DestinationProximityToObjectiveConsideration,
  DestinationSafetyConsideration,
  DestinationChaseFocusTargetConsideration,
  StayPutConsideration,
} from './considerations';

// ==================== 行为模块导出 ====================

// 基础行为抽象类
export { BaseUtilityAction } from './actions/BaseUtilityAction';

// 基础行为
export { MoveAction } from './actions/basic/MoveAction';
export { FleeAction } from './actions/basic/FleeAction';
export { IdleTurnAction } from './actions/basic/IdleTurnAction';

// 战斗行为
export { AttackEnemyAction } from './actions/combat/AttackEnemyAction';

// 技能行为
export { HealSelfAction } from './actions/skills/HealSelfAction';
export { ApplyArmorBreakAction } from './actions/skills/ApplyArmorBreakAction';
export { ExecuteHeavyBlowAction } from './actions/skills/ExecuteHeavyBlowAction';

// ==================== AI控制器导出 ====================

// AI控制器
export { AIController } from './controllers/AIController';

// ==================== 兼容性导出 ====================

/**
 * 兼容性说明：
 * 
 * 为了保持向后兼容，我们保留了原有的导出结构。
 * 现有代码可以继续正常工作，同时新代码可以使用模块化的导入方式。
 * 
 * 推荐的新导入方式：
 * ```typescript
 * import { Agent, TeamBlackboard } from './core';
 * import { HealthConsideration, DistanceConsideration } from './considerations';
 * import { MoveAction, AttackEnemyAction } from './actions';
 * ```
 * 
 * 而不是：
 * ```typescript
 * import { Agent, HealthConsideration, MoveAction } from './index';
 * ```
 */

// 重新导出聚合器和地图相关模块
export { GameMap } from './gameMap';
export {
  type AggregationMethod,
  getAverageAggregate,
  getProductAggregate,
  getWeightedAverageAggregate,
  getMinAggregate,
  getMaxAggregate,
  MIN_SCORE,
} from './aggregators'; 