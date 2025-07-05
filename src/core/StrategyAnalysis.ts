/**
 * 全局策略分析模块
 * ==================
 * 
 * 实现游戏中的全局策略决策，包括：
 * 1. 打城寨（适合打什么级别的城寨，选择最近的，最安全的）
 * 2. 出发去攻击对方（集合判断、实力对比、距离考量）
 * 3. 对方已经在我方攻击范围，集火攻击对方
 * 4. 占领龙旗
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { TeamBlackboard } from './TeamBlackboard';
import { AnalysisTools, Target, DistanceResult } from './AnalysisTools';
import { TERRAIN_TYPES, FLAG_ZONE } from './GameConstants';

/**
 * 策略类型枚举
 */
export enum StrategyType {
  ATTACK_CITY = 'ATTACK_CITY',           // 攻击城寨
  ATTACK_ENEMY = 'ATTACK_ENEMY',         // 攻击敌方
  FOCUS_FIRE = 'FOCUS_FIRE',             // 集火攻击
  CAPTURE_FLAG = 'CAPTURE_FLAG',         // 占领龙旗
  GATHER_FORCES = 'GATHER_FORCES',       // 集合兵力
  DEFENSIVE = 'DEFENSIVE',               // 防御策略
  RESOURCE_MANAGEMENT = 'RESOURCE_MANAGEMENT' // 资源管理
}

/**
 * 策略优先级
 */
export enum StrategyPriority {
  CRITICAL = 100,    // 紧急策略
  HIGH = 80,         // 高优先级
  MEDIUM = 60,       // 中等优先级
  LOW = 40,          // 低优先级
  MINIMAL = 20       // 最低优先级
}

/**
 * 城寨攻击评估结果
 */
export interface CityAttackAssessment {
  cityId: number;
  cityType: string;
  position: { x: number; y: number } | null;
  healthPercentage: number;
  distance: DistanceResult;
  attackPriority: number;
  safetyScore: number;
  resourceCost: number;
  canAttack: boolean;
  recommendedHeroes: number[];
  reason: string;
}

/**
 * 敌方攻击评估结果
 */
export interface EnemyAttackAssessment {
  shouldAttack: boolean;
  priority: number;
  powerComparison: number; // 我方实力 / 敌方实力
  avgDistance: number;
  shouldGatherFirst: boolean;
  gatherPosition: { x: number; y: number } | null;
  targetEnemyId: number | null;
  reason: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * 集火攻击评估结果
 */
export interface FocusFireAssessment {
  shouldFocusFire: boolean;
  primaryTargetId: number | null;
  secondaryTargets: number[];
  priority: number;
  expectedDamage: number;
  canEliminate: boolean;
  reason: string;
}

/**
 * 龙旗占领评估结果
 */
export interface FlagCaptureAssessment {
  shouldCapture: boolean;
  priority: number;
  isAvailable: boolean;
  controlStatus: 'OURS' | 'ENEMY' | 'NEUTRAL';
  distance: DistanceResult;
  risk: number;
  recommendedHeroes: number[];
  reason: string;
}

/**
 * 全局策略决策结果
 */
export interface StrategyDecision {
  strategy: StrategyType;
  priority: number;
  confidence: number; // 决策置信度 0-100
  details: any; // 具体策略的详细信息
  reason: string;
  executionPlan: string[];
}

/**
 * 全局策略分析类
 */
export class StrategyAnalysis {
  private blackboard: TeamBlackboard;

  constructor(blackboard: TeamBlackboard) {
    this.blackboard = blackboard;
  }

