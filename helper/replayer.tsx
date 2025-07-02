/**
 * 游戏AI战斗日志回放器
 * ===========================
 * 
 * 这是一个用于可视化AI战斗过程的React组件，主要功能包括：
 * - 解析游戏AI的文本日志，提取回合数据和代理状态
 * - 可视化地图和代理位置，显示血量条和状态信息
 * - 支持逐回合回放，可暂停、前进、后退
 * - 实时显示日志内容和代理行为描述
 * 
 * 技术特点：
 * - 基于React Hooks的状态管理
 * - 自定义日志解析器，支持多种日志格式
 * - Canvas渲染或SVG可视化（根据性能需求选择）
 * - 响应式设计，适配不同屏幕尺寸
 * 
 * @author AI可视化团队
 * @version 1.0.0
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TileType } from '../src/gameMap';
import { MapLayout } from '../src/mapData';

// --- 类型定义 (根据日志格式和需求细化) ---

/**
 * 位置坐标接口
 * 表示地图上的二维坐标点
 */
interface Position {
  x: number; // X坐标
  y: number; // Y坐标
}

/**
 * 代理快照接口
 * 记录某个时间点代理的完整状态信息
 */
interface AgentSnapshot {
  id: string;                      // 代理唯一标识符
  teamId?: string;                 // 所属队伍ID
  hp?: number;                     // 当前生命值
  maxHp?: number;                  // 最大生命值（用于显示血条）
  mana?: number;                   // 当前法力值
  position: Position;              // 当前位置坐标
  actionDescription?: string;      // 行为描述，例如 "移动至 (3,4)"
  isAlive: boolean;               // 是否存活
}

/**
 * 回合事件接口
 * 记录单个回合中发生的具体事件
 */
interface TurnEvent {
  agentId: string;                 // 执行事件的代理ID
  rawLog: string;                  // 原始日志行
  parsedAction?: {                 // 解析后的行为数据
    type: string;                  // 行为类型："MOVE", "ATTACK", "SKILL", "IDLE"
    from?: Position;               // 移动起点（仅移动事件）
    to?: Position;                 // 移动终点（仅移动事件）
    targetId?: string;             // 目标代理ID（攻击/技能事件）
    skillName?: string;            // 技能名称（技能事件）
    damage?: number;               // 伤害数值
    heal?: number;                 // 治疗数值
  };
  timestamp?: number;              // 事件时间戳，用于动画排序
}

/**
 * 回合数据接口
 * 包含整个回合的完整信息
 */
interface TurnData {
  turnNumber: number;                              // 回合编号
  events: TurnEvent[];                             // 回合内发生的所有事件，按顺序排列
  agentStatesAtEndOfTurn: Record<string, AgentSnapshot>; // 回合结束时所有代理的状态快照
  logLines: string[];                              // 本回合的原始日志行，用于显示
}

/**
 * 地图瓦片尺寸常量（像素）
 * 增大尺寸以便显示血条和状态信息
 */
const TILE_SIZE = 40;

// --- 日志解析函数 (核心功能，负责将文本日志转换为结构化数据) ---

/**
 * 解析游戏AI的文本日志，提取回合数据和代理状态变化
 * 
 * 支持的日志格式：
 * - 回合开始标记：'回合 X 开始'
 * - 代理行为日志：'[代理ID]: 行为描述'
 * - AI决策日志：'[AIController] 开始为 代理ID 的回合决策'
 * - 移动日志：'执行移动: 从 (x1,y1) 到 (x2,y2)'
 * - 攻击日志：'执行攻击: 目标 代理ID'
 * - 技能日志：'执行技能: 对 代理ID 使用 "技能名"'
 * - 血量变化：'代理ID 受到 X 点伤害, 剩余生命: Y'
 * 
 * @param logText 完整的游戏日志文本
 * @returns 解析后的回合数据数组
 */
