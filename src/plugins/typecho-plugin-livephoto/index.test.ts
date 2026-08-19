import { describe, expect, it } from 'vitest';
import init from './index';

describe('LivePhoto plugin', () => {
  it('should register content:markdown and content:content hooks', () => {
    const hooks = new Map<string, Function>();
    init({
      pluginId: 'typecho-plugin-livephoto',
      addHook: (point: string, _id: string, handler: Function) => {
        hooks.set(point, handler);
      },
    } as any);
    expect(hooks.has('content:markdown')).toBe(true);
    expect(hooks.has('content:content')).toBe(true);
  });

  it('should replace [LivePhoto] with placeholder in markdown', () => {
    const hooks = new Map<string, Function>();
    init({
      pluginId: 'typecho-plugin-livephoto',
      addHook: (point: string, _id: string, handler: Function) => {
        hooks.set(point, handler);
      },
    } as any);
    const markdownHandler = hooks.get('content:markdown') as Function;
    const input = '[LivePhoto photo="https://a.png" video="https://b.mp4" ratio="4/3"]';
    const output = markdownHandler(input);
    expect(output).toContain('@@LIVEPHOTO:');
    expect(output).toContain('"photo":"https://a.png"');
    expect(output).toContain('"ratio":"4/3"');
  });

  it('should use default ratio 3/4 if omitted', () => {
    const hooks = new Map<string, Function>();
    init({
      pluginId: 'typecho-plugin-livephoto',
      addHook: (point: string, _id: string, handler: Function) => {
        hooks.set(point, handler);
      },
    } as any);
    const markdownHandler = hooks.get('content:markdown') as Function;
    const input = '[LivePhoto photo="https://a.png" video="https://b.mp4"]';
    const output = markdownHandler(input);
    expect(output).toContain('"ratio":"3/4"');
  });

  it('should render proper HTML from placeholder', () => {
    const hooks = new Map<string, Function>();
    init({
      pluginId: 'typecho-plugin-livephoto',
      addHook: (point: string, _id: string, handler: Function) => {
        hooks.set(point, handler);
      },
    } as any);
    const contentHandler = hooks.get('content:content') as Function;
    const placeholder = '@@LIVEPHOTO:{"photo":"https://a.png","video":"https://b.mp4","ratio":"4/3"}@@';
    const html = contentHandler(placeholder);
    expect(html).toContain('aspect-ratio: 4/3;');
    expect(html).toContain('src="https://a.png"');
    expect(html).toContain('src="https://b.mp4"');
    expect(html).toContain('class="live-photo"');
  });
});