  /**
   * 进行全局策略分析，决定当前应该采取的主要策略
   */
  public analyzeGlobalStrategy(): StrategyDecision {
    const currentRound = this.blackboard.getCurrentRound();
    const myHeroes = this.blackboard.getMyAliveHeroes();
    
    console.log(`[策略分析] 开始全局策略分析 - 回合: ${currentRound}`);

    // 如果没有存活英雄，采取防御策略
    if (myHeroes.length === 0) {
      return {
        strategy: StrategyType.DEFENSIVE,
        priority: StrategyPriority.CRITICAL,
        confidence: 100,
        details: {},
        reason: '我方无存活英雄，等待复活',
        executionPlan: ['等待英雄复活', '保持防御姿态']
      };
    }

    // 分析各种策略选项
    const focusFireAssessment = this.analyzeFocusFireStrategy();
    const enemyAttackAssessment = this.analyzeEnemyAttackStrategy();
    const cityAttackAssessment = this.analyzeCityAttackStrategy();
    const flagCaptureAssessment = this.analyzeFlagCaptureStrategy();

    // 按优先级排序策略
    const strategies: Array<{ type: StrategyType; priority: number; assessment: any; reason: string }> = [];

    // 1. 集火攻击（最高优先级 - 如果敌人在攻击范围内）
    if (focusFireAssessment.shouldFocusFire) {
      strategies.push({
        type: StrategyType.FOCUS_FIRE,
        priority: focusFireAssessment.priority,
        assessment: focusFireAssessment,
        reason: focusFireAssessment.reason
      });
    }

    // 2. 攻击敌方
    if (enemyAttackAssessment.shouldAttack) {
      strategies.push({
        type: enemyAttackAssessment.shouldGatherFirst ? StrategyType.GATHER_FORCES : StrategyType.ATTACK_ENEMY,
        priority: enemyAttackAssessment.priority,
        assessment: enemyAttackAssessment,
        reason: enemyAttackAssessment.reason
      });
    }

    // 3. 占领龙旗
    if (flagCaptureAssessment.shouldCapture) {
      strategies.push({
        type: StrategyType.CAPTURE_FLAG,
        priority: flagCaptureAssessment.priority,
        assessment: flagCaptureAssessment,
        reason: flagCaptureAssessment.reason
      });
    }

    // 4. 攻击城寨
    if (cityAttackAssessment.length > 0) {
      const bestCity = cityAttackAssessment[0];
      if (bestCity.canAttack) {
        strategies.push({
          type: StrategyType.ATTACK_CITY,
          priority: bestCity.attackPriority,
          assessment: bestCity,
          reason: bestCity.reason
        });
      }
    }

    // 5. 资源管理（默认策略）
    const myPlayer = this.blackboard.getMyPlayerData();
    if (myPlayer && myPlayer.supplies < 100) {
      strategies.push({
         type: StrategyType.RESOURCE_MANAGEMENT,
         priority: StrategyPriority.MEDIUM,
         assessment: { supplies: myPlayer.supplies },
         reason: `粮草不足(${myPlayer.supplies})，影响生产小兵和占领龙旗`
      });
    }

    // 按优先级排序并选择最佳策略
    strategies.sort((a, b) => b.priority - a.priority);

    if (strategies.length > 0) {
      const bestStrategy = strategies[0];
      return this.createStrategyDecision(bestStrategy.type, bestStrategy.priority, bestStrategy.assessment, bestStrategy.reason);
    }

    // 默认策略：防御
    return {
      strategy: StrategyType.DEFENSIVE,
      priority: StrategyPriority.LOW,
      confidence: 50,
      details: {},
      reason: '当前局势不明确，采取保守防御策略',
      executionPlan: ['维持当前位置', '观察敌方动向', '等待更好时机']
    };
  }

