/**
 * 三国策略对战游戏常量定义
 * 包含地图元素、武将数据、兵种数据和游戏规则常量
 */

// ========== 地图相关常量 ==========
export const MAP_CONFIG = {
  WIDTH: 80,              // 地图宽度
  HEIGHT: 60,             // 地图高度
  CENTER_X: 40,           // 地图中心X坐标
  CENTER_Y: 30            // 地图中心Y坐标
};

// 地图元素类型
export const TERRAIN_TYPES = {
  SPACE: 0,               // 空地
  MOUNT: 1,               // 山丘（障碍物）
  WATER: 2,               // 水域（障碍物）
  FLAG: 3,                // 龙旗据点
  BASE: 5,                // 主基地
  SMALL_CITY: 50,         // 中立城寨（一级）
  MIDDLE_CITY: 51,        // 中立城寨（二级）
  BIG_CITY: 52            // 中立城寨（三级）
};

// 龙旗据点配置
export const FLAG_ZONE = {
  CENTER_X: MAP_CONFIG.CENTER_X,
  CENTER_Y: MAP_CONFIG.CENTER_Y,
  SIZE: 3,                // 3×3区域
  OPEN_TURN: 100          // 100回合后开放
};

// ========== 武将数据 ==========
export const GENERALS = {
  // 猛将类
  吕布: {
    type: '猛将',
    武力: 100,
    统帅: 6,
    体力: 1500,
    攻击距离: 3,
    技能1: {
      name: '无双乱舞',
      cooldown: 50,
      description: '对攻击距离内所有敌方单位造成2×武力值伤害'
    },
    技能2: {
      name: '大杀四方',
      cooldown: 30,
      description: '体力低于1000时可释放，3回合内对敌方武将伤害提升50%，结束后2回合虚弱状态'
    }
  },
  
  赵云: {
    type: '猛将',
    武力: 100,
    统帅: 6,
    体力: 1500,
    攻击距离: 3,
    技能1: {
      name: '龙胆突刺',
      cooldown: 50,
      description: '敌方武将体力低于25%直接击杀，否则造成2×武力值伤害'
    },
    技能2: {
      name: '冲锋陷阵',
      cooldown: 30,
      description: '对范围内所有小兵造成0.5×武力值伤害，无小兵则对敌方武将造成1×武力值伤害'
    }
  },
  
  关羽: {
    type: '猛将',
    武力: 100,
    统帅: 6,
    体力: 1500,
    攻击距离: 3,
    技能1: {
      name: '一骑当千',
      cooldown: 50,
      description: '对单个敌方武将造成3×武力值伤害'
    },
    技能2: {
      name: '青龙偃月斩',
      cooldown: 30,
      description: '对范围内所有敌方单位造成2×武力值伤害，释放后2回合蓄力状态'
    }
  },
  
  // 统帅类
  刘备: {
    type: '统帅',
    武力: 60,
    统帅: 12,
    体力: 1600,
    攻击距离: 3,
    技能1: {
      name: '仁德之君',
      cooldown: 50,
      description: '为己方单位施加护盾，减少50%伤害，持续5回合'
    },
    技能2: {
      name: '蜀汉旗',
      cooldown: 30,
      description: '标记距离8单位内位置，下回合可传送至此'
    }
  },
  
  曹操: {
    type: '统帅',
    武力: 60,
    统帅: 12,
    体力: 1600,
    攻击距离: 3,
    技能1: {
      name: '虎豹骑召令',
      cooldown: 50,
      description: '召唤2头巨兽造成1.5×武力值伤害并击退5格'
    },
    技能2: {
      name: '乱世枭雄',
      cooldown: 30,
      description: '武力值+20持续3回合，攻击回复伤害×10%的体力'
    }
  },
  
  孙权: {
    type: '统帅',
    武力: 60,
    统帅: 12,
    体力: 1600,
    攻击距离: 3,
    技能1: {
      name: '江东水师',
      cooldown: 50,
      description: '为己方所有作战单位恢复20%体力值'
    },
    技能2: {
      name: '制衡',
      cooldown: 30,
      description: '3回合内每回合额外增加1名士兵，无消耗'
    }
  },
  
  // 谋士类
  诸葛亮: {
    type: '谋士',
    武力: 50,
    统帅: 8,
    体力: 1200,
    攻击距离: 3,
    技能1: {
      name: '锦囊妙计',
      cooldown: 50,
      description: '获得免疫效果，3回合内敌方伤害为0'
    },
    技能2: {
      name: '斗转星移',
      cooldown: 30,
      description: '重新设定我方将领阵型，恢复15%体力'
    }
  },
  
  周瑜: {
    type: '谋士',
    武力: 50,
    统帅: 8,
    体力: 1200,
    攻击距离: 3,
    技能1: {
      name: '火攻',
      cooldown: 50,
      description: '4×4范围内对所有单位造成2.5×武力伤害，盾兵伤害翻倍'
    },
    技能2: {
      name: '连营',
      cooldown: 30,
      description: '额外伤害+20%，受到伤害-50%，持续3回合'
    }
  },
  
  司马懿: {
    type: '谋士',
    武力: 50,
    统帅: 8,
    体力: 1200,
    攻击距离: 3,
    技能1: {
      name: '鬼谋',
      cooldown: 50,
      description: '沉默敌方武将5回合，每回合造成1.5×武力值伤害'
    },
    技能2: {
      name: '天命',
      cooldown: 30,
      description: '禁锢单个敌方武将5回合，每回合造成1×武力伤害'
    }
  }
};

