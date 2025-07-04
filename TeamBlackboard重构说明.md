# TeamBlackboard 重构说明

## 重构概述

根据用户要求，对 `src/core/TeamBlackboard.ts` 进行了数据结构重构，主要目标是：

1. 根据全局策略（globalStrategy）存储对应的数据
2. 不同策略类型存储不同类型的数据
3. 使用数组保存历史目标记录
4. 移除了 `addObjective` 方法

## 主要变更

### 1. 新增策略数据结构

```typescript
// 集火目标数据
interface FocusTargetData {
  targetId: number;
  targetType: 'enemy_hero' | 'city' | 'stronghold';
  priority: number;
  reason: string;
  expectedDamage?: number;
  canEliminate?: boolean;
  participatingHeroes: number[];
  setAt: number; // 设置时的回合数
}

// 城寨攻击目标数据
interface CityAttackData {
  cityId: number;
  cityType: string;
  position: { x: number; y: number } | null;
  healthPercentage: number;
  distance: number;
  priority: number;
  safetyScore: number;
  recommendedHeroes: number[];
  reason: string;
  setAt: number;
}

// 敌方攻击目标数据
interface EnemyAttackData {
  targetEnemyId: number;
  enemyPosition: { x: number; y: number } | null;
  powerComparison: number;
  avgDistance: number;
  priority: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  setAt: number;
}

// 集合位置数据
interface GatherPositionData {
  position: { x: number; y: number };
  reason: string;
  participatingHeroes: number[];
  estimatedTime: number; // 预计集合所需回合数
  purpose: string; // 集合目的
  setAt: number;
}

// 龙旗占领数据
interface FlagCaptureData {
  flagPosition: { x: number; y: number };
  controlStatus: 'OURS' | 'ENEMY' | 'NEUTRAL';
  distance: number;
  risk: number;
  recommendedHeroes: number[];
  reason: string;
  setAt: number;
}

// 历史策略记录
interface StrategyHistoryEntry {
  round: number;
  strategy: StrategyType;
  priority: number;
  confidence: number;
  reason: string;
  data: any; // 对应策略的具体数据
  result?: 'SUCCESS' | 'FAILED' | 'INTERRUPTED'; // 执行结果
}
```

### 2. 核心方法重构

**新增核心方法：**
- `setGlobalStrategy()` - 设置全局策略及对应数据
- `getCurrentStrategy()` - 获取当前策略
- `getCurrentStrategyData()` - 获取当前策略数据
- `recordStrategyResult()` - 记录策略执行结果
- `clearStrategyData()` - 清除指定策略数据

**策略数据获取方法：**
- `getFocusTarget()` - 获取集火目标
- `getCityAttackTarget()` - 获取城寨攻击目标
- `getEnemyAttackTarget()` - 获取敌方攻击目标
- `getGatherPosition()` - 获取集合位置
- `getFlagCaptureTarget()` - 获取龙旗占领目标

**历史记录方法：**
- `getStrategyHistory()` - 获取完整策略历史
- `getRecentStrategyHistory()` - 获取最近N个策略记录

**移除的方法：**
- `addObjective()` - 已移除
- `removeObjective()` - 已移除
- `getHighestPriorityObjective()` - 已移除
- `getAllObjectives()` - 已移除
- `analyzeGameState()` - 已移除（分析逻辑转移到StrategyAnalysis）

### 3. 数据存储逻辑

根据策略类型自动存储对应数据：

```typescript
switch (strategy) {
  case StrategyType.FOCUS_FIRE:
    // 存储集火目标数据
    this.focusTarget = { ... };
    break;
    
  case StrategyType.ATTACK_CITY:
    // 存储城寨攻击数据
    this.cityAttackTarget = { ... };
    break;
    
  case StrategyType.ATTACK_ENEMY:
    // 存储敌方攻击数据
    this.enemyAttackTarget = { ... };
    break;
    
  case StrategyType.GATHER_FORCES:
    // 存储集合位置数据
    this.gatherPosition = { ... };
    break;
    
  case StrategyType.CAPTURE_FLAG:
    // 存储龙旗占领数据
    this.flagCaptureTarget = { ... };
    break;
}
```

### 4. 历史记录功能

- 自动记录每次策略变更
- 支持策略执行结果记录（SUCCESS/FAILED/INTERRUPTED）
- 保持最近20条历史记录
- 当策略变更时，自动将上一个策略标记为INTERRUPTED

## 使用示例

```typescript
// 设置集火策略
const focusFireData = {
  primaryTargetId: 2,
  priority: 90,
  reason: '敌方血量较低，适合集火',
  expectedDamage: 60,
  canEliminate: true,
  secondaryTargets: [1]
};

blackboard.setGlobalStrategy(
  StrategyType.FOCUS_FIRE,
  focusFireData,
  90,
  85,
  '敌方血量较低，适合集火攻击'
);

// 获取当前策略信息
const currentStrategy = blackboard.getCurrentStrategy(); // FOCUS_FIRE
const focusTarget = blackboard.getFocusTarget(); // 集火目标详细数据

// 记录执行结果
blackboard.recordStrategyResult('SUCCESS');

// 查看历史记录
const history = blackboard.getRecentStrategyHistory(5);
```

## 兼容性

为保持向后兼容性，保留了以下方法：
- `setFocusTarget()` - 兼容旧接口
- `getFocusTargetId()` - 兼容旧接口
- `setTargetDebuff()` - 保持不变
- `getTargetDebuffInfo()` - 保持不变

## 测试覆盖

重构后的代码包含完整的单元测试，覆盖：
- 策略设置和获取
- 数据存储验证
- 历史记录功能
- 错误处理
- 兼容性接口

所有测试通过，确保重构的稳定性和正确性。 