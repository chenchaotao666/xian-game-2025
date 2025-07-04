/**
 * 行为树构建器
 * ============
 * 
 * 提供预定义的AI行为模式和自定义行为树构建方法
 * 
 * @author AI游戏框架开发团队
 * @version 2.0.0
 */

export class BehaviorTreeBuilder {
  static buildTree(): string {
    return `root {
    selector {
        /* 武将复活和选择 - 最高优先级 */
        sequence {
            condition [ShouldPickGeneral]
            action [ExecutePickGeneral]
        }
        
        /* BUFF选择时机 */
        sequence {
            condition [CanChooseBuff]
            action [ExecuteChooseBuff]
        }
        
        /* 紧急情况处理 */
        sequence {
            condition [IsInDanger]
            selector {
                sequence {
                    condition [CanUseEscapeSkill]
                    action [ExecuteEscapeSkill]
                }
                sequence {
                    condition [CanTeleport]
                    action [ExecuteTeleport]
                }
                action [ExecuteEscape]
            }
        }
        
        /* 游戏后期 - 龙旗据点争夺（100回合后）*/
        sequence {
            condition [IsDragonFlagOpen]
            selector {
                /* 占领龙旗据点 */
                sequence {
                    condition [CanCaptureDragonFlag]
                    action [ExecuteCapture]
                }
                
                /* 准备占领 - 集结兵力和调整阵型 */
                sequence {
                    condition [ShouldPrepareForCapture]
                    selector {
                        sequence {
                            condition [ShouldChangeFormation]
                            action [ExecuteFormationChange]
                        }
                        sequence {
                            condition [NeedMoreTroops]
                            action [ExecuteProduceTroops]
                        }
                        action [ExecutePreparation]
                    }
                }
                
                /* 骚扰敌人占领 */
                sequence {
                    condition [EnemyCapturingFlag]
                    selector {
                        sequence {
                            condition [CanUseSkill]
                            action [ExecuteSkill]
                        }
                        action [ExecuteAttack]
                    }
                }
                
                /* 发育等待机会 */
                action [ExecuteDevelopment]
            }
        }
        
        /* 游戏前期策略（100回合前）*/
        sequence {
            condition [IsEarlyGame]
            selector {
                /* 生产士兵 */
                sequence {
                    condition [NeedMoreTroops]
                    action [ExecuteProduceTroops]
                }
                
                /* 攻击敌方武将获取粮草 */
                sequence {
                    condition [ShouldAttackEnemy]
                    selector {
                        sequence {
                            condition [CanUseSkill]
                            action [ExecuteSkill]
                        }
                        action [ExecuteAttack]
                    }
                }
                
                /* 攻打城寨获取粮草 */
                sequence {
                    condition [ShouldAttackFortress]
                    action [ExecuteAttackFortress]
                }
                
                /* 默认发育 */
                action [ExecuteDevelopment]
            }
        }
        
        /* 兜底行为 */
        action [ExecuteIdle]
    }
}`;
  }
} 