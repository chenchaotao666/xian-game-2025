/**
 * 全局类型定义文件
 * 定义游戏中使用的所有接口、类型和常量
 */

// ========== 基础类型 ==========

/** 位置坐标接口 */
export interface Position {
    x: number;
    y: number;
}

/** 游戏回合信息 */
export interface GameRound {
    current: number;
    total: number;
}

// ========== 地图相关类型 ==========

/** 地形类型枚举 */
export enum TerrainType {
    SPACE = 0,  // 空地
    MOUNT = 1,  // 山丘
    WATER = 2,  // 水域
    FLAG = 3,   // 龙旗据点
    CITY = 4,   // 中立城寨
    BASE = 5    // 主基地
}

/** 地图网格单元 */
export interface MapCell {
    x: number;
    y: number;
    terrain: TerrainType;
    terrainName: string;
    walkable: boolean;
}

/** 地图信息 */
export interface GameMap {
    width: number;
    height: number;
    maxX: number;
    maxY: number;
    grid: MapCell[][];
    rawData: number[];
    specialLocations: {
        flags: Position[];
        cities: Position[];
        bases: Position[];
    };
}

// ========== 阵营相关类型 ==========

/** 阵营类型 */
export enum CampType {
    NEUTRAL = 0,
    RED = 1,
    BLUE = 2
}

// ========== 英雄相关类型 ==========

/** 英雄角色ID枚举 */
export enum HeroRoleId {
    LV_BU = 1,        // 吕布
    ZHAO_YUN = 2,     // 赵云
    GUAN_YU = 3,      // 关羽
    LIU_BEI = 4,      // 刘备
    CAO_CAO = 5,      // 曹操
    SUN_QUAN = 6,     // 孙权
    ZHUGE_LIANG = 7,  // 诸葛亮
    ZHOU_YU = 8,      // 周瑜
    SIMA_YI = 9       // 司马懿
}

/** 英雄类型分类 */
export enum HeroCategory {
    WARRIOR = 'warrior',    // 猛将
    COMMANDER = 'commander', // 统帅
    STRATEGIST = 'strategist' // 谋士
}

/** 英雄状态枚举 */
export enum HeroStatus {
    NONE = 'none',
    RESURRECTION = 'resurrection',
    SILENCE = 'silence',
    GROUNDED = 'grounded',
    WEAKNESS = 'weakness'
}

/** 阵型类型 */
export enum FormationType {
    NONE = 0,
    ATTACK = 1,
    DEFENSE = 2
}

/** 技能信息 */
export interface Skill {
    skillId: number;
    cd: number;
    cdRemainRound: number;
    damage: number;
    damageReduceRatio: number;
    damageAddByAttackRatio: number;
    roleId: number;
    isReady: boolean;
    cooldownProgress: number;
}

/** 士兵类型 */
export enum SoldierType {
    ARCHER = 7,   // 弓兵
    SHIELD = 8    // 盾兵
}

/** 士兵信息 */
export interface Soldier {
    roleId: SoldierType;
    attack: number;
    heroId: number;
    life: number;
    type: 'archer' | 'shield';
    typeName: string;
}

/** 英雄状态信息 */
export interface StatusEffect {
    remainingRounds: number;
    statusName: string;
    isActive: boolean;
}

/** 英雄完整信息 */
export interface Hero {
    roleId: HeroRoleId;
    attack: number;
    position: Position | null;
    life: number;
    maxLife: number;
    camp: CampType;
    campName: string;
    reviveRound: number;
    formationType: FormationType;
    formationName: string;
    commander: number;
    statuses: Record<string, StatusEffect>;
    skills: Skill[];
    soldiers: Soldier[];
    isAlive: boolean;
    isReviving: boolean;
    totalSoldierCount: number;
    healthPercentage: number;
}

// ========== 城寨相关类型 ==========

/** 城寨角色ID */
export enum CityRoleId {
    SMALL_CITY = 50,
    MEDIUM_CITY = 51,
    LARGE_CITY = 52
}

/** 城寨信息 */
export interface City {
    roleId: CityRoleId;
    position: Position | null;
    life: number;
    maxLife: number;
    cityType: string;
    healthPercentage: number;
}

/** 据点信息 */
export interface Stronghold {
    roleId: number;
    camp: CampType;
    campName: string;
    occupiedRound: [number, number];
    position: Position | null;
    isAvailable: boolean;
    redOccupiedRounds: number;
    blueOccupiedRounds: number;
    totalOccupiedRounds: number;
}

// ========== 玩家相关类型 ==========

/** 玩家信息 */
export interface Player {
    playerId: number;
    supplies: number;
    morale: number;
    roles: Hero[];
    totalLife: number;
    aliveHeroes: number;
    totalSoldiers: number;
}

/** 游戏状态 */
export interface GameState {
    round: number;
    players: Player[];
    cityProps: City[];
    stronghold: Stronghold | null;
    timestamp: string;
}

// ========== 行动相关类型 ==========

