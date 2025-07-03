/**
 * 游戏行动指令构建器
 * 提供构建各种游戏行动指令的工具方法
 */

import { ACTION_TYPES, FORMATION_TYPES, SOLDIER_TYPES } from './ProtocolManager';

/**
 * 行动指令构建器类
 * 负责构建符合协议格式的各种游戏行动指令
 */
class ActionBuilder {
    
    /**
     * 构建普通移动指令
     * @param {number} roleId - 英雄ID
     * @param {Object} position - 目标位置 {x, y}
     * @returns {Object} 移动行动指令
     */
    static buildMoveAction(roleId, position) {
        if (!roleId || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            throw new Error('构建移动指令参数错误：需要roleId和有效的position{x, y}');
        }

        return {
            roleId: roleId,
            action: ACTION_TYPES.MOVE,
            position: {
                x: position.x,
                y: position.y
            }
        };
    }

    /**
     * 构建传送指令（英雄技能）
     * @param {number} roleId - 英雄ID
     * @param {Object} position - 传送目标位置 {x, y}
     * @returns {Object} 传送行动指令
     */
    static buildTeleportAction(roleId, position) {
        if (!roleId || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            throw new Error('构建传送指令参数错误：需要roleId和有效的position{x, y}');
        }

        return {
            roleId: roleId,
            action: ACTION_TYPES.SP,
            position: {
                x: position.x,
                y: position.y
            }
        };
    }

    /**
     * 构建选择阵容指令
     * @param {Array<number>} heroIds - 要选择的英雄ID数组，必须是3个
     * @returns {Object} 选择阵容行动指令
     */
    static buildPickAction(heroIds) {
        if (!Array.isArray(heroIds) || heroIds.length !== 3) {
            throw new Error('构建阵容选择指令参数错误：需要包含3个英雄ID的数组');
        }

        // 验证所有ID都是数字
        for (const id of heroIds) {
            if (typeof id !== 'number') {
                throw new Error(`英雄ID必须是数字: ${id}`);
            }
        }

        return {
            action: ACTION_TYPES.PICK,
            roles: heroIds
        };
    }

    /**
     * 构建生产兵力指令
     * @param {Array<Object>} productionDetails - 生产详情数组
     * 格式: [{roleId: number, soldiers: Array<number>}, ...]
     * @returns {Object} 生产兵力行动指令
     */
    static buildMakeAction(productionDetails) {
        if (!Array.isArray(productionDetails) || productionDetails.length === 0) {
            throw new Error('构建生产指令参数错误：需要非空的生产详情数组');
        }

        // 验证生产详情格式
        for (const detail of productionDetails) {
            if (!detail.roleId || !Array.isArray(detail.soldiers)) {
                throw new Error('生产详情格式错误：需要包含roleId和soldiers数组');
            }
            
            // 验证士兵类型
            for (const soldierType of detail.soldiers) {
                if (![SOLDIER_TYPES.ARCHER, SOLDIER_TYPES.SHIELD].includes(soldierType)) {
                    throw new Error(`无效的士兵类型: ${soldierType}`);
                }
            }
        }

        return {
            action: ACTION_TYPES.MAKE,
            details: productionDetails.map(detail => ({
                roleId: detail.roleId,
                solders: detail.soldiers // 注意协议中使用的是'solders'
            }))
        };
    }

    /**
     * 构建切换阵型指令
     * @param {number} roleId - 英雄ID
     * @param {number} formationType - 阵型类型（1攻击/2防守）
     * @returns {Object} 切换阵型行动指令
     */
    static buildFormAction(roleId, formationType) {
        if (!roleId || ![FORMATION_TYPES.ATTACK, FORMATION_TYPES.DEFENSE].includes(formationType)) {
            throw new Error('构建阵型指令参数错误：需要roleId和有效的阵型类型(1攻击/2防守)');
        }

        return {
            roleId: roleId,
            action: ACTION_TYPES.FORM,
            formationType: formationType
        };
    }

