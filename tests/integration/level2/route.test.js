import { RouteTable as L1RouteTable } from '../../../src/level1/route-table.js';
import { Router as L1Router } from '../../../src/level1/router.js';
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { RoutePath } from '../../../src/level2/route-path.js';
import { createTraceRouteElement, Router, RouteHistory } from '../../../src/level2/router.js';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").RouterObserver<T> } L1RouterObserver ルート遷移に関するオブザーバ
 */

/**
 * @template T
 * @typedef { import("../../../src/level2/route.js").L1RouteBody<T> } L1RouteBody ルート情報のボディ
 */

describe('Route', () => {
	/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T>>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => route?.body?.nexthop?.l1router?.routing?.(route, trace));

	beforeEach(() => {
		mockObserver.mockClear();
	});

	it('複数のルータの結合時の基本操作(Routerの場合と同じ)', async () => {
		/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		// メインのレベル1ルータ
		const l1router1 = new L1Router(l1routeTable1, createTraceRouteElement, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		// メインのルータ
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1-1' },
			{ path: '/page1-2' }
		]);
		// サブのレベル1ルータ
		const l1router2 = new L1Router(l1routeTable2, createTraceRouteElement, mockObserver);

		// サブのルータ
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
		await route2.push();
		expect(mockObserver.mock.calls).toHaveLength(4);
		expect(mockObserver.mock.calls[2][0].path).toBe('/page1/');		// ルートテーブルで'/'と定義しているため'/'が付加される
		expect(mockObserver.mock.calls[2][0].rest).toBe('');
		expect(mockObserver.mock.calls[3][0].path).toBe('/page1/');		// ルートテーブルで'/'と定義しているため'/'が付加される
		expect(mockObserver.mock.calls[3][0].rest).toBe(undefined);

		// routing()の確認
		const route3 = router2.get('/page1-2');
		const traceRoute = route3.routing();
		expect(traceRoute.routes.length).toBe(2);
		expect(traceRoute.routes[0].l1route.body.router.l1router).not.toBe(l1router1);
		expect(traceRoute.routes[1].l1route.body.router.l1router).toBe(l1router2);
		expect(mockObserver.mock.calls).toHaveLength(6);
		expect(mockObserver.mock.calls[4][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[4][0].rest).toBe('page1-2');
		expect(mockObserver.mock.calls[5][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[5][0].rest).toBe(undefined);

		// 存在しないルートへのrouting()の確認
		const route4 = router2.get('/page1-3');
		expect(route4).toBe(undefined);

		expect(router1.current.path).toBe('/page1/');
		await route3.transition();
		expect(router1.current.path).toBe('/page1/page1-2');
		expect(storage1.state.route).toBe('/page1/');
		expect(mockObserver.mock.calls).toHaveLength(8);
		expect(mockObserver.mock.calls[6][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[6][0].rest).toBe('page1-2');
		expect(mockObserver.mock.calls[7][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[7][0].rest).toBe(undefined);
	});

	it('取得したルート情報の取得と変更(pathの変更)', () => {
		/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
		const l1routeTable = new L1RouteTable([
			{ path: '/page1', name: 'page1' }
		]);
		// メインのレベル1ルータ
		const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

		const storage = new MemoryHistoryStorage();
		// メインのルータ
		const router = new RouteHistory(l1router, storage);

		expect(router.get('/page2')).toBe(undefined);
		const route = router.get('/page1');
		route.body = '/page1';
		expect(route.relative.toString()).toBe('/page1');
		// ルート情報の書き換え
		route.relative = '/page2';
		expect(router.get('/page1')).toBe(undefined);
		expect(router.get('/page2').body).toBe('/page1')
		expect(router.get({ name: 'page1' }).relative.toString()).toBe('/page2');
		route.body = '/page2';
		expect(router.get('/page2').body).toBe('/page2');
	});

	it('取得したルート情報の取得と変更(pathの変更2)', () => {
		/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
		const l1routeTable = new L1RouteTable([
			{ path: '/page1', name: 'page1' }
		]);
		// メインのレベル1ルータ
		const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

		const storage = new MemoryHistoryStorage();
		// メインのルータ
		const router = new RouteHistory(l1router, storage);

		expect(router.get('/page2')).toBe(undefined);
		const route = router.get('/page1');
		route.body = '/page1';
		expect(route.relative.toString()).toBe('/page1');
		// ルート情報の書き換え
		route.relative = new RoutePath('/page2');
		expect(router.get('/page1')).toBe(undefined);
		expect(router.get('/page2').body).toBe('/page1')
		expect(router.get({ name: 'page1' }).relative.toString()).toBe('/page2');
		route.body = '/page2';
		expect(router.get('/page2').body).toBe('/page2');
	});

	it('取得したルート情報の取得と変更(nameの変更)', () => {
		/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
		const l1routeTable = new L1RouteTable([
			{ path: '/page1', name: 'page1' }
		]);
		// メインのレベル1ルータ
		const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

		const storage = new MemoryHistoryStorage();
		// メインのルータ
		const router = new RouteHistory(l1router, storage);
		
		expect(router.get({ name: 'page2' })).toBe(undefined);
		const route = router.get({ name: 'page1' });
		route.body = '/page1';
		route.name = 'page2';
		expect(router.get({ name: 'page1' })).toBe(undefined);
		expect(router.get('/page1').name).toBe('page2');
		expect(router.get({ name: 'page2' }).body).toBe('/page1');
	});
});
