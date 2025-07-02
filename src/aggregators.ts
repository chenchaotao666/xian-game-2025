/**
 * 聚合方法类型
 * 定义将多个分数聚合为单一分数的函数签名
 */
export type AggregationMethod = (scores: number[]) => number

/**
 * 最小分数常量
 * 避免分数为零，确保所有行为都有最小的执行可能性
 */
export const MIN_SCORE = 0.0001;

/**
 * 获取平均值聚合方法
 * 计算所有分数的算术平均值
 * @returns 平均值聚合函数
 */
export function getAverageAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    return scores.reduce<number>((sum, score) => sum + score, 0) / scores.length;
  };
}

/**
 * 获取加权平均值聚合方法
 * 根据提供的权重计算加权平均值
 * @param weights 权重数组，应与分数数组长度相同
 * @returns 加权平均值聚合函数
 */
export function getWeightedAverageAggregate(weights: number[]): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    if (!weights || weights.length !== scores.length) {
      console.warn(
        '加权平均：权重数组缺失或与分数长度不匹配。回退到简单平均值。'
      );
      return scores.reduce<number>((sum, score) => sum + score, 0) / scores.length;
    }
    const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
      return 0;
    }
    return weightedSum / totalWeight;
  };
}

/**
 * 获取乘积聚合方法
 * 计算所有分数的乘积，要求所有条件都满足
 * 适用于所有考量因素都必须满足的情况
 * @returns 乘积聚合函数
 */
export function getProductAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    let product = 1;
    for (const score of scores) {
      product *= score;
      if (product <= MIN_SCORE) {
        return MIN_SCORE;
      }
    }
    return product;
  };
}

/**
 * 获取最小值聚合方法
 * 取所有分数中的最小值
 * 适用于"木桶原理"场景，最弱的环节决定整体表现
 * @returns 最小值聚合函数
 */
export function getMinAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    return Math.max(MIN_SCORE, Math.min(...scores));
  };
}

/**
 * 获取最大值聚合方法
 * 取所有分数中的最大值
 * 适用于只要有一个条件优秀就足够的情况
 * @returns 最大值聚合函数
 */
export function getMaxAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    return Math.max(...scores);
  };
}