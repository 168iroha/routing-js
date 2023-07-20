import { RouteTable as L1RouteTable } from '../../../src/level1/route-table.js';
import { Router as L1Router } from '../../../src/level1/router.js';
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { Router, RouteHistory } from '../../../src/level2/router.js';
import { jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").RouterObserver<T> } L1RouterObserver ルート遷移に関するオブザーバ
 */

/**
 * @template T, R1, R2
 * @typedef { import("../../../src/level2/route.js").L1RouteBody<T, R1, R2> } L1RouteBody ルート情報のボディ
 */

describe('Route', () => {
	/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T, R1, R2>>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => route?.body?.nexthop?.l1router.routing(route, trace));

	beforeEach(() => {
		mockObserver.mockClear();
	});

	it('複数のルータの結合時の基本操作(Routerの場合と同じ)', async () => {
		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>> } メインのレベル1ルータ */
		const l1router1 = new L1Router(l1routeTable1, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1-1' },
			{ path: '/page1-2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>> } サブのレベル1ルータ */
		const l1router2 = new L1Router(l1routeTable2, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router2 = new Router(l1router2, router1.get('/page1'));

		// replace()の確認
		const route1 = router2.get('/page1-1');
		route1.replace();
		expect(route1.lifecycle).toEqual({});
		expect(mockObserver.mock.calls).toHaveLength(2);
		expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls[0][0].rest).toBe('page1-1');
		expect(mockObserver.mock.calls[1][0].path).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);

		// push()の確認
		const route2 = router2.get('');
		route2.push();
		expect(mockObserver.mock.calls).toHaveLength(4);
		expect(mockObserver.mock.calls[2][0].path).toBe('/page1/');		// ルートテーブルで'/'と定義しているため'/'が付加される
		expect(mockObserver.mock.calls[2][0].rest).toBe('');
		expect(mockObserver.mock.calls[3][0].path).toBe('/page1/');		// ルートテーブルで'/'と定義しているため'/'が付加される
		expect(mockObserver.mock.calls[3][0].rest).toBe(undefined);

		// routing()の確認
		const route3 = router2.get('/page1-2');
		const traceRoute = route3.routing();
		expect(traceRoute.route.length).toBe(2);
		expect(traceRoute.route[0].l1route.body.router.l1router).not.toBe(l1router1);
		expect(traceRoute.route[1].l1route.body.router.l1router).toBe(l1router2);
		expect(mockObserver.mock.calls).toHaveLength(6);
		expect(mockObserver.mock.calls[4][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[4][0].rest).toBe('page1-2');
		expect(mockObserver.mock.calls[5][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[5][0].rest).toBe(undefined);

		// 存在しないルートへのrouting()の確認
		const route4 = router2.get('/page1-3');
		expect(route4).toBe(undefined);
	});
});
