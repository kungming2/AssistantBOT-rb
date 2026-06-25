import type { T3 } from '@devvit/shared-types/tid.js';

export function toT3(id: string): T3 {
  return (id.startsWith('t3_') ? id : `t3_${id}`) as T3;
}

export function shortPostId(id: string): string {
  return id.startsWith('t3_') ? id.slice(3) : id;
}
