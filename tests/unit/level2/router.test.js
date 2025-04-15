import { RouteTable as L1RouteTable } from '../../../src/level1/route-table.js';
import { Router as L1Router } from '../../../src/level1/router.js';
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { createTraceRouteElement, RouteHistory } from '../../../src/level2/router.js';
import { describe, jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").RouterObserver<T> } L1RouterObserver ルート遷移に関するオブザーバ
 */

/**
 * @template T
 * @typedef { import("../../../src/level2/route.js").L1RouteBody<T> } L1RouteBody ルート情報のボディ
 */

/**
 * @template T
 * @typedef { import("../../../src/level2/router.js").RouteLifecycle<T> } RouteLifecycle ルータに対するライフサイクルフック
 */

describe('RouteHistory', () => {
	/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T>>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => route?.body?.nexthop?.l1router?.routing?.(route, trace));

	// 各ライフサイクルの呼び出し順序を記録する定数
	const routerBeforeEach = 0;
	const routerBeforeLeave = 1;
	const routerBeforeEnter = 2;
	const routerBeforeUpdate = 3;
	const routeBeforeLeave = 4;
	const routeBeforeEnter = 5;
	const routeBeforeUpdate = 6;
	/** @type { number[] } ライフサイクルの呼び出し順序を記録するシーケンス */
	const seq = [];
	/** @type { jest.Mock<RouteLifecycle<T>['beforeEach']> } */
	const mockBeforeEach1 = jest.fn((route, trace) => { seq.push(routerBeforeEach); });
	/** @type { jest.Mock<RouteLifecycle<T>['beforeLeave']> } */
	const mockBeforeLeave1 = jest.fn((route, trace) => { seq.push(routerBeforeLeave); });
	/** @type { jest.Mock<RouteLifecycle<T>['beforeLeave']> } */
	const mockBeforeLeave2 = jest.fn((route, trace) => { seq.push(routeBeforeLeave); });
	/** @type { jest.Mock<RouteLifecycle<T>['beforeEnter']> } */
	const mockBeforeEnter1 = jest.fn((route, trace) => { seq.push(routerBeforeEnter); });
	/** @type { jest.Mock<RouteLifecycle<T>['beforeEnter']> } */
	const mockBeforeEnter2 = jest.fn((route, trace) => { seq.push(routeBeforeEnter); });
	/** @type { jest.Mock<RouteLifecycle<T>['beforeUpdate']> } */
	const mockBeforeUpdate1 = jest.fn((route, trace) => { seq.push(routerBeforeUpdate); });
	/** @type { jest.Mock<RouteLifecycle<T>['beforeUpdate']> } */
	const mockBeforeUpdate2 = jest.fn((route, trace) => { seq.push(routeBeforeUpdate); });

	beforeEach(() => {
		mockObserver.mockClear();
		seq.splice(0);
		mockBeforeEach1.mockClear();
		mockBeforeLeave1.mockClear();
		mockBeforeLeave2.mockClear();
		mockBeforeEnter1.mockClear();
		mockBeforeEnter2.mockClear();
		mockBeforeUpdate1.mockClear();
		mockBeforeUpdate2.mockClear();
	});

	it('基点となるルータであることの確認', () => {
		/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
		const l1routeTable = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		// メインのレベル1ルータ
		const l1router = new L1Router(l1routeTable);

		const storage = new MemoryHistoryStorage();
		// メインのルータ
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

	describe('RouteHistory.routing()', () => {
		it('リダイレクト', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// リダイレクトの設定
			router.get('/page1').redirect = {
				route: router.get('/page2')
			};

			const traceRoute = router.routing('/page1');
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.path).toBe('/page2');
			expect(traceRoute.routes[0].path.toString()).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(2);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[0][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2');
			expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
		});

		it('フォワード', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// フォワードの設定
			router.get('/page1').forward = {
				route: router.get('/page2')
			};

			const traceRoute = router.routing('/page1');
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.path).toBe('/page1');
			expect(traceRoute.routes[0].path.toString()).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(2);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[0][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[1][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
		});

		it('複数のフォワードの組み合わせ', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page1/page1-1' },
				{ path: '/page2' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// フォワードの設定
			router.get('/page1/page1-1').forward = {
				route: router.get('/page1')
			};
			router.get('/page1').forward = {
				route: router.get('/page2')
			};

			const traceRoute = router.routing('/page1/page1-1');
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.path).toBe('/page1/page1-1');
			expect(traceRoute.routes[0].path.toString()).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(3);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page1-1');
			expect(mockObserver.mock.calls[0][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[1][0].path).toBe('/page1/page1-1');
			expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[2][0].path).toBe('/page1/page1-1');
			expect(mockObserver.mock.calls[2][0].rest).toBe(undefined);
		});

		it('リダイレクトとフォワードの組み合わせ', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' },
				{ path: '/page3' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// フォワードの設定
			router.get('/page1').forward = {
				route: router.get('/page2')
			};
			router.get('/page2').redirect = {
				route: router.get('/page3')
			};

			const traceRoute = router.routing('/page1');
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.path).toBe('/page3');
			expect(traceRoute.routes[0].path.toString()).toBe('/page3');
			expect(mockObserver.mock.calls).toHaveLength(3);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[0][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[1][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[2][0].path).toBe('/page3');
			expect(mockObserver.mock.calls[2][0].rest).toBe(undefined);
		});

		it('ディレクトリパラメータのデフォルト変換', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/:page1/:page2' },
				{ path: '/page2/:page1/:page2' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// フォワードの設定
			router.get('/:page1/:page2').redirect = {
				route: router.get('/page2/:page1/:page2')
			};

			const traceRoute = router.routing('/page1/page1-1');
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.path).toBe('/page2/page1/page1-1');
			expect(traceRoute.routes[0].path.toString()).toBe('/page2/:page1/:page2');
			expect(mockObserver.mock.calls).toHaveLength(2);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page1-1');
			expect({ ...mockObserver.mock.calls[0][0].params }).toEqual({ page1: 'page1', page2: 'page1-1' });
			expect(mockObserver.mock.calls[0][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2/page1/page1-1');
			expect({ ...mockObserver.mock.calls[1][0].params }).toEqual({ page1: 'page1', page2: 'page1-1' });
			expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
		});

		it('ディレクトリパラメータの変換', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/:page1/:page2' },
				{ path: '/page2/:page1' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// リダイレクトの設定
			router.get('/:page1/:page2').redirect = {
				route: router.get('/page2/:page1'),
				map: params => ({ page1: params.page2 })
			};

			const traceRoute = router.routing('/page1/page1-1');
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.path).toBe('/page2/page1-1');
			expect(traceRoute.routes[0].path.toString()).toBe('/page2/:page1');
			expect(mockObserver.mock.calls).toHaveLength(2);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page1-1');
			expect({ ...mockObserver.mock.calls[0][0].params }).toEqual({ page1: 'page1', page2: 'page1-1' });
			expect(mockObserver.mock.calls[0][0].rest).toBe(undefined);
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2/page1-1');
			expect({ ...mockObserver.mock.calls[1][0].params }).toEqual({ page1: 'page1-1' });
			expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
		});

		it('リダイレクトやフォワードの回数が多すぎる', () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);

			// リダイレクトの設定
			router.get('/page1').redirect = {
				route: router.get('/page1')
			};

			expect(() => router.routing('/page1')).toThrow();
		});
	});

	describe('RouteHistory.push()', () => {
		it('異なるルートへの遷移', async () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);
			router.lifecycle.beforeEach = mockBeforeEach1;
			router.lifecycle.beforeLeave = mockBeforeLeave1;
			router.lifecycle.beforeEnter = mockBeforeEnter1;
			router.lifecycle.beforeUpdate = mockBeforeUpdate1;
			const page1 = router.get('/page1');
			page1.lifecycle.beforeLeave = mockBeforeLeave2;
			page1.lifecycle.beforeEnter = mockBeforeEnter2;
			page1.lifecycle.beforeUpdate = mockBeforeUpdate2;

			expect(await router.push('/page1')).toBe(true);
			expect(router.current.routes.length).toBe(1);
			expect(router.current.routes[0].path.toString()).toBe('/page1');
			expect(await router.push('/page2')).toBe(true);
			expect(router.current.routes.length).toBe(1);
			expect(router.current.routes[0].path.toString()).toBe('/page2');

			expect(seq).toStrictEqual([
				routerBeforeEach,
				routerBeforeEnter,
				routeBeforeEnter,
				routerBeforeEach,
				routerBeforeLeave,
				routeBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeEach1.mock.calls).toHaveLength(2);
			expect(mockBeforeLeave1.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter1.mock.calls).toHaveLength(2);
			expect(mockBeforeUpdate1.mock.calls).toHaveLength(0);
			expect(mockBeforeLeave2.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter2.mock.calls).toHaveLength(1);
			expect(mockBeforeUpdate2.mock.calls).toHaveLength(0);
			expect(mockBeforeEach1.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEach1.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeEach1.mock.calls[1][0].path.toString()).toBe('/page1');
			expect(mockBeforeEach1.mock.calls[1][1].path.toString()).toBe('/page2');
			expect(mockBeforeLeave1.mock.calls[0][0].path.toString()).toBe('/page1');
			expect(mockBeforeLeave1.mock.calls[0][1].path.toString()).toBe('/page2');
			expect(mockBeforeEnter1.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter1.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeEnter1.mock.calls[1][0].path.toString()).toBe('/page1');
			expect(mockBeforeEnter1.mock.calls[1][1].path.toString()).toBe('/page2');
			expect(mockBeforeEnter2.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter2.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeLeave2.mock.calls[0][0].path.toString()).toBe('/page1');
			expect(mockBeforeLeave2.mock.calls[0][1].path.toString()).toBe('/page2');
		});

		it('同一ルートへの遷移', async () => {
			/** @type { L1RouteTable<L1RouteBody<T>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' }
			]);
			// メインのレベル1ルータ
			const l1router = new L1Router(l1routeTable, createTraceRouteElement);

			const storage = new MemoryHistoryStorage();
			// メインのルータ
			const router = new RouteHistory(l1router, storage);
			router.lifecycle.beforeEach = mockBeforeEach1;
			router.lifecycle.beforeLeave = mockBeforeLeave1;
			router.lifecycle.beforeEnter = mockBeforeEnter1;
			router.lifecycle.beforeUpdate = mockBeforeUpdate1;
			const page1 = router.get('/page1');
			page1.lifecycle.beforeLeave = mockBeforeLeave2;
			page1.lifecycle.beforeEnter = mockBeforeEnter2;
			page1.lifecycle.beforeUpdate = mockBeforeUpdate2;

			expect(await router.push('/page1')).toBe(true);
			expect(router.current.routes.length).toBe(1);
			expect(router.current.routes[0].path.toString()).toBe('/page1');
			expect(await router.push('/page1')).toBe(true);
			expect(router.current.routes.length).toBe(1);
			expect(router.current.routes[0].path.toString()).toBe('/page1');

			expect(seq).toStrictEqual([
				routerBeforeEach,
				routerBeforeEnter,
				routeBeforeEnter,
				routerBeforeEach,
				routerBeforeUpdate,
				routeBeforeUpdate
			]);
			expect(mockBeforeEach1.mock.calls).toHaveLength(2);
			expect(mockBeforeLeave1.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter1.mock.calls).toHaveLength(1);
			expect(mockBeforeUpdate1.mock.calls).toHaveLength(1);
			expect(mockBeforeLeave2.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter2.mock.calls).toHaveLength(1);
			expect(mockBeforeUpdate2.mock.calls).toHaveLength(1);
			expect(mockBeforeEach1.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEach1.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeEach1.mock.calls[1][0].path.toString()).toBe('/page1');
			expect(mockBeforeEach1.mock.calls[1][1].path.toString()).toBe('/page1');
			expect(mockBeforeEnter1.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter1.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeUpdate1.mock.calls[0][0].path.toString()).toBe('/page1');
			expect(mockBeforeUpdate1.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeEnter2.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter2.mock.calls[0][1].path.toString()).toBe('/page1');
			expect(mockBeforeUpdate2.mock.calls[0][0].path.toString()).toBe('/page1');
			expect(mockBeforeUpdate2.mock.calls[0][1].path.toString()).toBe('/page1');
		});
	});
});
