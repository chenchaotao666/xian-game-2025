// 武将数据模型TypeScript类型定义

// 武将类型枚举
enum HeroType {
  WARRIOR = '猛将',
  COMMANDER = '统帅',
  STRATEGIST = '谋士'
}

// 技能接口
interface Skill {
  name: string;
  description: string;
  cooldown: number;
}

// 武将接口
interface Hero {
  id: number;
  name: string;
  type: HeroType;
  attackRange: number;
  attack: number; // 武力
  command: number; // 统帅
  health: number; // 体力
  skill1: Skill;
  skill2: Skill;
}

// 猛将 - 吕布
const lvbu: Hero = {
  id: 40,
  name: '吕布',
  type: HeroType.WARRIOR,
  attackRange: 3,
  attack: 100,
  command: 6,
  health: 1500,
  skill1: {
    name: '无双乱舞',
    description: '对攻击距离内的所有敌方单位造成2*武力值伤害',
    cooldown: 50
  },
  skill2: {
    name: '大杀四方',
    description: '体力低于1000时可释放，在接下来的3回合内对敌方武将伤害提升50%，结束后两回合进入虚弱状态，无法对敌方单位造成伤害',
    cooldown: 30
  }
};

// 猛将 - 赵云
const zhaoyun: Hero = {
  id: 41,
  name: '赵云',
  type: HeroType.WARRIOR,
  attackRange: 3,
  attack: 100,
  command: 6,
  health: 1500,
  skill1: {
    name: '龙胆突刺',
    description: '选定距离内指定武将，若敌方武将体力值低于25%，则直接击杀；否则对敌方武将造成2*武力值伤害',
    cooldown: 50
  },
  skill2: {
    name: '冲锋陷阵',
    description: '对攻击距离内所有小兵造成0.5*武力值伤害，若此范围内没有小兵单位则对所有敌方武将造成1*武力值伤害',
    cooldown: 30
  }
};

// 猛将 - 关羽
const guanyu: Hero = {
  id: 42,
  name: '关羽',
  type: HeroType.WARRIOR,
  attackRange: 3,
  attack: 100,
  command: 6,
  health: 1500,
  skill1: {
    name: '一骑当千',
    description: '对距离内单个敌方武将造成3*武力值伤害',
    cooldown: 50
  },
  skill2: {
    name: '青龙偃月斩',
    description: '对距离内所有敌方单位造成2*武力值伤害，释放后接下来2回合进入蓄力状态，蓄力期间无法攻击敌方，若此期间武将死亡则无法释放',
    cooldown: 30
  }
};

// 统帅 - 刘备
const liubei: Hero = {
  id: 43,
  name: '刘备',
  type: HeroType.COMMANDER,
  attackRange: 3,
  attack: 60,
  command: 12,
  health: 1600,
  skill1: {
    name: '仁德之君',
    description: '为己方单位施加护盾，减少50%伤害，持续5回合',
    cooldown: 50
  },
  skill2: {
    name: '蜀汉旗',
    description: '指定任意作战单位标记距离8个单位以内的一个位置，下一回合该单位可传送至此位置',
    cooldown: 30
  }
};

// 统帅 - 曹操
const caocao: Hero = {
  id: 44,
  name: '曹操',
  type: HeroType.COMMANDER,
  attackRange: 3,
  attack: 60,
  command: 12,
  health: 1600,
  skill1: {
    name: '虎豹骑召令',
    description: '召唤2头巨兽对距离内一个敌方单位发起冲锋，造成1.5*武力值伤害，并击退5个单位距离（击退到障碍物或地图边缘，则额外造成2倍伤害）',
    cooldown: 50
  },
  skill2: {
    name: '乱世枭雄',
    description: '短暂提升自身武力值20点，持续3回合，每次攻击回复己方单位已造成伤害*10%的体力',
    cooldown: 30
  }
};

// 统帅 - 孙权
const sunquan: Hero = {
  id: 45,
  name: '孙权',
  type: HeroType.COMMANDER,
  attackRange: 3,
  attack: 60,
  command: 12,
  health: 1600,
  skill1: {
    name: '江东水师',
    description: '为己方所有作战单位恢复20%体力值',
    cooldown: 50
  },
  skill2: {
    name: '制衡',
    description: '3回合内每回合可额外增加1名士兵，无消耗（最大上限18）',
    cooldown: 30
  }
};

// 谋士 - 诸葛亮
const zhugeliang: Hero = {
  id: 46,
  name: '诸葛亮',
  type: HeroType.STRATEGIST,
  attackRange: 3,
  attack: 50,
  command: 8,
  health: 1200,
  skill1: {
    name: '锦囊妙计',
    description: '额外获得一次免疫效果，接下来的3回合敌方单位对己方单位造成伤害为0',
    cooldown: 50
  },
  skill2: {
    name: '斗转星移',
    description: '指定一名我方将领，重新设定其阵型，并恢复15%体力',
    cooldown: 30
  }
};

// 谋士 - 周瑜
const zhouyu: Hero = {
  id: 47,
  name: '周瑜',
  type: HeroType.STRATEGIST,
  attackRange: 3,
  attack: 50,
  command: 8,
  health: 1200,
  skill1: {
    name: '火攻',
    description: '选定4*4范围内2个敌方单位（若范围内无敌方单位，此技能不可释放），对区域内所有单位造成2.5*武力伤害，区域内盾兵伤害翻倍',
    cooldown: 50
  },
  skill2: {
    name: '连营',
    description: '释放后提升自己（不包含小兵）额外伤害20%，同时降低受到伤害50%，持续3回合',
    cooldown: 30
  }
};

// 谋士 - 司马懿
const simayi: Hero = {
  id: 48,
  name: '司马懿',
  type: HeroType.STRATEGIST,
  attackRange: 3,
  attack: 50,
  command: 8,
  health: 1200,
  skill1: {
    name: '鬼谋',
    description: '对距离内所有敌方武将造成沉默效果，使其在接下来的5回合内无法使用任何技能（包括主动技能和瞬移技能），每回合对敌方武将造成1.5*武力值伤害',
    cooldown: 50
  },
  skill2: {
    name: '天命',
    description: '禁锢距离内单个敌方武将5回合，使其无法移动，每回合造成1*武力伤害',
    cooldown: 30
  }
};

// 瞬移技能（所有武将共有）
const teleportSkill: Skill = {
  name: '瞬移',
  description: '可将己方单位传送到地图指定位置，传送范围为10',
  cooldown: 60
};

// 所有武将集合
const generals: Hero[] = [
  lvbu,
  zhaoyun,
  guanyu,
  liubei,
  caocao,
  sunquan,
  zhugeliang,
  zhouyu,
  simayi
];

// 按类型分组的武将
const generalsByType = {
  [HeroType.WARRIOR]: [lvbu, zhaoyun, guanyu],
  [HeroType.COMMANDER]: [liubei, caocao, sunquan],
  [HeroType.STRATEGIST]: [zhugeliang, zhouyu, simayi]
};

export type { Hero, HeroType, Skill };
export {
  lvbu,
  zhaoyun,
  guanyu,
  liubei,
  caocao,
  sunquan,
  zhugeliang,
  zhouyu,
  simayi,
  teleportSkill,
  generals,
  generalsByType
};