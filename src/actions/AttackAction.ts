import { ActionContext } from "../core/types";

/**
 * 基础攻击动作
 * 执行基础攻击策略
 */
export function AttackAction(context: ActionContext): void {
  const { agent } = context;
  
  if (agent.visibleEnemies.length > 0) {
    const target = agent.visibleEnemies[0];
    agent.performAttack(target);
    agent.log(`段颖执行基础攻击 ${target.id}`);
  } else {
    agent.performIdle();
    agent.log(`段颖未发现敌人，待机中`);
  }
}