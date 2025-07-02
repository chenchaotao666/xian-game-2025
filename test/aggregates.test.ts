/**
 * 聚合函数测试套件
 * ==================
 * 
 * 测试所有效用AI系统中使用的聚合方法，确保：
 * - 边界条件处理正确（空数组、零值、负值）
 * - 数学计算精确性
 * - MIN_SCORE机制的正确应用
 * - 错误处理和回退逻辑
 * 
 * 覆盖的聚合方法：
 * - 平均值聚合：基础的算术平均
 * - 加权平均聚合：根据权重调整的平均值
 * - 乘积聚合：要求所有条件满足的严格模式
 * - 最小值聚合：木桶原理，最弱环节决定结果
 * - 最大值聚合：只要有一个条件优秀就足够
 * 
 * @author AI测试团队
 * @version 1.0.0
 */

// aggregates.test.ts
import {
  getAverageAggregate,
  getWeightedAverageAggregate,
  getProductAggregate,
  getMinAggregate,
  getMaxAggregate,
  MIN_SCORE, // 从模块导入更新后的 MIN_SCORE
} from '../src/aggregators'; // 确保路径正确

describe('带MIN_SCORE保护的聚合函数测试 (MIN_SCORE = 0.0001)', () => {
  let consoleWarnSpy: jest.SpyInstance;

  // 每个测试前设置mock，捕获控制台警告
  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
    });
  });

  // 每个测试后清理mock
  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('平均值聚合测试', () => {
    const averageAggregate = getAverageAggregate();

    it('空数组应返回MIN_SCORE保护值', () => {
      expect(averageAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('正确计算分数的算术平均值', () => {
      expect(averageAggregate([10, 20, 30])).toBe(20);
      expect(averageAggregate([0.0003, 0.0006, 0.0009])).toBeCloseTo(0.0006);
    });
  });

  describe('加权平均聚合测试', () => {
    it('空分数数组应返回MIN_SCORE保护值', () => {
      const weightedAverage = getWeightedAverageAggregate([1, 1]);
      expect(weightedAverage([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('正确计算加权平均值', () => {
      const weightedAverage = getWeightedAverageAggregate([1, 2, 3]);
      expect(weightedAverage([0.0001, 0.0002, 0.0003])).toBeCloseTo(
        (0.0001 + 0.0002 * 2 + 0.0003 * 3) / (1 + 2 + 3)
      ); // (0.0001 + 0.0004 + 0.0009) / 6 = 0.0014 / 6 = 0.0002333...
    });

    it('权重缺失时应回退到简单平均值并发出警告', () => {
      // @ts-ignore: 测试权重缺失的场景
      const weightedAverage = getWeightedAverageAggregate(null);
      expect(weightedAverage([10, 20, 30])).toBe(20);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '加权平均：权重数组缺失或与分数长度不匹配。回退到简单平均值。'
      );
    });

    it('权重长度不匹配时应回退到简单平均值', () => {
      const weightedAverage = getWeightedAverageAggregate([1, 2]);
      expect(weightedAverage([10, 20, 30])).toBe(20); // (10+20+30)/3
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '加权平均：权重数组缺失或与分数长度不匹配。回退到简单平均值。'
      );
    });

    it('权重无效且分数为空时应正确返回MIN_SCORE', () => {
      // 这是一个复杂情况：权重无效时回退到简单平均
      // 如果分数也为空，简单平均应该返回MIN_SCORE
      // getWeightedAverageAggregate中的初始检查 `if (scores.length === 0)` 处理这种情况
      const weightedAverageNull = getWeightedAverageAggregate(null as any);
      expect(weightedAverageNull([])).toBe(MIN_SCORE);
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // 初始空检查应阻止此处的警告

      const weightedAverageMismatch = getWeightedAverageAggregate([1]); // 权重长度1，分数长度0
      expect(weightedAverageMismatch([])).toBe(MIN_SCORE);
      // 如果scores.length > 0但权重不匹配则应发出警告
      // 但如果scores.length === 0，主要的MIN_SCORE返回优先
    });

    it('总权重为0时应返回0', () => {
      const weightedAverage = getWeightedAverageAggregate([0, 0, 0]);
      expect(weightedAverage([10, 20, 30])).toBe(0);
    });
  });

  describe('乘积聚合测试', () => {
    const productAggregate = getProductAggregate();

    it('空数组应返回MIN_SCORE保护值', () => {
      expect(productAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('正确计算分数的乘积', () => {
      expect(productAggregate([2, 3, 4])).toBe(24);
      expect(productAggregate([1, 10, 0.5])).toBe(5);
      expect(productAggregate([0.1, 0.01])).toBe(0.001); // 0.001 > MIN_SCORE (0.0001)
    });

    it('乘积低于MIN_SCORE时应返回MIN_SCORE保护值', () => {
      expect(productAggregate([0.5, 0.001])).toBe(0.0005); // 0.0005 > MIN_SCORE
      expect(productAggregate([0.5, 0.0001])).toBe(MIN_SCORE); // 0.5 * 0.0001 = 0.00005 <= MIN_SCORE
      expect(productAggregate([0.1, 0.001])).toBe(MIN_SCORE);   // 0.1 * 0.001 = 0.0001 <= MIN_SCORE
      expect(productAggregate([2, 0.00001])).toBe(MIN_SCORE); // 2 * 0.00001 = 0.00002 <= MIN_SCORE
      expect(productAggregate([10, 0.02, 0.00004])).toBe(MIN_SCORE); // 10*0.02=0.2; 0.2*0.00004 = 0.000008 <= MIN_SCORE
    });

    it('任何分数为0时乘积变为0（<= MIN_SCORE）应返回MIN_SCORE', () => {
      expect(productAggregate([5, 0, 10])).toBe(MIN_SCORE);
    });

    it('单个分数的情况', () => {
      expect(productAggregate([5])).toBe(5);
      expect(productAggregate([0.001])).toBe(0.001); // 0.001 > MIN_SCORE
      expect(productAggregate([0.0001])).toBe(MIN_SCORE); // 0.0001 <= MIN_SCORE
      expect(productAggregate([0.00001])).toBe(MIN_SCORE); // 0.00001 <= MIN_SCORE
    });

    it('包含MIN_SCORE因子时应正确计算或返回保护值', () => {
      expect(productAggregate([2, MIN_SCORE])).toBe(2 * MIN_SCORE); // 2 * 0.0001 = 0.0002. (0.0002 > MIN_SCORE)
      expect(productAggregate([0.5, MIN_SCORE])).toBe(MIN_SCORE); // 0.5 * 0.0001 = 0.00005. (0.00005 <= MIN_SCORE)
    });
  });

  describe('最小值聚合测试', () => {
    const minAggregate = getMinAggregate();

    it('空数组应返回MIN_SCORE保护值', () => {
      expect(minAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('最小分数大于MIN_SCORE时应返回最小分数', () => {
      expect(minAggregate([10, 5, 20])).toBe(5);
      expect(minAggregate([MIN_SCORE + 0.0001, MIN_SCORE + 1])).toBe(MIN_SCORE + 0.0001); // 0.0002
    });

    it('最小分数小于MIN_SCORE时应返回MIN_SCORE保护值', () => {
      expect(minAggregate([10, MIN_SCORE - 0.00001, 20])).toBe(MIN_SCORE); // min是0.00009, max(0.0001, 0.00009) = 0.0001
      expect(minAggregate([-5, -10, -1])).toBe(MIN_SCORE); // min是-10, max(0.0001, -10) = 0.0001
    });

    it('最小分数等于MIN_SCORE时应返回MIN_SCORE', () => {
      expect(minAggregate([10, MIN_SCORE, 20])).toBe(MIN_SCORE);
    });

    it('单个分数的情况', () => {
      expect(minAggregate([100])).toBe(100);
      expect(minAggregate([MIN_SCORE])).toBe(MIN_SCORE);
      expect(minAggregate([MIN_SCORE - 1])).toBe(MIN_SCORE); // 例如-0.9999, max(0.0001, -0.9999) = 0.0001
    });
  });

  describe('最大值聚合测试', () => {
    const maxAggregate = getMaxAggregate();

    it('空数组应返回MIN_SCORE保护值', () => {
      expect(maxAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('正确返回数组中的最大分数', () => {
      expect(maxAggregate([0.00001, 0.00005, 0.00002])).toBe(0.00005);
      expect(maxAggregate([MIN_SCORE, MIN_SCORE + 0.0001, MIN_SCORE + 0.00005])).toBe(MIN_SCORE + 0.0001); // 0.0002
    });

    it('单个分数的情况', () => {
      expect(maxAggregate([0.00005])).toBe(0.00005);
      expect(maxAggregate([MIN_SCORE])).toBe(MIN_SCORE);
    });

    it('即使最大值小于MIN_SCORE也应正确返回最大值（基于当前实现）', () => {
      expect(maxAggregate([MIN_SCORE - 0.001, MIN_SCORE - 0.0005])).toBe(MIN_SCORE - 0.0005); // 例如max(-0.0009, -0.0004) = -0.0004
      expect(maxAggregate([-0.001, -0.01, -0.1])).toBe(-0.001);
    });
  });
});