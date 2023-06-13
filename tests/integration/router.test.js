
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
	/** @type { jest.Mock<(route: Route<T>) => boolean> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn(route => true);
	/** @type { jest.Mock<(route: Route<T>) => unknown> } ルートのボディのモック  */
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
			expect(router.routing('/param')).toBe(true);
			expect(mockObserver.mock.calls[1][0].body).toBe('/:page');
			// pathにはrouting()に渡したpathが設定される
			expect(mockObserver.mock.calls[1][0].path).toBe('/param');
		});

		it('複数のルータの結合', () => {
			/**
			 * @typedef { Route<(route: MyRoute) => unknown> } MyRoute ルート解決のためのツリー
			 */

			/** @type { RouteTable<(route: MyRoute) => unknown> } メインのルートテーブル */
			const routeTable = new RouteTable([
				{ path: '/', body: mockBody },
				{ path: '/page1', segment: true },
				{ path: '/page1/page1-1', body: mockBody }
			]);
			/** @type { Router<(route: MyRoute) => unknown> } メインのルータ */
			const router = new Router(routeTable, route => route.body(route));

			/** @type { RouteTable<(route: MyRoute) => unknown> } 分散して管理するルートテーブル */
			const subRouteTable = new RouteTable([
				{ path: '/', body: mockBody },
				{ path: '/page1-1', body: mockBody },
				{ path: '/page1-2', body: mockBody }
			]);
			/** @type { Router<(route: MyRoute) => unknown> } 分散して管理するルータ */
			const subrouter = new Router(subRouteTable, route => route.body(route), null);

			routeTable.get('/page1').body = route => {
				mockBody(route);
				// 別のルータでルーティングする
				subrouter.routing(route);
			};

			// subRouteTableの'/page1-2'へマッチングする
			router.routing('/page1/page1-2');
			expect(mockBody.mock.calls[1][0].path).toBe('/page1/page1-2');
			expect(mockBody.mock.calls[1][0].rest).toBe('page1-2');
			expect(mockBody.mock.calls[2][0].path).toBe('/page1/page1-2');
			expect(mockBody.mock.calls[2][0].rest).toBe(undefined);
			expect(mockBody.mock.calls).toHaveLength(3);
			// subRouteTableの'/page1-1'へではなくrouteTableの'/page1/page1-1'へマッチングする
			router.routing('/page1/page1-1');
			expect(mockBody.mock.calls[3][0].path).toBe('/page1/page1-1');
			expect(mockBody.mock.calls[3][0].rest).toBe(undefined);
			expect(mockBody.mock.calls).toHaveLength(4);

		});
	});

});
