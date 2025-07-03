/**
 * 服务器消息解析器
 * 负责解析从服务器接收到的各种消息格式
 */

const { TERRAIN_TYPES, CAMP_TYPES, HERO_STATUS } = require('./ProtocolManager');

/**
 * 消息解析器类
 * 提供解析各种服务器消息的工具方法
 */
class MessageParser {

    /**
     * 解析游戏开始消息(start)
     * @param {Object} startData - start消息的msg_data部分
     * @returns {Object} 解析后的游戏开始数据
     */
    static parseStartMessage(startData) {
        if (!startData || !startData.map || !startData.players) {
            throw new Error('start消息格式错误：缺少map或players字段');
        }

        // 解析地图数据
        const mapInfo = this.parseMapData(startData.map);
        
        // 解析玩家数据
        const playersInfo = startData.players.map(player => ({
            playerId: player.playerId,
            camp: player.camp,
            campName: player.camp === CAMP_TYPES.RED ? '红方' : '蓝方'
        }));

        return {
            map: mapInfo,
            players: playersInfo,
            gameStarted: true,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 解析地图数据
     * @param {Object} mapData - 地图数据对象
     * @returns {Object} 解析后的地图信息
     */
    static parseMapData(mapData) {
        if (!mapData.data || typeof mapData.maxX !== 'number' || typeof mapData.maxY !== 'number') {
            throw new Error('地图数据格式错误：缺少data、maxX或maxY字段');
        }

        const terrainData = mapData.data.split(',').map(cell => parseInt(cell.trim(), 10));
        const width = mapData.maxX + 1; // maxX是最大坐标，实际宽度要+1
        const height = mapData.maxY + 1;

        if (terrainData.length !== width * height) {
            throw new Error(`地图数据长度错误：期望${width * height}，实际${terrainData.length}`);
        }

        // 构建二维地图数组
        const grid = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const terrainType = terrainData[index];
                
                row.push({
                    x: x,
                    y: y,
                    terrain: terrainType,
                    terrainName: this.getTerrainName(terrainType),
                    walkable: this.isTerrainWalkable(terrainType)
                });
            }
            grid.push(row);
        }

        return {
            width: width,
            height: height,
            maxX: mapData.maxX,
            maxY: mapData.maxY,
            grid: grid,
            rawData: terrainData,
            // 提取特殊地形位置
            specialLocations: this.extractSpecialLocations(grid)
        };
    }

