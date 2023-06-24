/** @jest-environment jsdom */
import { BrowserHistoryStorage, MemoryHistoryStorage } from '../../src/history-storage.js';

/**
 * @template T
 * @typedef { import("../../src/route-table.js").Route<T> } Route ルート情報
 */

describe('BrowserHistoryStorage', () => {
	beforeEach(() => {
		window.history.replaceState(null, '', '/');
	});

	it('履歴のスタック操作の確認', async () => {
		// 初期状態のスタック
		const storage = new BrowserHistoryStorage(window.history);
		expect(storage.state.id).toBe(0);
		expect(storage.state.route).toBe(null);
		// 履歴の追加
		expect(storage.push('/path1')).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path1');
		expect(storage.push('/path2')).toEqual(storage.state);
		expect(storage.state.id).toBe(2);
		expect(storage.state.route).toBe('/path2');
		// 履歴の置換と追加
		expect(storage.replace('/path3')).toEqual(storage.state);
		expect(storage.state.id).toBe(2);
		expect(storage.state.route).toBe('/path3');
		expect(storage.push('/path4')).toEqual(storage.state);
		expect(storage.state.id).toBe(3);
		expect(storage.state.route).toBe('/path4');
		// 履歴の移動と置換
		expect(await storage.go(-2)).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path1');
		expect(storage.replace('/path5')).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path5');
		// 履歴の最大量の移動
		expect(await storage.go(100)).toEqual(storage.state);
		expect(storage.state.id).toBe(3);
		expect(storage.state.route).toBe('/path4');
		// 履歴の最大量の移動と追加
		expect(await storage.go(-100)).toEqual(storage.state);
		expect(storage.state.id).toBe(0);
		expect(storage.state.route).toBe(null);
		expect(storage.push('/path6')).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path6');
		expect(await storage.go(100)).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path6');
		// 履歴情報の引継ぎ
		const storage2 = new BrowserHistoryStorage(window.history);
		expect(storage2.state.id).toBe(1);
		expect(storage2.state.route).toBe('/path6');
		// 外部から履歴を挿入して整合性を失わせる
		window.history.replaceState(null, '', '/page7');
		expect(await storage2.go(-1)).toEqual(storage2.state);
		await expect(async () => await storage2.go(1)).rejects.toThrow();
	});
});

describe('MemoryHistoryStorage', () => {
	it('履歴のスタック操作の確認', async () => {
		// 初期状態のスタック
		const storage = new MemoryHistoryStorage();
		expect(storage.state.id).toBe(0);
		expect(storage.state.route).toBe(null);
		// 履歴の追加
		expect(storage.push('/path1')).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path1');
		expect(storage.push('/path2')).toEqual(storage.state);
		expect(storage.state.id).toBe(2);
		expect(storage.state.route).toBe('/path2');
		// 履歴の置換と追加
		expect(storage.replace('/path3')).toEqual(storage.state);
		expect(storage.state.id).toBe(2);
		expect(storage.state.route).toBe('/path3');
		expect(storage.push('/path4')).toEqual(storage.state);
		expect(storage.state.id).toBe(3);
		expect(storage.state.route).toBe('/path4');
		// 履歴の移動と置換
		expect(await storage.go(-2)).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path1');
		expect(storage.replace('/path5')).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path5');
		// 履歴の最大量の移動
		expect(await storage.go(100)).toEqual(storage.state);
		expect(storage.state.id).toBe(3);
		expect(storage.state.route).toBe('/path4');
		// 履歴の最大量の移動と追加
		expect(await storage.go(-100)).toEqual(storage.state);
		expect(storage.state.id).toBe(0);
		expect(storage.state.route).toBe(null);
		expect(storage.push('/path6')).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path6');
		expect(await storage.go(100)).toEqual(storage.state);
		expect(storage.state.id).toBe(1);
		expect(storage.state.route).toBe('/path6');
	});
});
