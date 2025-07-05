import type { Position } from '../core/types';
import MessageParser from '../network/MessageParser.js';

/**
 * 距离计算方法类型
 * 定义计算两点之间距离的函数签名
 */
export type DistanceMethod = (x1: number, y1: number, x2: number, y2: number) => number

/**
 * 切比雪夫距离计算函数
 * 计算两点之间的切比雪夫距离（棋盘距离），允许对角线移动
 * 按照游戏规则，距离计算公式为 max(Δx, Δy)
 * @param x1 起点X坐标
 * @param y1 起点Y坐标
 * @param x2 终点X坐标
 * @param y2 终点Y坐标
 * @returns 切比雪夫距离
 */
export const chebyshevDistance: DistanceMethod = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
};

/**
 * 地图地形类型枚举
 * 按照游戏规则和通讯协议定义
 */
export enum TerrainType {
  SPACE = 0,        // 空地 - 可行军的空地
  MOUNT = 1,        // 山丘 - 山（障碍物）
  WATER = 2,        // 水域 - 水（障碍物）
  FLAG = 3,         // 龙旗据点 - 玩家可占领的据点
  CITY = 4,         // 中立城寨 - 通用城寨标识
  BASE = 5,         // 主基地 - 玩家出生基地
  SMALL_CITY = 50,  // 中立城寨（一级）
  MIDDLE_CITY = 51, // 中立城寨（二级）
  BIG_CITY = 52     // 中立城寨（三级）
}

/**
 * 地图网格单元接口
 */
export interface MapCell {
  x: number;
  y: number;
  terrain: TerrainType;
  terrainName: string;
  walkable: boolean;
  hasUnit?: boolean;        // 是否有单位占据
  unitId?: number;          // 占据单位的ID
}

/**
 * 城寨信息接口
 */
export interface CityInfo {
  roleId: number;           // 城寨角色ID (50/51/52)
  position: Position;       // 城寨位置
  life: number;            // 当前城防值
  maxLife: number;         // 最大城防值
  damage: number;          // 攻击伤害值
  attackRange: number;     // 攻击距离
  reward: number;          // 粮草奖励
  respawnRound: number;    // 重生回合（被攻陷后100回合重生）
  isDestroyed: boolean;    // 是否被摧毁
}

/**
 * 据点信息接口
 */
export interface StrongholdInfo {
  roleId: number;          // 据点角色ID (3)
  position: Position;      // 据点位置（3x3区域的中心）
  camp: number;           // 所属阵营（0/1/2，2表示中立）
  occupiedRound: [number, number]; // 占领进度数组 [红方回合数, 蓝方回合数]
  isAvailable: boolean;   // 是否可占领（100回合后开放）
  openRound: number;      // 开放回合数
}

/**
 * 特殊地形位置信息
 */
export interface SpecialLocations {
  flags: Position[];       // 龙旗据点位置
  cities: Position[];      // 城寨位置
  bases: Position[];       // 主基地位置
}

/**
 * A*算法中的节点接口
 * 表示网格中用于A*算法的节点
 */
interface Node {
  x: number;        // X坐标
  y: number;        // Y坐标
  g: number;        // 从起始节点到此节点的实际代价
  h: number;        // 从此节点到目标节点的启发式代价
  f: number;        // 总代价 (g + h)
  parent: Node | null; // 路径中的父节点
}

/**
 * 三国策略对战游戏地图类
 * 管理80×60的游戏地图，包括地形、单位位置、城寨和据点管理
 * 集成了地图同步功能，可处理服务器发送的地图数据
 */
export class GameMap {
  private map: MapCell[][];           // 当前地图状态
  private rawMap: MapCell[][];        // 原始地图数据
  private readonly width: number;     // 地图宽度 (80)
  private readonly height: number;    // 地图高度 (60)
  private cities: Map<string, CityInfo>;      // 城寨信息映射
  private stronghold: StrongholdInfo | null;  // 龙旗据点信息
  private currentRound: number;       // 当前回合数
  private lastSyncTime: number;       // 最后同步时间

