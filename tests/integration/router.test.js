
import { RouteTable } from '../../src/route-table.js';
import { Router } from '../../src/router.js';
import { jest } from '@jest/globals'

/**
 * @template T
 * @typedef { import("../../src/route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { import("../../src/router.js").RouterObserver<T> } RouterObserver ルート遷移に関するオブザーバ
 */

describe('Router', () => {
	/** @type { jest.Mock<RouterObserver<T>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn(route => {});
	/** @type { jest.Mock<RouterObserver<T>> } ルートのボディのモック  */
	const mockBody = jest.fn(route => {});

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
			const router = new Router(routeTable, mockObserver);
			expect(router.routing('/param').length).toBe(1);
			expect(mockObserver.mock.calls[0][0].body).toBe('/:page');
			// pathにはrouting()に渡したpathが設定される
			expect(mockObserver.mock.calls[0][0].path).toBe('/param');
		});

		it('複数のルータの結合', () => {
			/** @type { RouteTable<RouterObserver<T>> } メインのルートテーブル */
			const routeTable = new RouteTable([
				{ path: '/', body: mockBody },
				{ path: '/page1', segment: true },
				{ path: '/page1/page1-1', body: mockBody }
			]);
			/** @type { Router<RouterObserver<T>> } メインのルータ */
			const router = new Router(routeTable, (route, trace) => route.body(route, trace));

			/** @type { RouteTable<RouterObserver<T>> } 分散して管理するルートテーブル */
			const subRouteTable = new RouteTable([
				{ path: '/', body: mockBody },
				{ path: '/page1-1', body: mockBody },
				{ path: '/page1-2', body: mockBody }
			]);
			/** @type { Router<RouterObserver<T>> } 分散して管理するルータ */
			const subrouter = new Router(subRouteTable, (route, trace) => route.body(route, trace));

			routeTable.get('/page1').body = (route, trace) => {
				mockBody(route);
				// 別のルータでルーティングする
				return subrouter.routing(route, trace);
			};

			// subRouteTableの'/page1-2'へマッチングする
			const traceRoute1 = router.routing('/page1/page1-2');
			expect(traceRoute1.length).toBe(2);
			expect('route' in traceRoute1[0]).toBe(true);
			expect('route' in traceRoute1[1]).toBe(true);
			expect(traceRoute1[0].router).toBe(router);
			expect(traceRoute1[1].router).toBe(subrouter);
			expect(mockBody.mock.calls[0][0].path).toBe('/page1/page1-2');
			expect(mockBody.mock.calls[0][0].rest).toBe('page1-2');
			expect(mockBody.mock.calls[1][0].path).toBe('/page1/page1-2');
			expect(mockBody.mock.calls[1][0].rest).toBe(undefined);
			expect(mockBody.mock.calls).toHaveLength(2);
			// subRouteTableの'/page1-1'へではなくrouteTableの'/page1/page1-1'へマッチングする
			const traceRoute2 = router.routing('/page1/page1-1');
			expect(traceRoute2.length).toBe(1);
			expect('route' in traceRoute2[0]).toBe(true);
			expect(traceRoute2[0].router).toBe(router);
			expect(mockBody.mock.calls[2][0].path).toBe('/page1/page1-1');
			expect(mockBody.mock.calls[2][0].rest).toBe(undefined);
			expect(mockBody.mock.calls).toHaveLength(3);
			// subRouteTableでマッチングを試みるが失敗する
			const traceRoute3 = router.routing('/page1/page1-3');
			expect(traceRoute3.length).toBe(2);
			expect('route' in traceRoute3[0]).toBe(true);
			expect('route' in traceRoute3[1]).toBe(false);
			expect(traceRoute3[0].router).toBe(router);
			expect(traceRoute3[1].router).toBe(subrouter);
			expect(mockBody.mock.calls[3][0].path).toBe('/page1/page1-3');
			expect(mockBody.mock.calls[3][0].rest).toBe('page1-3');
			expect(mockBody.mock.calls).toHaveLength(4);
		});
	});

});
