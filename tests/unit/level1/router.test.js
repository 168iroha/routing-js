
import { IRouteTable } from '../../../src/level1/route-table.js';
import { Router } from '../../../src/level1/router.js';
import { jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { import("../../../src/level1/route-table.js").InputRoute<T> } InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").RouterObserver<T> } RouterObserver ルート解決に関するオブザーバ
 */

/**
 * ルートテーブルのスタブ
 * @template T
 * @implements { IRouteTable<T> }
 */
class StubRouteTable {
	/**
	 * @type { Route<T>[] } ルート情報全体
	 */
	#routes;

	/**
	 * ルートテーブルの初期化
	 * @param { Route<T>[] } routes 初期状態のルート情報
	 */
	constructor(routes) {
		this.#routes = routes;
	}

	/**
	 * ルートの追加
	 * @param { InputRoute<T> } route 追加するルート
	 * @return { Route<T> } 追加したルート情報
	 */
	add(route) { return route; }

	/**
	 * ルートの削除
	 * @param { InputRoute<T> } route 削除対象のルート情報
	 * @return { Route<T> } 削除したルート情報
	 */
	remove(route) { return typeof route === 'string' ? { path: route } : route; }

	/**
	 * ルートの取得
	 * @param { InputRoute<T> } route 取得対象のルート情報
	 * @return { Route<T> & { search: string; } | undefined } 解決したルート情報
	 */
	get(route) {
		// スタブなので単純な線型探索で解決
		const path = typeof route === 'string' ? route : route.path;
		const r = this.#routes.find(e => e.path == path);
		if (r !== undefined) {
			r.search = 'path';
		}
		return r;
	}
}

describe('Router', () => {
	/** 共通して用いるルート */
	const routes = [
		{ path: '/', body: '/' },
		{ path: '/page1', body: '/page1' },
		{ path: '/page2', body: '/page2' },
		{ path: '/page3', name: 'page3', body: '/page3' },
	];
	/** @type { jest.Mock<RouterObserver<T>> } ルーティング通知を受け取るオブザーバのモック  */
	const mockObserver = jest.fn((route, trace) => {});
	/** @type { IRouteTable } ルートテーブル */
	const routeTable = new StubRouteTable(routes);

	beforeEach(() => {
		mockObserver.mockClear();
	});

	describe('Router.constructor()', () => {
		it('デフォルト引数の確認', async () => {
			const router = new Router(routeTable);
			expect(router.routing('/page1').length).toBe(1);
		});
	})

	describe('Router.routing()', () => {
		it('Pathを指定したルーティング', () => {
			const router = new Router(routeTable, mockObserver);
			expect(router.routing('/page1').length).toBe(1);
			expect(router.routing('/page2').length).toBe(1);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(2);
			// 取得したルートを自由に書き換え
			expect(() => mockObserver.mock.calls[0][0].body = 'body').not.toThrow();
			expect(mockObserver.mock.calls[0][0].body).toBe('body');
			// pathの書き換えは不可
			expect(() => mockObserver.mock.calls[0][0].path = 'path').toThrow();
		});

		it('Routeを指定したルーティング', () => {
			const router = new Router(routeTable, mockObserver);
			expect(router.routing({ path: '/page1' }).length).toBe(1);
			expect(router.routing({ path: '/page2' }).length).toBe(1);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(2);
		});

		it('オブザーバによるリダイレクト', () => {
			const mockObserver = jest.fn((route, trace) => route.path === '/page2' || route.path === '/' ? undefined : { path: '/page2' });
			const router = new Router(routeTable, mockObserver);
			expect(router.routing({ path: '/page1' }).length).toBe(1);
			expect(router.routing({ path: '/page2' }).length).toBe(1);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2');
			expect(mockObserver.mock.calls[2][0].path).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(3);
		});

		it('戻り値の確認', () => {
			const router = new Router(routeTable, mockObserver);
			const traceRoute = router.routing(routes[3]);
			expect(traceRoute.length).toBe(1);
			expect(traceRoute[0]?.route !== undefined).toBe(true);
			expect(traceRoute[0].router).toBe(router);
			// pathとname、bodyはルートテーブルから直接取得したものと同一であることを保証
			const route = routeTable.get(routes[3]);
			expect(traceRoute[0].route.path).toBe(route.path);
			expect(traceRoute[0].route.name).toBe(route.name);
			expect(traceRoute[0].route.body).toBe(route.body);
		});

		it('存在しないルートの指定', () => {
			const path = '/unknown';
			expect(routeTable.get(path)).toBe(undefined);
			const router = new Router(routeTable, mockObserver);
			const traceRoute = router.routing(path);
			expect(traceRoute.length).toBe(1);
			expect(traceRoute[0]?.route !== undefined).toBe(false);
			expect(traceRoute[0].router === router).toBe(true);
			expect(mockObserver.mock.calls).toHaveLength(0);
		});

		it('Restによるルーティング', () => {
			const router = new Router(routeTable, mockObserver);
			expect(router.routing({ path: '/page1', rest: '/page2', segment: true }).length).toBe(1);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[0][0].body).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(1);
		});
	});

});
