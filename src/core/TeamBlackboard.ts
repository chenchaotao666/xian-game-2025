/**
 * 团队黑板模块
 * =============
 * 
 * 实现团队成员之间的信息共享机制，包括：
 * - 全局策略数据管理
 * - 集火目标管理
 * - 城寨攻击目标管理
 * - 集合位置管理
 * - Debuff状态追踪
 * - 历史目标记录
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { Agent } from './Agent';
import { StrategyType } from './StrategyAnalysis';

/**
 * 游戏状态接口
 */
interface GameStateData {
  round: number;
  players: PlayerData[];
  cityProps: CityData[];
  stronghold: StrongholdData | null;
  timestamp: string;
}

/**
 * 玩家数据接口
 */
interface PlayerData {
  playerId: number;
  supplies: number;
  morale: number;
  roles: RoleData[];
  totalLife: number;
  aliveHeroes: number;
  totalSoldiers: number;
}

/**
 * 英雄数据接口
 */
interface RoleData {
  roleId: number;
  attack: number;
  position: { x: number; y: number } | null;
  life: number;
  maxLife: number;
  camp: number;
  campName: string;
  reviveRound: number;
  formationType: number;
  formationName: string;
  commander: number;
  statuses: any;
  skills: SkillData[];
  soldiers: SoldierData[];
  isAlive: boolean;
  isReviving: boolean;
  totalSoldierCount: number;
  healthPercentage: number;
}

/**
 * 技能数据接口
 */
interface SkillData {
  skillId: number;
  cd: number;
  cdRemainRound: number;
  damage: number;
  damageReduceRatio: number;
  damageAddByAttackRatio: number;
  roleId: number;
  isReady: boolean;
  cooldownProgress: number;
}

/**
 * 士兵数据接口
 */
interface SoldierData {
  roleId: number;
  attack: number;
  heroId: number;
  life: number;
  type: string;
  typeName: string;
}

/**
 * 城寨数据接口
 */
interface CityData {
  roleId: number;
  position: { x: number; y: number } | null;
  life: number;
  maxLife: number;
  cityType: string;
  healthPercentage: number;
}

/**
 * 据点数据接口
 */
interface StrongholdData {
  roleId: number;
  camp: number;
  campName: string;
  occupiedRound: number[];
  position: { x: number; y: number } | null;
  isAvailable: boolean;
  redOccupiedRounds: number;
  blueOccupiedRounds: number;
  totalOccupiedRounds: number;
}

/**
 * 集火目标数据
 */
interface FocusTargetData {
  targetType: 'enemy_hero' | 'city' | 'stronghold' | 'gather_position';
  priority: number;
  reason: string;
  setAt: number; // 设置时的回合数
  
  // 敌方英雄目标
  heroTarget?: {
    roleId: number;
    position: { x: number; y: number } | null;
    life: number;
    maxLife: number;
    attack: number;
    camp: number;
  };
  
  // 城寨目标
  cityTarget?: {
    roleId: number;
    position: { x: number; y: number } | null;
    cityType: string;
    life: number;
    maxLife: number;
    healthPercentage: number;
  };
  
  // 据点/龙旗目标
  strongholdTarget?: {
    roleId: number;
    position: { x: number; y: number } | null;
    camp: number;
    campName: string;
    isAvailable: boolean;
  };
  
  // 集合位置目标
  gatherTarget?: {
    position: { x: number; y: number };
    purpose: string;
    estimatedTime: number;
    participatingHeroes: number[];
  };
}

/**
 * 城寨攻击目标数据
 */
interface CityAttackData {
  cityId: number;
  cityType: string;
  position: { x: number; y: number } | null;
  healthPercentage: number;
  distance: number;
  priority: number;
  safetyScore: number;
  recommendedHeroes: number[];
  reason: string;
  setAt: number;
}

/**
 * 敌方攻击目标数据
 */
interface EnemyAttackData {
  targetEnemyId: number;
  enemyPosition: { x: number; y: number } | null;
  powerComparison: number;
  avgDistance: number;
  priority: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  setAt: number;
}

