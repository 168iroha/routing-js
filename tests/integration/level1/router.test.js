import { RouteTable } from '../../../src/level1/route-table.js';
import { createTraceRouteElement, Router } from '../../../src/level1/router.js';
import { jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").RouterObserver<T> } RouterObserver ルート遷移に関するオブザーバ
 */

describe('Router', () => {
	/** @type { jest.Mock<RouterObserver<T>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => {});
	/** @type { jest.Mock<RouterObserver<T>> } ルートのボディのモック  */
	const mockBody = jest.fn((route, trace) => {});

	beforeEach(() => {
		mockObserver.mockClear();
		mockBody.mockClear();
	});

	describe('RouteTable', () => {
		it('ディレクトリパラメータを含む場合のオブザーバが受け取るパス', () => {
			const routeTable = new RouteTable([
				{ path: '/', body: '/' },
				{ path: '/:page', body: '/:page' }
			]);
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			expect(router.routing('/param').routes.length).toBe(1);
			expect(mockObserver.mock.calls[0][0].body).toBe('/:page');
			// pathにはrouting()に渡したpathが設定される
			expect(mockObserver.mock.calls[0][0].path).toBe('/param');
			expect(mockObserver.mock.calls[0][0].params['page']).toBe('param');
		});

		it('複数のルータの結合', () => {
			/** @type { RouteTable<RouterObserver<T>> } メインのルートテーブル */
			const routeTable = new RouteTable([
				{ path: '/', body: mockBody },
				{ path: '/page1/page1-1', body: mockBody }
			]);
			/** @type { Router<RouterObserver<T>, RT, TRE> } メインのルータ */
			const router = new Router(routeTable, createTraceRouteElement, (route, trace) => route?.body?.(route, trace));

			/** @type { RouteTable<RouterObserver<T>> } 分散して管理するルートテーブル */
			const subRouteTable = new RouteTable([
				{ path: '/', body: mockBody },
				{ path: '/page1-1', body: mockBody },
				{ path: '/page1-2', body: mockBody }
			]);
			/** @type { Router<RouterObserver<T>, RT, TRE> } 分散して管理するルータ */
			const subrouter = new Router(subRouteTable, createTraceRouteElement, (route, trace) => route?.body?.(route, trace));

			routeTable.add({ path: '/page1', segment: true }).body = (route, trace) => {
				mockBody(route, trace);
				// 別のルータでルーティングする
				return subrouter?.routing?.(route, trace);
			};

			// subRouteTableの'/page1-2'へマッチングする
			const traceRoute1 = router.routing('/page1/page1-2');
			expect(traceRoute1.routes.length).toBe(2);
			expect(traceRoute1.routes[0]?.route !== undefined).toBe(true);
			expect(traceRoute1.routes[1]?.route !== undefined).toBe(true);
			expect(traceRoute1.routes[0].router).toBe(router);
			expect(traceRoute1.routes[1].router).toBe(subrouter);
			expect(mockBody.mock.calls).toHaveLength(2);
			expect(mockBody.mock.calls[0][0].path).toBe('/page1/page1-2');
			expect(mockBody.mock.calls[0][0].rest).toBe('page1-2');
			expect(mockBody.mock.calls[1][0].path).toBe('/page1/page1-2');
			expect(mockBody.mock.calls[1][0].rest).toBe(undefined);
			expect(mockBody.mock.calls).toHaveLength(2);
			// subRouteTableの'/page1-1'へではなくrouteTableの'/page1/page1-1'へマッチングする
			const traceRoute2 = router.routing('/page1/page1-1');
			expect(traceRoute2.routes.length).toBe(1);
			expect(traceRoute2.routes[0]?.route !== undefined).toBe(true);
			expect(traceRoute2.routes[0].router).toBe(router);
			expect(mockBody.mock.calls[2][0].path).toBe('/page1/page1-1');
			expect(mockBody.mock.calls[2][0].rest).toBe(undefined);
			expect(mockBody.mock.calls).toHaveLength(3);
			// subRouteTableでマッチングを試みるが失敗する
			const traceRoute3 = router.routing('/page1/page1-3');
			expect(traceRoute3.routes.length).toBe(2);
			expect(traceRoute3.routes[0]?.route !== undefined).toBe(true);
			expect(traceRoute3.routes[1]?.route !== undefined).toBe(false);
			expect(traceRoute3.routes[0].router).toBe(router);
			expect(traceRoute3.routes[1].router).toBe(subrouter);
			expect(mockBody.mock.calls[3][0].path).toBe('/page1/page1-3');
			expect(mockBody.mock.calls[3][0].rest).toBe('page1-3');
			expect(mockBody.mock.calls).toHaveLength(4);
		});
	});

});