// ========== 兵种数据 ==========
export const TROOPS = {
  弓兵: {
    id: 7,
    武力: 25,
    体力: 240,
    攻击距离: 3,
    特点: '高输出，体力一般'
  },
  
  盾兵: {
    id: 8,
    武力: 15,
    体力: 400,
    攻击距离: 3,
    特点: '高体力，武力一般'
  }
};

// ========== 经济系统常量 ==========
export const ECONOMY = {
  INITIAL_FOOD: 100,      // 初始粮草
  MAX_FOOD: 1500,         // 粮草上限
  TROOP_COST: 20,         // 生产士兵消耗的粮草
  FORMATION_COST: 100,    // 切换阵型消耗的粮草
  KILL_GENERAL_REWARD: 120, // 击杀敌方武将获得的粮草
  FLAG_MAINTAIN_COST_GENERAL: 2, // 龙旗据点每名武将每回合消耗粮草
  FLAG_MAINTAIN_COST_TROOP: 1    // 龙旗据点每名小兵每回合消耗粮草
};

// ========== 城寨数据 ==========
export const CITIES = {
  [TERRAIN_TYPES.SMALL_CITY]: {
    level: 1,
    damage: 60,
    defense: 1000,
    food_reward: 100,
    attack_range: 3,
    respawn_time: 100
  },
  
  [TERRAIN_TYPES.MIDDLE_CITY]: {
    level: 2,
    damage: 120,
    defense: 2000,
    food_reward: 200,
    attack_range: 4,
    respawn_time: 100
  },
  
  [TERRAIN_TYPES.BIG_CITY]: {
    level: 3,
    damage: 180,
    defense: 3000,
    food_reward: 400,
    attack_range: 5,
    respawn_time: 100
  }
};

// ========== 游戏规则常量 ==========
export const GAME_RULES = {
  MAX_TURNS: 1000,          // 最大回合数
  WIN_FLAG_TURNS: 60,       // 占据龙旗据点胜利需要的回合数
  REVIVAL_TURNS: 5,         // 武将复活需要的回合数
  TELEPORT_RANGE: 10,       // 瞬移技能范围
  TELEPORT_COOLDOWN: 60,    // 瞬移技能冷却时间
  MOVE_DISTANCE: 1,         // 每回合移动距离
  MAX_GENERALS_PER_PLAYER: 6, // 每个玩家最多武将数
  FORMATION_MORALE_COST: 50,  // 阵型所需士气
  MAX_MORALE: 300,          // 最大士气值
  KILL_TROOP_MORALE: 10,    // 击杀小兵获得的士气
  KILL_GENERAL_MORALE: 80   // 击杀将领获得的士气
};

