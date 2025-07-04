/**
 * 服务器消息解析器
 * 负责解析从服务器接收到的各种消息格式
 */

import { TERRAIN_TYPES, CAMP_TYPES, HERO_STATUS } from './ProtocolManager';

/**
 * 消息解析器类
 * 提供解析各种服务器消息的工具方法
 */
class MessageParser {

    /**
     * 解析游戏开始消息(start)
     * @param {Object} startData - start消息的msg_data部分
     * @returns {Object} 解析后的游戏开始数据
     * @returns {Object} returns.map - 地图信息对象
     * @returns {Array} returns.players - 玩家信息数组
     * @returns {boolean} returns.gameStarted - 游戏是否已开始
     * @returns {string} returns.timestamp - 解析时间戳
     */
    static parseStartMessage(startData) {
        if (!startData || !startData.map || !startData.players) {
            throw new Error('start消息格式错误：缺少map或players字段');
        }

        // 解析地图数据
        const mapInfo = this.parseMapData(startData.map);
        
        // 解析玩家数据
        const playersInfo = startData.players.map(player => ({
            playerId: player.playerId,                                // 玩家ID
            camp: player.camp,                                        // 阵营类型（1红方，2蓝方）
            campName: player.camp === CAMP_TYPES.RED ? '红方' : '蓝方' // 阵营中文名称
        }));

        return {
            map: mapInfo,                                             // 地图信息对象
            players: playersInfo,                                     // 玩家信息数组
            gameStarted: true,                                        // 游戏是否已开始
            timestamp: new Date().toISOString()                      // 解析时间戳（ISO格式）
        };
    }

