import net from 'net';
import { start, setPlayerId, loop } from './game_core.js';

let params = process.argv.splice(2);        // 参数数组
let ip = '';
let port = '';
let id = '';
let isConnect = false;

params.forEach((item, index) => {
  if (item === '-l') {
    ip = params[index + 1];
  }
  if (item === '-p') {
    port = params[index + 1];
  }
  if (item === '-i') {
    id = Number(params[index + 1]);
  }
});
console.log(ip);
console.log(port);
console.log(id);
setPlayerId(id);

const initConnect = () => {
  console.log('正在启动连接，请稍后');
  const client = net.createConnection({
    host: ip,//服务器IP
    port: port,//服务器端口
  });
  client.on('connect', function () {
    console.log('与服务器连接成功');
    isConnect = true;
    start(client);
  });
  client.on('data', function (data) {
    loop(client, data);
  });
  client.on('end', function (data) {
    console.log('end', data?.toString());
  });
  client.on('error', function (data) {
    console.log('error', data?.toString());
  });
};

const timer = setInterval(() => {
  if (!isConnect) {
    initConnect();
  } else {
    clearInterval(timer);
  }
}, 3000);
