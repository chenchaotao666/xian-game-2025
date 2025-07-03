import { 
  MAP_CONFIG, 
  TERRAIN_TYPES, 
  FLAG_ZONE, 
  calculateDistance 
} from './GameConstants.js';
import type { Position } from '../types/index.js';

/**
 * 游戏地图管理类
 * 负责地图的初始化、单位位置管理、路径查找等功能
 */
export default class GameMap {
  constructor() {
    // 初始化地图数据
    this.width = MAP_CONFIG.WIDTH;
    this.height = MAP_CONFIG.HEIGHT;
    
    // 地图二维数组，存储地形类型
    this.terrain = this._initializeTerrain();
    
    // 单位位置映射表 {x,y} -> unit
    this.units = new Map();
    
    // 城寨状态跟踪 {x,y} -> {type, destroyed, respawnTurn}
    this.cities = new Map();
    
    // 龙旗据点状态
    this.flagZone = {
      centerX: FLAG_ZONE.CENTER_X,
      centerY: FLAG_ZONE.CENTER_Y,
      size: FLAG_ZONE.SIZE,
      controller: null,     // 当前控制者
      contestTurns: 0,      // 争夺回合数
      openTurn: FLAG_ZONE.OPEN_TURN
    };
    
    console.log('游戏地图初始化完成');
  }

  /**
   * 初始化地形数据
   * @returns {Array} 二维地形数组
   */
  _initializeTerrain() {
    console.log('开始生成地图地形...');
    
    // 创建空地图
    const terrain = Array(this.height).fill(null).map(() => 
      Array(this.width).fill(TERRAIN_TYPES.SPACE)
    );

    // 生成山丘地形
    this._generateMountains(terrain);
    
    // 生成水域地形
    this._generateWater(terrain);
    
    // 设置龙旗据点
    this._placeFlagZone(terrain);
    
    // 设置主基地
    this._placeBases(terrain);
    
    // 设置城寨
    this._placeCities(terrain);
    
    console.log('地图地形生成完成');
    return terrain;
  }

  /**
   * 生成山丘地形
   * @param {Array} terrain - 地形数组
   */
  _generateMountains(terrain) {
    // 随机生成山丘，约占地图10%的面积
    const mountainCount = Math.floor(this.width * this.height * 0.1);
    
    for (let i = 0; i < mountainCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      // 避免在重要位置生成山丘
      if (this._isImportantPosition(x, y)) continue;
      
      terrain[y][x] = TERRAIN_TYPES.MOUNT;
    }
  }

  /**
   * 生成水域地形
   * @param {Array} terrain - 地形数组
   */
  _generateWater(terrain) {
    // 随机生成水域，约占地图8%的面积
    const waterCount = Math.floor(this.width * this.height * 0.08);
    
    for (let i = 0; i < waterCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      // 避免在重要位置生成水域
      if (this._isImportantPosition(x, y) || terrain[y][x] !== TERRAIN_TYPES.SPACE) continue;
      
      terrain[y][x] = TERRAIN_TYPES.WATER;
    }
  }

  /**
   * 检查是否为重要位置（基地、据点附近）
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {boolean} 是否为重要位置
   */
  _isImportantPosition(x, y) {
    // 检查是否在龙旗据点范围内
    if (this._isInFlagZone(x, y)) return true;
    
    // 检查是否在基地附近
    const basePositions = [
      { x: 5, y: 5 },     // 玩家1基地
      { x: this.width - 6, y: this.height - 6 }  // 玩家2基地
    ];
    
    for (const base of basePositions) {
      if (calculateDistance(x, y, base.x, base.y) <= 5) return true;
    }
    
    return false;
  }