/**
 * 集合位置数据
 */
interface GatherPositionData {
  position: { x: number; y: number };
  reason: string;
  participatingHeroes: number[];
  estimatedTime: number; // 预计集合所需回合数
  purpose: string; // 集合目的
  setAt: number;
}

/**
 * 龙旗占领数据
 */
interface FlagCaptureData {
  flagPosition: { x: number; y: number };
  controlStatus: 'OURS' | 'ENEMY' | 'NEUTRAL';
  distance: number;
  risk: number;
  recommendedHeroes: number[];
  reason: string;
  setAt: number;
}

/**
 * 历史策略记录
 */
interface StrategyHistoryEntry {
  round: number;
  strategy: StrategyType;
  priority: number;
  confidence: number;
  reason: string;
  data: any; // 对应策略的具体数据
  result?: 'SUCCESS' | 'FAILED' | 'INTERRUPTED'; // 执行结果
}

/**
 * 团队黑板类
 * 用于团队成员之间共享信息，根据全局策略存储对应的数据
 */
export class TeamBlackboard {
  private data: Map<string, any> = new Map();              // 通用数据存储

  // 游戏状态数据
  private gameState: GameStateData | null = null;          // 当前游戏状态
  private myPlayerId: number | null = null;                // 我方玩家ID
  private enemyPlayerId: number | null = null;             // 敌方玩家ID

  // 当前策略数据
  private currentStrategy: StrategyType | null = null;
  private currentStrategyData: any = null;

  // 策略相关数据存储
  private focusTarget: FocusTargetData | null = null;      // 当前集火目标
  private cityAttackTarget: CityAttackData | null = null;  // 当前城寨攻击目标
  private enemyAttackTarget: EnemyAttackData | null = null; // 当前敌方攻击目标
  private gatherPosition: GatherPositionData | null = null; // 当前集合位置
  private flagCaptureTarget: FlagCaptureData | null = null; // 当前龙旗占领目标

  // 历史记录
  private strategyHistory: StrategyHistoryEntry[] = [];     // 策略历史记录

  public warrior: Agent;
  public support: Agent;
  public leader: Agent;
  public team: Agent[];

  constructor(public food: number = 100) {
  }

  setTeam(warrior: Agent, support: Agent, leader: Agent) {
    this.warrior = warrior;
    this.support = support;
    this.leader = leader;
    this.team = [warrior, support, leader];
  }

  /**
   * 填充游戏状态数据
   * @param gameStateData 从NetworkClient解析的游戏状态数据
   * @param myPlayerId 我方玩家ID
   */
  public updateGameState(gameStateData: GameStateData, myPlayerId: number): void {
    this.gameState = gameStateData;
    this.myPlayerId = myPlayerId;
    
    // 找到敌方玩家ID
    this.enemyPlayerId = gameStateData.players.find(p => p.playerId !== myPlayerId)?.playerId || null;
  }

  public getPlayerId(): number {
    return this.myPlayerId || 0;
  }

  /**
   * 设置全局策略及其对应数据
   * @param strategy 策略类型
   * @param data 策略相关数据
   * @param priority 优先级
   * @param confidence 置信度
   * @param reason 理由
   */
  public setGlobalStrategy(
    strategy: StrategyType, 
    data: any, 
    priority: number, 
    confidence: number, 
    reason: string
  ): void {
    const currentRound = this.getCurrentRound();
    
    // 如果策略发生变化，记录上一个策略的结果
    if (this.currentStrategy && this.currentStrategy !== strategy) {
      this.recordStrategyResult('INTERRUPTED');
    }

    // 设置新策略
    this.currentStrategy = strategy;
    this.currentStrategyData = data;

    // 根据策略类型存储对应数据
    this.storeStrategyData(strategy, data, currentRound);

    // 记录策略历史
    this.strategyHistory.push({
      round: currentRound,
      strategy,
      priority,
      confidence,
      reason,
      data
    });

    // 保持历史记录不超过20条
    if (this.strategyHistory.length > 20) {
      this.strategyHistory = this.strategyHistory.slice(-20);
    }

    console.log(`[团队黑板] 设置全局策略: ${strategy}, 优先级: ${priority}, 置信度: ${confidence}%`);
    console.log(`[团队黑板] 策略理由: ${reason}`);
  }

