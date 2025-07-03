export default {
    // 基础配置
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    testEnvironment: 'node',
    
    // 模块配置
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@ai/(.*)$': '<rootDir>/src/ai/$1',
        '^@entities/(.*)$': '<rootDir>/src/entities/$1',
        '^@network/(.*)$': '<rootDir>/src/network/$1'
    },
    
    // 文件模式
    testMatch: [
        '**/__tests__/**/*.(ts|tsx|js)',
        '**/*.(test|spec).(ts|tsx|js)'
    ],
    
    // 转换配置
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
            tsconfig: {
                module: 'ESNext',
                target: 'ES2022'
            }
        }]
    },
    
    // 收集覆盖率
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}'
    ],
    
    // 覆盖率阈值
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    
    // 设置文件
    setupFilesAfterEnv: [],
    
    // 清理模式
    clearMocks: true,
    restoreMocks: true,
    
    // 详细输出
    verbose: true,
    
    // 全局变量
    globals: {
        'ts-jest': {
            useESM: true
        }
    }
}; 