  /**
   * 分析城寨攻击策略
   */
  public analyzeCityAttackStrategy(): CityAttackAssessment[] {
    const cities = this.blackboard.getCities();
    const myHeroes = this.blackboard.getMyAliveHeroes();
    const myPlayer = this.blackboard.getMyPlayerData();
    const currentRound = this.blackboard.getCurrentRound();

    if (!myPlayer || myHeroes.length === 0) {
      return [];
    }

    const assessments: CityAttackAssessment[] = [];

    for (const city of cities) {
      if (!city.position) continue;

      // 计算到城寨的平均距离
      const heroDistances = myHeroes
        .filter(hero => hero.position)
        .map(hero => AnalysisTools.calculateShortestDistance(hero.position!, city.position!));
      
      const avgDistance = heroDistances.length > 0 
        ? heroDistances.reduce((sum, dist) => sum + (dist.isReachable ? dist.realDistance : 999), 0) / heroDistances.length
        : 999;

      // 评估城寨攻击优先级
      let attackPriority = StrategyPriority.LOW;
      let safetyScore = 50;
      let canAttack = true;
             let reason = '';

      // 前期优先攻击城寨
      if (currentRound < 50) {
        attackPriority += 20;
        reason += '前期主要以打城寨为主; ';
      }

      // 城寨血量越低，优先级越高
      const healthFactor = (100 - city.healthPercentage) / 100;
      attackPriority += Math.round(healthFactor * 30);

      // 距离越近，优先级越高
      if (avgDistance < 10) {
        attackPriority += 20;
        safetyScore += 20;
        reason += '距离较近，便于攻击; ';
      } else if (avgDistance > 20) {
        attackPriority -= 10;
        safetyScore -= 10;
        reason += '距离较远，需要考虑行军时间; ';
      }

             // 攻击城寨不需要消耗粮草，移除粮草限制
       // 粮草只在生产小兵和占领龙旗时才需要考虑

             // 根据城寨类型调整优先级
       if (city.cityType.includes('小')) {
         attackPriority += 10;
         reason += '小城寨容易攻破; ';
       } else if (city.cityType.includes('大')) {
         attackPriority -= 10;
         reason += '大城寨防御较强; ';
       }

      // 安全评估：检查附近是否有敌方英雄
      const enemyHeroes = this.blackboard.getEnemyAliveHeroes();
      for (const enemy of enemyHeroes) {
        if (enemy.position) {
          const enemyDistance = AnalysisTools.calculateShortestDistance(enemy.position, city.position!);
          if (enemyDistance.isReachable && enemyDistance.realDistance < 8) {
            safetyScore -= 30;
            attackPriority -= 15;
            reason += '附近有敌方英雄，存在风险; ';
          }
        }
      }

      // 推荐英雄（选择攻击力高且距离近的）
      const recommendedHeroes = myHeroes
        .filter(hero => hero.position && hero.life > hero.maxLife * 0.3) // 血量充足
        .sort((a, b) => {
          const distA = AnalysisTools.calculateShortestDistance(a.position!, city.position!);
          const distB = AnalysisTools.calculateShortestDistance(b.position!, city.position!);
          return (distA.realDistance - distB.realDistance) + (b.attack - a.attack) * 0.1;
        })
        .slice(0, 2) // 选择最多2个英雄
        .map(hero => hero.roleId);

      assessments.push({
        cityId: city.roleId,
        cityType: city.cityType,
        position: city.position,
        healthPercentage: city.healthPercentage,
        distance: { straightDistance: avgDistance, realDistance: avgDistance, isReachable: avgDistance < 999 },
                 attackPriority: Math.max(0, attackPriority),
         safetyScore: Math.max(0, Math.min(100, safetyScore)),
         resourceCost: 0, // 攻击城寨不消耗粮草
         canAttack,
        recommendedHeroes,
        reason: reason.trim()
      });
    }

    // 按攻击优先级排序
    assessments.sort((a, b) => b.attackPriority - a.attackPriority);
    
    return assessments;
  }

