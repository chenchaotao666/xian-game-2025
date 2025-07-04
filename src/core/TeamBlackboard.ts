/**
 * 团队黑板模块
 * =============
 * 
 * 实现团队成员之间的信息共享机制，包括：
 * - 集火目标管理
 * - Debuff状态追踪
 * - 全局目标管理
 * - 通用数据存储
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { Hero } from '..';
import { Agent } from './Agent';
import { GlobalObjective } from './types';

/**
 * 团队黑板类
 * 用于团队成员之间共享信息，包括集火目标、debuff状态、战略目标等
 * 实现AI之间的协作和信息同步
 */
export class TeamBlackboard {
  private data: Map<string, any> = new Map();              // 通用数据存储
  private currentObjectives: GlobalObjective[] = [];       // 支持多个目标，按优先级排序

  private warrior: Agent;
  private support: Agent;
  private leader: Agent;

  constructor(public food: number) {
  }

  setTeam(warrior: Agent, support: Agent, leader: Agent) {
    this.warrior = warrior;
    this.support = support;
    this.leader = leader;
  }

  /**
   * 设置团队集火目标
   * @param targetId 目标ID，null表示取消集火
   */
  public setFocusTarget(targetId: string | null): void {
    if (targetId) {
      this.data.set('teamFocusTargetId', targetId);
      console.log(`[团队黑板]: 新的集火目标 ${targetId}`);
    } else {
      this.data.delete('teamFocusTargetId');
      console.log(`[团队黑板]: 取消集火目标`);
    }
  }

  /**
   * 获取当前集火目标ID
   * @returns 目标ID或undefined
   */
  public getFocusTargetId(): string | undefined {
    return this.data.get('teamFocusTargetId');
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
      expiresTurn: currentTurn + durationTurns - 1 // 如果持续1回合，则在当前回合结束时就没了
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
   * 添加全局目标
   * @param objective 目标对象
   */
  public addObjective(objective: GlobalObjective): void {
    this.currentObjectives.push(objective);
    // 按优先级降序排序
    this.currentObjectives.sort((a, b) => b.priority - a.priority);
    console.log(`[团队黑板]: 添加目标 "${objective.type}" (优先级: ${objective.priority}, ID: ${objective.id})`);
  }

  /**
   * 移除指定的全局目标
   * @param objectiveId 目标ID
   */
  public removeObjective(objectiveId: string): void {
    const beforeLength = this.currentObjectives.length;
    this.currentObjectives = this.currentObjectives.filter(obj => obj.id !== objectiveId);
    if (this.currentObjectives.length < beforeLength) {
      console.log(`[团队黑板]: 移除目标 ID: ${objectiveId}`);
    }
  }

  /**
   * 获取最高优先级的目标
   * @returns 最高优先级目标或null
   */
  public getHighestPriorityObjective(): GlobalObjective | null {
    return this.currentObjectives.length > 0 ? this.currentObjectives[0] : null;
  }

  /**
   * 获取所有当前目标
   * @returns 目标数组（按优先级排序）
   */
  public getAllObjectives(): GlobalObjective[] {
    return [...this.currentObjectives];
  }
} 