  /**
   * 根据策略类型存储对应数据
   */
  private storeStrategyData(strategy: StrategyType, data: any, round: number): void {
    switch (strategy) {
      case StrategyType.FOCUS_FIRE:
        this.focusTarget = {
          targetType: 'enemy_hero',
          priority: data.priority,
          reason: data.reason,
          setAt: round
        };
        break;

      case StrategyType.ATTACK_CITY:
        this.cityAttackTarget = {
          cityId: data.cityId,
          cityType: data.cityType,
          position: data.position,
          healthPercentage: data.healthPercentage,
          distance: data.distance?.realDistance || 0,
          priority: data.attackPriority,
          safetyScore: data.safetyScore,
          recommendedHeroes: data.recommendedHeroes,
          reason: data.reason,
          setAt: round
        };
        break;

      case StrategyType.ATTACK_ENEMY:
        this.enemyAttackTarget = {
          targetEnemyId: data.targetEnemyId,
          enemyPosition: data.enemyPosition,
          powerComparison: data.powerComparison,
          avgDistance: data.avgDistance,
          priority: data.priority,
          riskLevel: data.riskLevel,
          reason: data.reason,
          setAt: round
        };
        break;

      case StrategyType.GATHER_FORCES:
        this.gatherPosition = {
          position: data.gatherPosition,
          reason: data.reason,
          participatingHeroes: this.getMyAliveHeroes().map(h => h.roleId),
          estimatedTime: data.estimatedTime || 3,
          purpose: data.purpose || '集合后攻击敌方',
          setAt: round
        };
        break;

      case StrategyType.CAPTURE_FLAG:
        this.flagCaptureTarget = {
          flagPosition: data.position || { x: 8, y: 8 },
          controlStatus: data.controlStatus,
          distance: data.distance?.realDistance || 0,
          risk: data.risk,
          recommendedHeroes: data.recommendedHeroes,
          reason: data.reason,
          setAt: round
        };
        break;
    }
  }

  /**
   * 记录策略执行结果
   */
  public recordStrategyResult(result: 'SUCCESS' | 'FAILED' | 'INTERRUPTED'): void {
    if (this.strategyHistory.length > 0) {
      const lastEntry = this.strategyHistory[this.strategyHistory.length - 1];
      if (!lastEntry.result) {
        lastEntry.result = result;
        console.log(`[团队黑板] 策略 ${lastEntry.strategy} 执行结果: ${result}`);
      }
    }
  }

  /**
   * 获取当前策略
   */
  public getCurrentStrategy(): StrategyType | null {
    return this.currentStrategy;
  }

  /**
   * 获取当前策略数据
   */
  public getCurrentStrategyData(): any {
    return this.currentStrategyData;
  }

  /**
   * 获取集火目标
   */
  public getFocusTarget(): FocusTargetData | null {
    return this.focusTarget;
  }

  /**
   * 获取城寨攻击目标
   */
  public getCityAttackTarget(): CityAttackData | null {
    return this.cityAttackTarget;
  }

  /**
   * 获取敌方攻击目标
   */
  public getEnemyAttackTarget(): EnemyAttackData | null {
    return this.enemyAttackTarget;
  }

  /**
   * 获取集合位置
   */
  public getGatherPosition(): GatherPositionData | null {
    return this.gatherPosition;
  }

  /**
   * 获取龙旗占领目标
   */
  public getFlagCaptureTarget(): FlagCaptureData | null {
    return this.flagCaptureTarget;
  }

  /**
   * 获取策略历史记录
   */
  public getStrategyHistory(): StrategyHistoryEntry[] {
    return [...this.strategyHistory];
  }