  /**
   * 分析敌方攻击策略
   */
  public analyzeEnemyAttackStrategy(): EnemyAttackAssessment {
    const myHeroes = this.blackboard.getMyAliveHeroes();
    const enemyHeroes = this.blackboard.getEnemyAliveHeroes();
    const myPlayer = this.blackboard.getMyPlayerData();
    const enemyPlayer = this.blackboard.getEnemyPlayerData();

    // 默认不攻击
    let assessment: EnemyAttackAssessment = {
      shouldAttack: false,
      priority: 0,
      powerComparison: 0,
      avgDistance: 999,
      shouldGatherFirst: false,
      gatherPosition: null,
      targetEnemyId: null,
      reason: '条件不满足',
      riskLevel: 'HIGH'
    };

    if (!myPlayer || !enemyPlayer || myHeroes.length === 0 || enemyHeroes.length === 0) {
      return assessment;
    }

    // 实力对比分析
    const myTotalPower = myHeroes.reduce((sum, hero) => sum + hero.attack + hero.life * 0.01, 0);
    const enemyTotalPower = enemyHeroes.reduce((sum, hero) => sum + hero.attack + hero.life * 0.01, 0);
    const powerComparison = myTotalPower / enemyTotalPower;

    // 距离分析
    const distances: number[] = [];
    let closestEnemyId: number | null = null;
    let minDistance = 999;

    for (const enemy of enemyHeroes) {
      if (!enemy.position) continue;
      
      for (const myHero of myHeroes) {
        if (!myHero.position) continue;
        
        const dist = AnalysisTools.calculateShortestDistance(myHero.position, enemy.position);
        if (dist.isReachable) {
          distances.push(dist.realDistance);
          if (dist.realDistance < minDistance) {
            minDistance = dist.realDistance;
            closestEnemyId = enemy.roleId;
          }
        }
      }
    }

    const avgDistance = distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 999;

    // 判断是否需要先集合
    const heroPositions = myHeroes.filter(h => h.position).map(h => h.position!);
    const shouldGatherFirst = this.shouldGatherForces(heroPositions);
    const gatherPosition = shouldGatherFirst ? this.calculateOptimalGatherPosition(heroPositions, enemyHeroes) : null;

    // 决策逻辑
    let shouldAttack = false;
    let priority = 0;
    let reason = '';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';

    // 实力优势明显时考虑攻击
    if (powerComparison > 1.3) {
      shouldAttack = true;
      priority = StrategyPriority.HIGH;
      reason += '我方实力优势明显; ';
      riskLevel = 'LOW';
    } else if (powerComparison > 1.1) {
      shouldAttack = true;
      priority = StrategyPriority.MEDIUM;
      reason += '我方略有优势; ';
      riskLevel = 'MEDIUM';
    } else if (powerComparison > 0.9) {
      // 势均力敌时，考虑其他因素
      if (avgDistance < 8) {
        shouldAttack = true;
        priority = StrategyPriority.MEDIUM;
        reason += '距离较近，可以一战; ';
        riskLevel = 'MEDIUM';
      }
    } else {
      reason += '敌方实力较强，不宜主动攻击; ';
    }

    // 距离考量
    if (avgDistance > 15 && shouldAttack) {
      if (!shouldGatherFirst) {
        priority -= 20;
        reason += '距离较远，需要考虑行军时间; ';
      }
    }

         // 攻击敌方不需要消耗粮草，移除粮草限制
     // 粮草只在生产小兵和占领龙旗时才需要考虑

    // 英雄血量考量
    const avgHealthPercentage = myHeroes.reduce((sum, h) => sum + h.healthPercentage, 0) / myHeroes.length;
    if (avgHealthPercentage < 60) {
      priority -= 30;
      reason += '我方英雄血量不足; ';
      riskLevel = 'HIGH';
    }

    return {
      shouldAttack,
      priority: Math.max(0, priority),
      powerComparison,
      avgDistance,
      shouldGatherFirst,
      gatherPosition,
      targetEnemyId: closestEnemyId,
      reason: reason.trim() || '战略分析完成',
      riskLevel
    };
  }

