import { IRouter } from "../../../src/level1/router.js";
import { TraceRoute } from "../../../src/level1/trace-route.js";
import { MemoryHistoryStorage } from '../../../src/level1/history-storage.js';
import { RouteHistory } from '../../../src/level1/history.js';
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
 * @template T, R
 * @typedef { import("../../../src/level1/history.js").PushHistoryObserver<T, R> } PushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
 */

/**
 * @template T, R
 * @typedef { import("../../../src/level1/history.js").ReplaceHistoryObserver<T, R> } ReplaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
 */

/**
 * @template T, R
 * @typedef { import("../../../src/level1/history.js").GoHistoryObserver<T, R> } GoHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
 */

/**
 * ルータのスタブ
 * @template T, RT, TRE
 * @implements { IRouter<T, RT, TRE> }
 */
class StubRouter {
	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	get routeTable() { throw new Error('don\'t call.'); }

	/**
	 * ルーティングの実施
	 * @param { InputRoute<T> } route 遷移先のルート情報
	 * @param { TraceRoute<RT, TRE> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<RT, TRE> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) {
		return new TraceRoute(undefined, route.path, [ ...trace.routes, { router: this, route } ]);
	}
}

describe('RouteHistory', () => {
	/** @type { jest.Mock<PushHistoryObserver<T, R>> } 履歴に対してpush()した際に呼び出すオブザーバのモック  */
	const mockPushObserver = jest.fn((from, to) => 1);
	/** @type { jest.Mock<ReplaceHistoryObserver<T, R>> } 履歴に対してreplace()した際に呼び出すオブザーバのモック  */
	const mockReplaceObserver = jest.fn((from, to) => 2);
	/** @type { jest.Mock<GoHistoryObserver<T, R>> } 履歴に対してgo()した際に呼び出すオブザーバのモック  */
	const mockGoObserver = jest.fn((from, to, delta, realDelta) => 3);
	/** @type { jest.Mock<GoHistoryObserver<T, R>> } 履歴に対してreplace()した際に呼び出すオブザーバのモック  */
	const mockTransitionObserver = jest.fn((from, to) => 4);

	beforeEach(() => {
		mockPushObserver.mockClear();
		mockReplaceObserver.mockClear();
		mockGoObserver.mockClear();
		mockTransitionObserver.mockClear();
	});

