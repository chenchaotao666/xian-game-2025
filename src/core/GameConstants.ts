/**
 * 三国策略对战游戏常量定义
 * 包含地图元素、武将数据、兵种数据和游戏规则常量
 */

import type { Position, HeroRoleId, HeroCategory, SoldierType, FormationType } from '../types/index.js';

// ========== 地图相关常量 ==========

/** 地图配置常量 */
export const MAP_CONFIG = {
    WIDTH: 80,              // 地图宽度
    HEIGHT: 60,             // 地图高度
    CENTER_X: 40,           // 地图中心X坐标
    CENTER_Y: 30            // 地图中心Y坐标
} as const;

/** 地图元素类型常量 */
export const TERRAIN_TYPES = {
    SPACE: 0,               // 空地
    MOUNT: 1,               // 山丘（障碍物）
    WATER: 2,               // 水域（障碍物）
    FLAG: 3,                // 龙旗据点
    BASE: 5,                // 主基地
    SMALL_CITY: 50,         // 中立城寨（一级）
    MIDDLE_CITY: 51,        // 中立城寨（二级）
    BIG_CITY: 52            // 中立城寨（三级）
} as const;

/** 龙旗据点配置 */
export const FLAG_ZONE = {
    CENTER_X: MAP_CONFIG.CENTER_X,
    CENTER_Y: MAP_CONFIG.CENTER_Y,
    SIZE: 3,                // 3×3区域
    OPEN_TURN: 100          // 100回合后开放
} as const;

// ========== 技能接口定义 ==========

/** 技能信息接口 */
export interface SkillInfo {
    name: string;
    cooldown: number;
    description: string;
}

/** 武将数据接口 */
export interface GeneralData {
    type: HeroCategory;
    武力: number;
    统帅: number;
    体力: number;
    攻击距离: number;
    技能1: SkillInfo;
    技能2: SkillInfo;
}

// ========== 武将数据 ==========

