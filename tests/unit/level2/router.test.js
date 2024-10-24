import { RouteTable as L1RouteTable } from '../../../src/level1/route-table.js';
import { Router as L1Router } from '../../../src/level1/router.js';
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { createTraceRouteElement, RouteHistory } from '../../../src/level2/router.js';
import { jest } from '@jest/globals';

/**
 * @template T, R1, R2
 * @typedef { import("../../../src/level2/route.js").L1RouteBody<T, R1, R2> } L1RouteBody ルート情報のボディ
 */

describe('RouteHistory', () => {
	/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T, R1, R2>>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => route?.body?.nexthop?.l1router?.routing?.(route, trace));

	beforeEach(() => {
		mockObserver.mockClear();
	});

	it('基点となるルータであることの確認', () => {
		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>> } メインのレベル1ルータ */
		const l1router = new L1Router(l1routeTable);

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

	describe('RouteHistory.routing()', () => {
		it('リダイレクト', () => {
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
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
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
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
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page1/page1-1' },
				{ path: '/page2' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
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
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' },
				{ path: '/page2' },
				{ path: '/page3' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
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
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/:page1/:page2' },
				{ path: '/page2/:page1/:page2' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
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
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/:page1/:page2' },
				{ path: '/page2/:page1' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
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
			/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
			const l1routeTable = new L1RouteTable([
				{ path: '/' },
				{ path: '/page1' }
			]);
			/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
			const l1router = new L1Router(l1routeTable, createTraceRouteElement, mockObserver);

			const storage = new MemoryHistoryStorage();
			/** @type { RouteHistory<T, R1, R2, R3> } メインのルータ */
			const router = new RouteHistory(l1router, storage);

			// リダイレクトの設定
			router.get('/page1').redirect = {
				route: router.get('/page1')
			};

			expect(() => router.routing('/page1')).toThrow();
		});
	});
});