  /**
   * 设置龙旗据点
   * @param {Array} terrain - 地形数组
   */
  _placeFlagZone(terrain) {
    const centerX = this.flagZone.centerX;
    const centerY = this.flagZone.centerY;
    const size = this.flagZone.size;
    
    // 在3×3区域设置龙旗据点
    for (let dx = -Math.floor(size/2); dx <= Math.floor(size/2); dx++) {
      for (let dy = -Math.floor(size/2); dy <= Math.floor(size/2); dy++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          terrain[y][x] = TERRAIN_TYPES.FLAG;
        }
      }
    }
  }

  /**
   * 设置主基地
   * @param {Array} terrain - 地形数组
   */
  _placeBases(terrain) {
    // 玩家1基地（左上角）
    terrain[5][5] = TERRAIN_TYPES.BASE;
    
    // 玩家2基地（右下角）
    terrain[this.height - 6][this.width - 6] = TERRAIN_TYPES.BASE;
  }

  /**
   * 设置城寨
   * @param {Array} terrain - 地形数组
   */
  _placeCities(terrain) {
    const cityTypes = [TERRAIN_TYPES.SMALL_CITY, TERRAIN_TYPES.MIDDLE_CITY, TERRAIN_TYPES.BIG_CITY];
    const cityCount = 15; // 总共放置15个城寨
    
    for (let i = 0; i < cityCount; i++) {
      let x, y;
      let attempts = 0;
      
      // 尝试找到合适的位置
      do {
        x = Math.floor(Math.random() * this.width);
        y = Math.floor(Math.random() * this.height);
        attempts++;
      } while (
        (terrain[y][x] !== TERRAIN_TYPES.SPACE || this._isImportantPosition(x, y)) && 
        attempts < 100
      );
      
      if (attempts < 100) {
        const cityType = cityTypes[Math.floor(Math.random() * cityTypes.length)];
        terrain[y][x] = cityType;
        
        // 记录城寨信息
        this.cities.set(`${x},${y}`, {
          type: cityType,
          destroyed: false,
          respawnTurn: -1
        });
      }
    }
  }

  /**
   * 检查位置是否在龙旗据点范围内
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {boolean} 是否在龙旗据点范围内
   */
  _isInFlagZone(x, y) {
    const distance = calculateDistance(x, y, this.flagZone.centerX, this.flagZone.centerY);
    return distance <= Math.floor(this.flagZone.size / 2);
  }

  /**
   * 检查位置是否可通行
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {boolean} 是否可通行
   */
  isPassable(x, y) {
    // 边界检查
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    
    const terrain = this.terrain[y][x];
    
    // 障碍物不可通行
    if (terrain === TERRAIN_TYPES.MOUNT || terrain === TERRAIN_TYPES.WATER) return false;
    
    return true;
  }

  /**
   * 在指定位置放置单位
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {Object} unit - 单位对象
   * @returns {boolean} 是否成功放置
   */
  placeUnit(x, y, unit) {
    if (!this.isPassable(x, y)) return false;
    
    const key = `${x},${y}`;
    if (this.units.has(key)) return false; // 位置已被占用
    
    this.units.set(key, unit);
    unit.x = x;
    unit.y = y;
    
    console.log(`单位${unit.name || unit.type}放置在位置(${x}, ${y})`);
    return true;
  }

  /**
   * 移除指定位置的单位
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {Object|null} 被移除的单位
   */
  removeUnit(x, y) {
    const key = `${x},${y}`;
    const unit = this.units.get(key);
    
    if (unit) {
      this.units.delete(key);
      console.log(`单位${unit.name || unit.type}从位置(${x}, ${y})移除`);
    }
    
    return unit || null;
  }

  /**
   * 移动单位
   * @param {number} fromX - 起始X坐标
   * @param {number} fromY - 起始Y坐标
   * @param {number} toX - 目标X坐标
   * @param {number} toY - 目标Y坐标
   * @returns {boolean} 是否成功移动
   */
  moveUnit(fromX, fromY, toX, toY) {
    const unit = this.removeUnit(fromX, fromY);
    if (!unit) return false;
    
    if (this.placeUnit(toX, toY, unit)) {
      return true;
    } else {
      // 移动失败，恢复原位置
      this.placeUnit(fromX, fromY, unit);
      return false;
    }
  }

  /**
   * 获取指定位置的单位
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {Object|null} 单位对象
   */
  getUnitAt(x, y) {
    const key = `${x},${y}`;
    return this.units.get(key) || null;
  }

  /**
   * 获取指定范围内的所有单位
   * @param {number} centerX - 中心X坐标
   * @param {number} centerY - 中心Y坐标
   * @param {number} range - 范围
   * @returns {Array} 单位数组
   */
  getUnitsInRange(centerX, centerY, range) {
    const unitsInRange = [];
    
    for (const [key, unit] of this.units) {
      const [x, y] = key.split(',').map(Number);
      const distance = calculateDistance(centerX, centerY, x, y);
      
      if (distance <= range) {
        unitsInRange.push(unit);
      }
    }
    
    return unitsInRange;
  }

  /**
   * 寻找从起点到终点的路径（简单A*算法）
   * @param {number} startX - 起始X坐标
   * @param {number} startY - 起始Y坐标
   * @param {number} endX - 目标X坐标
   * @param {number} endY - 目标Y坐标
   * @returns {Array} 路径数组，包含坐标点
   */
  findPath(startX, startY, endX, endY) {
    // 简化的路径查找：直线移动，考虑障碍物
    const path = [];
    let currentX = startX;
    let currentY = startY;
    
    while (currentX !== endX || currentY !== endY) {
      // 计算移动方向
      const dx = endX > currentX ? 1 : endX < currentX ? -1 : 0;
      const dy = endY > currentY ? 1 : endY < currentY ? -1 : 0;
      
      const nextX = currentX + dx;
      const nextY = currentY + dy;
      
      // 检查下一步是否可行
      if (this.isPassable(nextX, nextY) && !this.getUnitAt(nextX, nextY)) {
        currentX = nextX;
        currentY = nextY;
        path.push({ x: currentX, y: currentY });
      } else {
        // 遇到障碍物，尝试绕行
        const alternatives = this._getAlternativeMoves(currentX, currentY, endX, endY);
        let moved = false;
        
        for (const alt of alternatives) {
          if (this.isPassable(alt.x, alt.y) && !this.getUnitAt(alt.x, alt.y)) {
            currentX = alt.x;
            currentY = alt.y;
            path.push({ x: currentX, y: currentY });
            moved = true;
            break;
          }
        }
        
        if (!moved) break; // 无法继续移动
      }
    }
    
    return path;
  }

  /**
   * 获取绕行的备选移动方向
   * @param {number} currentX - 当前X坐标
   * @param {number} currentY - 当前Y坐标
   * @param {number} targetX - 目标X坐标
   * @param {number} targetY - 目标Y坐标
   * @returns {Array} 备选移动坐标数组
   */
  _getAlternativeMoves(currentX, currentY, targetX, targetY) {
    const alternatives = [];
    
    // 获取所有可能的移动方向，按与目标的距离排序
    for (const [dx, dy] of DIRECTIONS) {
      const newX = currentX + dx;
      const newY = currentY + dy;
      
      if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
        const distance = calculateDistance(newX, newY, targetX, targetY);
        alternatives.push({ x: newX, y: newY, distance });
      }
    }
    
    // 按距离排序，优先选择更接近目标的位置
    alternatives.sort((a, b) => a.distance - b.distance);
    
    return alternatives;
  }

  /**
   * 获取地形类型
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number} 地形类型
   */
  getTerrainType(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return -1; // 边界外
    }
    return this.terrain[y][x];
  }

  /**
   * 更新城寨状态
   * @param {number} turn - 当前回合数
   */
  updateCities(turn) {
    for (const [key, cityData] of this.cities) {
      if (cityData.destroyed && turn >= cityData.respawnTurn) {
        // 城寨重生
        const [x, y] = key.split(',').map(Number);
        this.terrain[y][x] = cityData.type;
        cityData.destroyed = false;
        cityData.respawnTurn = -1;
        
        console.log(`城寨在位置(${x}, ${y})重新生成`);
      }
    }
  }

  /**
   * 摧毁城寨
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} currentTurn - 当前回合数
   */
  destroyCity(x, y, currentTurn) {
    const key = `${x},${y}`;
    const cityData = this.cities.get(key);
    
    if (cityData && !cityData.destroyed) {
      this.terrain[y][x] = TERRAIN_TYPES.SPACE;
      cityData.destroyed = true;
      cityData.respawnTurn = currentTurn + 100; // 100回合后重生
      
      console.log(`城寨在位置(${x}, ${y})被摧毁，将在第${cityData.respawnTurn}回合重生`);
    }
  }

  /**
   * 检查龙旗据点的控制状态
   * @param {number} turn - 当前回合数
   * @returns {boolean} 龙旗据点是否已开放
   */
  isFlagZoneOpen(turn) {
    return turn >= this.flagZone.openTurn;
  }

  /**
   * 更新龙旗据点控制权
   * @param {Array} player1Units - 玩家1在据点内的单位
   * @param {Array} player2Units - 玩家2在据点内的单位
   * @returns {Object} 控制状态信息
   */
  updateFlagControl(player1Units, player2Units) {
    const player1Count = player1Units.length;
    const player2Count = player2Units.length;
    
    let newController = null;
    
    if (player1Count > player2Count) {
      newController = 1;
    } else if (player2Count > player1Count) {
      newController = 2;
    }
    // 如果数量相等，保持当前控制者
    
    // 更新控制者
    if (newController && newController !== this.flagZone.controller) {
      this.flagZone.controller = newController;
      this.flagZone.contestTurns = 1;
      console.log(`玩家${newController}开始控制龙旗据点`);
    } else if (newController === this.flagZone.controller) {
      this.flagZone.contestTurns++;
    } else {
      // 没有明确的控制者，重置计数
      this.flagZone.contestTurns = 0;
    }
    
    return {
      controller: this.flagZone.controller,
      contestTurns: this.flagZone.contestTurns,
      player1Count,
      player2Count
    };
  }

  /**
   * 获取地图的字符串表示（用于调试）
   * @returns {string} 地图字符串
   */
  toString() {
    let mapStr = '';
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const unit = this.getUnitAt(x, y);
        if (unit) {
          mapStr += unit.playerId === 1 ? '1' : '2';
        } else {
          const terrain = this.terrain[y][x];
          switch (terrain) {
            case TERRAIN_TYPES.SPACE: mapStr += '.'; break;
            case TERRAIN_TYPES.MOUNT: mapStr += '^'; break;
            case TERRAIN_TYPES.WATER: mapStr += '~'; break;
            case TERRAIN_TYPES.FLAG: mapStr += 'F'; break;
            case TERRAIN_TYPES.BASE: mapStr += 'B'; break;
            case TERRAIN_TYPES.SMALL_CITY: mapStr += 's'; break;
            case TERRAIN_TYPES.MIDDLE_CITY: mapStr += 'm'; break;
            case TERRAIN_TYPES.BIG_CITY: mapStr += 'L'; break;
            default: mapStr += '?'; break;
          }
        }
      }
      mapStr += '\n';
    }
         
     return mapStr;
   }
 } 