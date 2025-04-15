import { IRouter } from "./router.js";
import { TraceRoute } from "./trace-route.js";
import { IHistoryStorage } from "./history-storage.js";

/**
 * @template T
 * @typedef { import("./route-table.js").Route<T> } Route ルート情報
 */

/**
 * @typedef { import("./route-table.js").InputRoute } InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @template RT
 * @typedef { import("./trace-route.js").TraceRouteElement<RT> } TraceRouteElement ルータ型からルート解決の要素の型の取得
 */

/**
 * @template RT
 * @typedef { import("./router.js").DefaultRouter<RT> } DefaultRouter ルータが実際にルーティングをする際に利用するデフォルトのルータ
 */

/**
 * @typedef { import("./history-storage.js").RouteHistoryState } RouteHistoryState 履歴操作のためのルートの状態
 */

/**
 * @template T
 * @typedef {{
 *     beforeEnter?: (from: TraceRoute<DefaultRouter<IRouter<T>>>?, to: TraceRoute<DefaultRouter<IRouter<T>>>?) => undefined | boolean | Promise<undefined | boolean>;
 *     beforeLeave?: (from: TraceRoute<DefaultRouter<IRouter<T>>>?, to: TraceRoute<DefaultRouter<IRouter<T>>>?) => void;
 * }} RouteLifecycle ルータに対するライフサイクルフック
 */

/**
 * 履歴操作クラス
 * @template T
 * @implements { IRouter<T> }
 */
class RouteHistory extends IRouter {
	/** @type { IRouter<T> } ルータ */
	#router;
	/** @type { IHistoryStorage } 履歴を管理するストレージ */
	#storage;
	/** @type { TraceRoute<DefaultRouter<IRouter<T>>>? } 現在のルート情報についての経路 */
	#currentTraceRoute = null;
	/** @type { RouteHistoryState } 現在のルート情報についての経路 */
	#routeHistoryState;
	/** @type { RouteLifecycle<T> } ライフサイクルフック */
	lifecycle = {};

	/**
	 * 履歴操作クラスの初期化
	 * @param { IRouter<T> } router ルータ
	 * @param { IHistoryStorage } storage 履歴を管理するストレージ
	 */
	constructor(router, storage) {
		super();
		this.#router = router;
		this.#storage = storage;
		this.#routeHistoryState = this.#storage.state;
	}

	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	/* istanbul ignore next */
	get routeTable() { return this.#router.routeTable; }

	/**
	 * 現在のルート解決に用いた経路の取得
	 */
	get current() { return this.#currentTraceRoute.clone(); }

	/**
	 * ライフサイクルフックを発火する
	 * @param { TraceRoute<DefaultRouter<IRouter<T>>>? } from 遷移元のルート解決の経路
	 * @param { TraceRoute<DefaultRouter<IRouter<T>>>? } to 遷移先のルート解決の経路
	 * @return { Promise<boolean> }
	 */
	async #callLifecycle(from, to) {
		if (from && from.routes.length !== 0) {
			this.lifecycle.beforeLeave?.(from, to && to.routes.length !== 0 ? to : null);
		}
		if (to && to.routes.length !== 0) {
			const ret = this.lifecycle.beforeEnter?.(from && from.routes.length !== 0 ? from : null, to);
			return (ret instanceof Promise ? await ret : ret) !== false;
		}
		return true;
	}

	/**
	 * 履歴にルートを追加する
	 * @param { InputRoute } route 履歴に追加するルート情報
	 * @returns { Promise<boolean> }
	 */
	async push(route) {
		const to = this.routing(route);
		const from = this.#currentTraceRoute;
		if (!await this.#callLifecycle(from, to)) {
			return false;
		}
		this.#routeHistoryState = await this.#storage.push(to.path ?? route);
		this.#currentTraceRoute = to;
		return true;
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { InputRoute } route 履歴に置き換えるルート情報
	 * @returns { Promise<boolean> }
	 */
	async replace(route) {
		const to = this.routing(route);
		const from = this.#currentTraceRoute;
		if (!await this.#callLifecycle(from, to)) {
			return false;
		}
		this.#routeHistoryState = await this.#storage.replace(to.path ?? route);
		this.#currentTraceRoute = to;
		return true;
	}

	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<boolean> }
	 */
	async go(delta) {
		const state = await this.#storage.go(delta);
		const realDelta = state.id - this.#routeHistoryState.id;
		this.#routeHistoryState = state;
		if (state.route !== null) {
			const to = this.routing(state.route);
			const from = this.#currentTraceRoute;
			if (await this.#callLifecycle(from, to)) {
				this.#currentTraceRoute = to;
				return true;
			}
		}
		else {
			// ルート情報がないときはそのままオブザーバへ渡す
			const from = this.#currentTraceRoute;
			if (await this.#callLifecycle(from, null)) {
				this.#currentTraceRoute = null;
				return true;
			}
		}

		// 履歴を元に戻す
		this.#routeHistoryState = await this.#storage.go(-realDelta);
		return false;
	}

	/**
	 * 現在位置を起点とした直前の履歴へ移動
	 * @returns { Promise<boolean> }
	 */
	back() {
		return this.go(-1);
	}

	/**
	 * 現在位置を起点とした直後の履歴へ移動
	 * @returns { Promise<boolean> }
	 */
	forward() {
		return this.go(1);
	}

	/**
	 * 履歴の操作なしで移動を行う
	 * @param { InputRoute | TraceRoute<DefaultRouter<IRouter<T>>> } route 移動先のルート情報
	 * @returns { Promise<boolean> }
	 */
	async transition(route) {
		const to = route instanceof TraceRoute ? route : this.routing(route);
		const from = this.#currentTraceRoute;
		if (!(await this.#callLifecycle(from, to))) {
			return false;
		}
		this.#currentTraceRoute = to;
		return true;
	}

	/**
	 * 外部からのストレージの変更を通知(pushやreplaceの検知は実施しない)
	 * @returns { Promise<boolean> }
	 */
	async notify() {
		const delta = this.#storage.state.id - this.#routeHistoryState.id;
		if (delta !== 0) {
			this.#routeHistoryState = this.#storage.state;
			if (this.#storage.state.route !== null) {
				const to = this.#router.routing(this.#storage.state.route);
				const from = this.#currentTraceRoute;
				if (await this.#callLifecycle(from, to)) {
					this.#currentTraceRoute = to;
					return true;
				}
			}
			else {
				const from = this.#currentTraceRoute;
				if (await this.#callLifecycle(from, null)) {
					this.#currentTraceRoute = null;
					return true;
				}
			}

			// 履歴を元に戻す
			this.#routeHistoryState = await this.#storage.go(-delta);
			return false;
		}
		return true;
	}

	/**
	 * ルーティングの実施
	 * @param { InputRoute } route 遷移先のルート情報
	 * @param {  TraceRoute<DefaultRouter<IRouter<T>>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<DefaultRouter<IRouter<T>>> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) {
		return this.#router.routing(route, trace);
	}
}

export { RouteHistory };
