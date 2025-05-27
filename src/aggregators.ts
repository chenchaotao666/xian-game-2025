export type AggregationMethod = (scores: number[]) => number

export const MIN_SCORE = 0.0001;

export function getAverageAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    return scores.reduce<number>((sum, score) => sum + score, 0) / scores.length;
  };
}

export function getWeightedAverageAggregate(weights: number[]): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    if (!weights || weights.length !== scores.length) {
      console.warn(
        'WeightedAverage: Weights array is missing or does not match scores length. Falling back to simple average.'
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

export function getMinAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    return Math.max(MIN_SCORE, Math.min(...scores));
  };
}

export function getMaxAggregate(): AggregationMethod {
  return scores => {
    if (scores.length === 0) {
      return MIN_SCORE;
    }
    return Math.max(...scores);
  };
}