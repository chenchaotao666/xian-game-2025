import type { Position } from './index';

export type DistanceMethod = (x1: number, y1: number, x2: number, y2: number) => number

export const chebyshevDistance: DistanceMethod = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
};

export enum TileType {
  Empty = 0,
  Wall = 1,
  // weapon
  // enemy
}

/**
 * Represents a node in the grid for the A* algorithm.
 */
interface Node {
  x: number;
  y: number;
  g: number; // Cost from the start node to this node
  h: number; // Heuristic cost from this node to the end node
  f: number; // Total cost (g + h)
  parent: Node | null; // Parent node in the path
}

export class GameMap {
  private map: TileType[][];
  private rawMap: TileType[][];
  private readonly width: number;
  private readonly height: number;

  constructor(data: string, maxX: number, maxY: number) {
    this.width = maxX;
    this.height = maxY;
    this.map = this.convertMap(data, maxX, maxY);
    this.rawMap = this.convertMap(data, maxX, maxY);
  }

  private convertMap(data: string, maxX: number, maxY: number): TileType[][] {
    const mapArrayData = data.trim().split(',').map(Number);
    const mapData: number[][] = [];
    for (let i = 0; i < maxY; i++) {
      mapData.push(mapArrayData.slice(i * maxX, (i + 1) * maxX));
    }
    return mapData;
  }

  isValidPosition(x: number, y: number): boolean {
    return !(x < 0 || y < 0 || x > this.width - 1 || y > this.height - 1);
  }

  getTile(x: number, y: number): null | TileType {
    if (!this.isValidPosition(x, y)) {
      return null;
    }
    return this.map[this.height - y - 1][x];
  }

  isObstacle(x: number, y: number): boolean {
    return !this.isValidPosition(x, y) || this.getTile(x, y) === TileType.Wall;
  }

  setTile(x: number, y: number, value: TileType): boolean {
    if (!this.isValidPosition(x, y)) {
      return false;
    }
    this.map[this.height - y - 1][x] = value;
    return true;
  }

  updateTurnMap() {
    this.map = this.rawMap.map(i => [...i]);
    // todo: need impl
  }

  // 考虑障碍物
  getRealDistance(startX: number, startY: number, endX: number, endY: number) {
    const path = this.findPathAStar(startX, startY, endX, endY);
    if (Array.isArray(path)) {
      return path.length > 0 ? path.length - 1 : 0;
    }
    return -1;
  }

  /**
   * Finds the shortest path between two points on a grid using the A* algorithm.
   * Allows diagonal movement.
   *
   * @param x1 The x-coordinate of the starting point.
   * @param y1 The y-coordinate of the starting point.
   * @param x2 The x-coordinate of the ending point.
   * @param y2 The y-coordinate of the ending point.
   * @returns An array of {x, y} coordinates representing the path from start to end,
   * or an empty array if no path is found.
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

    // The set of nodes already evaluated. Stores "x,y" strings.
    const closedList: Set<string> = new Set();
    // The set of currently discovered nodes that are not evaluated yet.
    // Implemented as an array that will be sorted by f-cost.
    const openList: Node[] = [startNode];

    // Possible movement directions (including diagonals)
    // Cost for each move is 1.
    const directions = [
      { dx: 0, dy: 1 },  // Down
      { dx: 0, dy: -1 }, // Up
      { dx: 1, dy: 0 },  // Right
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 1 },  // Down-Right (Diagonal)
      { dx: 1, dy: -1 }, // Up-Right (Diagonal)
      { dx: -1, dy: 1 }, // Down-Left (Diagonal)
      { dx: -1, dy: -1 }  // Up-Left (Diagonal)
    ];

    while (openList.length > 0) {
      // Get the node in openList having the lowest f cost
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!; // Remove and get the first element

      // Check if the current node is the destination
      if (currentNode.x === x2 && currentNode.y === y2) {
        // Path found, reconstruct it
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

      // Explore neighbors
      for (const direction of directions) {
        const neighborX = currentNode.x + direction.dx;
        const neighborY = currentNode.y + direction.dy;

        // 1. Check if the neighbor is an obstacle
        if (this.isObstacle(neighborX, neighborY)) {
          continue;
        }

        // 2. Check if the neighbor is in the closed list
        const neighborKey = `${neighborX},${neighborY}`;
        if (closedList.has(neighborKey)) {
          continue;
        }

        // 3. Calculate tentative g cost for the neighbor
        const gCostToNeighbor = currentNode.g + 1; // Cost to move to a neighbor is 1

        // 4. Check if neighbor is in open list or if this path is better
        let neighborNodeInOpenList = openList.find(node => node.x === neighborX && node.y === neighborY);

        if (neighborNodeInOpenList === undefined || gCostToNeighbor < neighborNodeInOpenList.g) {
          // This path to neighbor is better than any previous one OR neighbor is not in openList
          const hCost = chebyshevDistance(neighborX, x2, neighborY, y2);
          if (neighborNodeInOpenList === undefined) {
            // If neighbor is not in openList, add it
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
            // If neighbor is in openList, update its g, f, and parent
            neighborNodeInOpenList.g = gCostToNeighbor;
            neighborNodeInOpenList.f = gCostToNeighbor + hCost; // hCost is neighborNodeInOpenList.h
            neighborNodeInOpenList.parent = currentNode;
          }
        }
      }
    }

    return null;
  }

  canDirectMove(startX: number, startY: number, endX: number, endY: number): boolean {
    // 如果起点和终点是同一个格子，则视线没有被“中间”的墙遮挡
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