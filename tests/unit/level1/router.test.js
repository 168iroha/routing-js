
import { IRouteTable } from '../../../src/level1/route-table.js';
import { TraceRoute } from '../../../src/level1/trace-route.js';
import { createTraceRouteElement, Router } from '../../../src/level1/router.js';
import { jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { import("../../../src/level1/route-table.js").ResolveRoute<T> } ResolveRoute IRouteTable.get()などより取得するルート情報
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
	 * ルートの置換を行う
	 * @param { InputRoute<T> | undefined } dest 置換先のルート。undefinedの場合は新規作成する
	 * @param { InputRoute<T> | undefined } src 置換元のルート。stringの場合はpathのみの置換、undefinedの場合はdestの削除のみ行う
	 * @return { Route<T> | undefined } srcがundefinedであるときは置換元のルート、そうでない場合は置換結果のルート
	 */
	replace(dest, src) { throw new Error('not implemented.'); }

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
	 * @return { ResolveRoute<T> | undefined } 解決したルート情報
	 */
	get(route) {
		// スタブなので単純な線型探索で解決
		const path = typeof route === 'string' ? route : route?.path;
		const name = typeof route === 'string' ? undefined : route?.name;
		if (path) {
			const r = this.#routes.find(e => e?.path !== undefined && e.path == path);
			if (r !== undefined) {
				r.search = 'path';
				return r;
			}
		}
		if (name) {
			const r = this.#routes.find(e => e?.name !== undefined && e.name == name);
			if (r !== undefined) {
				r.search = 'name';
				return r;
			}
		}
		return undefined;
	}
}

describe('Router', () => {
	/** 共通して用いるルート */
	const routes = [
		{ path: '/', body: '/' },
		{ path: '/page1', body: '/page1' },
		{ path: '/page2', body: '/page2' },
		{ path: '/page3', name: 'page3', body: '/page3' },
		{ name: 'page4', body: '/page4' },
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
			const router = new Router(routeTable, createTraceRouteElement);
			expect(router.routing('/page1').routes.length).toBe(1);
		});
	})

	describe('Router.routing()', () => {
		it('Pathを指定したルーティング', () => {
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			const traceRoute1 = router.routing('/page1');
			const traceRoute2 = router.routing('/page2');
			expect(traceRoute1.routes.length).toBe(1);
			expect(traceRoute2.routes.length).toBe(1);
			expect(traceRoute1.path).toBe('/page1');
			expect(traceRoute2.path).toBe('/page2');
			expect(traceRoute1.routes[0].route.path).toBe('/page1');
			expect(traceRoute2.routes[0].route.path).toBe('/page2');
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[1][0].path).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(2);
		});

		it('Routeを指定したルーティング(pathを指定)', () => {
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			const traceRoute1 = router.routing({ path: '/page1' });
			expect(traceRoute1.routes.length).toBe(1);
			expect(traceRoute1.path).toBe('/page1');
			expect(traceRoute1.routes[0].route.path).toBe('/page1');
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls).toHaveLength(1);
		});

		it('Routeを指定したルーティング(nameを指定かつpathが存在)', () => {
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			const traceRoute1 = router.routing({ name: 'page3' });
			expect(traceRoute1.routes.length).toBe(1);
			expect(traceRoute1.path).toBe('/page3');
			expect(traceRoute1.routes[0].route.path).toBe('/page3');
			expect(mockObserver.mock.calls[0][0].path).toBe('/page3');
			expect(mockObserver.mock.calls[0][0].name).toBe('page3');
			expect(mockObserver.mock.calls).toHaveLength(1);
		});

		it('Routeを指定したルーティング(nameを指定かつpathが存在しない)', () => {
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			const traceRoute1 = router.routing({ name: 'page4' });
			expect(traceRoute1.routes.length).toBe(1);
			expect(traceRoute1?.path).toBe(undefined);
			expect(mockObserver.mock.calls[0][0].name).toBe('page4');
			expect(mockObserver.mock.calls).toHaveLength(1);
		});

		it('オブザーバでパスを指定', () => {
			const router = new Router(routeTable, createTraceRouteElement, (route, trace) => '/pageX');
			const traceRoute1 = router.routing('/page1');
			expect(traceRoute1.routes.length).toBe(1);
			expect(traceRoute1.path).toBe('/pageX');
			expect(traceRoute1.routes[0].route.path).toBe('/page1');
		});

		it('オブザーバで経路を指定', () => {
			const router = new Router(routeTable, createTraceRouteElement,
				(route, trace) => new TraceRoute(trace.base, trace.path, [...trace.routes , createTraceRouteElement(router, { path: '/pageY' })])
			);
			const traceRoute1 = router.routing('/page1');
			expect(traceRoute1.routes.length).toBe(2);
			expect(traceRoute1.path).toBe('/page1');
			expect(traceRoute1.routes[0].route.path).toBe('/page1');
			expect(traceRoute1.routes[1].route.path).toBe('/pageY');
		});

		it('戻り値の確認', () => {
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			const traceRoute = router.routing(routes[3]);
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.routes[0]?.route !== undefined).toBe(true);
			expect(traceRoute.routes[0].router).toBe(router);
			// pathとname、bodyはルートテーブルから直接取得したものと同一であることを保証
			const route = routeTable.get(routes[3]);
			expect(traceRoute.routes[0].route.path).toBe(route.path);
			expect(traceRoute.routes[0].route.name).toBe(route.name);
			expect(traceRoute.routes[0].route.body).toBe(route.body);
		});

		it('存在しないルートの指定', () => {
			const path = '/unknown';
			expect(routeTable.get(path)).toBe(undefined);
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			const traceRoute = router.routing(path);
			expect(traceRoute.routes.length).toBe(1);
			expect(traceRoute.routes[0]?.route !== undefined).toBe(false);
			expect(traceRoute.routes[0].router === router).toBe(true);
			expect(mockObserver.mock.calls[0][0]).toBe(undefined);
			expect(mockObserver.mock.calls).toHaveLength(1);
		});

		it('Restによるルーティング', () => {
			const router = new Router(routeTable, createTraceRouteElement, mockObserver);
			expect(router.routing({ path: '/page1', rest: '/page2' }).routes.length).toBe(1);
			expect(mockObserver.mock.calls[0][0].path).toBe('/page1');
			expect(mockObserver.mock.calls[0][0].body).toBe('/page2');
			expect(mockObserver.mock.calls).toHaveLength(1);
		});
	});

});