    /**
     * 解析询问消息(inquire)
     * @param {Object} inquireData - inquire消息的msg_data部分
     * @returns {Object} 解析后的游戏状态数据
     */
    static parseInquireMessage(inquireData) {
        if (!inquireData || typeof inquireData.round !== 'number' || !Array.isArray(inquireData.players)) {
            throw new Error('inquire消息格式错误：缺少round或players字段');
        }

        return {
            round: inquireData.round,
            players: inquireData.players.map(player => this.parsePlayerData(player)),
            cityProps: inquireData.cityProps ? inquireData.cityProps.map(city => this.parseCityData(city)) : [],
            stronghold: inquireData.stronghold ? this.parseStrongholdData(inquireData.stronghold) : null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 解析玩家数据
     * @param {Object} playerData - 玩家数据对象
     * @returns {Object} 解析后的玩家信息
     */
    static parsePlayerData(playerData) {
        if (!playerData.hasOwnProperty('playerId') || !Array.isArray(playerData.roles)) {
            throw new Error('玩家数据格式错误：缺少playerId或roles字段');
        }

        return {
            playerId: playerData.playerId,
            supplies: playerData.supplies || 0,           // 粮草
            morale: playerData.morale || 0,               // 士气
            roles: playerData.roles.map(role => this.parseRoleData(role)),
            totalLife: this.calculateTotalLife(playerData.roles),
            aliveHeroes: this.countAliveHeroes(playerData.roles),
            totalSoldiers: this.countTotalSoldiers(playerData.roles)
        };
    }

    /**
     * 解析英雄数据
     * @param {Object} roleData - 英雄数据对象
     * @returns {Object} 解析后的英雄信息
     */
    static parseRoleData(roleData) {
        if (!roleData.hasOwnProperty('roleId')) {
            throw new Error('英雄数据格式错误：缺少roleId字段');
        }

        return {
            roleId: roleData.roleId,
            attack: roleData.attack || 0,
            position: roleData.position ? {
                x: roleData.position.x,
                y: roleData.position.y
            } : null,
            life: roleData.life || 0,
            maxLife: roleData.maxLife || 0,
            camp: roleData.camp,
            campName: roleData.camp === CAMP_TYPES.RED ? '红方' : '蓝方',
            reviveRound: roleData.reviveRound || 0,
            formationType: roleData.formationType || 0,
            formationName: this.getFormationName(roleData.formationType),
            commander: roleData.commander || 0,
            statuses: roleData.statuses ? this.parseStatuses(roleData.statuses) : {},
            skills: roleData.skills ? roleData.skills.map(skill => this.parseSkillData(skill)) : [],
            soldiers: roleData.solderProps ? roleData.solderProps.map(soldier => this.parseSoldierData(soldier)) : [],
            isAlive: roleData.life > 0 && roleData.reviveRound === 0,
            isReviving: roleData.reviveRound > 0,
            totalSoldierCount: this.countSoldiers(roleData.solderProps),
            healthPercentage: roleData.maxLife > 0 ? (roleData.life / roleData.maxLife) * 100 : 0
        };
    }

    /**
     * 解析技能数据
     * @param {Object} skillData - 技能数据对象
     * @returns {Object} 解析后的技能信息
     */
    static parseSkillData(skillData) {
        return {
            skillId: skillData.skillId,
            cd: skillData.cd || 0,                                    // 最大冷却时间
            cdRemainRound: skillData.cdRemainRound || 0,              // 剩余冷却时间
            damage: skillData.damage || 0,                            // 技能伤害
            damageReduceRatio: skillData.damageReduceRatio || 0,      // 伤害减免比例
            damageAddByAttackRatio: skillData.damageAddByAttackRatio || 0, // 攻击加成比例
            roleId: skillData.roleId,                                 // 归属英雄ID
            isReady: (skillData.cdRemainRound || 0) === 0,           // 是否可用
            cooldownProgress: skillData.cd > 0 ? 
                ((skillData.cd - (skillData.cdRemainRound || 0)) / skillData.cd) * 100 : 100
        };
    }

    /**
     * 解析士兵数据
     * @param {Object} soldierData - 士兵数据对象
     * @returns {Object} 解析后的士兵信息
     */
    static parseSoldierData(soldierData) {
        return {
            roleId: soldierData.roleId,                              // 士兵类型ID (7弓兵/8盾兵)
            attack: soldierData.attack || 0,                         // 攻击力
            heroId: soldierData.heroId,                              // 所属英雄ID
            life: soldierData.life || 0,                             // 生命值
            type: soldierData.roleId === 7 ? 'archer' : 'shield',    // 士兵类型
            typeName: soldierData.roleId === 7 ? '弓兵' : '盾兵'
        };
    }

    /**
     * 解析城寨数据
     * @param {Object} cityData - 城寨数据对象
     * @returns {Object} 解析后的城寨信息
     */
    static parseCityData(cityData) {
        return {
            roleId: cityData.roleId,
            position: cityData.position ? {
                x: cityData.position.x,
                y: cityData.position.y
            } : null,
            life: cityData.life || 0,
            maxLife: this.getCityMaxLife(cityData.roleId),           // 根据城寨类型获取最大血量
            cityType: this.getCityType(cityData.roleId),             // 城寨类型
            healthPercentage: this.getCityHealthPercentage(cityData.roleId, cityData.life)
        };
    }

    /**
     * 解析据点数据
     * @param {Object} strongholdData - 据点数据对象
     * @returns {Object} 解析后的据点信息
     */
    static parseStrongholdData(strongholdData) {
        const isAvailable = strongholdData.position && 
                           strongholdData.position.x !== -1 && 
                           strongholdData.position.y !== -1;

        return {
            roleId: strongholdData.roleId,
            camp: strongholdData.camp,
            campName: strongholdData.camp === CAMP_TYPES.RED ? '红方' : 
                     strongholdData.camp === CAMP_TYPES.BLUE ? '蓝方' : '中立',
            occupiedRound: strongholdData.occupiedRound || [0, 0],    // [红方占领回合数, 蓝方占领回合数]
            position: strongholdData.position ? {
                x: strongholdData.position.x,
                y: strongholdData.position.y
            } : null,
            isAvailable: isAvailable,                                  // 是否可占领
            redOccupiedRounds: (strongholdData.occupiedRound || [0, 0])[0],
            blueOccupiedRounds: (strongholdData.occupiedRound || [0, 0])[1],
            totalOccupiedRounds: (strongholdData.occupiedRound || [0, 0]).reduce((a, b) => a + b, 0)
        };
    }

    /**
     * 解析游戏结束消息(over)
     * @param {Object} overData - over消息的msg_data部分
     * @returns {Object} 解析后的游戏结果数据
     */
    static parseOverMessage(overData) {
        if (!overData || !Array.isArray(overData.players)) {
            throw new Error('over消息格式错误：缺少players字段');
        }

        const players = overData.players.map(player => this.parseGameResultPlayer(player));
        
        // 确定获胜者
        const winner = this.determineWinner(players);

        return {
            players: players,
            winner: winner,
            gameEndTime: new Date().toISOString(),
            totalPlayers: players.length,
            summary: this.generateGameSummary(players, winner)
        };
    }

    /**
     * 解析游戏结果中的玩家数据
     * @param {Object} playerData - 玩家结果数据
     * @returns {Object} 解析后的玩家结果
     */
    static parseGameResultPlayer(playerData) {
        return {
            playerId: playerData.playerId,
            playerName: playerData.playerName || '未知玩家',
            online: playerData.online !== false,                      // 是否在线
            overRound: playerData.overRound || 0,                     // 结束回合
            progress: playerData.progress || 0,                       // 占点进度
            soldierNum: playerData.soldierNum || 0,                   // 存活士兵总量
            totalGold: playerData.totalGold || 0,                     // 剩余粮草
            destroyTowerNum: playerData.destroyTowerNum || 0,         // 摧毁塔数量
            killedNum: playerData.killedNum || 0,                     // 总击杀数
            occupyRound: playerData.occupyRound || 0,                 // 占领回合数
            heroes: playerData.heroes ? playerData.heroes.map(hero => this.parseGameResultHero(hero)) : [],
            rank: 0, // 将在确定获胜者时设置
            score: this.calculatePlayerScore(playerData)              // 计算玩家得分
        };
    }

    /**
     * 解析游戏结果中的英雄数据
     * @param {Object} heroData - 英雄结果数据
     * @returns {Object} 解析后的英雄结果
     */
    static parseGameResultHero(heroData) {
        return {
            id: heroData.id,
            roleId: heroData.roleId,
            name: heroData.name || '未知英雄',
            bowmen: heroData.bowmen || 0,                             // 存活弓兵数
            shieldmen: heroData.shieldmen || 0,                       // 存活盾兵数
            killedNum: heroData.killedNum || 0,                       // 击杀数
            totalSoldiers: (heroData.bowmen || 0) + (heroData.shieldmen || 0),
            efficiency: this.calculateHeroEfficiency(heroData)        // 计算英雄效率
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
     */
    static extractSpecialLocations(grid) {
        const locations = {
            flags: [],      // 龙旗据点
            cities: [],     // 城寨
            bases: []       // 基地
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
            0: '无阵型',
            1: '攻击阵型',
            2: '防守阵型'
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
                remainingRounds: rounds,
                statusName: this.getStatusName(status),
                isActive: rounds > 0
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
            [HERO_STATUS.NONE]: '正常',
            [HERO_STATUS.RESURRECTION]: '复活中',
            [HERO_STATUS.SILENCE]: '沉默',
            [HERO_STATUS.GROUNDED]: '控制',
            [HERO_STATUS.WEAKNESS]: '虚弱'
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
            50: '小型城寨',
            51: '中型城寨',
            52: '大型城寨'
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
            50: 200,  // 小型城寨
            51: 400,  // 中型城寨
            52: 600   // 大型城寨
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
            player.rank = index + 1;
        });

        return {
            winner: sortedPlayers[0],
            rankings: sortedPlayers
        };
    }

    /**
     * 计算玩家得分
     * @param {Object} playerData - 玩家数据
     * @returns {number} 玩家得分
     */
    static calculatePlayerScore(playerData) {
        const progressScore = (playerData.progress || 0) * 1000;      // 占点进度得分
        const occupyScore = (playerData.occupyRound || 0) * 10;       // 占领回合得分
        const killScore = (playerData.killedNum || 0) * 50;           // 击杀得分
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
     */
    static generateGameSummary(players, winner) {
        const totalKills = players.reduce((sum, p) => sum + p.killedNum, 0);
        const totalSoldiers = players.reduce((sum, p) => sum + p.soldierNum, 0);
        const avgProgress = players.reduce((sum, p) => sum + p.progress, 0) / players.length;

        return {
            winnerName: winner.winner ? winner.winner.playerName : '未知',
            totalKills: totalKills,
            totalSurvivingSoldiers: totalSoldiers,
            averageProgress: Math.round(avgProgress * 10000) / 100, // 转换为百分比
            competitionLevel: this.assessCompetitionLevel(players),
            gameQuality: this.assessGameQuality(players)
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

        if (scoreDiff < 100) return '势均力敌';
        if (scoreDiff < 500) return '竞争激烈';
        if (scoreDiff < 1000) return '优势明显';
        return '压倒性胜利';
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
        
        // 击杀数评分
        if (totalKills > 20) qualityScore += 2;
        else if (totalKills > 10) qualityScore += 1;
        
        // 占点进度评分
        if (avgProgress > 0.5) qualityScore += 2;
        else if (avgProgress > 0.2) qualityScore += 1;
        
        // 在线状态评分
        const onlinePlayers = players.filter(p => p.online).length;
        if (onlinePlayers === players.length) qualityScore += 1;

        const qualities = ['低质量', '普通', '良好', '优秀', '完美'];
        return qualities[Math.min(qualityScore, qualities.length - 1)];
    }
}

module.exports = MessageParser; 