const parseLog = (logText: string): TurnData[] => {
  const turns: TurnData[] = [];
  let currentTurnData: TurnData | null = null;
  const lines = logText.split('\n');

  const agentRegistry: Record<string, Partial<AgentSnapshot>> = {};

  const getAgent = (id: string): Partial<AgentSnapshot> => {
    if (!agentRegistry[id]) {
      // 尝试从ID中猜测队伍和设定默认最大HP
      let teamId = undefined;
      if (id.includes('英雄') || id.includes('法师')) {
        teamId = 'TeamA';
      }
      if (id.includes('战士') || id.includes('弓箭手')) {
        teamId = 'TeamB';
      }

      agentRegistry[id] = {
        id,
        isAlive: true,
        position: { x: -1, y: -1 },
        hp: 100, // 默认初始血量
        maxHp: id.toLowerCase().includes('warrior') || id.toLowerCase().includes('战士') ? 120 : 100, // 战士血厚点
        teamId: teamId
      };
    }
    return agentRegistry[id];
  };

  // 模拟从构造函数日志中提取初始状态
  // 例如: const hero = new MyTurnBasedAgent('英雄-阿尔法', 100, 100, { x: 1, y: 1 }, 'TeamA', teamABlackboard, 4, gameMapInstance);
  const agentConstructorRegex = /new MyTurnBasedAgent\('([^']*)',\s*(\d+),\s*(\d+),\s*{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*},\s*'([^']*)'/g;
  let match: RegExpExecArray | null;
  while((match = agentConstructorRegex.exec(logText)) !== null) {
    const id = match[1];
    const agent = getAgent(id);
    agent.hp = parseInt(match[2], 10);
    agent.maxHp = parseInt(match[2], 10); // 初始血量即为最大血量
    agent.mana = parseInt(match[3], 10);
    agent.position = { x: parseInt(match[4], 10), y: parseInt(match[5], 10) };
    agent.teamId = match[6];
    agent.isAlive = agent.hp > 0;
  }


  let currentAgentIdForLine: string | null = null; // 用于关联AIController决策和Agent行动

  for (const line of lines) {
    const turnStartMatch = line.match(/回合 (\d+) 开始/);
    if (turnStartMatch) {
      if (currentTurnData) turns.push(currentTurnData);
      currentTurnData = {
        turnNumber: parseInt(turnStartMatch[1], 10),
        events: [],
        agentStatesAtEndOfTurn: {},
        logLines: [line],
      };
      currentAgentIdForLine = null; // 每回合重置
      continue;
    }

    if (!currentTurnData) continue;
    currentTurnData.logLines.push(line);

    const agentLogPrefixMatch = line.match(/^\[([^()]+?)(?:\s\((Team\w+)\))?\]:/);
    if (agentLogPrefixMatch) {
      currentAgentIdForLine = agentLogPrefixMatch[1].trim(); // 捕获执行动作的Agent ID
      const agent = getAgent(currentAgentIdForLine);
      if (agentLogPrefixMatch[2] && !agent.teamId) {
        agent.teamId = agentLogPrefixMatch[2];
      }
    }


    const aiDecisionStartMatch = line.match(/\[AIController] 开始为 (\S+) 的回合决策.*?当前位置: (\d+),(\d+) 生命: (\d+)/);
    if (aiDecisionStartMatch) {
      currentAgentIdForLine = aiDecisionStartMatch[1]; // 这个是AI正在为哪个Agent决策
      const agent = getAgent(currentAgentIdForLine);
      agent.position = { x: parseInt(aiDecisionStartMatch[2], 10), y: parseInt(aiDecisionStartMatch[3], 10) };
      agent.hp = parseInt(aiDecisionStartMatch[4], 10);
      if (!agent.maxHp) agent.maxHp = agent.hp; // 如果之前没设定maxHp，用此时的hp作为maxHp
    }

    const moveMatch = line.match(/执行移动: 从 \((\d+),(\d+)\) 到 \((\d+),(\d+)\)/);
    if (moveMatch && currentAgentIdForLine) {
      const agent = getAgent(currentAgentIdForLine);
      const fromPos = { x: parseInt(moveMatch[1], 10), y: parseInt(moveMatch[2], 10) };
      const toPos = { x: parseInt(moveMatch[3], 10), y: parseInt(moveMatch[4], 10) };
      agent.position = toPos;
      agent.actionDescription = `移动至 (${toPos.x},${toPos.y})`;
      currentTurnData.events.push({
        agentId: currentAgentIdForLine,
        rawLog: line,
        parsedAction: { type: "MOVE", from: fromPos, to: toPos }
      });
    }

    const attackMatch = line.match(/执行攻击: 目标 ([^\s!]+)/);
    if (attackMatch && currentAgentIdForLine) {
      const agent = getAgent(currentAgentIdForLine);
      const targetId = attackMatch[1];
      agent.actionDescription = `攻击 ${targetId}`;
      currentTurnData.events.push({
        agentId: currentAgentIdForLine,
        rawLog: line,
        parsedAction: { type: "ATTACK", targetId }
      });
    }
    const skillUseMatch = line.match(/执行技能: 对 (\S+) 使用 "([^"]+)"/);
    if (skillUseMatch && currentAgentIdForLine) {
      const agent = getAgent(currentAgentIdForLine);
      const targetId = skillUseMatch[1];
      const skillName = skillUseMatch[2];
      agent.actionDescription = `对 ${targetId} 使用 ${skillName}`;
      currentTurnData.events.push({
        agentId: currentAgentIdForLine,
        rawLog: line,
        parsedAction: { type: "SKILL", targetId, skillName }
      });
    }

    // 统一处理伤害和治疗相关的血量更新
    // 例如: [英雄-阿尔法 (TeamA)]: 战士-X 受到 17 点伤害, 剩余生命: 83。
    // 例如: [法师-贝塔 (TeamA)]: 生命值恢复到 68。 (目标是自己)
    const hpChangeMatch = line.match(/(\S+?) (?:受到 (\d+) 点伤害, )?剩余生命: (\d+)/) || line.match(/生命值恢复到 (\d+)/);
    if (hpChangeMatch && currentAgentIdForLine) { // currentAgentIdForLine 是执行动作的Agent
      let targetAgentId = "";
      let newHp = 0;

      if (line.includes("受到")) { // 伤害日志
        targetAgentId = hpChangeMatch[1]; // 受伤者ID在信息中
        newHp = parseInt(hpChangeMatch[3], 10);
      } else if (line.includes("生命值恢复到")) { // 治疗自己
        targetAgentId = currentAgentIdForLine; // 治疗目标是自己
        newHp = parseInt(hpChangeMatch[1], 10); // 直接是恢复后的血量
      }

      if (targetAgentId) {
        const agent = getAgent(targetAgentId);
        agent.hp = newHp;
        if (!agent.maxHp) agent.maxHp = newHp > 100 ? newHp : 100; // 粗略设定maxHp
        if (newHp <= 0) agent.isAlive = false;
      }
    }


    const idleMatch = line.match(/执行"待命"动作/);
    if (idleMatch && currentAgentIdForLine) {
      const agent = getAgent(currentAgentIdForLine);
      agent.actionDescription = "待命";
      currentTurnData.events.push({
        agentId: currentAgentIdForLine,
        rawLog: line,
        parsedAction: { type: "IDLE" }
      });
    }

    const turnEndMatch = line.match(/回合 (\d+) 结束/);
    if (turnEndMatch && currentTurnData) {
      currentTurnData.agentStatesAtEndOfTurn = JSON.parse(JSON.stringify(agentRegistry));
    }
  }

  if (currentTurnData) turns.push(currentTurnData);

  // 确保所有在 registry 中的 agent 都有一个初始快照，即使它们在第一回合没有动作
  const allKnownAgentIds = Object.keys(agentRegistry);
  turns.forEach(turn => {
    allKnownAgentIds.forEach(id => {
      if (!turn.agentStatesAtEndOfTurn[id]) {
        // 如果某个 agent 在此回合没有更新，则从 registry 中取（可能是上一回合的状态）
        // 或者如果是第一回合且没有被构造函数初始化，则用一个默认值
        turn.agentStatesAtEndOfTurn[id] = JSON.parse(JSON.stringify(agentRegistry[id] || { id, hp: 0, maxHp:100, position:{x:-1,y:-1}, isAlive:false, teamId: "Unknown"}));
      }
      // 确保maxHp存在
      if (turn.agentStatesAtEndOfTurn[id] && !turn.agentStatesAtEndOfTurn[id].maxHp) {
        turn.agentStatesAtEndOfTurn[id].maxHp = turn.agentStatesAtEndOfTurn[id].hp > 100 ? turn.agentStatesAtEndOfTurn[id].hp : 100;
      }
    });
  });

  return turns;
};