    /**
     * 解析地图数据
     * @param {Object} mapData - 地图数据对象
     * @returns {Object} 解析后的地图信息
     * @returns {number} returns.width - 地图宽度
     * @returns {number} returns.height - 地图高度
     * @returns {number} returns.maxX - 最大X坐标
     * @returns {number} returns.maxY - 最大Y坐标
     * @returns {Array} returns.grid - 二维地图网格数组
     * @returns {Array} returns.rawData - 原始地形数据数组
     * @returns {Object} returns.specialLocations - 特殊地形位置信息
     */
    static parseMapData(mapData) {
        if (!mapData.data || typeof mapData.maxX !== 'number' || typeof mapData.maxY !== 'number') {
            throw new Error('地图数据格式错误：缺少data、maxX或maxY字段');
        }

        const terrainData = mapData.data.split(',').map(cell => parseInt(cell.trim(), 10));
        const width = mapData.maxX + 1; // maxX是最大坐标，实际宽度要+1
        const height = mapData.maxY + 1;

        // if (terrainData.length !== width * height) {
        //     throw new Error(`地图数据长度错误：期望${width * height}，实际${terrainData.length}`);
        // }

        // 构建二维地图数组
        const grid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const terrainType = terrainData[index];
                
                row.push({
                    x: x,                                             // 网格X坐标
                    y: y,                                             // 网格Y坐标
                    terrain: terrainType,                             // 地形类型数值
                    terrainName: this.getTerrainName(terrainType),    // 地形中文名称
                    walkable: this.isTerrainWalkable(terrainType)     // 是否可通行
                });
            }
            grid.push(row);
        }

        return {
            width: width,                                             // 地图宽度（格子数）
            height: height,                                           // 地图高度（格子数）
            maxX: mapData.maxX,                                       // 最大X坐标值
            maxY: mapData.maxY,                                       // 最大Y坐标值
            grid: grid,                                               // 二维地图网格数组
            rawData: terrainData,                                     // 原始地形数据一维数组
            // 提取特殊地形位置
            specialLocations: this.extractSpecialLocations(grid)      // 特殊地形位置信息对象
        };
    }

    /**
     * 解析询问消息(inquire)
     * @param {Object} inquireData - inquire消息的msg_data部分
     * @returns {Object} 解析后的游戏状态数据
     * @returns {number} returns.round - 当前回合数
     * @returns {Array} returns.players - 玩家状态数组
     * @returns {Array} returns.cityProps - 城寨状态数组
     * @returns {Object} returns.stronghold - 据点状态对象
     * @returns {string} returns.timestamp - 解析时间戳
     */
    static parseInquireMessage(inquireData) {
        if (!inquireData || typeof inquireData.round !== 'number' || !Array.isArray(inquireData.players)) {
            throw new Error('inquire消息格式错误：缺少round或players字段');
        }

        return {
            round: inquireData.round,                                 // 当前游戏回合数
            players: inquireData.players.map(player => this.parsePlayerData(player)), // 玩家状态数组
            cityProps: inquireData.cityProps ? inquireData.cityProps.map(city => this.parseCityData(city)) : [], // 城寨状态数组
            stronghold: inquireData.stronghold ? this.parseStrongholdData(inquireData.stronghold) : null, // 据点状态对象
            timestamp: new Date().toISOString()                      // 解析时间戳（ISO格式）
        };
    }

    /**
     * 解析玩家数据
     * @param {Object} playerData - 玩家数据对象
     * @returns {Object} 解析后的玩家信息
     * @returns {number} returns.playerId - 玩家ID
     * @returns {number} returns.supplies - 当前粮草数量
     * @returns {number} returns.morale - 当前士气值
     * @returns {Array} returns.roles - 英雄角色数组
     * @returns {number} returns.totalLife - 所有英雄总生命值
     * @returns {number} returns.aliveHeroes - 存活英雄数量
     * @returns {number} returns.totalSoldiers - 总士兵数量
     */
    static parsePlayerData(playerData) {
        if (!playerData.hasOwnProperty('playerId') || !Array.isArray(playerData.roles)) {
            throw new Error('玩家数据格式错误：缺少playerId或roles字段');
        }

        return {
            playerId: playerData.playerId,                            // 玩家唯一标识ID
            supplies: playerData.supplies || 0,                      // 当前粮草数量
            morale: playerData.morale || 0,                          // 当前士气值
            roles: playerData.roles.map(role => this.parseRoleData(role)), // 英雄角色数组
            totalLife: this.calculateTotalLife(playerData.roles),    // 所有英雄总生命值
            aliveHeroes: this.countAliveHeroes(playerData.roles),    // 存活英雄数量统计
            totalSoldiers: this.countTotalSoldiers(playerData.roles) // 总士兵数量统计
        };
    }

    /**
     * 解析英雄数据
     * @param {Object} roleData - 英雄数据对象
     * @returns {Object} 解析后的英雄信息
     * @returns {number} returns.roleId - 英雄角色ID
     * @returns {number} returns.attack - 英雄攻击力
     * @returns {Object} returns.position - 英雄位置坐标
     * @returns {number} returns.life - 当前生命值
     * @returns {number} returns.maxLife - 最大生命值
     * @returns {number} returns.camp - 所属阵营
     * @returns {string} returns.campName - 阵营中文名称
     * @returns {number} returns.reviveRound - 复活剩余回合数
     * @returns {number} returns.formationType - 阵型类型
     * @returns {string} returns.formationName - 阵型中文名称
     * @returns {number} returns.commander - 统帅值
     * @returns {Object} returns.statuses - 状态效果对象
     * @returns {Array} returns.skills - 技能数组
     * @returns {Array} returns.soldiers - 士兵数组
     * @returns {boolean} returns.isAlive - 是否存活
     * @returns {boolean} returns.isReviving - 是否正在复活
     * @returns {number} returns.totalSoldierCount - 总士兵数量
     * @returns {number} returns.healthPercentage - 血量百分比
     */
    static parseRoleData(roleData) {
        if (!roleData.hasOwnProperty('roleId')) {
            throw new Error('英雄数据格式错误：缺少roleId字段');
        }

        return {
            roleId: roleData.roleId,                                  // 英雄角色唯一ID
            attack: roleData.attack || 0,                             // 英雄攻击力数值
            position: roleData.position ? {
                x: roleData.position.x,                               // 英雄X坐标位置
                y: roleData.position.y                                // 英雄Y坐标位置
            } : null,
            life: roleData.life || 0,                                 // 当前生命值
            maxLife: roleData.maxLife || 0,                           // 最大生命值上限
            camp: roleData.camp,                                      // 所属阵营（1红方，2蓝方）
            campName: roleData.camp === CAMP_TYPES.RED ? '红方' : '蓝方', // 阵营中文名称
            reviveRound: roleData.reviveRound || 0,                   // 复活剩余回合数
            formationType: roleData.formationType || 0,               // 阵型类型数值
            formationName: this.getFormationName(roleData.formationType), // 阵型中文名称
            commander: roleData.commander || 0,                       // 统帅值数值
            statuses: roleData.statuses ? this.parseStatuses(roleData.statuses) : {}, // 状态效果对象
            skills: roleData.skills ? roleData.skills.map(skill => this.parseSkillData(skill)) : [], // 技能数组
            soldiers: roleData.solderProps ? roleData.solderProps.map(soldier => this.parseSoldierData(soldier)) : [], // 士兵数组
            isAlive: roleData.life > 0 && roleData.reviveRound === 0, // 是否存活（血量>0且不在复活）
            isReviving: roleData.reviveRound > 0,                     // 是否正在复活中
            totalSoldierCount: this.countSoldiers(roleData.solderProps), // 总士兵数量统计
            healthPercentage: roleData.maxLife > 0 ? (roleData.life / roleData.maxLife) * 100 : 0 // 血量百分比
        };
    }

    /**
     * 解析技能数据
     * @param {Object} skillData - 技能数据对象
     * @returns {Object} 解析后的技能信息
     * @returns {number} returns.skillId - 技能ID
     * @returns {number} returns.cd - 最大冷却时间
     * @returns {number} returns.cdRemainRound - 剩余冷却时间
     * @returns {number} returns.damage - 技能伤害值
     * @returns {number} returns.damageReduceRatio - 伤害减免比例
     * @returns {number} returns.damageAddByAttackRatio - 攻击加成比例
     * @returns {number} returns.roleId - 归属英雄ID
     * @returns {boolean} returns.isReady - 是否可用
     * @returns {number} returns.cooldownProgress - 冷却进度百分比
     */
    static parseSkillData(skillData) {
        return {
            skillId: skillData.skillId,                               // 技能唯一标识ID
            cd: skillData.cd || 0,                                    // 最大冷却时间（回合数）
            cdRemainRound: skillData.cdRemainRound || 0,              // 剩余冷却时间（回合数）
            damage: skillData.damage || 0,                            // 技能基础伤害值
            damageReduceRatio: skillData.damageReduceRatio || 0,      // 伤害减免比例（0-1）
            damageAddByAttackRatio: skillData.damageAddByAttackRatio || 0, // 攻击力加成比例（0-1）
            roleId: skillData.roleId,                                 // 归属英雄的角色ID
            isReady: (skillData.cdRemainRound || 0) === 0,           // 技能是否可以使用
            cooldownProgress: skillData.cd > 0 ?                      // 冷却进度百分比（0-100）
                ((skillData.cd - (skillData.cdRemainRound || 0)) / skillData.cd) * 100 : 100
        };
    }

    /**
     * 解析士兵数据
     * @param {Object} soldierData - 士兵数据对象
     * @returns {Object} 解析后的士兵信息
     * @returns {number} returns.roleId - 士兵类型ID
     * @returns {number} returns.attack - 士兵攻击力
     * @returns {number} returns.heroId - 所属英雄ID
     * @returns {number} returns.life - 士兵生命值
     * @returns {string} returns.type - 士兵类型英文名
     * @returns {string} returns.typeName - 士兵类型中文名
     */
    static parseSoldierData(soldierData) {
        return {
            roleId: soldierData.roleId,                              // 士兵类型ID (7弓兵/8盾兵)
            attack: soldierData.attack || 0,                         // 士兵攻击力数值
            heroId: soldierData.heroId,                              // 所属英雄的ID
            life: soldierData.life || 0,                             // 士兵当前生命值
            type: soldierData.roleId === 7 ? 'archer' : 'shield',    // 士兵类型英文标识
            typeName: soldierData.roleId === 7 ? '弓兵' : '盾兵'      // 士兵类型中文名称
        };
    }

    /**
     * 解析城寨数据
     * @param {Object} cityData - 城寨数据对象
     * @returns {Object} 解析后的城寨信息
     * @returns {number} returns.roleId - 城寨角色ID
     * @returns {Object} returns.position - 城寨位置坐标
     * @returns {number} returns.life - 当前生命值
     * @returns {number} returns.maxLife - 最大生命值
     * @returns {string} returns.cityType - 城寨类型名称
     * @returns {number} returns.healthPercentage - 血量百分比
     */
    static parseCityData(cityData) {
        return {
            roleId: cityData.roleId,                                  // 城寨角色唯一ID
            position: cityData.position ? {
                x: cityData.position.x,                               // 城寨X坐标位置
                y: cityData.position.y                                // 城寨Y坐标位置
            } : null,
            life: cityData.life || 0,                                 // 城寨当前生命值
            maxLife: this.getCityMaxLife(cityData.roleId),           // 根据城寨类型获取最大血量
            cityType: this.getCityType(cityData.roleId),             // 城寨类型中文名称
            healthPercentage: this.getCityHealthPercentage(cityData.roleId, cityData.life) // 血量百分比
        };
    }

    /**
     * 解析据点数据
     * @param {Object} strongholdData - 据点数据对象
     * @returns {Object} 解析后的据点信息
     * @returns {number} returns.roleId - 据点角色ID
     * @returns {number} returns.camp - 控制阵营
     * @returns {string} returns.campName - 控制阵营中文名称
     * @returns {Array} returns.occupiedRound - 占领回合数数组
     * @returns {Object} returns.position - 据点位置坐标
     * @returns {boolean} returns.isAvailable - 是否可占领
     * @returns {number} returns.redOccupiedRounds - 红方占领回合数
     * @returns {number} returns.blueOccupiedRounds - 蓝方占领回合数
     * @returns {number} returns.totalOccupiedRounds - 总占领回合数
     */
    static parseStrongholdData(strongholdData) {
        const isAvailable = strongholdData.position && 
                           strongholdData.position.x !== -1 && 
                           strongholdData.position.y !== -1;

        return {
            roleId: strongholdData.roleId,                            // 据点角色唯一ID
            camp: strongholdData.camp,                                // 当前控制阵营
            campName: strongholdData.camp === CAMP_TYPES.RED ? '红方' : // 控制阵营中文名称
                     strongholdData.camp === CAMP_TYPES.BLUE ? '蓝方' : '中立',
            occupiedRound: strongholdData.occupiedRound || [0, 0],    // [红方占领回合数, 蓝方占领回合数]
            position: strongholdData.position ? {
                x: strongholdData.position.x,                         // 据点X坐标位置
                y: strongholdData.position.y                          // 据点Y坐标位置
            } : null,
            isAvailable: isAvailable,                                  // 据点是否可以占领
            redOccupiedRounds: (strongholdData.occupiedRound || [0, 0])[0], // 红方累计占领回合数
            blueOccupiedRounds: (strongholdData.occupiedRound || [0, 0])[1], // 蓝方累计占领回合数
            totalOccupiedRounds: (strongholdData.occupiedRound || [0, 0]).reduce((a, b) => a + b, 0) // 总占领回合数
        };
    }

    /**
     * 解析游戏结束消息(over)
     * @param {Object} overData - over消息的msg_data部分
     * @returns {Object} 解析后的游戏结果数据
     * @returns {Array} returns.players - 玩家结果数组
     * @returns {Object} returns.winner - 获胜者信息
     * @returns {string} returns.gameEndTime - 游戏结束时间
     * @returns {number} returns.totalPlayers - 总玩家数
     * @returns {Object} returns.summary - 游戏总结信息
     */
    static parseOverMessage(overData) {
        if (!overData || !Array.isArray(overData.players)) {
            throw new Error('over消息格式错误：缺少players字段');
        }

        const players = overData.players.map(player => this.parseGameResultPlayer(player));
        
        // 确定获胜者
        const winner = this.determineWinner(players);

        return {
            players: players,                                         // 所有玩家结果数组
            winner: winner,                                           // 获胜者信息对象
            gameEndTime: new Date().toISOString(),                   // 游戏结束时间戳
            totalPlayers: players.length,                            // 参与游戏总玩家数
            summary: this.generateGameSummary(players, winner)        // 游戏总结统计信息
        };
    }

    /**
     * 解析游戏结果中的玩家数据
     * @param {Object} playerData - 玩家结果数据
     * @returns {Object} 解析后的玩家结果
     * @returns {number} returns.playerId - 玩家ID
     * @returns {string} returns.playerName - 玩家名称
     * @returns {boolean} returns.online - 是否在线
     * @returns {number} returns.overRound - 结束回合
     * @returns {number} returns.progress - 占点进度
     * @returns {number} returns.soldierNum - 存活士兵总量
     * @returns {number} returns.totalGold - 剩余粮草
     * @returns {number} returns.destroyTowerNum - 摧毁塔数量
     * @returns {number} returns.killedNum - 总击杀数
     * @returns {number} returns.occupyRound - 占领回合数
     * @returns {Array} returns.heroes - 英雄结果数组
     * @returns {number} returns.rank - 玩家排名
     * @returns {number} returns.score - 玩家得分
     */
    static parseGameResultPlayer(playerData) {
        return {
            playerId: playerData.playerId,                            // 玩家唯一标识ID
            playerName: playerData.playerName || '未知玩家',           // 玩家显示名称
            online: playerData.online !== false,                      // 玩家是否在线状态
            overRound: playerData.overRound || 0,                     // 游戏结束时的回合数
            progress: playerData.progress || 0,                       // 占点进度百分比
            soldierNum: playerData.soldierNum || 0,                   // 游戏结束时存活士兵总量
            totalGold: playerData.totalGold || 0,                     // 游戏结束时剩余粮草数量
            destroyTowerNum: playerData.destroyTowerNum || 0,         // 摧毁敌方防御塔数量
            killedNum: playerData.killedNum || 0,                     // 总击杀敌方单位数量
            occupyRound: playerData.occupyRound || 0,                 // 累计占领据点回合数
            heroes: playerData.heroes ? playerData.heroes.map(hero => this.parseGameResultHero(hero)) : [], // 英雄结果数组
            rank: 0, // 玩家最终排名（将在确定获胜者时设置）
            score: this.calculatePlayerScore(playerData)              // 计算的玩家综合得分
        };
    }

    /**
     * 解析游戏结果中的英雄数据
     * @param {Object} heroData - 英雄结果数据
     * @returns {Object} 解析后的英雄结果
     * @returns {number} returns.id - 英雄实例ID
     * @returns {number} returns.roleId - 英雄角色ID
     * @returns {string} returns.name - 英雄名称
     * @returns {number} returns.bowmen - 存活弓兵数
     * @returns {number} returns.shieldmen - 存活盾兵数
     * @returns {number} returns.killedNum - 击杀数
     * @returns {number} returns.totalSoldiers - 总存活士兵数
     * @returns {number} returns.efficiency - 英雄效率值
     */
    static parseGameResultHero(heroData) {
        return {
            id: heroData.id,                                          // 英雄实例唯一ID
            roleId: heroData.roleId,                                  // 英雄角色类型ID
            name: heroData.name || '未知英雄',                        // 英雄显示名称
            bowmen: heroData.bowmen || 0,                             // 游戏结束时存活弓兵数量
            shieldmen: heroData.shieldmen || 0,                       // 游戏结束时存活盾兵数量
            killedNum: heroData.killedNum || 0,                       // 该英雄总击杀敌方数量
            totalSoldiers: (heroData.bowmen || 0) + (heroData.shieldmen || 0), // 总存活士兵数量
            efficiency: this.calculateHeroEfficiency(heroData)        // 计算的英雄作战效率值
        };
    }

    // ========== 辅助方法 ==========

    /**
     * 获取地形名称
     * @param {number} terrainType - 地形类型
     * @returns {string} 地形名称
     */
    static getTerrainName(terrainType) {
        const names = {
            [TERRAIN_TYPES.SPACE]: '空地',
            [TERRAIN_TYPES.MOUNT]: '山丘',
            [TERRAIN_TYPES.WATER]: '水域',
            [TERRAIN_TYPES.FLAG]: '龙旗据点',
            [TERRAIN_TYPES.CITY]: '中立城寨',
            [TERRAIN_TYPES.BASE]: '主基地'
        };
        return names[terrainType] || '未知地形';
    }

    /**
     * 判断地形是否可通行
     * @param {number} terrainType - 地形类型
     * @returns {boolean} 是否可通行
     */
    static isTerrainWalkable(terrainType) {
        return ![TERRAIN_TYPES.MOUNT, TERRAIN_TYPES.WATER].includes(terrainType);
    }

    /**
     * 提取地图中的特殊位置
     * @param {Array} grid - 地图网格
     * @returns {Object} 特殊位置信息
     * @returns {Array} returns.flags - 龙旗据点位置数组
     * @returns {Array} returns.cities - 城寨位置数组
     * @returns {Array} returns.bases - 基地位置数组
     */
    static extractSpecialLocations(grid) {
        const locations = {
            flags: [],      // 龙旗据点位置坐标数组
            cities: [],     // 中立城寨位置坐标数组
            bases: []       // 主基地位置坐标数组
        };

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const cell = grid[y][x];
                switch (cell.terrain) {
                    case TERRAIN_TYPES.FLAG:
                        locations.flags.push({x, y});
                        break;
                    case TERRAIN_TYPES.CITY:
                        locations.cities.push({x, y});
                        break;
                    case TERRAIN_TYPES.BASE:
                        locations.bases.push({x, y});
                        break;
                }
            }
        }

        return locations;
    }

    /**
     * 获取阵型名称
     * @param {number} formationType - 阵型类型
     * @returns {string} 阵型名称
     */
    static getFormationName(formationType) {
        const names = {
            0: '无阵型',      // 默认状态，无特殊阵型
            1: '攻击阵型',    // 攻击力加成阵型
            2: '防守阵型'     // 防御力加成阵型
        };
        return names[formationType] || '未知阵型';
    }

    /**
     * 解析状态信息
     * @param {Object} statuses - 状态对象
     * @returns {Object} 解析后的状态信息
     */
    static parseStatuses(statuses) {
        const parsedStatuses = {};
        for (const [status, rounds] of Object.entries(statuses)) {
            parsedStatuses[status] = {
                remainingRounds: rounds,                              // 状态剩余持续回合数
                statusName: this.getStatusName(status),               // 状态效果中文名称
                isActive: rounds > 0                                  // 状态是否当前生效
            };
        }
        return parsedStatuses;
    }

    /**
     * 获取状态名称
     * @param {string} status - 状态英文名
     * @returns {string} 状态中文名
     */
    static getStatusName(status) {
        const names = {
            [HERO_STATUS.NONE]: '正常',         // 无异常状态
            [HERO_STATUS.RESURRECTION]: '复活中', // 英雄正在复活过程中
            [HERO_STATUS.SILENCE]: '沉默',      // 无法使用技能
            [HERO_STATUS.GROUNDED]: '控制',     // 无法移动
            [HERO_STATUS.WEAKNESS]: '虚弱'      // 攻击力降低
        };
        return names[status] || status;
    }

    /**
     * 计算总生命值
     * @param {Array} roles - 英雄数组
     * @returns {number} 总生命值
     */
    static calculateTotalLife(roles) {
        return roles.reduce((total, role) => total + (role.life || 0), 0);
    }

    /**
     * 统计存活英雄数量
     * @param {Array} roles - 英雄数组
     * @returns {number} 存活英雄数量
     */
    static countAliveHeroes(roles) {
        return roles.filter(role => role.life > 0 && role.reviveRound === 0).length;
    }

    /**
     * 统计总士兵数量
     * @param {Array} roles - 英雄数组
     * @returns {number} 总士兵数量
     */
    static countTotalSoldiers(roles) {
        return roles.reduce((total, role) => {
            return total + this.countSoldiers(role.solderProps);
        }, 0);
    }

    /**
     * 统计单个英雄的士兵数量
     * @param {Array} soldiers - 士兵数组
     * @returns {number} 士兵数量
     */
    static countSoldiers(soldiers) {
        return soldiers ? soldiers.length : 0;
    }

    /**
     * 获取城寨类型
     * @param {number} roleId - 城寨角色ID
     * @returns {string} 城寨类型
     */
    static getCityType(roleId) {
        const types = {
            50: '小型城寨',    // 血量较少的防御建筑
            51: '中型城寨',    // 中等血量的防御建筑
            52: '大型城寨'     // 高血量的防御建筑
        };
        return types[roleId] || '未知城寨';
    }

    /**
     * 获取城寨最大血量
     * @param {number} roleId - 城寨角色ID
     * @returns {number} 最大血量
     */
    static getCityMaxLife(roleId) {
        const maxLifeMap = {
            50: 200,  // 小型城寨最大血量
            51: 400,  // 中型城寨最大血量
            52: 600   // 大型城寨最大血量
        };
        return maxLifeMap[roleId] || 400;
    }

    /**
     * 计算城寨血量百分比
     * @param {number} roleId - 城寨角色ID
     * @param {number} currentLife - 当前血量
     * @returns {number} 血量百分比
     */
    static getCityHealthPercentage(roleId, currentLife) {
        const maxLife = this.getCityMaxLife(roleId);
        return maxLife > 0 ? (currentLife / maxLife) * 100 : 0;
    }

    /**
     * 确定获胜者
     * @param {Array} players - 玩家数组
     * @returns {Object} 获胜者信息
     * @returns {Object} returns.winner - 获胜玩家对象
     * @returns {Array} returns.rankings - 排名后的玩家数组
     */
    static determineWinner(players) {
        // 根据占点进度排序
        const sortedPlayers = [...players].sort((a, b) => {
            // 首先按占点进度排序
            if (b.progress !== a.progress) {
                return b.progress - a.progress;
            }
            // 然后按占领回合数排序
            if (b.occupyRound !== a.occupyRound) {
                return b.occupyRound - a.occupyRound;
            }
            // 最后按总击杀数排序
            return b.killedNum - a.killedNum;
        });

        // 设置排名
        sortedPlayers.forEach((player, index) => {
            player.rank = index + 1;                                 // 设置玩家最终排名（1开始）
        });

        return {
            winner: sortedPlayers[0],                                 // 排名第一的获胜玩家
            rankings: sortedPlayers                                   // 完整排名数组
        };
    }

    /**
     * 计算玩家得分
     * @param {Object} playerData - 玩家数据
     * @returns {number} 玩家得分
     */
    static calculatePlayerScore(playerData) {
        const progressScore = (playerData.progress || 0) * 1000;      // 占点进度得分（权重最高）
        const occupyScore = (playerData.occupyRound || 0) * 10;       // 占领回合得分
        const killScore = (playerData.killedNum || 0) * 50;           // 击杀数得分
        const soldierScore = (playerData.soldierNum || 0) * 5;        // 存活士兵得分
        const goldScore = (playerData.totalGold || 0) * 1;            // 剩余粮草得分

        return progressScore + occupyScore + killScore + soldierScore + goldScore;
    }

    /**
     * 计算英雄效率
     * @param {Object} heroData - 英雄数据
     * @returns {number} 英雄效率
     */
    static calculateHeroEfficiency(heroData) {
        const totalSoldiers = (heroData.bowmen || 0) + (heroData.shieldmen || 0);
        const kills = heroData.killedNum || 0;
        
        // 简单的效率计算：击杀数 + 存活士兵数 * 0.5
        return kills + totalSoldiers * 0.5;
    }

    /**
     * 生成游戏总结
     * @param {Array} players - 玩家数组
     * @param {Object} winner - 获胜者信息
     * @returns {Object} 游戏总结
     * @returns {string} returns.winnerName - 获胜者名称
     * @returns {number} returns.totalKills - 总击杀数
     * @returns {number} returns.totalSurvivingSoldiers - 总存活士兵数
     * @returns {number} returns.averageProgress - 平均占点进度
     * @returns {string} returns.competitionLevel - 竞争激烈程度
     * @returns {string} returns.gameQuality - 游戏质量评估
     */
    static generateGameSummary(players, winner) {
        const totalKills = players.reduce((sum, p) => sum + p.killedNum, 0);
        const totalSoldiers = players.reduce((sum, p) => sum + p.soldierNum, 0);
        const avgProgress = players.reduce((sum, p) => sum + p.progress, 0) / players.length;

        return {
            winnerName: winner.winner ? winner.winner.playerName : '未知', // 获胜者玩家名称
            totalKills: totalKills,                                   // 所有玩家总击杀数统计
            totalSurvivingSoldiers: totalSoldiers,                   // 所有玩家总存活士兵数
            averageProgress: Math.round(avgProgress * 10000) / 100,   // 平均占点进度百分比
            competitionLevel: this.assessCompetitionLevel(players),   // 竞争激烈程度评估
            gameQuality: this.assessGameQuality(players)              // 游戏整体质量评估
        };
    }

    /**
     * 评估竞争激烈程度
     * @param {Array} players - 玩家数组
     * @returns {string} 竞争程度
     */
    static assessCompetitionLevel(players) {
        if (players.length < 2) return '单人游戏';
        
        const scores = players.map(p => p.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const scoreDiff = maxScore - minScore;

        if (scoreDiff < 100) return '势均力敌';      // 分差很小，实力相当
        if (scoreDiff < 500) return '竞争激烈';      // 分差中等，竞争激烈
        if (scoreDiff < 1000) return '优势明显';     // 分差较大，有明显优势
        return '压倒性胜利';                        // 分差巨大，一方完全碾压
    }

    /**
     * 评估游戏质量
     * @param {Array} players - 玩家数组
     * @returns {string} 游戏质量
     */
    static assessGameQuality(players) {
        const totalKills = players.reduce((sum, p) => sum + p.killedNum, 0);
        const avgProgress = players.reduce((sum, p) => sum + p.progress, 0) / players.length;
        
        let qualityScore = 0;
        
        // 击杀数评分（反映战斗激烈程度）
        if (totalKills > 20) qualityScore += 2;
        else if (totalKills > 10) qualityScore += 1;
        
        // 占点进度评分（反映游戏进程）
        if (avgProgress > 0.5) qualityScore += 2;
        else if (avgProgress > 0.2) qualityScore += 1;
        
        // 在线状态评分（反映游戏完整性）
        const onlinePlayers = players.filter(p => p.online).length;
        if (onlinePlayers === players.length) qualityScore += 1;

        const qualities = ['低质量', '普通', '良好', '优秀', '完美'];
        return qualities[Math.min(qualityScore, qualities.length - 1)];
    }
}

export default MessageParser; 