  /**
   * 分析集火攻击策略
   */
  public analyzeFocusFireStrategy(): FocusFireAssessment {
    const myHeroes = this.blackboard.getMyAliveHeroes();
    const enemyHeroes = this.blackboard.getEnemyAliveHeroes();

    let assessment: FocusFireAssessment = {
      shouldFocusFire: false,
      primaryTargetId: null,
      secondaryTargets: [],
      priority: 0,
      expectedDamage: 0,
      canEliminate: false,
      reason: '无合适目标'
    };

    if (myHeroes.length === 0 || enemyHeroes.length === 0) {
      return assessment;
    }

    // 找到在攻击范围内的敌方英雄
    const targetsInRange: Array<{ enemy: any; attackers: any[] }> = [];

    for (const enemy of enemyHeroes) {
      if (!enemy.position) continue;
      
      const attackers = myHeroes.filter(hero => {
        if (!hero.position) return false;
        const distance = AnalysisTools.calculateShortestDistance(hero.position, enemy.position!);
        return distance.isReachable && distance.realDistance <= 3; // 假设攻击距离为3
      });

      if (attackers.length > 0) {
        targetsInRange.push({ enemy, attackers });
      }
    }

    if (targetsInRange.length === 0) {
      assessment.reason = '没有敌人在攻击范围内';
      return assessment;
    }

    // 选择最佳集火目标（血量最低且攻击者最多）
    let bestTarget = targetsInRange.reduce((best, current) => {
      const currentScore = (100 - current.enemy.healthPercentage) + current.attackers.length * 10;
      const bestScore = (100 - best.enemy.healthPercentage) + best.attackers.length * 10;
      return currentScore > bestScore ? current : best;
    });

    // 计算预期伤害
    const expectedDamage = bestTarget.attackers.reduce((sum, attacker) => sum + attacker.attack, 0);
    const canEliminate = expectedDamage > bestTarget.enemy.life;

    // 设置优先级
    let priority = StrategyPriority.HIGH;
    if (canEliminate) {
      priority = StrategyPriority.CRITICAL;
    } else if (bestTarget.enemy.healthPercentage < 30) {
      priority = StrategyPriority.HIGH;
    }

    // 次要目标
    const secondaryTargets = targetsInRange
      .filter(t => t.enemy.roleId !== bestTarget.enemy.roleId)
      .sort((a, b) => (100 - a.enemy.healthPercentage) - (100 - b.enemy.healthPercentage))
      .slice(0, 2)
      .map(t => t.enemy.roleId);

    let reason = `集火攻击敌方英雄${bestTarget.enemy.roleId}(${bestTarget.enemy.healthPercentage.toFixed(1)}%血量), `;
    reason += `有${bestTarget.attackers.length}个英雄可参与攻击`;
    if (canEliminate) {
      reason += ', 预计可以击杀';
    }

    return {
      shouldFocusFire: true,
      primaryTargetId: bestTarget.enemy.roleId,
      secondaryTargets,
      priority,
      expectedDamage,
      canEliminate,
      reason
    };
  }

