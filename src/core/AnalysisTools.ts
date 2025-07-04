/**
 * 分析工具类
 * 提供游戏中各种分析计算功能，包括距离计算、路径分析等
 * 
 * @author AI游戏框架开发团队
 * @version 1.0.0
 */

import { GameMap } from '../context/gameMap';
import { MapLayout } from '../mapData';
import { Position } from './types';

/**
 * 目标对象接口
 * 表示可以计算距离的目标，可以是位置坐标或包含位置的对象
 */
export interface Target {
  x: number;
  y: number;
}

/**
 * 距离计算结果接口
 * 包含直线距离和真实距离（考虑障碍物）的计算结果
 */
export interface DistanceResult {
  /** 切比雪夫距离（直线距离，允许对角线移动） */
  straightDistance: number;
  /** 真实距离（使用A*算法，考虑障碍物绕行） */
  realDistance: number;
  /** 是否可以到达目标位置 */
  isReachable: boolean;
  /** 最短路径（如果存在） */
  path?: Position[];
}

/**
 * 分析工具类
 * 提供基于真实地图数据的各种分析计算功能
 */
export class AnalysisTools {
  private static gameMap: GameMap | null = null;

  /**
   * 初始化分析工具
   * 使用真实的地图数据创建GameMap实例
   */
  private static initializeGameMap(): void {
    if (!this.gameMap) {
      // 将二维地图数组转换为字符串格式
      const mapData = MapLayout.flat().join(',');
      // 地图大小为16x16
      this.gameMap = new GameMap(mapData, 16, 16);
    }
  }

  /**
   * 获取GameMap实例
   * @returns GameMap实例
   */
  public static getGameMap(): GameMap {
    this.initializeGameMap();
    return this.gameMap!;
  }

