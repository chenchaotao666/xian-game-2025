// 游戏道具TypeScript类型定义

// 效果类型
type EffectType = '立即生效' | '持续生效';

// 游戏道具接口
interface GameItem {
  name: string;
  id: number;
  icon: string;
  type: EffectType;
  description: string;
  limitation: string;
}

// 传国玉玺
const summon: GameItem = {
  name: '传国玉玺',
  id: 1001,
  icon: '',
  type: '立即生效',
  description: '选择我方一名将领，立即为其召唤4名弓兵和2名盾兵',
  limitation: '无法超过每名将领的统帅值上限'
};

// 华佗再世
const healer: GameItem = {
  name: '华佗再世',
  id: 1002,
  icon: '',
  type: '立即生效',
  description: '回复我方所有单位50%体力',
  limitation: 'NA'
};

// 青龙护体
const protection: GameItem = {
  name: '青龙护体',
  id: 1003,
  icon: '',
  type: '持续生效',
  description: '接下来的5回合己方所有单位所受伤害减少20%',
  limitation: 'NA'
};

// 酒狂
const rage: GameItem = {
  name: '酒狂',
  id: 1004,
  icon: '',
  type: '持续生效',
  description: '接下来的3回合己方单位每回合武力增加30%，体力损失5%（上一回合的体力）',
  limitation: 'NA'
};

// 所有道具集合
const gameItems: GameItem[] = [
  summon,
  healer,
  protection,
  rage
];

export type { GameItem, EffectType };
export {
  summon,
  healer,
  protection,
  rage,
  gameItems
};