import { RouteTable as L1RouteTable } from '../../../src/level1/route-table.js';
import { Router as L1Router } from '../../../src/level1/router.js';
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { createTraceRouteElement, Router, RouteHistory } from '../../../src/level2/router.js';
import { jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").RouterObserver<T> } L1RouterObserver ルート遷移に関するオブザーバ
 */

/**
 * @template T, R1, R2
 * @typedef { import("../../../src/level2/route.js").L1RouteBody<T, R1, R2> } L1RouteBody ルート情報のボディ
 */

describe('Router', () => {
	/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T, R1, R2>>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => route?.body?.nexthop?.l1router?.routing?.(route, trace));

	beforeEach(() => {
		mockObserver.mockClear();
	});

	it('複数のルータの結合時の基本操作', async () => {
		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
		const l1router1 = new L1Router(l1routeTable1, createTraceRouteElement, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3, R4> } メインのルータ */
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1-1' },
			{ path: '/page1-2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router2 = new L1Router(l1routeTable2, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router2 = new Router(l1router2, router1.get('/page1'));

		expect(router2.base).toBe(router1);
		expect(router2.l1router).toBe(l1router2);
		expect(router2.path.toString()).toBe('/page1');

		// replace()の確認
		router2.replace('/page1-1');
		expect(mockObserver.mock.calls).toHaveLength(2);
		expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls[0][0].rest).toBe('page1-1');
		expect(mockObserver.mock.calls[1][0].path).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);

		// push()の確認
		router2.push('');
		expect(mockObserver.mock.calls).toHaveLength(4);
		expect(mockObserver.mock.calls[2][0].path).toBe('/page1');
		expect(mockObserver.mock.calls[2][0].rest).toBe('');
		expect(mockObserver.mock.calls[3][0].path).toBe('/page1');
		expect(mockObserver.mock.calls[3][0].rest).toBe(undefined);

		// routing()の確認
		const traceRoute = router2.routing('/page1-2');
		expect(traceRoute.routes.length).toBe(2);
		expect(traceRoute.routes[0].l1route.body.router.l1router).not.toBe(l1router1);
		expect(traceRoute.routes[1].l1route.body.router.l1router).toBe(l1router2);
		expect(mockObserver.mock.calls).toHaveLength(6);
		expect(mockObserver.mock.calls[4][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[4][0].rest).toBe('page1-2');
		expect(mockObserver.mock.calls[5][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[5][0].rest).toBe(undefined);

		// go()の確認
		expect(storage1.state.route).toBe('/page1');
		await router1.back();
		expect(storage1.state.route).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls).toHaveLength(8);
		expect(mockObserver.mock.calls[6][0].path).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls[6][0].rest).toBe('page1-1');
		expect(mockObserver.mock.calls[7][0].path).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls[7][0].rest).toBe(undefined);

		// 存在しないルートへのrouting()の確認
		const traceRoute2 = router2.routing('/page1-3');
		expect(traceRoute2.routes.length).toBe(1);
		expect(traceRoute2.routes[0].l1route.body.router.l1router).not.toBe(l1router1);
		expect(traceRoute2.routes[0].nexthop).not.toBe(undefined);
		expect(mockObserver.mock.calls).toHaveLength(10);
		expect(mockObserver.mock.calls[8][0].path).toBe('/page1/page1-3');
		expect(mockObserver.mock.calls[8][0].rest).toBe('page1-3');
		expect(mockObserver.mock.calls[9][0]).toBe(undefined);

		const traceRouteTemp = router1.current;
		// transition()の確認(pathの指定)
		expect(router1.current.path).toBe('/page1/page1-1');
		router2.transition('/page1-2');
		expect(router1.current.path).toBe('/page1/page1-2');
		expect(storage1.state.route).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls).toHaveLength(12);
		expect(mockObserver.mock.calls[10][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[10][0].rest).toBe('page1-2');
		expect(mockObserver.mock.calls[11][0].path).toBe('/page1/page1-2');
		expect(mockObserver.mock.calls[11][0].rest).toBe(undefined);
		// transition()の確認(経路の指定)
		expect(router1.current.path).toBe('/page1/page1-2');
		router2.transition(traceRouteTemp);
		expect(router1.current.path).toBe('/page1/page1-1');
		expect(storage1.state.route).toBe('/page1/page1-1');
		expect(mockObserver.mock.calls).toHaveLength(12);
	});

	it('1つのルートに複数のルータを結合することを試みる', () => {
		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
		const l1router1 = new L1Router(l1routeTable1, createTraceRouteElement, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3, R4> } メインのルータ */
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1-1' },
			{ path: '/page1-2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router2 = new L1Router(l1routeTable2, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router2 = new Router(l1router2, router1.get('/page1'));

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable3 = new L1RouteTable([
			{ path: '/' },
			{ path: '/page1-1' },
			{ path: '/page1-2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router3 = new L1Router(l1routeTable3, createTraceRouteElement, mockObserver);

		// 異常発生
		expect(() => new Router(l1router3, router1.get('/page1'))).toThrow();
	});

	it('ルータ単位でリダイレクトが行われることの確認', () => {
		/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T, R1, R2>>> } ルーティング通知を受け取るオブザーバのモック  */
		const mockObserver = jest.fn((route, trace) => {
			// リダイレクトやフォワードが存在すれば中断
			if (route?.body?.navigate !== undefined) {
				return;
			}
			return route?.body?.nexthop?.l1router.routing(route, trace)
		});

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
		const l1router1 = new L1Router(l1routeTable1, createTraceRouteElement, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3, R4> } メインのルータ */
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/page' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router2 = new L1Router(l1routeTable2, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router2 = new Router(l1router2, router1.get('/page1'));

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable3 = new L1RouteTable([
			{ path: '/page' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router3 = new L1Router(l1routeTable3, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router3 = new Router(l1router3, router1.get('/page2'));

		// リダイレクトの設定
		router1.get('/page1').redirect = {
			route: router1.get('/page2')
		};

		// リダイレクトの確認
		const traceRoute = router2.routing('/page');
		expect(traceRoute.routes.length).toBe(2);
		expect(traceRoute.path).toBe('/page2/page');
		expect(traceRoute.routes[0].l1route.body.router).toBe(router1);
		expect(traceRoute.routes[1].l1route.body.router).toBe(router3);
		expect(mockObserver.mock.calls).toHaveLength(3);
		expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page');
		expect(mockObserver.mock.calls[0][0].rest).toBe('page');
		expect(mockObserver.mock.calls[1][0].path).toBe('/page2/page');
		expect(mockObserver.mock.calls[1][0].rest).toBe('page');
		expect(mockObserver.mock.calls[2][0].path).toBe('/page2/page');
		expect(mockObserver.mock.calls[2][0].rest).toBe(undefined);
	});

	it('ルータ単位でフォワードが行われることの確認', () => {
		/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T, R1, R2>>> } ルーティング通知を受け取るオブザーバのモック  */
		const mockObserver = jest.fn((route, trace) => {
			// リダイレクトやフォワードが存在すれば中断
			if (route?.body?.navigate) {
				return;
			}
			return route?.body?.nexthop?.l1router.routing(route, trace)
		});

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
		const l1router1 = new L1Router(l1routeTable1, createTraceRouteElement, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3, R4> } メインのルータ */
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/page' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router2 = new L1Router(l1routeTable2, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router2 = new Router(l1router2, router1.get('/page1'));

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable3 = new L1RouteTable([
			{ path: '/page' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router3 = new L1Router(l1routeTable3, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router3 = new Router(l1router3, router1.get('/page2'));

		// フォワードの設定
		router1.get('/page1').forward = {
			route: router1.get('/page2')
		};

		// フォワードの確認
		const traceRoute = router2.routing('/page');
		expect(traceRoute.routes.length).toBe(2);
		expect(traceRoute.path).toBe('/page1/page');
		expect(traceRoute.routes[0].l1route.body.router).toBe(router1);
		expect(traceRoute.routes[1].l1route.body.router).toBe(router3);
		expect(mockObserver.mock.calls).toHaveLength(3);
		expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page');
		expect(mockObserver.mock.calls[0][0].rest).toBe('page');
		expect(mockObserver.mock.calls[1][0].path).toBe('/page1/page');
		expect(mockObserver.mock.calls[1][0].rest).toBe('page');
		expect(mockObserver.mock.calls[2][0].path).toBe('/page1/page');
		expect(mockObserver.mock.calls[2][0].rest).toBe(undefined);
	});

	it('リダイレクトをフォワードとして扱うことの確認', () => {
		/** @type { jest.Mock<L1RouterObserver<L1RouteBody<T, R1, R2>>> } ルーティング通知を受け取るオブザーバのモック  */
		const mockObserver = jest.fn((route, trace) => {
			// リダイレクトやフォワードが存在すれば中断
			if (route?.body?.navigate) {
				return;
			}
			return route?.body?.nexthop?.l1router.routing(route, trace)
		});

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } メインのレベル1ルートテーブル */
		const l1routeTable1 = new L1RouteTable([
			{ path: '/page1' },
			{ path: '/page2' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } メインのレベル1ルータ */
		const l1router1 = new L1Router(l1routeTable1, createTraceRouteElement, mockObserver);

		const storage1 = new MemoryHistoryStorage();
		/** @type { RouteHistory<T, R1, R2, R3, R4> } メインのルータ */
		const router1 = new RouteHistory(l1router1, storage1);

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable2 = new L1RouteTable([
			{ path: '/page3' },
			{ path: '/page4' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router2 = new L1Router(l1routeTable2, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router2 = new Router(l1router2, router1.get('/page1'));

		/** @type { L1RouteTable<L1RouteBody<T, R1, R2>> } サブのレベル1ルートテーブル */
		const l1routeTable3 = new L1RouteTable([
			{ path: '/page3' },
			{ path: '/page4' }
		]);
		/** @type { L1Router<L1RouteBody<T, R1, R2>, RT, TRE> } サブのレベル1ルータ */
		const l1router3 = new L1Router(l1routeTable3, createTraceRouteElement, mockObserver);

		/** @type { Router<T, R1, R2> } サブのルータ */
		const router3 = new Router(l1router3, router1.get('/page2'));

		// フォワードの設定
		router2.get('/page3').forward = {
			route: router3.get('/page4')
		};

		// リダイレクトの設定
		router1.get('/page2').redirect = {
			route: router1.get('/page1')
		};

		// リダイレクトをフォワードとして扱うことの確認
		const traceRoute = router2.routing('/page3');
		expect(traceRoute.routes.length).toBe(2);
		expect(traceRoute.path).toBe('/page1/page3');
		expect(traceRoute.routes[0].l1route.body.router).toBe(router1);
		expect(traceRoute.routes[1].l1route.body.router).toBe(router2);
		expect(mockObserver.mock.calls).toHaveLength(5);
		expect(mockObserver.mock.calls[0][0].path).toBe('/page1/page3');
		expect(mockObserver.mock.calls[0][0].rest).toBe('page3');
		expect(mockObserver.mock.calls[1][0].path).toBe('/page1/page3');
		expect(mockObserver.mock.calls[1][0].rest).toBe(undefined);
		expect(mockObserver.mock.calls[2][0].path).toBe('/page1/page3');
		expect(mockObserver.mock.calls[2][0].rest).toBe('page4');
		expect(mockObserver.mock.calls[3][0].path).toBe('/page1/page3');
		expect(mockObserver.mock.calls[3][0].rest).toBe('page4');
		expect(mockObserver.mock.calls[4][0].path).toBe('/page1/page3');
		expect(mockObserver.mock.calls[4][0].rest).toBe(undefined);
	});
});
