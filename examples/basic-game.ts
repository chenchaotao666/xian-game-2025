import XianGame from '../src/Game';
import type { GameResult, GameConfig } from '../src/types/index';

/**
 * 基础游戏示例 (TypeScript版本)
 * 演示两个AI之间的对战
 */
async function runBasicGame(): Promise<GameResult> {
    console.log('=== 三国策略对战游戏示例 ===\n');
    
    // 创建游戏实例
    const game = new XianGame({
        player1Type: 'ai',
        player2Type: 'ai',
        ai1Difficulty: 'normal',
        ai2Difficulty: 'hard',
        autoPlay: true,
        gameSpeed: 'normal',
        logLevel: 'info',
        renderMode: 'console'
    });
    
    try {
        // 开始游戏
        const result = await game.startGame();
        
        // 显示游戏结果
        console.log('\n=== 游戏结果 ===');
        console.log(`获胜者: ${result.winner ? `玩家${result.winner.id}` : '平局'}`);
        console.log(`胜利原因: ${result.winReason}`);
        console.log(`总回合数: ${result.totalTurns}`);
        console.log(`游戏时长: ${(result.duration / 1000).toFixed(2)}秒`);
        
        return result;
        
    } catch (error) {
        console.error('游戏运行失败:', (error as Error).message);
        throw error;
    }
}

/**
 * 高级游戏示例
 * 演示不同难度AI的对战性能
 */
async function runAdvancedExample(): Promise<Array<{
    player1Difficulty: string;
    player2Difficulty: string;
    winner?: number;
    turns: number;
    duration: number;
}>> {
    console.log('\n=== 高级示例：不同难度AI对战 ===\n');
    
    const difficulties = ['easy', 'normal', 'hard', 'expert'];
    const results: Array<{
        player1Difficulty: string;
        player2Difficulty: string;
        winner?: number;
        turns: number;
        duration: number;
    }> = [];
    
    // 每个难度对战3场
    for (let i = 0; i < difficulties.length; i++) {
        for (let j = i + 1; j < difficulties.length; j++) {
            const diff1 = difficulties[i];
            const diff2 = difficulties[j];
            
            console.log(`\n${diff1} vs ${diff2}:`);
            
            const game = new XianGame({
                player1Type: 'ai',
                player2Type: 'ai',
                ai1Difficulty: diff1,
                ai2Difficulty: diff2,
                autoPlay: true,
                gameSpeed: 'fast',
                logLevel: 'warn',
                renderMode: 'console'
            });
            
            try {
                const result = await game.startGame();
                results.push({
                    player1Difficulty: diff1,
                    player2Difficulty: diff2,
                    winner: result.winner?.id,
                    turns: result.totalTurns,
                    duration: result.duration
                });
                
                const winnerDiff = result.winner?.id === 1 ? diff1 : diff2;
                console.log(`  结果: ${winnerDiff || '平局'} 获胜 (${result.totalTurns}回合)`);
                
            } catch (error) {
                console.error(`  游戏出错: ${(error as Error).message}`);
            }
        }
    }
    
    // 分析结果
    console.log('\n=== 对战结果分析 ===');
    results.forEach(r => {
        const winner = r.winner ? `玩家${r.winner}` : '平局';
        const winnerDiff = r.winner === 1 ? r.player1Difficulty : r.player2Difficulty;
        console.log(`${r.player1Difficulty} vs ${r.player2Difficulty}: ${winner} (${winnerDiff}) - ${r.turns}回合`);
    });
    
    return results;
}

/**
 * 批量测试示例
 * 用于AI性能评估
 */
async function runBatchTest(): Promise<GameResult[]> {
    console.log('\n=== 批量测试示例 ===\n');
    
    // 运行20场normal vs hard的对战
    const results = await XianGame.runBatch(20, {
        player1Type: 'ai',
        player2Type: 'ai',
        ai1Difficulty: 'normal',
        ai2Difficulty: 'hard',
        autoPlay: true
    });
    
    return results;
}

/**
 * 性能测试示例
 */
async function runPerformanceTest(): Promise<{ results: GameResult[]; totalTime: number }> {
    console.log('\n=== 性能测试示例 ===\n');
    
    const startTime = Date.now();
    
    // 运行10场快速游戏
    const results = await XianGame.runBatch(10, {
        player1Type: 'ai',
        player2Type: 'ai',
        ai1Difficulty: 'expert',
        ai2Difficulty: 'expert',
        gameSpeed: 'instant',
        renderMode: 'headless'
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n性能统计:`);
    console.log(`总耗时: ${(totalTime / 1000).toFixed(2)}秒`);
    console.log(`平均每场: ${(totalTime / 10).toFixed(0)}毫秒`);
    
    return { results, totalTime };
}

/**
 * 交互式示例
 * 允许用户控制游戏进程
 */
async function runInteractiveExample(): Promise<XianGame> {
    console.log('\n=== 交互式游戏示例 ===\n');
    
    const game = new XianGame({
        player1Type: 'ai',
        player2Type: 'ai',
        ai1Difficulty: 'normal',
        ai2Difficulty: 'normal',
        autoPlay: false,  // 不自动进行
        gameSpeed: 'normal',
        logLevel: 'info',
        renderMode: 'console'
    });
    
    // 启动游戏但不自动进行
    await game.startGame();
    
    console.log('游戏已启动，可以手动控制回合...');
    console.log('使用 game.executeSingleTurn() 执行单回合');
    console.log('使用 game.pauseGame() / game.resumeGame() 暂停/恢复');
    console.log('使用 game.getGameState() 查看游戏状态');
    
    // 执行几个回合作为示例
    for (let i = 0; i < 5; i++) {
        console.log(`\n执行第${i + 1}个手动回合...`);
        await game.executeSingleTurn();
        
        // 显示简化状态
        const state = game.getGameState();
        if (state.gameEngine.gameState === 'finished') {
            console.log('游戏已结束！');
            break;
        }
    }
    
    return game;
}

/**
 * 主函数 - 运行所有示例
 */
async function main(): Promise<void> {
    try {
        console.log('开始运行三国策略游戏示例...\n');
        
        // 1. 基础游戏
        await runBasicGame();
        
        // 2. 高级示例
        await runAdvancedExample();
        
        // 3. 批量测试
        await runBatchTest();
        
        // 4. 性能测试
        await runPerformanceTest();
        
        // 5. 交互式示例
        await runInteractiveExample();
        
        console.log('\n✅ 所有示例运行完成！');
        
    } catch (error) {
        console.error('❌ 示例运行错误:', (error as Error).message);
        console.error('堆栈信息:', (error as Error).stack);
    }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export {
    runBasicGame,
    runAdvancedExample,
    runBatchTest,
    runPerformanceTest,
    runInteractiveExample
}; 