/** 武将数据常量 */
export const GENERALS: Record<string, GeneralData> = {
    // 猛将类
    吕布: {
        type: 'warrior' as HeroCategory,
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
        type: 'warrior' as HeroCategory,
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
        type: 'warrior' as HeroCategory,
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
        type: 'commander' as HeroCategory,
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
        type: 'commander' as HeroCategory,
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
        type: 'commander' as HeroCategory,
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
        type: 'strategist' as HeroCategory,
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
        type: 'strategist' as HeroCategory,
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
        type: 'strategist' as HeroCategory,
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

/** 兵种信息接口 */
export interface SoldierData {
    name: string;
    武力: number;
    体力: number;
    cost: number;
    description: string;
}

/** 兵种数据常量 */
export const SOLDIERS: Record<SoldierType, SoldierData> = {
    [7]: { // 弓兵
        name: '弓兵',
        武力: 25,
        体力: 240,
        cost: 20,
        description: '远程攻击单位，攻击力中等，体力较低'
    },
    [8]: { // 盾兵
        name: '盾兵',
        武力: 15,
        体力: 400,
        cost: 20,
        description: '近战防御单位，攻击力较低，体力较高'
    }
};

// ========== 游戏命令常量 ==========

/** 游戏命令类型 */
export const COMMANDS = {
    PICK: 'PICK',       // 选择武将
    MAKE: 'MAKE',       // 生产士兵
    MOVE: 'MOVE',       // 移动
    AD: 'AD',           // 攻击
    SK: 'SK',           // 使用技能
    SP: 'SP',           // 特殊指令
    AC: 'AC',           // 争夺据点
    SG: 'SG',           // 攻击城寨
    FORM: 'FORM',       // 切换阵型
    BUFF: 'BUFF'        // 增益效果
} as const;

// ========== 经济系统常量 ==========

/** 经济相关常量 */
export const ECONOMY = {
    INITIAL_FOOD: 100,           // 初始粮草
    MAX_FOOD: 1500,              // 粮草上限
    TROOP_COST: 20,              // 生产士兵成本
    KILL_GENERAL_REWARD: 100,    // 击杀武将奖励
    FLAG_MAINTAIN_COST_GENERAL: 5,   // 武将据点维护成本
    FLAG_MAINTAIN_COST_TROOP: 2      // 士兵据点维护成本
} as const;

// ========== 玩家常量 ==========

/** 玩家ID常量 */
export const PLAYERS = {
    PLAYER1: 1,
    PLAYER2: 2
} as const;

// ========== 阵型常量 ==========

/** 阵型配置 */
export const FORMATIONS = {
    NORMAL: 0,      // 无阵型
    ATTACK: 1,      // 攻击阵型
    DEFENSE: 2      // 防御阵型
} as const;

// ========== 战斗状态常量 ==========

/** 战斗状态枚举 */
export const BATTLE_STATES = {
    NORMAL: 'normal',           // 正常状态
    SILENCED: 'silenced',       // 沉默状态（无法使用技能）
    IMPRISONED: 'imprisoned',   // 禁锢状态（无法行动）
    WEAKENED: 'weakened',       // 虚弱状态（攻击力降低）
    STRENGTHENED: 'strengthened', // 强化状态（攻击力提高）
    SHIELDED: 'shielded',       // 护盾状态（减少伤害）
    IMMUNE: 'immune'            // 免疫状态（免疫伤害）
} as const;

// ========== 兵种配置常量 ==========

/** 兵种配置数据 */
export const TROOPS = {
    archer: {
        name: '弓兵',
        attackPower: 25,
        health: 300,
        range: 4
    },
    shield: {
        name: '盾兵',
        attackPower: 15,
        health: 400,
        range: 1
    }
} as const;

// ========== 增益效果常量 ==========

/** 增益效果配置 */
export const BUFFS = {
    ATTACK_BOOST: {
        name: '攻击增强',
        effect: 'attack_boost',
        value: 20,  // 攻击力提升20%
        duration: 3
    },
    DEFENSE_BOOST: {
        name: '防御增强', 
        effect: 'defense_boost',
        value: 20,  // 防御力提升20%
        duration: 3
    },
    HEAL_OVER_TIME: {
        name: '持续治疗',
        effect: 'heal_over_time',
        value: 10,  // 每回合回复10%
        duration: 5
    }
} as const;

// ========== 城寨数据常量 ==========

/** 城寨配置数据 */
export const CITIES = {
    [50]: {  // 小型城寨
        name: '小型城寨',
        maxTroops: 100,
        attackPower: 30,
        rewardFood: 50
    },
    [51]: {  // 中型城寨
        name: '中型城寨', 
        maxTroops: 200,
        attackPower: 50,
        rewardFood: 100
    },
    [52]: {  // 大型城寨
        name: '大型城寨',
        maxTroops: 300,
        attackPower: 80,
        rewardFood: 150
    }
} as const;

// ========== 游戏规则常量 ==========

/** 游戏基础规则 */
export const GAME_RULES = {
    MAX_TURNS: 1000,                // 最大回合数
    MAX_GENERALS_PER_PLAYER: 5,     // 每个玩家最多武将数
    MOVE_DISTANCE: 5,               // 每回合移动距离
    MAX_MORALE: 100,                // 最大士气值
    KILL_GENERAL_MORALE: 20,        // 击杀武将获得士气
    WIN_FLAG_TURNS: 60,             // 占领据点获胜回合数
    FLAG_OPEN_TURN: 100,            // 据点开放回合数
    REVIVAL_TURNS: 10,              // 武将复活回合数
    TELEPORT_COOLDOWN: 50,          // 传送技能冷却
    TELEPORT_RANGE: 8,              // 传送距离
    
    // 胜利条件
    VICTORY_CONDITIONS: {
        OCCUPY_ROUNDS: 60,          // 占领据点60回合获胜
        ALTERNATIVE_ROUNDS: 1000    // 1000回合后比较占领回合数
    },
    
    // 距离计算
    DISTANCE_TYPE: 'chebyshev',     // 切比雪夫距离
    
    // 阵营配置
    CAMPS: {
        RED: 1,
        BLUE: 2
    }
} as const;

/** 阵型效果配置 */
export const FORMATION_EFFECTS: Record<FormationType, { name: string; effect: string }> = {
    [0]: {
        name: '无阵型',
        effect: '无特殊效果'
    },
    [1]: {
        name: '攻击阵型',
        effect: '攻击力+20%'
    },
    [2]: {
        name: '防御阵型',
        effect: '受到伤害-20%'
    }
};

// ========== 工具函数 ==========

/**
 * 计算切比雪夫距离（游戏中使用的距离计算方法）
 * @param x1 起点X坐标
 * @param y1 起点Y坐标
 * @param x2 终点X坐标
 * @param y2 终点Y坐标
 * @returns 切比雪夫距离
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * 计算两个位置之间的切比雪夫距离
 * @param pos1 位置1
 * @param pos2 位置2
 * @returns 切比雪夫距离
 */
export function calculatePositionDistance(pos1: Position, pos2: Position): number {
    return calculateDistance(pos1.x, pos1.y, pos2.x, pos2.y);
}

/**
 * 检查位置是否在地图范围内
 * @param x X坐标
 * @param y Y坐标
 * @returns 是否在地图范围内
 */
export function isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < MAP_CONFIG.WIDTH && y >= 0 && y < MAP_CONFIG.HEIGHT;
}

/**
 * 检查位置对象是否在地图范围内
 * @param position 位置对象
 * @returns 是否在地图范围内
 */
export function isValidPositionObject(position: Position): boolean {
    return isValidPosition(position.x, position.y);
}

/**
 * 获取武将的类型分类
 * @param generalName 武将名称
 * @returns 武将类型分类
 */
export function getGeneralCategory(generalName: string): HeroCategory | null {
    const general = GENERALS[generalName];
    return general ? general.type : null;
}

/**
 * 根据武将类型获取基础属性
 * @param generalName 武将名称
 * @returns 武将基础属性
 */
export function getGeneralStats(generalName: string): Pick<GeneralData, '武力' | '统帅' | '体力'> | null {
    const general = GENERALS[generalName];
    return general ? {
        武力: general.武力,
        统帅: general.统帅,
        体力: general.体力
    } : null;
}

/**
 * 获取兵种的基础数据
 * @param soldierType 兵种类型
 * @returns 兵种基础数据
 */
export function getSoldierStats(soldierType: SoldierType): SoldierData | null {
    return SOLDIERS[soldierType] || null;
}

/**
 * 检查地形是否可通行
 * @param terrainType 地形类型
 * @returns 是否可通行
 */
export function isTerrainWalkable(terrainType: number): boolean {
    return terrainType !== TERRAIN_TYPES.MOUNT && terrainType !== TERRAIN_TYPES.WATER;
}

/**
 * 获取地形名称
 * @param terrainType 地形类型
 * @returns 地形名称
 */
export function getTerrainName(terrainType: number): string {
    const names: Record<number, string> = {
        [TERRAIN_TYPES.SPACE]: '空地',
        [TERRAIN_TYPES.MOUNT]: '山丘',
        [TERRAIN_TYPES.WATER]: '水域',
        [TERRAIN_TYPES.FLAG]: '龙旗据点',
        [TERRAIN_TYPES.BASE]: '主基地',
        [TERRAIN_TYPES.SMALL_CITY]: '小型城寨',
        [TERRAIN_TYPES.MIDDLE_CITY]: '中型城寨',
        [TERRAIN_TYPES.BIG_CITY]: '大型城寨'
    };
    return names[terrainType] || '未知地形';
}

/**
 * 生成指定范围内的随机位置
 * @param minX 最小X坐标
 * @param maxX 最大X坐标
 * @param minY 最小Y坐标
 * @param maxY 最大Y坐标
 * @returns 随机位置
 */
export function generateRandomPosition(minX: number, maxX: number, minY: number, maxY: number): Position {
    return {
        x: Math.floor(Math.random() * (maxX - minX + 1)) + minX,
        y: Math.floor(Math.random() * (maxY - minY + 1)) + minY
    };
}

/**
 * 获取位置周围的邻居位置（8方向）
 * @param position 中心位置
 * @param distance 距离（默认为1）
 * @returns 邻居位置数组
 */
export function getNeighborPositions(position: Position, distance: number = 1): Position[] {
    const neighbors: Position[] = [];
    
    for (let dx = -distance; dx <= distance; dx++) {
        for (let dy = -distance; dy <= distance; dy++) {
            if (dx === 0 && dy === 0) continue; // 跳过中心位置
            
            const newPos = {
                x: position.x + dx,
                y: position.y + dy
            };
            
            if (isValidPositionObject(newPos)) {
                neighbors.push(newPos);
            }
        }
    }
    
    return neighbors;
}

/**
 * 获取指定范围内的所有位置
 * @param center 中心位置
 * @param radius 半径
 * @returns 范围内的位置数组
 */
export function getPositionsInRange(center: Position, radius: number): Position[] {
    const positions: Position[] = [];
    
    for (let x = center.x - radius; x <= center.x + radius; x++) {
        for (let y = center.y - radius; y <= center.y + radius; y++) {
            const pos = { x, y };
            if (isValidPositionObject(pos) && calculatePositionDistance(center, pos) <= radius) {
                positions.push(pos);
            }
        }
    }
    
    return positions;
} 