// 行为树条件函数导出
export { isInDanger } from './IsInDanger';
export { isDragonFlagOpen } from './IsDragonFlagOpen';
export { canCaptureDragonFlag } from './CanCaptureDragonFlag';
export { shouldPrepareForCapture } from './ShouldPrepareForCapture';
export { enemyCapturingFlag } from './EnemyCapturingFlag';
export { isMidGame } from './IsMidGame';
export { shouldAttackEnemy } from './ShouldAttackEnemy';
export { shouldAttackFortress } from './ShouldAttackFortress';
export { isEarlyGame } from './IsEarlyGame';

// 游戏状态相关条件
export { shouldPickGeneral, canChooseBuff, canUseSkill, canUseEscapeSkill, canTeleport } from './GameStateConditions';

// 战略决策相关条件
export { needMoreTroops, shouldChangeFormation, hasEnoughFood, shouldPrioritizeDevelopment } from './StrategicConditions';

// 原有条件函数
export { hasEnemyInRange } from './DistanceCondition';