  /**
   * 获取最近N个策略记录
   */
  public getRecentStrategyHistory(count: number = 5): StrategyHistoryEntry[] {
    return this.strategyHistory.slice(-count);
  }

  /**
   * 清除指定策略的数据
   */
  public clearStrategyData(strategy: StrategyType): void {
    switch (strategy) {
      case StrategyType.FOCUS_FIRE:
        this.focusTarget = null;
        break;
      case StrategyType.ATTACK_CITY:
        this.cityAttackTarget = null;
        break;
      case StrategyType.ATTACK_ENEMY:
        this.enemyAttackTarget = null;
        break;
      case StrategyType.GATHER_FORCES:
        this.gatherPosition = null;
        break;
      case StrategyType.CAPTURE_FLAG:
        this.flagCaptureTarget = null;
        break;
    }
    console.log(`[团队黑板] 清除策略数据: ${strategy}`);
  }

  /**
   * 获取当前游戏回合数
   */
  public getCurrentRound(): number {
    return this.gameState?.round || 0;
  }

  /**
   * 获取我方玩家数据
   */
  public getMyPlayerData(): PlayerData | null {
    if (!this.gameState || !this.myPlayerId) return null;
    return this.gameState.players.find(p => p.playerId === this.myPlayerId) || null;
  }

  /**
   * 获取敌方玩家数据
   */
  public getEnemyPlayerData(): PlayerData | null {
    if (!this.gameState || !this.enemyPlayerId) return null;
    return this.gameState.players.find(p => p.playerId === this.enemyPlayerId) || null;
  }

  /**
   * 获取我方所有英雄
   */
  public getMyHeroes(): RoleData[] {
    const myPlayer = this.getMyPlayerData();
    return myPlayer?.roles || [];
  }

  /**
   * 获取敌方所有英雄
   */
  public getEnemyHeroes(): RoleData[] {
    const enemyPlayer = this.getEnemyPlayerData();
    return enemyPlayer?.roles || [];
  }

  /**
   * 获取我方存活英雄
   */
  public getMyAliveHeroes(): RoleData[] {
    return this.getMyHeroes().filter(hero => hero.isAlive);
  }

  /**
   * 获取敌方存活英雄
   */
  public getEnemyAliveHeroes(): RoleData[] {
    return this.getEnemyHeroes().filter(hero => hero.isAlive);
  }

  /**
   * 根据ID获取英雄数据
   */
  public getHeroById(heroId: number): RoleData | null {
    if (!this.gameState) return null;
    
    for (const player of this.gameState.players) {
      const hero = player.roles.find(role => role.roleId === heroId);
      if (hero) return hero;
    }
    return null;
  }

  /**
   * 获取城寨数据
   */
  public getCities(): CityData[] {
    return this.gameState?.cityProps || [];
  }

  /**
   * 获取据点数据
   */
  public getStronghold(): StrongholdData | null {
    return this.gameState?.stronghold || null;
  }

  /**
   * 获取当前游戏状态快照
   */
  public getGameStateSnapshot(): GameStateData | null {
    return this.gameState;
  }

