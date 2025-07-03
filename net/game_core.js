import { GameMap } from './worldState.js';
import { getActions } from './action.js';
import { getPlayerState } from './actions/contextData.js';

const HEAD_LEN = 5;
/**
 * @type {GameMap}
 */
let gameMap;
let _players;
let _playId;
let buffer;

export function loop(client, dataBuffer) {
  if (!buffer) {
    buffer = Buffer.from([]);
  }
  //合并
  buffer = Buffer.concat([buffer, dataBuffer]);
  if (buffer.length < HEAD_LEN) {
    console.log(`package len ${buffer.length} less than head len..`);
    return;
  }
  const head_pack = buffer.slice(0, HEAD_LEN);
  const body_size = Number(head_pack);
  //分包
  if (buffer.length < HEAD_LEN + body_size) {
    console.log(`package not complete ${buffer.length} Bytes for all ${HEAD_LEN + body_size} Bytes, continue to receive..`);
    return;
  }
  const res = buffer.slice(HEAD_LEN, buffer.length);
  round(client, res);
  //黏包
  buffer = buffer.slice(HEAD_LEN + body_size);
}

export function setPlayerId(id) {
  _playId = id;
}

export function start(client) {
  const paramsObj = {
    'msg_name': 'registration',
    'msg_data': {
      'playerId': _playId,
      'playerName': 'ODRS必胜',
      'version': 'v0.0.1',
    },
  };
  const paramsJSON = JSON.stringify(paramsObj);
  const num = calculateJSONLength(paramsJSON);
  client.write(num + paramsJSON);
}

function round(client, data) {
  const dataObj = JSON.parse(data.toString());
  console.log('round----: ', dataObj.msg_data.round);
  console.log(dataObj);
  if (dataObj) {
    if (dataObj.msg_name === 'start') {
      ready(client, dataObj.msg_data);
    } else if (dataObj.msg_name === 'inquire') {
      run(client, dataObj.msg_data);
    } else if (dataObj.msg_name === 'over') {
      over(client, dataObj.msg_data);
    }
  }
}

function ready(client, response) {
  const { data, maxX, maxY } = response.map;
  globalThis.gameMap = new GameMap(data, maxX, maxY);
  _players = response.players;
  const paramsObj = {
    'msg_name': 'ready',
    'msg_data': {
      'playerId': _playId,
    },
  };
  const paramsJSON = JSON.stringify(paramsObj);
  const num = calculateJSONLength(paramsJSON);
  client.write(num + paramsJSON);
}

function run(client, data) {
  const state = getPlayerState(data, _playId);
  globalThis.gameMap.updateMap(data);
  const paramsObj = {
    'msg_name': 'action',
    'msg_data': {
      'round': data.round,
      'playerId': _playId,
      'action': getActions(data, gameMap, state),
    },
  };
  const paramsJSON = JSON.stringify(paramsObj);
  const num = calculateJSONLength(paramsJSON);
  client.write(num + paramsJSON);
}

function over(client, data) {

}

function getByteLength(str) {
  // 创建一个新的 TextEncoder 实例
  const encoder = new TextEncoder('utf-8');
  // 使用 TextEncoder 将字符串编码为 Uint8Array
  const uint8array = encoder.encode(str);
  // Uint8Array 的长度就是字节长度
  return uint8array.length;
}

/**
 * 获取json字符串的长度，固定为5个字符，不足5位前面补填0。
 * @param {*} data json字符串
 * @returns
 */
function calculateJSONLength(data) {
  if ((typeof data == 'string') && data.constructor === String) {
    let res = '0';
    const byteLength = getByteLength(data);
    const zeroLength = 5 - `${byteLength}`.length;
    if (zeroLength >= 0) {
      res = res.repeat(zeroLength);
      return `${res}${byteLength}`;
    }
    return byteLength;
  }
  return false;
}