  /**
   * 构造函数
   * @param data 地图数据字符串，格式为逗号分隔的数字
   * @param maxX 地图最大X坐标（宽度）
   * @param maxY 地图最大Y坐标（高度）
   */
  constructor(data: string, maxX: number, maxY: number) {
    this.width = maxX;
    this.height = maxY;
    this.currentRound = 0;
    this.lastSyncTime = 0;
    this.cities = new Map();
    this.stronghold = null;
    
    // 初始化地图数据
    this.map = this.convertMap(data, maxX, maxY);
    this.rawMap = this.deepCopyMap(this.map);
    
    // 初始化特殊地形
    this.initializeSpecialTerrain();
  }

  /**
   * 从服务器地图数据创建地图实例
   * @param mapData 服务器发送的地图数据
   * @returns 游戏地图实例
   */
  static fromServerData(mapData: any): GameMap {
    console.log('从服务器数据初始化地图...', mapData);
    
    // 解析地图数据
    const parsedMapData = MessageParser.parseMapData(mapData);
    
    // 创建游戏地图实例
    const gameMap = new GameMap(
      parsedMapData.rawData.join(','),
      parsedMapData.width,
      parsedMapData.height
    );
    
    console.log(`地图初始化完成: ${parsedMapData.width}x${parsedMapData.height}`);
    console.log(`特殊地形位置:`, parsedMapData.specialLocations);
    
    return gameMap;
  }

  /**
   * 同步游戏状态
   * @param gameState 服务器发送的游戏状态数据
   */
  syncGameState(gameState: any): void {
    console.log(`同步第 ${gameState.round} 回合游戏状态...`);
    
    // 更新回合数
    this.currentRound = gameState.round;
    
    // 更新地图状态
    this.updateTurnMap();
    
    // 同步单位位置
    this.syncUnitPositions(gameState.players);
    
    // 同步城寨状态
    this.syncCityStates(gameState.cityProps);
    
    // 同步据点状态
    this.syncStrongholdState(gameState.stronghold);
    
    this.lastSyncTime = Date.now();
    
    console.log(`第 ${gameState.round} 回合状态同步完成`);
  }

  /**
   * 同步单位位置
   * @param players 玩家数据数组
   */
  private syncUnitPositions(players: any[]): void {
    // 清除旧的单位位置
    this.clearAllUnitPositions();

    // 设置新的单位位置
    for (const player of players) {
      for (const hero of player.roles) {
        if (hero.position && hero.reviveRound === 0) {
          const { x, y } = hero.position;
          this.setUnit(x, y, hero.roleId);
          
          console.log(`英雄 ${hero.roleId} 位置: (${x}, ${y})`);
        }
      }
    }
  }

  /**
   * 同步城寨状态
   * @param cityProps 城寨数据数组
   */
  private syncCityStates(cityProps: any[]): void {
    for (const cityData of cityProps) {
      if (cityData.position) {
        const cityInfo = this.getCityInfo(cityData.position);
        if (cityInfo) {
          // 更新城寨生命值
          cityInfo.life = cityData.life;
          cityInfo.isDestroyed = cityData.life <= 0;
          
          if (cityInfo.isDestroyed && cityInfo.respawnRound === 0) {
            // 如果城寨刚被摧毁，设置重生倒计时
            cityInfo.respawnRound = 100;
            console.log(`城寨在位置 (${cityData.position.x}, ${cityData.position.y}) 被摧毁`);
          }
        }
      }
    }
  }

  /**
   * 同步据点状态
   * @param strongholdData 据点数据
   */
  private syncStrongholdState(strongholdData: any): void {
    if (!strongholdData) return;

    const strongholdInfo = this.getStrongholdInfo();
    if (strongholdInfo) {
      // 更新据点状态
      strongholdInfo.camp = strongholdData.camp;
      strongholdInfo.occupiedRound = strongholdData.occupiedRound;
      strongholdInfo.isAvailable = strongholdData.position && 
                                  strongholdData.position.x !== -1 && 
                                  strongholdData.position.y !== -1;
      
      if (strongholdInfo.isAvailable) {
        strongholdInfo.position = strongholdData.position;
        console.log(`据点状态更新: 阵营=${strongholdInfo.camp}, 占领进度=[${strongholdInfo.occupiedRound.join(',')}]`);
      }
    }
  }