  /**
   * 设置团队集火目标
   * @param target 目标对象，可以是敌方英雄、城寨、据点
   */
  public setFocusTarget(target: any): void {
    if (!target) {
      this.focusTarget = null;
      console.log(`[团队黑板]: 取消集火目标`);
      return;
    }

    const currentRound = this.getCurrentRound();

    // 根据目标类型创建相应的集火目标数据
    if (target.roleId !== undefined && target.camp !== undefined) {
      // 敌方英雄目标
      if (target.camp !== (this.myPlayerId === 1 ? 1 : 2)) {
        this.focusTarget = {
          targetType: 'enemy_hero',
          priority: 100,
          reason: '选择距离最近的敌方英雄',
          setAt: currentRound,
          heroTarget: {
            roleId: target.roleId,
            position: target.position,
            life: target.life,
            maxLife: target.maxLife,
            attack: target.attack,
            camp: target.camp
          }
        };
        console.log(`[团队黑板]: 设置敌方英雄目标 - 英雄${target.roleId}`);
      }
    } else if (target.cityType !== undefined) {
      // 城寨目标
      this.focusTarget = {
        targetType: 'city',
        priority: 90,
        reason: '选择最优城寨攻击目标',
        setAt: currentRound,
        cityTarget: {
          roleId: target.roleId,
          position: target.position,
          cityType: target.cityType,
          life: target.life,
          maxLife: target.maxLife,
          healthPercentage: target.healthPercentage
        }
      };
      console.log(`[团队黑板]: 设置城寨目标 - ${target.cityType}(${target.roleId})`);
    } else if (target.campName !== undefined && target.isAvailable !== undefined) {
      // 据点/龙旗目标
      this.focusTarget = {
        targetType: 'stronghold',
        priority: 95,
        reason: '占领龙旗据点',
        setAt: currentRound,
        strongholdTarget: {
          roleId: target.roleId,
          position: target.position,
          camp: target.camp,
          campName: target.campName,
          isAvailable: target.isAvailable
        }
      };
      console.log(`[团队黑板]: 设置龙旗目标 - 位置(${target.position?.x}, ${target.position?.y})`);
    } else if (target.position !== undefined && target.purpose !== undefined) {
      // 集合位置目标
      this.focusTarget = {
        targetType: 'gather_position',
        priority: 80,
        reason: '设置集合位置',
        setAt: currentRound,
        gatherTarget: {
          position: target.position,
          purpose: target.purpose,
          estimatedTime: target.estimatedTime || 3,
          participatingHeroes: target.participatingHeroes || []
        }
      };
      console.log(`[团队黑板]: 设置集合目标 - 位置(${target.position.x}, ${target.position.y})`);
    } else {
      // 兼容旧的字符串ID格式（临时保留）
      console.log(`[团队黑板]: 设置目标 - ${target}`);
    }
  }

  /**
   * 获取当前集火目标ID（兼容旧接口）
   * @returns 目标ID或undefined
   */
  public getFocusTargetId(): string | undefined {
    if (!this.focusTarget) return undefined;
    
    switch (this.focusTarget.targetType) {
      case 'enemy_hero':
        return this.focusTarget.heroTarget?.roleId.toString();
      case 'city':
        return this.focusTarget.cityTarget?.roleId.toString();
      case 'stronghold':
        return this.focusTarget.strongholdTarget?.roleId.toString();
      case 'gather_position':
        return `gather_${this.focusTarget.gatherTarget?.position.x}_${this.focusTarget.gatherTarget?.position.y}`;
      default:
        return undefined;
    }
  }

  /**
   * 设置城寨攻击目标
   * @param cityTarget 城寨目标对象
   */
  public setCityTarget(cityTarget: any): void {
    if (!cityTarget) {
      this.cityAttackTarget = null;
      console.log(`[团队黑板]: 取消城寨攻击目标`);
      return;
    }

    const currentRound = this.getCurrentRound();
    this.cityAttackTarget = {
      cityId: cityTarget.roleId,
      cityType: cityTarget.cityType,
      position: cityTarget.position,
      healthPercentage: cityTarget.healthPercentage,
      distance: 0, // 将在使用时计算
      priority: 90,
      safetyScore: 70,
      recommendedHeroes: [],
      reason: '选择最优城寨攻击目标',
      setAt: currentRound
    };
    console.log(`[团队黑板]: 设置城寨攻击目标 - ${cityTarget.cityType}(${cityTarget.roleId})`);
  }

  /**
   * 设置敌方攻击目标
   * @param enemyTarget 敌方目标对象
   */
  public setEnemyTarget(enemyTarget: any): void {
    if (!enemyTarget) {
      this.enemyAttackTarget = null;
      console.log(`[团队黑板]: 取消敌方攻击目标`);
      return;
    }

    const currentRound = this.getCurrentRound();
    this.enemyAttackTarget = {
      targetEnemyId: enemyTarget.roleId,
      enemyPosition: enemyTarget.position,
      powerComparison: 1.0, // 将在使用时计算
      avgDistance: 0, // 将在使用时计算
      priority: 100,
      riskLevel: 'MEDIUM',
      reason: '选择距离最近的敌方英雄',
      setAt: currentRound
    };
    console.log(`[团队黑板]: 设置敌方攻击目标 - 英雄${enemyTarget.roleId}`);
  }