  /**
   * 分析龙旗占领策略
   */
  public analyzeFlagCaptureStrategy(): FlagCaptureAssessment {
    const stronghold = this.blackboard.getStronghold();
    const myHeroes = this.blackboard.getMyAliveHeroes();
    const myPlayer = this.blackboard.getMyPlayerData();
    const currentRound = this.blackboard.getCurrentRound();

    let assessment: FlagCaptureAssessment = {
      shouldCapture: false,
      priority: 0,
      isAvailable: false,
      controlStatus: 'NEUTRAL',
      distance: { straightDistance: 999, realDistance: 999, isReachable: false },
      risk: 100,
      recommendedHeroes: [],
      reason: '龙旗未开放或数据不足'
    };

    if (!stronghold || !myPlayer || myHeroes.length === 0) {
      return assessment;
    }

    // 检查龙旗是否开放
    const isAvailable = currentRound >= FLAG_ZONE.OPEN_TURN || stronghold.isAvailable;
    assessment.isAvailable = isAvailable;

    if (!isAvailable) {
      const roundsLeft = FLAG_ZONE.OPEN_TURN - currentRound;
      assessment.reason = `龙旗将在${roundsLeft}回合后开放`;
      return assessment;
    }

    // 确定控制状态
    if (stronghold.camp === myPlayer.playerId) {
      assessment.controlStatus = 'OURS';
    } else if (stronghold.camp !== 0) {
      assessment.controlStatus = 'ENEMY';
    } else {
      assessment.controlStatus = 'NEUTRAL';
    }

    // 计算到龙旗的距离
    if (stronghold.position) {
      const distances = myHeroes
        .filter(hero => hero.position)
        .map(hero => AnalysisTools.calculateShortestDistance(hero.position!, stronghold.position!));
      
      if (distances.length > 0) {
        const avgDistance = distances.reduce((sum, dist) => 
          sum + (dist.isReachable ? dist.realDistance : 999), 0) / distances.length;
        assessment.distance = {
          straightDistance: avgDistance,
          realDistance: avgDistance,
          isReachable: avgDistance < 999
        };
      }
    }

    // 决策逻辑
    let shouldCapture = false;
    let priority = StrategyPriority.LOW;
    let reason = '';
    let risk = 50;

    if (assessment.controlStatus === 'OURS') {
      reason = '我方已控制龙旗';
      shouldCapture = false;
    } else if (assessment.controlStatus === 'ENEMY') {
      shouldCapture = true;
      priority = StrategyPriority.HIGH;
      reason = '敌方控制龙旗，需要夺回控制权';
    } else {
      // 中立状态
      if (currentRound > FLAG_ZONE.OPEN_TURN + 10) {
        shouldCapture = true;
        priority = StrategyPriority.MEDIUM;
        reason = '龙旗处于中立状态，可以占领';
      }
    }

         // 距离因素
     if (assessment.distance.realDistance < 10) {
       priority += 20;
       risk -= 20;
       reason += ', 距离较近';
     } else if (assessment.distance.realDistance > 20) {
       priority -= 20;
       risk += 20;
       reason += ', 距离较远';
     }

     // 粮草考量（占领龙旗需要消耗粮草）
     const flagSupplyCost = 50; // 占领龙旗的粮草消耗
     if (shouldCapture && myPlayer.supplies < flagSupplyCost) {
       shouldCapture = false;
       priority = StrategyPriority.MINIMAL;
       reason += ', 粮草不足无法占领龙旗';
     } else if (shouldCapture && myPlayer.supplies < flagSupplyCost * 2) {
       priority -= 30;
       risk += 20;
       reason += ', 粮草紧张需谨慎占领';
     }

    // 风险评估：检查附近敌方英雄
    const enemyHeroes = this.blackboard.getEnemyAliveHeroes();
    let enemyNearFlag = 0;
    
    if (stronghold.position) {
      for (const enemy of enemyHeroes) {
        if (enemy.position) {
          const dist = AnalysisTools.calculateShortestDistance(enemy.position, stronghold.position);
          if (dist.isReachable && dist.realDistance < 8) {
            enemyNearFlag++;
            risk += 20;
          }
        }
      }
    }

    if (enemyNearFlag > 0) {
      reason += `, 附近有${enemyNearFlag}个敌方英雄`;
    }

    // 推荐英雄（选择移动力强且生命值高的）
    const recommendedHeroes = myHeroes
      .filter(hero => hero.position && hero.healthPercentage > 50)
      .sort((a, b) => {
        if (!stronghold.position) return 0;
        const distA = AnalysisTools.calculateShortestDistance(a.position!, stronghold.position);
        const distB = AnalysisTools.calculateShortestDistance(b.position!, stronghold.position);
        return distA.realDistance - distB.realDistance;
      })
      .slice(0, 2)
      .map(hero => hero.roleId);

    return {
      shouldCapture,
      priority: Math.max(0, priority),
      isAvailable,
      controlStatus: assessment.controlStatus,
      distance: assessment.distance,
      risk: Math.max(0, Math.min(100, risk)),
      recommendedHeroes,
      reason: reason.trim() || '龙旗占领分析完成'
    };
  }