    /**
     * 构建获取增益效果指令
     * @param {number} buffType - buff类型的固定枚举值
     * @param {number} [roleId] - 当buffType为1001时需要指定的英雄ID
     * @returns {Object} 获取buff行动指令
     */
    static buildBuffAction(buffType, roleId = null) {
        if (typeof buffType !== 'number') {
            throw new Error('构建buff指令参数错误：buffType必须是数字');
        }

        const action = {
            action: ACTION_TYPES.BUFF,
            buffType: buffType
        };

        // 传国玉玺buff需要指定英雄
        if (buffType === 1001) {
            if (!roleId) {
                throw new Error('传国玉玺buff(1001)需要指定roleId');
            }
            action.roleId = roleId;
        }

        return action;
    }

    /**
     * 构建占领据点指令
     * @returns {Object} 占领据点行动指令
     */
    static buildOccupyAction() {
        return {
            action: ACTION_TYPES.AC
        };
    }

    /**
     * 构建攻打城寨指令
     * @param {number} roleId - 英雄ID
     * @param {Object} position - 攻打位置 {x, y}
     * @returns {Object} 攻打城寨行动指令
     */
    static buildSiegeAction(roleId, position) {
        if (!roleId || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            throw new Error('构建攻城指令参数错误：需要roleId和有效的position{x, y}');
        }

        return {
            roleId: roleId,
            action: ACTION_TYPES.SG,
            position: {
                x: position.x,
                y: position.y
            }
        };
    }

    /**
     * 构建普通攻击指令
     * @param {number} roleId - 英雄ID
     * @param {Object} position - 攻击位置 {x, y}
     * @returns {Object} 普通攻击行动指令
     */
    static buildAttackAction(roleId, position) {
        if (!roleId || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            throw new Error('构建攻击指令参数错误：需要roleId和有效的position{x, y}');
        }

        return {
            roleId: roleId,
            action: ACTION_TYPES.AD,
            position: {
                x: position.x,
                y: position.y
            }
        };
    }

    /**
     * 构建技能攻击指令
     * @param {number} roleId - 释放技能的英雄ID
     * @param {number} skillId - 技能ID
     * @param {Object} [position] - 技能释放位置 {x, y}（可选）
     * @param {number} [formType] - 诸葛亮二技能专用阵型类型
     * @param {Object} [teleportPosition] - 刘备二技能专用传送位置 {x, y}
     * @returns {Object} 技能攻击行动指令
     */
    static buildSkillAction(roleId, skillId, position = null, formType = null, teleportPosition = null) {
        if (!roleId || !skillId) {
            throw new Error('构建技能指令参数错误：需要roleId和skillId');
        }

        const action = {
            roleId: roleId,
            action: ACTION_TYPES.SK,
            skillId: skillId
        };

        // 添加可选参数
        if (position && typeof position.x === 'number' && typeof position.y === 'number') {
            action.position = {
                x: position.x,
                y: position.y
            };
        }

        // 诸葛亮二技能(4601)专用阵型参数
        if (skillId === 4601 && formType !== null) {
            action.formType = formType;
        }

        // 刘备二技能(4301)专用传送位置参数
        if (skillId === 4301 && teleportPosition) {
            if (typeof teleportPosition.x !== 'number' || typeof teleportPosition.y !== 'number') {
                throw new Error('刘备技能传送位置参数错误');
            }
            action.teleportPosition = {
                x: teleportPosition.x,
                y: teleportPosition.y
            };
        }

        return action;
    }