  /**
   * 清除所有单位位置
   */
  private clearAllUnitPositions(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.removeUnit(x, y);
      }
    }
  }

  /**
   * 将字符串数据转换为二维地图数组
   * @param data 逗号分隔的地图数据字符串
   * @param maxX 地图宽度
   * @param maxY 地图高度
   * @returns 二维地图数组
   */
  private convertMap(data: string, maxX: number, maxY: number): MapCell[][] {
    const mapArrayData = data.trim().split(',').map(Number);
    const mapData: MapCell[][] = [];
    
    for (let y = 0; y < maxY; y++) {
      const row: MapCell[] = [];
      for (let x = 0; x < maxX; x++) {
        const index = y * maxX + x;
        const terrainType = mapArrayData[index] as TerrainType;
        
        row.push({
          x: x,
          y: y,
          terrain: terrainType,
          terrainName: this.getTerrainName(terrainType),
          walkable: this.isTerrainWalkable(terrainType),
          hasUnit: false
        });
      }
      mapData.push(row);
    }
    
    return mapData;
  }

  /**
   * 深拷贝地图数据
   * @param map 要拷贝的地图
   * @returns 深拷贝的地图
   */
  private deepCopyMap(map: MapCell[][]): MapCell[][] {
    return map.map(row => row.map(cell => ({ ...cell })));
  }

  /**
   * 初始化特殊地形（城寨和据点）
   */
  private initializeSpecialTerrain(): void {
    // 初始化城寨信息
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.map[y][x];
        if (cell.terrain >= TerrainType.SMALL_CITY && cell.terrain <= TerrainType.BIG_CITY) {
          this.initializeCityInfo(cell.terrain, { x, y });
        } else if (cell.terrain === TerrainType.FLAG) {
          this.initializeStrongholdInfo({ x, y });
        }
      }
    }
  }

  /**
   * 初始化城寨信息
   * @param cityType 城寨类型
   * @param position 城寨位置
   */
  private initializeCityInfo(cityType: TerrainType, position: Position): void {
    const key = `${position.x},${position.y}`;
    let cityInfo: CityInfo;

    switch (cityType) {
      case TerrainType.SMALL_CITY:
        cityInfo = {
          roleId: 50,
          position,
          life: 1000,
          maxLife: 1000,
          damage: 60,
          attackRange: 3,
          reward: 100,
          respawnRound: 0,
          isDestroyed: false
        };
        break;
      case TerrainType.MIDDLE_CITY:
        cityInfo = {
          roleId: 51,
          position,
          life: 2000,
          maxLife: 2000,
          damage: 120,
          attackRange: 4,
          reward: 200,
          respawnRound: 0,
          isDestroyed: false
        };
        break;
      case TerrainType.BIG_CITY:
        cityInfo = {
          roleId: 52,
          position,
          life: 3000,
          maxLife: 3000,
          damage: 180,
          attackRange: 5,
          reward: 400,
          respawnRound: 0,
          isDestroyed: false
        };
        break;
      default:
        return;
    }

    this.cities.set(key, cityInfo);
  }

  /**
   * 初始化据点信息
   * @param position 据点位置
   */
  private initializeStrongholdInfo(position: Position): void {
    this.stronghold = {
      roleId: 3,
      position,
      camp: 2, // 中立状态
      occupiedRound: [0, 0],
      isAvailable: false,
      openRound: 100
    };
  }

  /**
   * 获取地形名称
   * @param terrainType 地形类型
   * @returns 地形名称
   */
  private getTerrainName(terrainType: TerrainType): string {
    const names: Record<TerrainType, string> = {
      [TerrainType.SPACE]: '空地',
      [TerrainType.MOUNT]: '山丘',
      [TerrainType.WATER]: '水域',
      [TerrainType.FLAG]: '龙旗据点',
      [TerrainType.CITY]: '中立城寨',
      [TerrainType.BASE]: '主基地',
      [TerrainType.SMALL_CITY]: '小型城寨',
      [TerrainType.MIDDLE_CITY]: '中型城寨',
      [TerrainType.BIG_CITY]: '大型城寨'
    };
    return names[terrainType] || '未知地形';
  }

  /**
   * 检查地形是否可通行
   * @param terrainType 地形类型
   * @returns 是否可通行
   */
  private isTerrainWalkable(terrainType: TerrainType): boolean {
    // 山丘和水域是障碍物，不可通行
    return terrainType !== TerrainType.MOUNT && terrainType !== TerrainType.WATER;
  }

  /**
   * 检查位置是否在地图边界内
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否为有效位置
   */
  isValidPosition(x: number, y: number): boolean {
    return !(x < 0 || y < 0 || x >= this.width || y >= this.height);
  }

  /**
   * 获取指定位置的地图单元
   * @param x X坐标
   * @param y Y坐标
   * @returns 地图单元，如果位置无效则返回null
   */
  getCell(x: number, y: number): MapCell | null {
    if (!this.isValidPosition(x, y)) {
      return null;
    }
    return this.map[y][x];
  }

  /**
   * 获取指定位置的地形类型
   * @param x X坐标
   * @param y Y坐标
   * @returns 地形类型，如果位置无效则返回null
   */
  getTerrain(x: number, y: number): TerrainType | null {
    const cell = this.getCell(x, y);
    return cell ? cell.terrain : null;
  }

  /**
   * 检查指定位置是否为障碍物
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否为障碍物
   */
  isObstacle(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return !cell || !cell.walkable;
  }

  /**
   * 检查指定位置是否有单位
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否有单位
   */
  hasUnit(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return cell ? cell.hasUnit || false : false;
  }

  /**
   * 设置单位位置
   * @param x X坐标
   * @param y Y坐标
   * @param unitId 单位ID
   * @returns 是否设置成功
   */
  setUnit(x: number, y: number, unitId: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !cell.walkable) {
      return false;
    }
    
    cell.hasUnit = true;
    cell.unitId = unitId;
    return true;
  }

  /**
   * 移除单位
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否移除成功
   */
  removeUnit(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) {
      return false;
    }
    
    cell.hasUnit = false;
    cell.unitId = undefined;
    return true;
  }

  /**
   * 更新回合地图状态
   * 根据当前回合数更新地图状态，包括城寨重生、据点开放等
   */
  updateTurnMap(): void {
    this.currentRound++;
    
    // 更新城寨状态
    this.updateCitiesStatus();
    
    // 更新据点状态
    this.updateStrongholdStatus();
    
    // 清除单位位置信息（每回合重新设置）
    this.clearUnitPositions();
  }

  /**
   * 更新城寨状态
   */
  private updateCitiesStatus(): void {
    for (const [key, city] of this.cities) {
      if (city.isDestroyed && city.respawnRound > 0) {
        city.respawnRound--;
        if (city.respawnRound <= 0) {
          // 城寨重生
          city.isDestroyed = false;
          city.life = city.maxLife;
          console.log(`城寨在位置 (${city.position.x}, ${city.position.y}) 重生`);
        }
      }
    }
  }

  /**
   * 更新据点状态
   */
  private updateStrongholdStatus(): void {
    if (this.stronghold && !this.stronghold.isAvailable && this.currentRound >= this.stronghold.openRound) {
      this.stronghold.isAvailable = true;
      console.log(`龙旗据点在第 ${this.currentRound} 回合开放占领`);
    }
  }

  /**
   * 清除单位位置信息
   */
  private clearUnitPositions(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.map[y][x];
        cell.hasUnit = false;
        cell.unitId = undefined;
      }
    }
  }

  /**
   * 攻击城寨
   * @param position 城寨位置
   * @param damage 攻击伤害
   * @returns 攻击结果信息
   */
  attackCity(position: Position, damage: number): { success: boolean; destroyed: boolean; reward: number } {
    const key = `${position.x},${position.y}`;
    const city = this.cities.get(key);
    
    if (!city || city.isDestroyed) {
      return { success: false, destroyed: false, reward: 0 };
    }
    
    city.life -= damage;
    if (city.life <= 0) {
      city.life = 0;
      city.isDestroyed = true;
      city.respawnRound = 100; // 100回合后重生
      
      console.log(`城寨在位置 (${position.x}, ${position.y}) 被摧毁，将在100回合后重生`);
      return { success: true, destroyed: true, reward: city.reward };
    }
    
    return { success: true, destroyed: false, reward: 0 };
  }

  /**
   * 获取城寨信息
   * @param position 城寨位置
   * @returns 城寨信息
   */
  getCityInfo(position: Position): CityInfo | null {
    const key = `${position.x},${position.y}`;
    return this.cities.get(key) || null;
  }

  /**
   * 获取据点信息
   * @returns 据点信息
   */
  getStrongholdInfo(): StrongholdInfo | null {
    return this.stronghold;
  }

  /**
   * 更新据点占领状态
   * @param camp 占领方阵营 (0: 红方, 1: 蓝方)
   */
  updateStrongholdOccupation(camp: number): void {
    if (!this.stronghold || !this.stronghold.isAvailable) {
      return;
    }
    
    if (camp === 0) {
      this.stronghold.occupiedRound[0]++;
      this.stronghold.camp = 0;
    } else if (camp === 1) {
      this.stronghold.occupiedRound[1]++;
      this.stronghold.camp = 1;
    }
  }

  /**
   * 获取地图尺寸
   * @returns 地图尺寸信息
   */
  getMapSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * 获取特殊地形位置
   * @returns 特殊地形位置信息
   */
  getSpecialLocations(): SpecialLocations {
    const flags: Position[] = [];
    const cities: Position[] = [];
    const bases: Position[] = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.map[y][x];
        const position = { x, y };
        
        switch (cell.terrain) {
          case TerrainType.FLAG:
            flags.push(position);
            break;
          case TerrainType.SMALL_CITY:
          case TerrainType.MIDDLE_CITY:
          case TerrainType.BIG_CITY:
            cities.push(position);
            break;
          case TerrainType.BASE:
            bases.push(position);
            break;
        }
      }
    }
    
    return { flags, cities, bases };
  }

  /**
   * 计算考虑障碍物的真实距离
   * 使用A*算法计算两点间的最短路径长度
   * @param startX 起点X坐标
   * @param startY 起点Y坐标
   * @param endX 终点X坐标
   * @param endY 终点Y坐标
   * @returns 路径长度，如果无法到达则返回-1
   */
  getRealDistance(startX: number, startY: number, endX: number, endY: number) {
    const path = this.findPathAStar(startX, startY, endX, endY);
    if (Array.isArray(path)) {
      return path.length > 0 ? path.length - 1 : 0;
    }
    return -1;
  }

  /**
   * 使用A*算法在网格上找到两点间的最短路径
   * 允许对角线移动
   *
   * @param x1 起点X坐标
   * @param y1 起点Y坐标
   * @param x2 终点X坐标
   * @param y2 终点Y坐标
   * @returns 表示从起点到终点路径的坐标数组，如果找不到路径则返回null
   */
  findPathAStar(x1: number, y1: number, x2: number, y2: number): Position[] | null {
    const startNode: Node = {
      x: x1,
      y: y1,
      g: 0,
      h: chebyshevDistance(x1, y1, x2, y2),
      f: chebyshevDistance(x1, y1, x2, y2),
      parent: null,
    };

    // 已评估的节点集合，存储"x,y"字符串
    const closedList: Set<string> = new Set();
    // 当前发现但尚未评估的节点集合
    // 实现为按f代价排序的数组
    const openList: Node[] = [startNode];

    // 可能的移动方向（包括对角线）
    // 每次移动的代价都是1
    const directions = [
      { dx: 0, dy: 1 },   // 下
      { dx: 0, dy: -1 },  // 上
      { dx: 1, dy: 0 },   // 右
      { dx: -1, dy: 0 },  // 左
      { dx: 1, dy: 1 },   // 右下（对角线）
      { dx: 1, dy: -1 },  // 右上（对角线）
      { dx: -1, dy: 1 },  // 左下（对角线）
      { dx: -1, dy: -1 }  // 左上（对角线）
    ];

    while (openList.length > 0) {
      // 获取openList中f代价最低的节点
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!; // 移除并获取第一个元素

      // 检查当前节点是否为目标
      if (currentNode.x === x2 && currentNode.y === y2) {
        // 找到路径，重构路径
        const path: Position[] = [];
        let temp: Node | null = currentNode;
        while (temp !== null) {
          path.unshift({ x: temp.x, y: temp.y });
          temp = temp.parent;
        }
        return path;
      }

      const currentNodeKey = `${currentNode.x},${currentNode.y}`;
      closedList.add(currentNodeKey);

      // 探索邻居
      for (const direction of directions) {
        const neighborX = currentNode.x + direction.dx;
        const neighborY = currentNode.y + direction.dy;

        // 1. 检查邻居是否为障碍物
        if (this.isObstacle(neighborX, neighborY)) {
          continue;
        }

        // 2. 检查邻居是否在已评估列表中
        const neighborKey = `${neighborX},${neighborY}`;
        if (closedList.has(neighborKey)) {
          continue;
        }

        // 3. 计算到邻居的暂定g代价
        const gCostToNeighbor = currentNode.g + 1; // 移动到邻居的代价是1

        // 4. 检查邻居是否在开放列表中，或者这条路径是否更好
        let neighborNodeInOpenList = openList.find(node => node.x === neighborX && node.y === neighborY);

        if (neighborNodeInOpenList === undefined || gCostToNeighbor < neighborNodeInOpenList.g) {
          // 到邻居的这条路径比之前的任何路径都好，或者邻居不在openList中
          const hCost = chebyshevDistance(neighborX, x2, neighborY, y2);
          if (neighborNodeInOpenList === undefined) {
            // 如果邻居不在openList中，添加它
            const newNode: Node = {
              x: neighborX,
              y: neighborY,
              g: gCostToNeighbor,
              h: hCost,
              f: gCostToNeighbor + hCost,
              parent: currentNode,
            };
            openList.push(newNode);
          } else {
            // 如果邻居在openList中，更新其g、f和parent
            neighborNodeInOpenList.g = gCostToNeighbor;
            neighborNodeInOpenList.f = gCostToNeighbor + hCost; // hCost是neighborNodeInOpenList.h
            neighborNodeInOpenList.parent = currentNode;
          }
        }
      }
    }

    return null;
  }

  /**
   * 检查两点间是否可以直线移动（无障碍物阻挡）
   * 使用Bresenham直线算法检查路径上是否有障碍物
   * @param startX 起点X坐标
   * @param startY 起点Y坐标
   * @param endX 终点X坐标
   * @param endY 终点Y坐标
   * @returns 是否可以直线移动
   */
  canDirectMove(startX: number, startY: number, endX: number, endY: number): boolean {
    // 如果起点和终点是同一个格子，则视线没有被"中间"的墙遮挡
    if (startX === endX && startY === endY) {
      return true;
    }

    let currentX = startX;
    let currentY = startY;

    const dx = Math.abs(endX - currentX);
    const dy = -Math.abs(endY - currentY); // Bresenham中通常dy为负

    const sx = currentX < endX ? 1 : -1;
    const sy = currentY < endY ? 1 : -1;

    let error = dx + dy; // error = dx - abs(dy)

    while (true) {
      // 检查当前格子 (currentX, currentY)
      // 我们不把起点格子本身视为对从该点发出的视线的遮挡物。
      // 但路径上的任何其他格子（包括终点格子）如果是障碍物，则视为遮挡。
      if (currentX !== startX || currentY !== startY) {
        if (this.isObstacle(currentX, currentY)) {
          return false; // 视线被障碍物遮挡
        }
      }

      // 到达终点
      if (currentX === endX && currentY === endY) {
        break;
      }

      const e2 = 2 * error;

      if (e2 >= dy) { // error + error >= dy (dy是负数) -> error >= dy/2
        if (currentX === endX) {
          break;
        } // 防止超出终点（主要在单轴移动时）
        error += dy;
        currentX += sx;
      }

      if (e2 <= dx) { // error + error <= dx (dx是正数) -> error <= dx/2
        if (currentY === endY) {
          break;
        } // 防止超出终点
        error += dx;
        currentY += sy;
      }
    }
    return true; // 视线未被遮挡
  }

  /**
   * 获取当前回合数
   * @returns 当前回合数
   */
  getCurrentRound(): number {
    return this.currentRound;
  }

  /**
   * 获取地图同步状态
   * @returns 同步状态信息
   */
  getSyncStatus(): {
    isInitialized: boolean;
    currentRound: number;
    lastSyncTime: number;
    timeSinceLastSync: number;
  } {
    return {
      isInitialized: true,
      currentRound: this.currentRound,
      lastSyncTime: this.lastSyncTime,
      timeSinceLastSync: Date.now() - this.lastSyncTime
    };
  }

  /**
   * 检查位置是否可移动
   * @param position 目标位置
   * @returns 是否可移动
   */
  canMoveTo(position: Position): boolean {
    const { x, y } = position;
    
    // 检查位置是否有效
    if (!this.isValidPosition(x, y)) {
      return false;
    }

    // 检查是否为障碍物
    if (this.isObstacle(x, y)) {
      return false;
    }

    // 检查是否有其他单位
    if (this.hasUnit(x, y)) {
      return false;
    }

    return true;
  }

  /**
   * 获取可移动的相邻位置
   * @param position 当前位置
   * @param range 移动范围（默认为1）
   * @returns 可移动的位置数组
   */
  getMovablePositions(position: Position, range: number = 1): Position[] {
    const movablePositions: Position[] = [];
    const { x, y } = position;

    // 检查八个方向的位置
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue; // 跳过当前位置

        const newX = x + dx;
        const newY = y + dy;
        const newPosition = { x: newX, y: newY };

        if (this.canMoveTo(newPosition)) {
          movablePositions.push(newPosition);
        }
      }
    }

    return movablePositions;
  }

  /**
   * 计算两点间的距离
   * @param pos1 位置1
   * @param pos2 位置2
   * @returns 切比雪夫距离
   */
  calculateDistance(pos1: Position, pos2: Position): number {
    return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
  }

  /**
   * 查找路径
   * @param start 起始位置
   * @param end 目标位置
   * @returns 路径数组，如果无法到达则返回null
   */
  findPath(start: Position, end: Position): Position[] | null {
    return this.findPathAStar(start.x, start.y, end.x, end.y);
  }

  /**
   * 获取攻击范围内的目标
   * @param position 攻击者位置
   * @param range 攻击范围
   * @returns 范围内的目标位置数组
   */
  getTargetsInRange(position: Position, range: number): Position[] {
    const targets: Position[] = [];
    const { x, y } = position;

    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue; // 跳过自身位置

        const targetX = x + dx;
        const targetY = y + dy;

        // 检查距离是否在范围内（切比雪夫距离）
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= range) {
          if (this.isValidPosition(targetX, targetY)) {
            targets.push({ x: targetX, y: targetY });
          }
        }
      }
    }

    return targets;
  }

  /**
   * 重置地图状态
   */
  resetMap(): void {
    this.currentRound = 0;
    this.lastSyncTime = 0;
    this.cities.clear();
    this.stronghold = null;
    
    // 重新初始化地图
    this.map = this.deepCopyMap(this.rawMap);
    this.initializeSpecialTerrain();
    
    console.log('地图状态已重置');
  }
}