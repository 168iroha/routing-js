import { IRouter } from "../../../src/level1/router.js";
import { TraceRoute } from "../../../src/level1/trace-route.js";
import { IRouteTable } from "../../../src/level1/route-table.js";
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { RouteHistory } from '../../../src/level1/history.js';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * @template T
 * @typedef { import("../../../src/level1/route-table.js").Route<T> } Route ルート情報
 */

/**
 * @typedef { import("../../../src/level1/route-table.js").InputRoute } InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @template T
 * @typedef { import("../../../src/level1/router.js").DefaultRouter<T> } DefaultRouter ルータが実際にルーティングをする際に利用するデフォルトのルータ
 */

/**
 * @template T
 * @typedef { import("../../../src/level1/history.js").RouteLifecycle<T> } RouteLifecycle ルート情報に対するライフサイクルフック
 */

/**
 * ルータのスタブ
 * @template T
 * @implements { IRouter<T> }
 */
class StubRouter extends IRouter {
	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	get routeTable() { throw new Error('don\'t call.'); }

	/**
	 * ルーティングの実施
	 * @param { InputRoute } route 遷移先のルート情報
	 * @param { TraceRoute<DefaultRouter<IRouter<T>>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<DefaultRouter<IRouter<T>>> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) {
		const path = typeof route === 'string' ? route : route.path;
		const name = route.name;
		return new TraceRoute(
			this,
			path,
			[ ...trace.routes, { router: this, route: { search: path ? 'path' : 'name', path, name } } ]
		);
	}
}

describe('RouteHistory', () => {

	// 各ライフサイクルの呼び出し順序を記録する定数
	const routerBeforeLeave = 0;
	const routerBeforeEnter = 1;
	/** @type { number[] } ライフサイクルの呼び出し順序を記録するシーケンス */
	const seq = [];
	/** @type { jest.Mock<RouteLifecycle<any>['beforeLeave']> } */
	const mockBeforeLeave = jest.fn((from, to) => { seq.push(routerBeforeLeave); });
	/** @type { jest.Mock<RouteLifecycle<any>['beforeEnter']> } */
	const mockBeforeEnter = jest.fn((from, to) => { seq.push(routerBeforeEnter); });

	beforeEach(() => {
		seq.splice(0);
		mockBeforeLeave.mockClear();
		mockBeforeEnter.mockClear();
	});