    /**
     * 批量构建行动指令
     * @param {Array<Object>} actionConfigs - 行动配置数组
     * 格式: [{type: 'MOVE', roleId: 40, position: {x: 1, y: 2}}, ...]
     * @returns {Array<Object>} 行动指令数组
     */
    static buildBatchActions(actionConfigs) {
        if (!Array.isArray(actionConfigs)) {
            throw new Error('批量构建行动需要配置数组');
        }

        const actions = [];

        for (const config of actionConfigs) {
            let action;

            switch (config.type) {
                case 'MOVE':
                    action = this.buildMoveAction(config.roleId, config.position);
                    break;
                case 'SP':
                    action = this.buildTeleportAction(config.roleId, config.position);
                    break;
                case 'PICK':
                    action = this.buildPickAction(config.roles);
                    break;
                case 'MAKE':
                    action = this.buildMakeAction(config.details);
                    break;
                case 'FORM':
                    action = this.buildFormAction(config.roleId, config.formationType);
                    break;
                case 'BUFF':
                    action = this.buildBuffAction(config.buffType, config.roleId);
                    break;
                case 'AC':
                    action = this.buildOccupyAction();
                    break;
                case 'SG':
                    action = this.buildSiegeAction(config.roleId, config.position);
                    break;
                case 'AD':
                    action = this.buildAttackAction(config.roleId, config.position);
                    break;
                case 'SK':
                    action = this.buildSkillAction(
                        config.roleId, 
                        config.skillId, 
                        config.position, 
                        config.formType, 
                        config.teleportPosition
                    );
                    break;
                default:
                    throw new Error(`未知的行动类型: ${config.type}`);
            }

            actions.push(action);
        }

        return actions;
    }

    /**
     * 验证行动指令格式是否正确
     * @param {Object} action - 行动指令对象
     * @returns {boolean} 是否有效
     */
    static validateAction(action) {
        if (!action || !action.action) {
            return false;
        }

        // 检查行动类型是否有效
        if (!Object.values(ACTION_TYPES).includes(action.action)) {
            return false;
        }

        // 根据行动类型验证必需字段
        switch (action.action) {
            case ACTION_TYPES.MOVE:
            case ACTION_TYPES.SP:
            case ACTION_TYPES.SG:
            case ACTION_TYPES.AD:
                return action.roleId && action.position && 
                       typeof action.position.x === 'number' && 
                       typeof action.position.y === 'number';

            case ACTION_TYPES.PICK:
                return Array.isArray(action.roles) && action.roles.length === 3;

            case ACTION_TYPES.MAKE:
                return Array.isArray(action.details) && action.details.length > 0;

            case ACTION_TYPES.FORM:
                return action.roleId && 
                       [FORMATION_TYPES.ATTACK, FORMATION_TYPES.DEFENSE].includes(action.formationType);

            case ACTION_TYPES.BUFF:
                return typeof action.buffType === 'number';

            case ACTION_TYPES.AC:
                return true; // AC指令不需要额外参数

            case ACTION_TYPES.SK:
                return action.roleId && action.skillId;

            default:
                return false;
        }
    }

    /**
     * 获取行动指令的描述文本
     * @param {Object} action - 行动指令对象
     * @returns {string} 描述文本
     */
    static getActionDescription(action) {
        if (!this.validateAction(action)) {
            return '无效行动';
        }

        const roleText = action.roleId ? `英雄${action.roleId}` : '';
        const posText = action.position ? `(${action.position.x},${action.position.y})` : '';

        switch (action.action) {
            case ACTION_TYPES.MOVE:
                return `${roleText}移动到${posText}`;
            case ACTION_TYPES.SP:
                return `${roleText}传送到${posText}`;
            case ACTION_TYPES.PICK:
                return `选择阵容: [${action.roles.join(', ')}]`;
            case ACTION_TYPES.MAKE:
                const makeDesc = action.details.map(d => 
                    `英雄${d.roleId}生产[${d.solders.join(',')}]`
                ).join(', ');
                return `生产兵力: ${makeDesc}`;
            case ACTION_TYPES.FORM:
                const formName = action.formationType === 1 ? '攻击' : '防守';
                return `${roleText}切换为${formName}阵型`;
            case ACTION_TYPES.BUFF:
                return `获取buff${action.buffType}${action.roleId ? `(目标:英雄${action.roleId})` : ''}`;
            case ACTION_TYPES.AC:
                return '占领据点';
            case ACTION_TYPES.SG:
                return `${roleText}攻打城寨${posText}`;
            case ACTION_TYPES.AD:
                return `${roleText}攻击${posText}`;
            case ACTION_TYPES.SK:
                return `${roleText}释放技能${action.skillId}${posText}`;
            default:
                return '未知行动';
        }
    }
}

export default ActionBuilder; 