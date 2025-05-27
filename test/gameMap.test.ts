import { GameMap, TileType } from '../src/gameMap';
import { MapLayout } from '../src/mapData';

describe('gameMap test', () => {
  /**
   * [0,0,0,0,0]
   * [0,1,1,1,0]
   * [0,1,0,1,0]
   * [0,1,0,1,0]
   * [0,0,0,0,0]
   */
  const mapString = '0,0,0,0,0,0,1,1,1,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,0';
  const map = new GameMap(mapString, 5, 5);

  it('getValue', () => {
    expect(map.getTile(0, 0)).toEqual(0);
    expect(map.getTile(1, 1)).toEqual(1);
    expect(map.getTile(1, 2)).toBe(1);
    expect(map.getTile(4, 2)).toBe(0);
    expect(map.getTile(10, 2)).toBe(null);
  });

  it('setValue', () => {
    map.setTile(0, 0, 1);
    expect(map.getTile(0, 0)).toEqual(1);
  });

  it('calculate distance', () => {
    expect(map.getRealDistance(0, 1, 3, 3)).toBe(-1); // 不可达
    expect(map.getRealDistance(0, 1, 2, 2)).toBe(3);
    expect(map.getRealDistance(0, 1, 1, 0)).toBe(1);
    expect(map.getRealDistance(0, 1, 0, 1)).toBe(0);
  });

  it('test position', () => {
    expect(map.isValidPosition(0, 1)).toEqual(true);
    expect(map.isValidPosition(6, 1)).toEqual(false);
    expect(map.isValidPosition(3, 3)).toEqual(true);
  });

  it('test isObstacle', () => {
    expect(map.isObstacle(0, 0)).toEqual(true);
    expect(map.isObstacle(1, 1)).toEqual(true);
    expect(map.isObstacle(2, 1)).toEqual(false);
  });

  it('text canDirectMove', () => {
    expect(map.canDirectMove(0, 0, 2, 1)).toEqual(false);
    expect(map.canDirectMove(0, 0, 4, 1)).toEqual(false);
    expect(map.canDirectMove(0, 3, 1, 4)).toEqual(true);
    expect(map.canDirectMove(0, 3, 4, 4)).toEqual(false);
  });
});

describe('complex map test', () => {
  const map = new GameMap(MapLayout.flat().join(), MapLayout[0].length, MapLayout.length);

  it('test getTile', () => {
    expect(map.getTile(2, 2)).toBe(TileType.Wall);
    expect(map.getTile(2, 3)).toBe(TileType.Wall);
    expect(map.getTile(2, 4)).toBe(TileType.Empty);
    expect(map.getTile(2, 4)).toBe(TileType.Empty);
    expect(map.getTile(7, 9)).toBe(TileType.Empty);
    expect(map.getTile(8, 9)).toBe(TileType.Wall);
  });

  it('test canDirectMove', () => {
    expect(map.canDirectMove(4, 9, 8, 11)).toEqual(true);
    expect(map.canDirectMove(9, 11, 11, 14)).toEqual(true);
  });
});