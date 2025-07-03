/**
 * 游戏地图功能测试套件
 * 测试地图的基本功能、路径查找、障碍物检测等核心功能
 * 
 * 测试覆盖范围：
 * - 基础地图操作：获取/设置瓦片类型、位置有效性检查
 * - A*路径查找算法：距离计算、路径可达性判断
 * - 障碍物检测：墙壁碰撞、边界检查
 * - 直线移动检测：Bresenham算法的路径遮挡判断
 * - 复杂地图场景：使用真实16x16地图的综合测试
 */
import { GameMap, TileType } from '../src/context/gameMap';
import { MapLayout } from '../src/mapData';

describe('游戏地图基础功能测试', () => {
  /**
   * 测试用的简单5x5地图布局
   * 
   * 地图可视化（从上到下，Y轴递减）：
   * Y=4: [0,0,0,0,0]  - 顶部开放区域
   * Y=3: [0,1,1,1,0]  - 上方障碍物墙
   * Y=2: [0,1,0,1,0]  - 中间通道（两侧是墙）
   * Y=1: [0,1,0,1,0]  - 中间通道（两侧是墙）
   * Y=0: [0,0,0,0,0]  - 底部开放区域
   *      X=0,1,2,3,4
   * 
   * 该布局创建了一个中央通道，测试路径查找算法的有效性
   */
  const mapString = '0,0,0,0,0,0,1,1,1,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,0';
  const map = new GameMap(mapString, 5, 5);

  it('测试获取瓦片类型', () => {
    expect(map.getTile(0, 0)).toEqual(0);   // 底部左角应为空地
    expect(map.getTile(1, 1)).toEqual(1);   // 障碍物区域应为墙
    expect(map.getTile(1, 2)).toBe(1);      // 障碍物区域应为墙
    expect(map.getTile(4, 2)).toBe(0);      // 右侧应为空地
    expect(map.getTile(10, 2)).toBe(null);  // 超出边界应返回null
  });

  it('测试设置瓦片类型', () => {
    map.setTile(0, 0, 1);                   // 将空地设置为墙
    expect(map.getTile(0, 0)).toEqual(1);   // 验证设置成功
  });

  it('测试距离计算（A*算法）', () => {
    // 测试不可达路径：从(0,1)到(3,3)被墙阻挡
    expect(map.getRealDistance(0, 1, 3, 3)).toBe(-1);  // 不可达路径应返回-1
    
    // 测试通过中央通道的路径：需要绕过墙壁
    expect(map.getRealDistance(0, 1, 2, 2)).toBe(3);   // 通过中央通道的路径长度为3
    
    // 测试相邻位置的距离
    expect(map.getRealDistance(0, 1, 1, 0)).toBe(1);   // 相邻位置距离为1
    
    // 测试同一位置的距离
    expect(map.getRealDistance(0, 1, 0, 1)).toBe(0);   // 同一位置距离为0
  });

  it('测试位置有效性', () => {
    expect(map.isValidPosition(0, 1)).toEqual(true);   // 地图内位置应有效
    expect(map.isValidPosition(6, 1)).toEqual(false);  // 超出边界位置应无效
    expect(map.isValidPosition(3, 3)).toEqual(true);   // 地图内位置应有效
  });

  it('测试障碍物检测', () => {
    expect(map.isObstacle(0, 0)).toEqual(true);   // 墙位置应为障碍物（注意：前面已设置为墙）
    expect(map.isObstacle(1, 1)).toEqual(true);   // 墙位置应为障碍物
    expect(map.isObstacle(2, 1)).toEqual(false);  // 通道位置不应为障碍物
  });

  it('测试直线移动可能性', () => {
    // 测试被墙阻挡的直线移动
    expect(map.canDirectMove(0, 0, 2, 1)).toEqual(false);  // 有墙阻挡，不能直线移动
    expect(map.canDirectMove(0, 0, 4, 1)).toEqual(false);  // 有墙阻挡，不能直线移动
    
    // 测试无阻挡的直线移动
    expect(map.canDirectMove(0, 3, 1, 4)).toEqual(true);   // 无阻挡，可以直线移动
    
    // 测试穿越墙壁的直线移动
    expect(map.canDirectMove(0, 3, 4, 4)).toEqual(false);  // 有墙阻挡，不能直线移动
  });
});

describe('复杂地图测试', () => {
  /**
   * 使用项目中定义的16x16复杂地图布局进行综合测试
   * 该地图包含：
   * - 多个分离的障碍物区域
   * - 中央大型障碍物结构
   * - 复杂的通道系统
   * - 战术要素（掩体、瓶颈点等）
   */
  const map = new GameMap(MapLayout.flat().join(), MapLayout[0].length, MapLayout.length);

  it('测试复杂地图的瓦片获取', () => {
    // 测试左上角障碍物区域
    expect(map.getTile(2, 2)).toBe(TileType.Wall);   // 左上角障碍物区域
    expect(map.getTile(2, 3)).toBe(TileType.Wall);   // 左上角障碍物区域
    
    // 测试开放区域
    expect(map.getTile(2, 4)).toBe(TileType.Empty);  // 开放区域
    expect(map.getTile(2, 4)).toBe(TileType.Empty);  // 开放区域
    
    // 测试中央结构
    expect(map.getTile(7, 9)).toBe(TileType.Empty);  // 中央通道
    expect(map.getTile(8, 9)).toBe(TileType.Wall);   // 中央障碍物边缘
  });

  it('测试复杂地图的直线移动', () => {
    // 测试开放区域间的长距离直线移动
    expect(map.canDirectMove(4, 9, 8, 11)).toEqual(true);   // 开放区域间可直线移动
    expect(map.canDirectMove(9, 11, 11, 14)).toEqual(true); // 开放区域间可直线移动
  });
});