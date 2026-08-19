import type { PlayerIdFactory } from '../../../application/progress/ProgressService';

export class WebPlayerIdFactory implements PlayerIdFactory {
  create(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }
}
