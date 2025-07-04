// 位置对象
export interface Position {
  x: number;
  y: number;
}

// 英雄状态枚举
export enum HeroStatus {
  NONE = 'NONE',
  RESURRECTION = 'RESURRECTION',
  Silence = 'Silence',
  Grounded = 'Grounded',
  WEAKNESS = 'WEAKNESS'
}

// 技能对象
export interface Skill {
  skillId: number;  // 技能id（英雄技能+号令）
  cd: number;  // 技能冷却最大回合数
  cdRemainRound: number;  // 当前技能冷却剩余回合数
  damage: number;  // 技能伤害值
  damageReduceRatio: number;  // 额外伤害免伤比例（护盾）
  damageAddByAttackRatio: number;  // 攻击加成比例
  roleId: number;  // 技能归属的英雄id
}

// 士兵对象
export interface Soldier {
  roleId: number;  // 角色id（7：弓兵/8：盾兵）
  attack: number;  // 攻击力
  heroId: number;  // 所属英雄id
  life: number;  // 生命值
}

// 英雄角色对象
export interface Role {
  roleId: number;  // 英雄id，ID与英雄映射关系见附录
  attack: number;  // 英雄的武力值，即初始攻击力（静态值，不包含加成后的实际值）
  position: Position;  // 英雄位置
  life: number;  // 英雄当前生命值（静态值，不包含加成后的实际值）
  maxLife: number;  // 英雄最大生命值
  camp: number;  // 阵营
  reviveRound: number;  // 英雄复活剩余回合数
  formationType: number;  // 英雄带兵阵型（0：无/1：攻击/2：防守）
  commander: number;  // 统帅值
  statuses: Record<HeroStatus, number>;  // 英雄当前状态，状态后面的数字代表状态剩余回合数
  skills: Skill[];  // 技能情况列表
  solderProps: Soldier[];  // 表示当前英雄携带的士兵情况
}

// 玩家对象
export interface Player {
  playerId: number;  // 玩家id
  supplies: number;  // 当前玩家的粮草值（上限1500）
  morale: number;  // 当前玩家的士气值（上限300）
  roles: Role[];  // 玩家英雄详细情况-三个
}

// 城寨属性对象
export interface CityProp {
  roleId: number;  // 城寨的角色id（50/51/52）
  position: Position;  // 城寨所在单元格坐标
  life: number;  // 当前城防值
}

// 龙旗据点对象
export interface Stronghold {
  roleId: number;  // 据点的角色id（3）
  camp: number;  // 所属阵营（0/1/2），未被占领时阵营为2
  occupiedRound: number[];  // 占领进度（数组，下标为0表示红方占领的回合数，下标为1表示蓝方占领的回合数）
  position: Position;  // 据点所在单元格坐标，([-1, -1]表示龙旗据点不可占领)
}

// inquire消息数据结构
export interface InquireMessageData {
  round: number;  // 当前的回合数，从1开始计数
  players: Player[];  // 地图上的所有的玩家对象列表
  cityProps: CityProp[];  // 地图上中立城寨所在位置列表
  stronghold: Stronghold;  // 地图上龙旗据点所在位置
}

// inquire消息完整结构
export interface InquireMessage {
  msg_name: 'inquire';
  msg_data: InquireMessageData;
}

// 导出主要类型
export type { InquireMessage as default };