// ========== 阵型效果 ==========
export const FORMATIONS = {
  鹤翼阵: {
    type: 'attack',
    base_bonus: 0.10,       // 基础10%攻击力加成
    max_bonus: 0.15,        // 最大15%攻击力加成
    morale_cost: 50,
    food_cost: 100
  },
  
  八卦阵: {
    type: 'defense',
    base_bonus: 0.10,       // 基础10%减伤
    max_bonus: 0.15,        // 最大15%减伤
    morale_cost: 50,
    food_cost: 100
  }
};

// ========== BUFF系统 ==========
export const BUFFS = {
  // 立即生效类
  传国玉玺: {
    id: 1001,
    type: 'instant',
    effect: '为某将领召唤4名弓兵+2名盾兵',
    archers: 4,
    shields: 2
  },
  
  华佗再世: {
    id: 1002,
    type: 'instant',
    effect: '回复所有单位50%体力',
    heal_percent: 0.5
  },
  
  // 持续生效类
  青龙护体: {
    id: 1003,
    type: 'duration',
    effect: '所受伤害减少20%',
    damage_reduction: 0.2,
    duration: 5
  },
  
  酒狂: {
    id: 1004,
    type: 'duration',
    effect: '武力增加30%，体力损失5%',
    attack_bonus: 0.3,
    health_loss: 0.05,
    duration: 3
  }
};

// ========== 操作指令常量 ==========
export const COMMANDS = {
  PICK: 'PICK',           // 选择武将
  MAKE: 'MAKE',           // 生产士兵
  BUFF: 'BUFF',           // 获取增益效果
  FORM: 'FORM',           // 切换阵型
  MOVE: 'MOVE',           // 移动
  SP: 'SP',               // 瞬移技能
  AC: 'AC',               // 占领据点
  SG: 'SG',               // 攻打城寨
  AD: 'AD',               // 普通攻击
  SK: 'SK'                // 释放技能
};

// ========== 战斗状态常量 ==========
export const BATTLE_STATES = {
  NORMAL: 'normal',       // 正常状态
  WEAKENED: 'weakened',   // 虚弱状态
  CHARGING: 'charging',   // 蓄力状态
  SILENCED: 'silenced',   // 沉默状态
  IMPRISONED: 'imprisoned', // 禁锢状态
  SHIELDED: 'shielded',   // 护盾状态
  IMMUNE: 'immune'        // 免疫状态
};

// ========== 距离计算 ==========
/**
 * 计算切比雪夫距离
 * @param {number} x1 - 起点X坐标
 * @param {number} y1 - 起点Y坐标
 * @param {number} x2 - 终点X坐标
 * @param {number} y2 - 终点Y坐标
 * @returns {number} 切比雪夫距离
 */
export function calculateDistance(x1, y1, x2, y2) {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// ========== 方向常量 ==========
export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],  // 上左、上、上右
  [0, -1],           [0, 1],    // 左、右
  [1, -1],  [1, 0],  [1, 1]     // 下左、下、下右
];

// ========== 玩家常量 ==========
export const PLAYERS = {
  PLAYER1: 1,
  PLAYER2: 2
};

export default {
  MAP_CONFIG,
  TERRAIN_TYPES,
  FLAG_ZONE,
  GENERALS,
  TROOPS,
  ECONOMY,
  CITIES,
  GAME_RULES,
  FORMATIONS,
  BUFFS,
  COMMANDS,
  BATTLE_STATES,
  DIRECTIONS,
  PLAYERS,
  calculateDistance
}; 