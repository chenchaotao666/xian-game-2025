// 城寨数据模型TypeScript类型定义

// 城寨接口
interface Fortress {
  level: number; // 城寨等级
  icon: string; // 图标
  damage: number; // 伤害值
  defense: number; // 城防值
  supplyReward: number; // 粮草奖励
  attackRange: number; // 攻击距离
}

// 1级城寨
const level1Fortress: Fortress = {
  level: 1,
  icon: '',
  damage: 60,
  defense: 1000,
  supplyReward: 100,
  attackRange: 3
};

// 2级城寨
const level2Fortress: Fortress = {
  level: 2,
  icon: '',
  damage: 120,
  defense: 2000,
  supplyReward: 200,
  attackRange: 4
};

// 3级城寨
const level3Fortress: Fortress = {
  level: 3,
  icon: '',
  damage: 180,
  defense: 3000,
  supplyReward: 400,
  attackRange: 5
};

// 所有城寨等级
const fortresses: Fortress[] = [
  level1Fortress,
  level2Fortress,
  level3Fortress
];

// 按等级分组的城寨
const fortressesByLevel = {
  1: level1Fortress,
  2: level2Fortress,
  3: level3Fortress
};

function getFortressByLevel(level: number): Fortress | undefined {
  return fortressesByLevel[level as keyof typeof fortressesByLevel];
}

export type { Fortress };
export {
  level1Fortress,
  level2Fortress,
  level3Fortress,
  fortresses,
  fortressesByLevel,
  getFortressByLevel
};