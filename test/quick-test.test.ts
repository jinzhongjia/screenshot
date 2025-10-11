import { test, expect, describe } from 'bun:test';

describe('Quick Test - Verify Test Environment', () => {
  test('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    expect('hello').toBe('hello');
  });

  test('should handle objects', () => {
    const obj = { name: 'test' };
    expect(obj.name).toBe('test');
  });
});