	describe('RouteHistory.constructor()', () => {
		it('デフォルト引数の確認', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage
			);

			expect(router.push('/page1')).toBe(undefined);
			expect(await router.go(-1)).toBe(undefined);
			expect(router.replace('/page2')).toBe(undefined);
			expect(router.transition('/page3')).toBe(undefined);
		});
	});

	describe('RouteHistory.push()', () => {
		it('push操作の確認', () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.push('/page1')).toBe(1);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls[0][0]).toBe(null);
			expect(mockPushObserver.mock.calls[0][1].routes[0].route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(1);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});

		it('routing()との組み合わせの確認', () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.push(router.routing('/page1'))).toBe(1);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls[0][0]).toBe(null);
			expect(mockPushObserver.mock.calls[0][1].routes[0].route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(1);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});
	});

	describe('RouteHistory.replace()', () => {
		it('replace操作の確認', () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.replace('/page1')).toBe(2);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls[0][0]).toBe(null);
			expect(mockReplaceObserver.mock.calls[0][1].routes[0].route).toBe('/page1');
			expect(mockReplaceObserver.mock.calls).toHaveLength(1);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});

		it('routing()との組み合わせの確認', () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.replace(router.routing('/page1'))).toBe(2);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls[0][0]).toBe(null);
			expect(mockReplaceObserver.mock.calls[0][1].routes[0].route).toBe('/page1');
			expect(mockReplaceObserver.mock.calls).toHaveLength(1);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});
	});

	describe('RouteHistory.forward()', () => {
		it('遷移先が存在しない場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(await router.forward()).toBe(3);
			expect(storage.state.route).toBe(null);
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls[0][0]).toBe(null);
			expect(mockGoObserver.mock.calls[0][1]).toBe(null);
			expect(mockGoObserver.mock.calls[0][2]).toBe(1);
			expect(mockGoObserver.mock.calls[0][3]).toBe(0);
			expect(mockGoObserver.mock.calls).toHaveLength(1);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});

		it('遷移先が存在する場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.push('/page1')).toBe(1);
			expect(storage.state.route).toBe('/page1');
			expect(await router.back()).toBe(3);
			expect(storage.state.route).toBe(null);
			expect(await router.forward()).toBe(3);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(1);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls[0][0].routes[0].route).toBe('/page1');
			expect(mockGoObserver.mock.calls[0][1]).toBe(null);
			expect(mockGoObserver.mock.calls[0][2]).toBe(-1);
			expect(mockGoObserver.mock.calls[0][3]).toBe(-1);
			expect(mockGoObserver.mock.calls[1][0]).toBe(null);
			expect(mockGoObserver.mock.calls[1][1].routes[0].route).toBe('/page1');
			expect(mockGoObserver.mock.calls[1][2]).toBe(1);
			expect(mockGoObserver.mock.calls[1][3]).toBe(1);
			expect(mockGoObserver.mock.calls).toHaveLength(2);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});
	});

	describe('RouteHistory.back()', () => {
		it('遷移先が存在しない場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(await router.back()).toBe(3);
			expect(storage.state.route).toBe(null);
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls[0][0]).toBe(null);
			expect(mockGoObserver.mock.calls[0][1]).toBe(null);
			expect(mockGoObserver.mock.calls[0][2]).toBe(-1);
			expect(mockGoObserver.mock.calls[0][3]).toBe(0);
			expect(mockGoObserver.mock.calls).toHaveLength(1);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});
	});

	describe('RouteHistory.transition()', () => {
		it('transition操作の確認', () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.replace('/page1')).toBe(2);
			expect(storage.state.route).toBe('/page1');
			expect(router.transition('/page2')).toBe(4);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls).toHaveLength(1);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls[0][0].routes[0].route).toBe('/page1');
			expect(mockTransitionObserver.mock.calls[0][1].routes[0].route).toBe('/page2');
			expect(mockTransitionObserver.mock.calls).toHaveLength(1);
		});

		it('routing()との組み合わせの確認', () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.replace('/page1')).toBe(2);
			expect(storage.state.route).toBe('/page1');
			expect(router.transition(router.routing('/page2'))).toBe(4);
			expect(storage.state.route).toBe('/page1');
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls).toHaveLength(1);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls[0][0].routes[0].route).toBe('/page1');
			expect(mockTransitionObserver.mock.calls[0][1].routes[0].route).toBe('/page2');
			expect(mockTransitionObserver.mock.calls).toHaveLength(1);
		});
	});

	describe('RouteHistory.notify()', () => {
		it('無効な通知の場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(await router.notify()).toBe(null);
			expect(mockPushObserver.mock.calls).toHaveLength(0);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls).toHaveLength(0);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});

		it('有効な通知の場合の動作', async () => {
			const storage = new MemoryHistoryStorage();
			const router = new RouteHistory(
				new StubRouter(),
				storage, mockPushObserver, mockReplaceObserver, mockGoObserver, mockTransitionObserver
			);

			expect(router.push('/page1')).toBe(1);

			// 仮想的に「戻る」を実施
			await storage.go(-1);
			expect(await router.notify()).toBe(3);
			// 仮想的に「進む」を実施
			await storage.go(1);
			expect(await router.notify()).toBe(3);
			expect(mockPushObserver.mock.calls).toHaveLength(1);
			expect(mockReplaceObserver.mock.calls).toHaveLength(0);
			expect(mockGoObserver.mock.calls[0][0].routes[0].route).toBe('/page1');
			expect(mockGoObserver.mock.calls[0][1]).toBe(null);
			expect(mockGoObserver.mock.calls[0][2]).toBe(-1);
			expect(mockGoObserver.mock.calls[0][3]).toBe(-1);
			expect(mockGoObserver.mock.calls[1][0]).toBe(null);
			expect(mockGoObserver.mock.calls[1][1].routes[0].route).toBe('/page1');
			expect(mockGoObserver.mock.calls[1][2]).toBe(1);
			expect(mockGoObserver.mock.calls[1][3]).toBe(1);
			expect(mockGoObserver.mock.calls).toHaveLength(2);
			expect(mockTransitionObserver.mock.calls).toHaveLength(0);
		});
	});	
});
