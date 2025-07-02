/**
 * 日志回放器应用入口文件
 * 用于启动游戏AI战斗日志的可视化回放工具
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import LogReplayer from './replayer';

// 获取根DOM元素并渲染日志回放器组件
const element = document.getElementById('root');
createRoot(element).render(<LogReplayer />);