  /**
   * 计算两个目标之间的最短距离
   * 考虑障碍物，使用A*算法计算真实可行路径
   * 
   * @param target1 第一个目标（位置坐标或包含位置的对象）
   * @param target2 第二个目标（位置坐标或包含位置的对象）
   * @returns 距离计算结果，包含直线距离和真实距离
   */
  public static calculateShortestDistance(target1: Target, target2: Target): DistanceResult {
    this.initializeGameMap();
    
    const map = this.gameMap!;
    
    // 提取坐标
    const x1 = Math.round(target1.x);
    const y1 = Math.round(target1.y);
    const x2 = Math.round(target2.x);
    const y2 = Math.round(target2.y);

    // 验证坐标有效性
    if (!map.isValidPosition(x1, y1) || !map.isValidPosition(x2, y2)) {
      return {
        straightDistance: -1,
        realDistance: -1,
        isReachable: false
      };
    }

    // 计算切比雪夫距离（直线距离）
    const straightDistance = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));

    // 如果起点和终点相同，距离为0
    if (x1 === x2 && y1 === y2) {
      return {
        straightDistance: 0,
        realDistance: 0,
        isReachable: true,
        path: [{ x: x1, y: y1 }]
      };
    }

    // 检查起点和终点是否是障碍物
    if (map.isObstacle(x1, y1) || map.isObstacle(x2, y2)) {
      return {
        straightDistance,
        realDistance: -1,
        isReachable: false
      };
    }

    // 使用A*算法计算真实距离
    const path = map.findPathAStar(x1, y1, x2, y2);
    
    if (path && path.length > 0) {
      const realDistance = path.length - 1; // 路径长度减1为移动步数
      return {
        straightDistance,
        realDistance,
        isReachable: true,
        path
      };
    } else {
      return {
        straightDistance,
        realDistance: -1,
        isReachable: false
      };
    }
  }

  /**
   * 批量计算一个目标到多个目标的最短距离
   * 
   * @param origin 起始目标
   * @param targets 目标列表
   * @returns 距离结果数组，与目标列表顺序对应
   */
  public static calculateDistancesToMultipleTargets(
    origin: Target,
    targets: Target[]
  ): DistanceResult[] {
    return targets.map(target => this.calculateShortestDistance(origin, target));
  }

  /**
   * 找到距离起点最近的目标
   * 
   * @param origin 起始目标
   * @param targets 候选目标列表
   * @param useRealDistance 是否使用真实距离（考虑障碍物），默认为true
   * @returns 最近的目标及其距离信息，如果没有可达目标则返回null
   */
  public static findNearestTarget(
    origin: Target,
    targets: Target[],
    useRealDistance: boolean = true
  ): { target: Target; distance: DistanceResult; index: number } | null {
    if (targets.length === 0) {
      return null;
    }

    let nearestTarget: Target | null = null;
    let nearestDistance: DistanceResult | null = null;
    let nearestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const distanceResult = this.calculateShortestDistance(origin, target);
      
      // 选择使用真实距离还是直线距离
      const currentDistance = useRealDistance 
        ? (distanceResult.isReachable ? distanceResult.realDistance : Infinity)
        : distanceResult.straightDistance;

      if (currentDistance < minDistance && currentDistance >= 0) {
        minDistance = currentDistance;
        nearestTarget = target;
        nearestDistance = distanceResult;
        nearestIndex = i;
      }
    }

    if (nearestTarget && nearestDistance) {
      return {
        target: nearestTarget,
        distance: nearestDistance,
        index: nearestIndex
      };
    }

    return null;
  }

  /**
   * 检查两个目标之间是否可以直线移动（无障碍物阻挡）
   * 
   * @param target1 第一个目标
   * @param target2 第二个目标
   * @returns 是否可以直线移动
   */
  public static canMoveDirectly(target1: Target, target2: Target): boolean {
    this.initializeGameMap();
    
    const map = this.gameMap!;
    const x1 = Math.round(target1.x);
    const y1 = Math.round(target1.y);
    const x2 = Math.round(target2.x);
    const y2 = Math.round(target2.y);

    // 验证坐标有效性
    if (!map.isValidPosition(x1, y1) || !map.isValidPosition(x2, y2)) {
      return false;
    }

    return map.canDirectMove(x1, y1, x2, y2);
  }

  /**
   * 获取指定范围内的所有可达位置
   * 
   * @param origin 起始位置
   * @param maxDistance 最大距离
   * @param useRealDistance 是否使用真实距离（考虑障碍物），默认为true
   * @returns 可达位置列表，包含位置坐标和距离信息
   */
  public static getReachablePositionsInRange(
    origin: Target,
    maxDistance: number,
    useRealDistance: boolean = true
  ): Array<{ position: Position; distance: DistanceResult }> {
    this.initializeGameMap();
    
    const map = this.gameMap!;
    const reachablePositions: Array<{ position: Position; distance: DistanceResult }> = [];
    
    const originX = Math.round(origin.x);
    const originY = Math.round(origin.y);

    // 遍历地图上的所有位置
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        // 跳过障碍物和起点
        if (map.isObstacle(x, y) || (x === originX && y === originY)) {
          continue;
        }

        const target = { x, y };
        const distanceResult = this.calculateShortestDistance(origin, target);
        
        // 检查是否在指定范围内
        const distance = useRealDistance ? distanceResult.realDistance : distanceResult.straightDistance;
        
        if (distanceResult.isReachable && distance <= maxDistance && distance >= 0) {
          reachablePositions.push({
            position: { x, y },
            distance: distanceResult
          });
        }
      }
    }

    // 按距离排序
    reachablePositions.sort((a, b) => {
      const distanceA = useRealDistance ? a.distance.realDistance : a.distance.straightDistance;
      const distanceB = useRealDistance ? b.distance.realDistance : b.distance.straightDistance;
      return distanceA - distanceB;
    });

    return reachablePositions;
  }

  /**
   * 重置地图状态（清理缓存）
   * 在地图数据发生变化时调用
   */
  public static resetMap(): void {
    this.gameMap = null;
  }
}
