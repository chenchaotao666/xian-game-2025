/**
 * 行为树构建器
 * ============
 * 
 * 提供预定义的AI行为模式和自定义行为树构建方法
 * 
 * @author AI游戏框架开发团队
 * @version 2.0.0
 */

export const teamBehaviorTree = `root {
  sequence {
    /* === 综合战略决策 （发育、团战、抢龙旗） === */
    action [AnalyzeAndSetStrategy]

    /* === 执行全局操作 === */
    parallel {
        /* BUFF选择 */
        sequence {
            condition [CanChooseBuff]
            action [ExecuteChooseBuff]
        }
        
        /* 生产士兵 */
        sequence {
            condition [NeedMoreTroops]
            action [ExecuteTroopProduction]
        }
        
        /* 阵型调整 */
        sequence {
            condition [ShouldChangeFormation]
            action [ExecuteFormationChange]
        }
        
        /* 占领据点 */
        sequence {
            condition [CanCaptureDragonFlag]
            action [ExecuteCaptureFlag]
        }
            
        /* === 执行武将行动 === */
        parallel {
            action [ExecuteWarriorActions]
            action [ExecuteLeaderActions] 
            action [ExecuteSupportActions]
        }
    }
  }
}`

export const heroBehaviorTree = `root {
    /* 优先尝试使用技能 */
    action [TryUseSkill]
    
    /* 基于策略的行为 */
    selector {
        /* 主动攻击策略 */
        sequence {
            condition [ShouldSeekEnemy]
            selector {
                sequence {
                    condition [HasEnemyInRange]
                    action [ExecuteAttackEnemy]
                }
                action [ExecuteSeekEnemy]
            }
        }

        /* 争夺据点策略 */
        sequence {
            condition [ShouldGroupUp]
            action [ExecuteMoveToFlag]
        }
        
        /* 刷城寨策略 */
        sequence {
            condition [ShouldAttackFortress]
            selector {
                sequence {
                    condition [HasFortressInRange]
                    action [ExecuteAttackFortress]
                }
                action [ExecuteSeekFortress]
            }
        }
    }
}`