  /**
   * 判断是否需要集合兵力
   */
  private shouldGatherForces(heroPositions: Array<{ x: number; y: number }>): boolean {
    if (heroPositions.length < 2) return false;

    // 计算英雄之间的平均距离
    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < heroPositions.length; i++) {
      for (let j = i + 1; j < heroPositions.length; j++) {
        const dist = AnalysisTools.calculateShortestDistance(heroPositions[i], heroPositions[j]);
        if (dist.isReachable) {
          totalDistance += dist.realDistance;
          pairCount++;
        }
      }
    }

    const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
    
    // 如果平均距离大于10，建议集合
    return avgDistance > 10;
  }

  /**
   * 计算最优集合位置
   */
  private calculateOptimalGatherPosition(
    heroPositions: Array<{ x: number; y: number }>,
    enemyHeroes: any[]
  ): { x: number; y: number } | null {
    if (heroPositions.length === 0) return null;

    // 计算英雄的中心位置
    const centerX = Math.round(heroPositions.reduce((sum, pos) => sum + pos.x, 0) / heroPositions.length);
    const centerY = Math.round(heroPositions.reduce((sum, pos) => sum + pos.y, 0) / heroPositions.length);

    // 找到距离中心最近且安全的位置
    const candidates = AnalysisTools.getReachablePositionsInRange({ x: centerX, y: centerY }, 5);
    
    for (const candidate of candidates) {
      // 检查该位置是否远离敌方英雄
      let isSafe = true;
      for (const enemy of enemyHeroes) {
        if (enemy.position) {
          const dist = AnalysisTools.calculateShortestDistance(candidate.position, enemy.position);
          if (dist.isReachable && dist.realDistance < 8) {
            isSafe = false;
            break;
          }
        }
      }
      
      if (isSafe) {
        return candidate.position;
      }
    }

    // 如果没有安全位置，返回中心位置
    return { x: centerX, y: centerY };
  }

  /**
   * 创建策略决策对象
   */
  private createStrategyDecision(
    strategy: StrategyType,
    priority: number,
    details: any,
    reason: string
  ): StrategyDecision {
    let executionPlan: string[] = [];
    let confidence = 70; // 默认置信度

    switch (strategy) {
      case StrategyType.ATTACK_CITY:
        executionPlan = [
          `选择目标城寨: ${details.cityType}`,
          `派遣英雄: ${details.recommendedHeroes.join(', ')}`,
          '移动到攻击位置',
          '开始攻城'
        ];
        confidence = details.safetyScore;
        break;

      case StrategyType.ATTACK_ENEMY:
        executionPlan = [
          '向敌方位置移动',
          '保持队形',
          '寻找攻击机会'
        ];
        confidence = Math.min(90, 50 + details.powerComparison * 20);
        break;

      case StrategyType.GATHER_FORCES:
        executionPlan = [
          '向集合点移动',
          '等待所有英雄到位',
          '重新评估战局'
        ];
        confidence = 80;
        break;

      case StrategyType.FOCUS_FIRE:
        executionPlan = [
          `集火攻击目标: ${details.primaryTargetId}`,
          '协调攻击时机',
          '优先击杀血量较低的敌人'
        ];
        confidence = details.canEliminate ? 90 : 70;
        break;

      case StrategyType.CAPTURE_FLAG:
        executionPlan = [
          '向龙旗位置移动',
          '清理附近敌方单位',
          '占领并防守龙旗'
        ];
        confidence = 100 - details.risk;
        break;

      default:
        executionPlan = ['维持当前策略'];
        confidence = 50;
    }

    return {
      strategy,
      priority,
      confidence,
      details,
      reason,
      executionPlan
    };
  }
}
