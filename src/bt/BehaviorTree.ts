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
        /* 紧急情况处理 - 最高优先级 */
        sequence {
            condition [IsInDanger]
            action [ExecuteEscape]
        }
        
        /* 游戏后期 - 龙旗据点开放后的策略 */
        sequence {
            condition [IsDragonFlagOpen]
            selector {
                /* 优先占领龙旗据点 */
                sequence {
                    condition [CanCaptureDragonFlag]
                    action [ExecuteCapture]
                }
                
                /* 无法占领时的策略选择 */
                selector {
                    /* 准备占领 - 集结兵力 */
                    sequence {
                        condition [ShouldPrepareForCapture]
                        action [ExecutePreparation]
                    }
                    
                    /* 骚扰敌人占领 */
                    sequence {
                        condition [EnemyCapturingFlag]
                        action [ExecuteAttack]
                    }
                    
                    /* 继续发育等待机会 */
                    action [ExecuteDevelopment]
                }
            }
        }
        
        /* 游戏前期 - 龙旗据点开放前的策略 */
        sequence {
            condition [IsMidGame]
            selector {
                /* 优先攻击敌方武将获取粮草 */
                sequence {
                    condition [ShouldAttackEnemy]
                    action [ExecuteAttack]
                }
                
                /* 攻打城寨获取粮草 */
                sequence {
                    condition [ShouldAttackFortress]
                    action [ExecuteAttack]
                }
            }
        }
        
    }
}
`;
  }
} 