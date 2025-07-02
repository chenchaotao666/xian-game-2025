/**
 * 考量因素模块统一导出
 * ======================
 * 
 * 导出所有可用的考量因素类，便于使用和管理
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

// 基础考量因素
export { HealthConsideration } from './basic/HealthConsideration';
export { ManaConsideration } from './basic/ManaConsideration';
export { DistanceConsideration } from './basic/DistanceConsideration';
export { SkillReadyConsideration } from './basic/SkillReadyConsideration';

// 协作考量因素
export { IsTeamFocusTargetConsideration } from './teamwork/IsTeamFocusTargetConsideration';
export { TargetUnderAttackConsideration } from './teamwork/TargetUnderAttackConsideration';
export { TargetHasSetupDebuffConsideration } from './teamwork/TargetHasSetupDebuffConsideration';

// 目标导向考量因素
export { ProximityToGoalPositionConsideration } from './objective/ProximityToGoalPositionConsideration';
export { ClearDefendersAtGoalConsideration } from './objective/ClearDefendersAtGoalConsideration';

// 移动专用考量因素
export { DestinationProximityToObjectiveConsideration } from './movement/DestinationProximityToObjectiveConsideration';
export { DestinationSafetyConsideration } from './movement/DestinationSafetyConsideration';
export { DestinationChaseFocusTargetConsideration } from './movement/DestinationChaseFocusTargetConsideration';
export { StayPutConsideration } from './movement/StayPutConsideration'; 