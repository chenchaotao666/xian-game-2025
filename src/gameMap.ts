import type { Position } from './core/types';

/**
 * 距离计算方法类型
 * 定义计算两点之间距离的函数签名
 */
export type DistanceMethod = (x1: number, y1: number, x2: number, y2: number) => number

/**
 * 切比雪夫距离计算函数
 * 计算两点之间的切比雪夫距离（棋盘距离），允许对角线移动
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
 * 地图瓦片类型枚举
 * 定义地图中不同类型的瓦片
 */
export enum TileType {
  Empty = 0,    // 空地，可通行
  Wall = 1,     // 墙壁，不可通行
  // weapon     // 武器（预留）
  // enemy      // 敌人（预留）
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
 * 游戏地图类
 * 管理游戏地图的表示、路径查找和碰撞检测
 */
export class GameMap {
  private map: TileType[][];        // 当前地图状态
  private rawMap: TileType[][];     // 原始地图数据
  private readonly width: number;   // 地图宽度
  private readonly height: number;  // 地图高度

  /**
   * 构造函数
   * @param data 地图数据字符串，格式为逗号分隔的数字
   * @param maxX 地图最大X坐标（宽度）
   * @param maxY 地图最大Y坐标（高度）
   */
  constructor(data: string, maxX: number, maxY: number) {
    this.width = maxX;
    this.height = maxY;
    this.map = this.convertMap(data, maxX, maxY);
    this.rawMap = this.convertMap(data, maxX, maxY);
  }

  /**
   * 将字符串数据转换为二维地图数组
   * @param data 逗号分隔的地图数据字符串
   * @param maxX 地图宽度
   * @param maxY 地图高度
   * @returns 二维地图数组
   */
  private convertMap(data: string, maxX: number, maxY: number): TileType[][] {
    const mapArrayData = data.trim().split(',').map(Number);
    const mapData: number[][] = [];
    for (let i = 0; i < maxY; i++) {
      mapData.push(mapArrayData.slice(i * maxX, (i + 1) * maxX));
    }
    return mapData;
  }

  /**
   * 检查位置是否在地图边界内
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否为有效位置
   */
  isValidPosition(x: number, y: number): boolean {
    return !(x < 0 || y < 0 || x > this.width - 1 || y > this.height - 1);
  }

  /**
   * 获取指定位置的瓦片类型
   * @param x X坐标
   * @param y Y坐标
   * @returns 瓦片类型，如果位置无效则返回null
   */
  getTile(x: number, y: number): null | TileType {
    if (!this.isValidPosition(x, y)) {
      return null;
    }
    return this.map[this.height - y - 1][x];
  }

  /**
   * 检查指定位置是否为障碍物
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否为障碍物
   */
  isObstacle(x: number, y: number): boolean {
    return !this.isValidPosition(x, y) || this.getTile(x, y) === TileType.Wall;
  }

  /**
   * 设置指定位置的瓦片类型
   * @param x X坐标
   * @param y Y坐标
   * @param value 瓦片类型
   * @returns 是否设置成功
   */
  setTile(x: number, y: number, value: TileType): boolean {
    if (!this.isValidPosition(x, y)) {
      return false;
    }
    this.map[this.height - y - 1][x] = value;
    return true;
  }

  /**
   * 更新回合地图状态
   * 将地图重置为原始状态
   */
  updateTurnMap() {
    this.map = this.rawMap.map(i => [...i]);
    // TODO: 需要实现具体逻辑
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
      // 但路径上的任何其他格子（包括终点格子）如果是墙，则视为遮挡。
      if (currentX !== startX || currentY !== startY) {
        if (this.getTile(currentX, currentY) === TileType.Wall) {
          return false; // 视线被墙壁遮挡
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
}