  /**
   * 设置龙旗占领目标
   * @param flagTarget 龙旗目标对象
   */
  public setFlagTarget(flagTarget: any): void {
    if (!flagTarget) {
      this.flagCaptureTarget = null;
      console.log(`[团队黑板]: 取消龙旗占领目标`);
      return;
    }

    const currentRound = this.getCurrentRound();
    this.flagCaptureTarget = {
      flagPosition: flagTarget.position,
      controlStatus: 'NEUTRAL', // 将在使用时计算
      distance: 0, // 将在使用时计算
      risk: 50,
      recommendedHeroes: [],
      reason: '占领龙旗据点',
      setAt: currentRound
    };
    console.log(`[团队黑板]: 设置龙旗占领目标 - 位置(${flagTarget.position?.x}, ${flagTarget.position?.y})`);
  }

  /**
   * 获取城寨攻击目标
   * @returns 城寨攻击目标数据或null
   */
  public getCityTarget(): CityAttackData | null {
    return this.cityAttackTarget;
  }

  /**
   * 获取敌方攻击目标
   * @returns 敌方攻击目标数据或null
   */
  public getEnemyTarget(): EnemyAttackData | null {
    return this.enemyAttackTarget;
  }

  /**
   * 获取龙旗占领目标
   * @returns 龙旗占领目标数据或null
   */
  public getFlagTarget(): FlagCaptureData | null {
    return this.flagCaptureTarget;
  }

  /**
   * 记录目标身上的debuff状态
   * @param targetId 目标ID
   * @param debuffType debuff类型
   * @param sourceSkill 施加debuff的技能
   * @param durationTurns 持续回合数
   * @param currentTurn 当前回合数
   */
  public setTargetDebuff(targetId: string, debuffType: string, sourceSkill: string, durationTurns: number, currentTurn: number): void {
    const key = `debuff_${targetId}_${debuffType}`;
    this.data.set(key, {
      sourceSkill,
      appliedTurn: currentTurn,
      expiresTurn: currentTurn + durationTurns - 1
    });
    console.log(`[团队黑板]: 目标 ${targetId} 获得debuff "${debuffType}" (来自: ${sourceSkill}, 持续到回合结束: ${currentTurn + durationTurns - 1})`);
  }

  /**
   * 获取目标身上指定debuff的信息
   * @param targetId 目标ID
   * @param debuffType debuff类型
   * @param currentTurn 当前回合数
   * @returns debuff信息或undefined（如果不存在或已过期）
   */
  public getTargetDebuffInfo(targetId: string, debuffType: string, currentTurn: number): {
    sourceSkill: string,
    appliedTurn: number,
    expiresTurn: number
  } | undefined {
    const key = `debuff_${targetId}_${debuffType}`;
    const debuffInfo = this.data.get(key);
    if (debuffInfo && currentTurn <= debuffInfo.expiresTurn) {
      return debuffInfo;
    }
    // 如果过期了就删除
    if (debuffInfo) {
      this.data.delete(key);
    }
    return undefined;
  }

  /**
   * 设置黑板数据
   * @param key 数据键
   * @param value 数据值
   */
  public setData(key: string, value: any): void {
    this.data.set(key, value);
  }

  /**
   * 获取黑板数据
   * @param key 数据键
   * @returns 数据值或undefined
   */
  public getData(key: string): any {
    return this.data.get(key);
  }

  /**
   * 删除黑板数据
   * @param key 数据键
   */
  public deleteData(key: string): void {
    this.data.delete(key);
  }

  /**
   * 检查黑板是否包含指定数据
   * @param key 数据键
   * @returns 是否包含
   */
  public hasData(key: string): boolean {
    return this.data.has(key);
  }
} 