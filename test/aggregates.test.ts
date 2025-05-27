// aggregates.test.ts
import {
  getAverageAggregate,
  getWeightedAverageAggregate,
  getProductAggregate,
  getMinAggregate,
  getMaxAggregate,
  MIN_SCORE, // 从模块导入更新后的 MIN_SCORE
} from '../src/aggregators'; // 确保路径正确

describe('Aggregation Functions with MIN_SCORE = 0.0001', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('getAverageAggregate', () => {
    const averageAggregate = getAverageAggregate();

    it('should return MIN_SCORE for an empty array', () => {
      expect(averageAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('should calculate the average of scores', () => {
      expect(averageAggregate([10, 20, 30])).toBe(20);
      expect(averageAggregate([0.0003, 0.0006, 0.0009])).toBeCloseTo(0.0006);
    });
  });

  describe('getWeightedAverageAggregate', () => {
    it('should return MIN_SCORE for an empty scores array', () => {
      const weightedAverage = getWeightedAverageAggregate([1, 1]);
      expect(weightedAverage([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('should calculate the weighted average correctly', () => {
      const weightedAverage = getWeightedAverageAggregate([1, 2, 3]);
      expect(weightedAverage([0.0001, 0.0002, 0.0003])).toBeCloseTo(
        (0.0001 + 0.0002 * 2 + 0.0003 * 3) / (1 + 2 + 3)
      ); // (0.0001 + 0.0004 + 0.0009) / 6 = 0.0014 / 6 = 0.0002333...
    });

    it('should fall back to simple average if weights are not provided', () => {
      // @ts-ignore: Testing missing weights scenario
      const weightedAverage = getWeightedAverageAggregate(null);
      expect(weightedAverage([10, 20, 30])).toBe(20);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WeightedAverage: Weights array is missing or does not match scores length. Falling back to simple average.'
      );
    });

    it('should fall back to simple average if weights length does not match scores length and scores is not empty', () => {
      const weightedAverage = getWeightedAverageAggregate([1, 2]);
      expect(weightedAverage([10, 20, 30])).toBe(20); // (10+20+30)/3
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'WeightedAverage: Weights array is missing or does not match scores length. Falling back to simple average.'
      );
    });

    it('should correctly fall back to simple average even if scores array for simple average would be empty (returns MIN_SCORE)', () => {
      // This case is tricky: if weights are invalid, it falls back to simple average.
      // If scores is also empty for that simple average, it should return MIN_SCORE.
      // The initial check `if (scores.length === 0)` in getWeightedAverageAggregate handles this.
      const weightedAverageNull = getWeightedAverageAggregate(null as any);
      expect(weightedAverageNull([])).toBe(MIN_SCORE);
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // The initial empty check should prevent the warning here

      const weightedAverageMismatch = getWeightedAverageAggregate([1]); // weights length 1, scores length 0
      expect(weightedAverageMismatch([])).toBe(MIN_SCORE);
      // Warning *should* be called if scores.length > 0 but weights mismatch,
      // but if scores.length === 0, the primary MIN_SCORE return takes precedence.
    });


    it('should return 0 if total weight is 0', () => {
      const weightedAverage = getWeightedAverageAggregate([0, 0, 0]);
      expect(weightedAverage([10, 20, 30])).toBe(0);
    });
  });

  describe('getProductAggregate', () => {
    const productAggregate = getProductAggregate();

    it('should return MIN_SCORE for an empty array', () => {
      expect(productAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('should calculate the product of scores', () => {
      expect(productAggregate([2, 3, 4])).toBe(24);
      expect(productAggregate([1, 10, 0.5])).toBe(5);
      expect(productAggregate([0.1, 0.01])).toBe(0.001); // 0.001 > MIN_SCORE (0.0001)
    });

    it('should return MIN_SCORE if product falls below or equals MIN_SCORE during calculation', () => {
      expect(productAggregate([0.5, 0.001])).toBe(0.0005); // 0.0005 > MIN_SCORE
      expect(productAggregate([0.5, 0.0001])).toBe(MIN_SCORE); // 0.5 * 0.0001 = 0.00005 <= MIN_SCORE
      expect(productAggregate([0.1, 0.001])).toBe(MIN_SCORE);   // 0.1 * 0.001 = 0.0001 <= MIN_SCORE
      expect(productAggregate([2, 0.00001])).toBe(MIN_SCORE); // 2 * 0.00001 = 0.00002 <= MIN_SCORE
      expect(productAggregate([10, 0.02, 0.00004])).toBe(MIN_SCORE); // 10*0.02=0.2; 0.2*0.00004 = 0.000008 <= MIN_SCORE
    });

    it('should return MIN_SCORE if any score is 0 and product becomes 0 (which is <= MIN_SCORE)', () => {
      expect(productAggregate([5, 0, 10])).toBe(MIN_SCORE);
    });

    it('should handle a single score', () => {
      expect(productAggregate([5])).toBe(5);
      expect(productAggregate([0.001])).toBe(0.001); // 0.001 > MIN_SCORE
      expect(productAggregate([0.0001])).toBe(MIN_SCORE); // 0.0001 <= MIN_SCORE
      expect(productAggregate([0.00001])).toBe(MIN_SCORE); // 0.00001 <= MIN_SCORE
    });

    it('should return correct product or MIN_SCORE with MIN_SCORE as a factor', () => {
      expect(productAggregate([2, MIN_SCORE])).toBe(2 * MIN_SCORE); // 2 * 0.0001 = 0.0002. (0.0002 > MIN_SCORE)
      expect(productAggregate([0.5, MIN_SCORE])).toBe(MIN_SCORE); // 0.5 * 0.0001 = 0.00005. (0.00005 <= MIN_SCORE)
    });
  });

  describe('getMinAggregate', () => {
    const minAggregate = getMinAggregate();

    it('should return MIN_SCORE for an empty array', () => {
      expect(minAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('should return the minimum score if it is greater than MIN_SCORE', () => {
      expect(minAggregate([10, 5, 20])).toBe(5);
      expect(minAggregate([MIN_SCORE + 0.0001, MIN_SCORE + 1])).toBe(MIN_SCORE + 0.0001); // 0.0002
    });

    it('should return MIN_SCORE if the minimum score is less than MIN_SCORE', () => {
      expect(minAggregate([10, MIN_SCORE - 0.00001, 20])).toBe(MIN_SCORE); // min is 0.00009, max(0.0001, 0.00009) = 0.0001
      expect(minAggregate([-5, -10, -1])).toBe(MIN_SCORE); // min is -10, max(0.0001, -10) = 0.0001
    });

    it('should return MIN_SCORE if the minimum score is equal to MIN_SCORE', () => {
      expect(minAggregate([10, MIN_SCORE, 20])).toBe(MIN_SCORE);
    });

    it('should handle a single score', () => {
      expect(minAggregate([100])).toBe(100);
      expect(minAggregate([MIN_SCORE])).toBe(MIN_SCORE);
      expect(minAggregate([MIN_SCORE - 1])).toBe(MIN_SCORE); // e.g. -0.9999, max(0.0001, -0.9999) = 0.0001
    });
  });

  describe('getMaxAggregate', () => {
    const maxAggregate = getMaxAggregate();

    it('should return MIN_SCORE for an empty array', () => {
      expect(maxAggregate([])).toBe(MIN_SCORE); // MIN_SCORE = 0.0001
    });

    it('should return the maximum score from the array', () => {
      expect(maxAggregate([0.00001, 0.00005, 0.00002])).toBe(0.00005);
      expect(maxAggregate([MIN_SCORE, MIN_SCORE + 0.0001, MIN_SCORE + 0.00005])).toBe(MIN_SCORE + 0.0001); // 0.0002
    });

    it('should handle a single score', () => {
      expect(maxAggregate([0.00005])).toBe(0.00005);
      expect(maxAggregate([MIN_SCORE])).toBe(MIN_SCORE);
    });

    it('should correctly return max even if it is less than MIN_SCORE (based on current implementation)', () => {
      expect(maxAggregate([MIN_SCORE - 0.001, MIN_SCORE - 0.0005])).toBe(MIN_SCORE - 0.0005); // e.g., max(-0.0009, -0.0004) = -0.0004
      expect(maxAggregate([-0.001, -0.01, -0.1])).toBe(-0.001);
    });
  });
});