// --- React 组件 ---
const AgentMarker: React.FC<{ agent: AgentSnapshot; isSelected?: boolean }> = ({ agent, isSelected }) => {
  if (!agent || !agent.isAlive || agent.hp === undefined) return null; // 增加 agent 和 hp 存在的检查

  const teamColor = agent.teamId === 'TeamA' ? 'rgba(0, 0, 255, 0.7)' : agent.teamId === 'TeamB' ? 'rgba(255, 0, 0, 0.7)' : 'rgba(128, 128, 128, 0.7)';
  const borderColor = agent.teamId === 'TeamA' ? 'blue' : agent.teamId === 'TeamB' ? 'red' : 'grey';
  const hpPercentage = agent.maxHp && agent.hp > 0 ? (agent.hp / agent.maxHp) * 100 : 0;

  return (
    <div
      title={`${agent.id} (HP: ${agent.hp}/${agent.maxHp || '?'})`}
      style={{
        position: 'absolute',
        left: agent.position.x * TILE_SIZE,
        bottom: agent.position.y * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
        transition: 'left 0.3s ease, bottom 0.3s ease',
        display: 'flex',
        flexDirection: 'column', // Stack elements vertically
        alignItems: 'center',
        justifyContent: 'flex-end', // Align HP bar to bottom
        boxSizing: 'border-box',
      }}
    >
      {/* Agent Circle */}
      <div
        style={{
          width: TILE_SIZE * 0.7,
          height: TILE_SIZE * 0.7,
          backgroundColor: teamColor,
          border: isSelected ? '2px solid yellow' : `1px solid ${borderColor}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
          fontWeight: 'bold',
          zIndex: 1, // Ensure circle is above HP bar background
        }}
      >
        {agent.id.substring(0, 2)}
      </div>
      {/* HP Bar Background */}
      <div style={{
        width: '90%',
        height: '5px',
        backgroundColor: '#555', // Dark background for HP bar
        borderRadius: '2px',
        marginTop: '2px',
        overflow: 'hidden', // Ensure HP fill stays within bounds
        zIndex: 0,
      }}>
        {/* HP Fill */}
        <div style={{
          width: `${hpPercentage}%`,
          height: '100%',
          backgroundColor: hpPercentage > 60 ? 'lightgreen' : hpPercentage > 30 ? 'orange' : 'red',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};


const MapView: React.FC<{ layout: TileType[][]; agents: Record<string, AgentSnapshot> }> = ({ layout, agents }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: layout[0].length * TILE_SIZE,
        height: layout.length * TILE_SIZE,
        border: '1px solid #ccc',
        backgroundColor: '#f0f0f0',
        overflow: 'hidden',
      }}
    >
      {layout.toReversed().map((row, y) =>
        row.map((tile, x) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: x * TILE_SIZE,
              bottom: y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
              backgroundColor: tile === TileType.Wall ? '#2e0000' : 'rgb(204,204,204)',
              border: '1px solid #FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        ))
      )}
      {Object.values(agents).map(agent => agent && <AgentMarker key={agent.id} agent={agent} />)}
    </div>
  );
};


const LogReplayer: React.FC = () => {
  const [logText, setLogText] = useState<string>('');
  const [parsedTurns, setParsedTurns] = useState<TurnData[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [currentAgentsState, setCurrentAgentsState] = useState<Record<string, AgentSnapshot>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);

  const handleParseLog = useCallback(() => {
    const turns = parseLog(logText);
    setParsedTurns(turns);
    setCurrentTurnIndex(0); // Start from the beginning
    if (turns.length > 0) {
      // For the very first display, use the state *after* the first turn's events have been processed.
      // Or more ideally, have a dedicated "initial setup state" before turn 1.
      // For now, using the end state of the first turn for simplicity if it exists.
      setCurrentAgentsState(turns[0]?.agentStatesAtEndOfTurn || {});
    } else {
      setCurrentAgentsState({});
    }
    console.log("Parsed Turns:", turns);
  }, [logText]);

  useEffect(() => {
    if (parsedTurns.length > 0 && currentTurnIndex < parsedTurns.length) {
      const turnData = parsedTurns[currentTurnIndex];
      setCurrentAgentsState(turnData.agentStatesAtEndOfTurn || currentAgentsState);
    }
    // If currentTurnIndex is 0 and parsedTurns[0] exists, it will be set above.
    // If currentTurnIndex goes out of bounds (e.g., after parsing new shorter log),
    // it should ideally be reset or handled, but this simple version doesn't.
  }, [currentTurnIndex, parsedTurns]); // Removed currentAgentsState from deps to avoid loops


  useEffect(() => {
    let timerId: number;
    if (isPlaying && currentTurnIndex < parsedTurns.length - 1) {
      timerId = window.setTimeout(() => {
        setCurrentTurnIndex(prev => prev + 1);
      }, playbackSpeed);
    }
    return () => clearTimeout(timerId);
  }, [isPlaying, currentTurnIndex, parsedTurns.length, playbackSpeed]);

  const currentTurnData = parsedTurns[currentTurnIndex];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        <h3>日志输入</h3>
        <textarea
          value={logText}
          onChange={(e) => setLogText(e.target.value)}
          rows={15}
          style={{ width: '100%', marginBottom: '10px', fontFamily: 'monospace' }}
          placeholder="在此粘贴游戏日志..."
        />
        <button onClick={handleParseLog} disabled={!logText.trim()}>解析日志并加载回放</button>

        <h3>回放控制</h3>
        <div>
          <button onClick={() => setCurrentTurnIndex(0)} disabled={parsedTurns.length === 0}>
            回到开头
          </button>
          <button onClick={() => setCurrentTurnIndex(prev => Math.max(0, prev - 1))} disabled={currentTurnIndex === 0 || parsedTurns.length === 0}>
            上一回合 ({(currentTurnData?.turnNumber ?? 0) > 1 ? (currentTurnData?.turnNumber ?? 0) -1 : '-'})
          </button>
          <button onClick={() => setIsPlaying(prev => !prev)} disabled={parsedTurns.length === 0}>
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button
            onClick={() => setCurrentTurnIndex(prev => Math.min(parsedTurns.length - 1, prev + 1))}
            disabled={currentTurnIndex >= parsedTurns.length - 1 || parsedTurns.length === 0}
          >
            下一回合 ({(currentTurnData?.turnNumber ?? 0) + 1})
          </button>
          <label style={{ marginLeft: '10px' }}>
            速度:
            <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
              <option value={2000}>慢 (2s/回合)</option>
              <option value={1000}>正常 (1s/回合)</option>
              <option value={500}>快 (0.5s/回合)</option>
              <option value={250}>很快 (0.25s/回合)</option>
            </select>
          </label>
        </div>
        <p>当前回合: {currentTurnData?.turnNumber ?? 'N/A'} / {parsedTurns.length > 0 ? parsedTurns[parsedTurns.length-1].turnNumber : 'N/A'}</p>
      </div>

      <div style={{ flex: 2 }}>
        <h3>地图视图</h3>
        {parsedTurns.length > 0 ? (
          <MapView layout={MapLayout} agents={currentAgentsState} />
        ) : (
          <p>请先加载并解析日志。</p>
        )}
      </div>

      <div style={{ flex: 1.5, maxHeight: '80vh', overflowY: 'auto', borderLeft: '1px solid #eee', paddingLeft: '10px' }}>
        <h3>当前回合日志 ({currentTurnData?.turnNumber ?? 'N/A'})</h3>
        {currentTurnData?.logLines.map((line, index) => (
          <pre key={index} style={{ margin: '2px 0', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'transparent' }}>{line}</pre>
        ))}
      </div>
    </div>
  );
};

export default LogReplayer;