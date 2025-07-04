import { BehaviorTreeAgent } from "../src/bt/BehaviorTreeAgent";
import * as actions from "../src/actions";
import * as conditions from "../src/conditions";

describe('BehaviorTreeAgent', () => {
  it('should be contains all actions and conditions', () => {
    /** @ts-ignore */
    const agent = new BehaviorTreeAgent(null, null, null);
    console.log(agent);
    expect(agent).toBeDefined();
    Object.keys(actions).forEach(actionName => {
      const nodeName = agent.toPascalCase(actionName);
      if (agent[nodeName]) {
        expect(agent[nodeName]).toBeDefined();
      } else {
        throw new Error(`action ${actionName} not found`);
      }
    });
    Object.keys(conditions).forEach(conditionName => {
      const nodeName = agent.toPascalCase(conditionName);
      if (agent[nodeName]) {
        expect(agent[nodeName]).toBeDefined();
      } else {
        throw new Error(`condition ${conditionName} not found`);
      }
    });
  });
});