/** 行动类型枚举 */
export enum ActionType {
    MOVE = 'move',
    PICK = 'pick',
    MAKE = 'make',
    ATTACK = 'attack',
    SKILL = 'skill',
    FORMATION = 'formation'
}

/** 移动行动 */
export interface MoveAction {
    action: ActionType.MOVE;
    heroId: number;
    targetPosition: Position;
}

/** 招募行动 */
export interface PickAction {
    action: ActionType.PICK;
    heroId: HeroRoleId;
    position: Position;
}

/** 生产行动 */
export interface MakeAction {
    action: ActionType.MAKE;
    heroId: number;
    soldierType: SoldierType;
    count: number;
}

/** 攻击行动 */
export interface AttackAction {
    action: ActionType.ATTACK;
    heroId: number;
    targetId: number;
}

/** 技能行动 */
export interface SkillAction {
    action: ActionType.SKILL;
    heroId: number;
    skillId: number;
    targetId?: number;
    targetPosition?: Position;
}

/** 阵型行动 */
export interface FormationAction {
    action: ActionType.FORMATION;
    heroId: number;
    formationType: FormationType;
}

/** 联合行动类型 */
export type GameAction = MoveAction | PickAction | MakeAction | AttackAction | SkillAction | FormationAction;

// ========== 网络协议相关类型 ==========

/** 消息类型 */
export enum MessageType {
    START = 'start',
    INQUIRE = 'inquire',
    OVER = 'over'
}

/** 基础消息结构 */
export interface BaseMessage {
    msg_name: MessageType;
    msg_data: any;
}

/** 开始消息 */
export interface StartMessage extends BaseMessage {
    msg_name: MessageType.START;
    msg_data: {
        map: any;
        players: Array<{
            playerId: number;
            camp: CampType;
        }>;
    };
}

/** 询问消息 */
export interface InquireMessage extends BaseMessage {
    msg_name: MessageType.INQUIRE;
    msg_data: GameState;
}

/** 结束消息 */
export interface OverMessage extends BaseMessage {
    msg_name: MessageType.OVER;
    msg_data: {
        players: Array<any>;
    };
}

// ========== AI相关类型 ==========

/** AI决策上下文 */
export interface AIContext {
    gameState: GameState;
    myPlayerId: number;
    enemyPlayerId: number;
    gameMap: GameMap;
    round: number;
}

/** AI评估结果 */
export interface AIEvaluation {
    score: number;
    confidence: number;
    reasoning: string;
}

/** AI决策结果 */
export interface AIDecision {
    action: GameAction;
    priority: number;
    evaluation: AIEvaluation;
}

// ========== 行为树相关类型 ==========

/** 行为树节点状态 */
export enum NodeStatus {
    SUCCESS = 'success',
    FAILURE = 'failure',
    RUNNING = 'running'
}

/** 行为树上下文 */
export interface BehaviorTreeContext {
    ai: AIContext;
    blackboard: Record<string, any>;
    deltaTime: number;
}

// ========== 游戏结果相关类型 ==========

/** 游戏结果中的英雄数据 */
export interface GameResultHero {
    id: number;
    roleId: HeroRoleId;
    name: string;
    bowmen: number;
    shieldmen: number;
    killedNum: number;
    totalSoldiers: number;
    efficiency: number;
}

/** 游戏结果中的玩家数据 */
export interface GameResultPlayer {
    playerId: number;
    playerName: string;
    online: boolean;
    overRound: number;
    progress: number;
    soldierNum: number;
    totalGold: number;
    destroyTowerNum: number;
    killedNum: number;
    occupyRound: number;
    heroes: GameResultHero[];
    rank: number;
    score: number;
}

/** 游戏总结 */
export interface GameSummary {
    winnerName: string;
    totalKills: number;
    totalSurvivingSoldiers: number;
    averageProgress: number;
    competitionLevel: string;
    gameQuality: string;
}

/** 游戏结果 */
export interface GameResult {
    players: GameResultPlayer[];
    winner: {
        winner: GameResultPlayer;
        rankings: GameResultPlayer[];
    };
    gameEndTime: string;
    totalPlayers: number;
    summary: GameSummary;
}

// ========== 工具函数类型 ==========

/** 距离计算函数类型 */
export type DistanceFunction = (pos1: Position, pos2: Position) => number;

/** 路径查找结果 */
export interface PathResult {
    path: Position[];
    distance: number;
    found: boolean;
}

/** 范围查询结果 */
export interface RangeQueryResult<T> {
    items: T[];
    count: number;
    center: Position;
    radius: number;
}

// ========== 配置相关类型 ==========

/** 游戏配置 */
export interface GameConfig {
    maxRounds: number;
    mapSize: { width: number; height: number };
    initialSupplies: number;
    maxSupplies: number;
    soldierCost: number;
    victoryConditions: {
        occupyRounds: number;
        alternativeRounds: number;
    };
}

/** AI配置 */
export interface AIConfig {
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    reactionTime: number;
    errorRate: number;
    aggressiveness: number;
    defensiveness: number;
}

/** 网络配置 */
export interface NetworkConfig {
    host: string;
    port: number;
    timeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
} 