	describe('RouteHistory.constructor()', () => {
		it('デフォルト引数の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);

			expect(await router.push('/page1')).toBe(true);
			expect(await router.go(-1)).toBe(true);
			expect(await router.replace('/page2')).toBe(true);
			expect(await router.transition('/page3')).toBe(true);
		});
	});

	describe('RouteHistory.push()', () => {
		it('pathによるpush操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
		});

		it('nameによるpush操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push({ name: 'page1' })).toBe(true);
			expect(storage.state.route).toStrictEqual({ name: 'page1' });
			expect(seq).toStrictEqual([
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.name).toBe('page1');
		});

		it('push操作のキャンセル', async () => {
			let cancelFlag = true;
			/** @type { jest.Mock<RouteLifecycle<any>['beforeEnter']> } */
			const mockBeforeEnter = jest.fn((from, to) => { seq.push(routerBeforeEnter); return cancelFlag; });
	
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			cancelFlag = false;
			expect(await router.push('/page2')).toBe(false);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1].routes[0].route.path).toBe('/page2');
			expect(mockBeforeEnter.mock.calls[1][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page2');
		});
	});

	describe('RouteHistory.replace()', () => {
		it('pathによるreplace操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
		});

		it('nameによるreplace操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace({ name: 'page1' })).toBe(true);
			expect(storage.state.route).toStrictEqual({ name: 'page1' });
			expect(seq).toStrictEqual([
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.name).toBe('page1');
		});

		it('replace操作のキャンセル', async () => {
			let cancelFlag = true;
			/** @type { jest.Mock<RouteLifecycle<any>['beforeEnter']> } */
			const mockBeforeEnter = jest.fn((from, to) => { seq.push(routerBeforeEnter); return cancelFlag; });

			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			cancelFlag = false;
			expect(await router.replace('/page2')).toBe(false);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1].routes[0].route.path).toBe('/page2');
			expect(mockBeforeEnter.mock.calls[1][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page2');
		});
	});

	describe('RouteHistory.forward()', () => {
		it('pathによる遷移先が存在しない場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.forward()).toBe(true);
			expect(storage.state.route).toBe(null);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(0);
		});

		it('pathによる遷移先が存在する場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(await router.back()).toBe(true);
			expect(storage.state.route).toBe(null);
			expect(await router.forward()).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page1');
		});

		it('nameによる遷移先が存在する場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push({ name: 'page1' })).toBe(true);
			expect(storage.state.route).toStrictEqual({ name: 'page1' });
			expect(await router.back()).toBe(true);
			expect(storage.state.route).toBe(null);
			expect(await router.forward()).toBe(true);
			expect(storage.state.route).toStrictEqual({ name: 'page1' });
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.name).toBe('page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.name).toBe('page1');
			expect(mockBeforeLeave.mock.calls[0][1]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.name).toBe('page1');
		});

		it('forward操作のキャンセル', async () => {
			let cancelFlag = true;
			/** @type { jest.Mock<RouteLifecycle<any>['beforeEnter']> } */
			const mockBeforeEnter = jest.fn((from, to) => { seq.push(routerBeforeEnter); return cancelFlag; });

			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(await router.back()).toBe(true);
			expect(storage.state.route).toBe(null);
			cancelFlag = false;
			expect(await router.forward()).toBe(false);
			expect(storage.state.route).toBe(null);
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page1');
		});
	});

	describe('RouteHistory.back()', () => {
		it('pathによる遷移先が存在しない場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.back()).toBe(true);
			expect(storage.state.route).toBe(null);
			expect(seq).toStrictEqual([]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(0);
		});
	});

	describe('RouteHistory.transition()', () => {
		it('pathによるtransition操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(await router.transition('/page2')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1].routes[0].route.path).toBe('/page2');
			expect(mockBeforeEnter.mock.calls[1][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page2');
		});

		it('nameによるtransition操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace({ name: 'page1' })).toBe(true);
			expect(storage.state.route).toStrictEqual({ name: 'page1' });
			expect(await router.transition({ name: 'page2' })).toBe(true);
			expect(storage.state.route).toStrictEqual({ name: 'page1' });
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.name).toBe('page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.name).toBe('page1');
			expect(mockBeforeLeave.mock.calls[0][1].routes[0].route.name).toBe('page2');
			expect(mockBeforeEnter.mock.calls[1][0].routes[0].route.name).toBe('page1');
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.name).toBe('page2');
		});

		it('routing()によるtransition操作の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(await router.transition(router.routing('/page2'))).toBe(true);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1].routes[0].route.path).toBe('/page2');
			expect(mockBeforeEnter.mock.calls[1][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page2');
		});

		it('transition操作のキャンセル', async () => {
			let cancelFlag = true;
			/** @type { jest.Mock<RouteLifecycle<any>['beforeEnter']> } */
			const mockBeforeEnter = jest.fn((from, to) => { seq.push(routerBeforeEnter); return cancelFlag; });

			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.replace('/page1')).toBe(true);
			expect(storage.state.route).toBe('/page1');
			cancelFlag = false;
			expect(await router.transition('/page2')).toBe(false);
			expect(storage.state.route).toBe('/page1');
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1].routes[0].route.path).toBe('/page2');
			expect(mockBeforeEnter.mock.calls[1][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page2');
		});
	});

	describe('RouteHistory.notify()', () => {
		it('無効な通知の場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.notify()).toBe(true);
			expect(mockBeforeLeave.mock.calls).toHaveLength(0);
			expect(mockBeforeEnter.mock.calls).toHaveLength(0);
		});

		it('有効な通知の場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push('/page1')).toBe(true);

			// 疑似的に「戻る」を実施
			await storage.go(-1);
			expect(await router.notify()).toBe(true);
			// 疑似的に「進む」を実施
			await storage.go(1);
			expect(await router.notify()).toBe(true);
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page1');
		});

		it('通知のキャンセル', async () => {
			let cancelFlag = true;
			/** @type { jest.Mock<RouteLifecycle<any>['beforeEnter']> } */
			const mockBeforeEnter = jest.fn((from, to) => { seq.push(routerBeforeEnter); return cancelFlag; });

			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(new StubRouter(), storage);
			router.lifecycle.beforeLeave = mockBeforeLeave;
			router.lifecycle.beforeEnter = mockBeforeEnter;

			expect(await router.push('/page1')).toBe(true);

			// 疑似的に「戻る」を実施
			await storage.go(-1);
			expect(await router.notify()).toBe(true);
			// 疑似的に「進む」を実施
			await storage.go(1);
			cancelFlag = false;
			expect(await router.notify()).toBe(false);
			expect(storage.state.route).toBe(null);
			expect(seq).toStrictEqual([
				routerBeforeEnter,
				routerBeforeLeave,
				routerBeforeEnter
			]);
			expect(mockBeforeLeave.mock.calls).toHaveLength(1);
			expect(mockBeforeEnter.mock.calls).toHaveLength(2);
			expect(mockBeforeEnter.mock.calls[0][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[0][1].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][0].routes[0].route.path).toBe('/page1');
			expect(mockBeforeLeave.mock.calls[0][1]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][0]).toBe(null);
			expect(mockBeforeEnter.mock.calls[1][1].routes[0].route.path).toBe('/page1');
		});
	});	
});
