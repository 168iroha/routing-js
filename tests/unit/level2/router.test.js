import { RouteTable as L1RouteTable } from '../../../src/level1/route-table.js';
import { Router as L1Router } from '../../../src/level1/router.js';
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { RouteHistory } from '../../../src/level2/router.js';

/**
 * @template T, R1, R2
 * @typedef { import("../../../src/level2/route.js").L1RouteBody<T, R1, R2> } L1RouteBody ルート情報のボディ
 */

describe('RouteHistory', () => {
	it('基点となるルータであることの確認', () => {
		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>> } メインのレベル1ルータ */
		const l1router = new L1Router(l1routeTable, (route, trace) => route?.body?.routing(route, trace));

		const storage = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
		const router = new RouteHistory(l1router, storage);

		expect(router.base).toBe(router);
		expect(router.l1router).not.toBe(l1router);
		expect(router.path.toString()).toBe('');

		// add()の確認
		const route1 = router.add('/page3');
		expect(route1).not.toBe(undefined);
		expect(route1.path).not.toBe('/page3');
		route1.body = true;

		// get()の確認
		const route2 = router.get('/page3');
		expect(route2).not.toBe(undefined);
		expect(route2.path).not.toBe('/page3');
		expect(route2.body).toBe(true);

		// remove()の確認
		const route3 = router.remove('/page3');
		expect(route3).not.toBe(undefined);
		expect(route3.path).not.toBe('/page3');
		expect(route3.body).toBe(true);
		expect(router.get('/page3')).toBe(undefined);
	});
});
