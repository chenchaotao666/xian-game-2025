// 兵种和阵型数据模型TypeScript类型定义

// 兵种类型
type UnitType = '弓兵' | '盾兵';

// 阵型类型
type FormationType = '鹤翼阵' | '八卦阵';

// 兵种接口
interface Unit {
  id: number;
  name: string;
  type: UnitType;
  attack: number; // 武力
  health: number; // 体力
  attackRange: number; // 攻击距离
}

// 阵型接口
interface Formation {
  name: FormationType;
  effectDescription: string;
  moraleCost: number; // 士气消耗
  supplyCost: number; // 粮草消耗
  maxBonus: string; // 上限
  getBonusPercentage: (unitCount: number) => number; // 根据人数计算加成
}

// 士气获取规则
interface MoraleRules {
  killSoldier: number; // 击杀小兵获得士气
  killGeneral: number; // 击杀将领获得士气
  maxMorale: number; // 士气上限
}

// 弓兵
const archer: Unit = {
  id: 7,
  name: '弓兵',
  type: '弓兵',
  attack: 25,
  health: 240,
  attackRange: 3
};

// 盾兵
const shieldSoldier: Unit = {
  id: 8,
  name: '盾兵',
  type: '盾兵',
  attack: 15,
  health: 400,
  attackRange: 3
};

// 鹤翼阵
const craneWingFormation: Formation = {
  name: '鹤翼阵',
  effectDescription: '小于等于5人时攻击力加成10%，大于5人小于等于10人时攻击力加成11%，大于10人小于等于15人时攻击力加成12%，依此类推',
  moraleCost: 50,
  supplyCost: 100,
  maxBonus: '上限为15%',
  getBonusPercentage: (unitCount: number): number => {
    if (unitCount <= 5) return 10;
    if (unitCount <= 10) return 11;
    if (unitCount <= 15) return 12;
    if (unitCount <= 20) return 13;
    if (unitCount <= 25) return 14;
    return 15; // 最大15%
  }
};

// 八卦阵
const eightTrigramsFormation: Formation = {
  name: '八卦阵',
  effectDescription: '小于等于5人时减伤10%，大于5人小于等于10人时减伤11%，大于10人小于等于15人时减伤12%，依此类推',
  moraleCost: 50,
  supplyCost: 100,
  maxBonus: '上限为15%',
  getBonusPercentage: (unitCount: number): number => {
    if (unitCount <= 5) return 10;
    if (unitCount <= 10) return 11;
    if (unitCount <= 15) return 12;
    if (unitCount <= 20) return 13;
    if (unitCount <= 25) return 14;
    return 15; // 最大15%
  }
};

// 士气规则
const moraleRules: MoraleRules = {
  killSoldier: 10,
  killGeneral: 80,
  maxMorale: 300
};

// 所有兵种
const units: Unit[] = [
  archer,
  shieldSoldier
];

// 所有阵型
const formations: Formation[] = [
  craneWingFormation,
  eightTrigramsFormation
];

// 按类型分组的兵种
const unitsByType = {
  弓兵: archer,
  盾兵: shieldSoldier
};

// 按名称分组的阵型
const formationsByName = {
  鹤翼阵: craneWingFormation,
  八卦阵: eightTrigramsFormation
};

export type { Unit, UnitType, Formation, FormationType, MoraleRules };
export {
  archer,
  shieldSoldier,
  craneWingFormation,
  eightTrigramsFormation,
  moraleRules,
  units,
  formations,
  unitsByType,
  formationsByName
};