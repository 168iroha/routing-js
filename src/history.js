import { IRouter } from "./router.js";
import { IHistoryStorage } from "./history-storage.js"

/**
 * @template T
 * @typedef { import("./route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { import("./router.js").TraceRoute<T> } TraceRoute ルート解決の経路
 */

/**
 * @template T
 * @typedef { import("./history-storage.js").RouteHistoryState<T> } RouteHistoryState 履歴操作のためのルートの状態
 */

/**
 * @template T, R
 * @typedef { (from: Readonly<TraceRoute<T>>?, to: Readonly<TraceRoute<T>>) => R } PushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
 */

/**
 * @template T, R
 * @typedef { (from: Readonly<TraceRoute<T>>?, to: Readonly<TraceRoute<T>>) => R } ReplaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
 */

/**
 * @template T, R
 * @typedef { (from: Readonly<TraceRoute<T>>?, to: Readonly<TraceRoute<T>>?, delta: number, realDelta: number) => R } GoHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
 */


/**
 * 履歴操作クラス
 * @template T, R1, R2, R3
 * @implements { IRouter<T> }
 */
class RouteHistory {
	/**
	 * @type { IRouter<T> } ルータ
	 */
	#router;
	/**
	 * @type { IHistoryStorage<T> } 履歴を管理するストレージ
	 */
	#strage;
	/**
	 * @type { TraceRoute<T>? } 現在のルート情報についての経路
	 */
	#currentTraceRoute = null;
	/**
	 * @type { RouteHistoryState<T> } 現在のルート情報についての経路
	 */
	#routeHistoryState;
	/**
	 * @type { PushHistoryObserver<T, R1> } 履歴に対してpush()した際に呼び出すオブザーバ
	 */
	#pushHistoryObserver;
	/**
	 * @type { ReplaceHistoryObserver<T, R2> } 履歴に対してreplace()した際に呼び出すオブザーバ
	 */
	#replaceHistoryObserver;
	/**
	 * @type { GoHistoryObserver<T, R3> } 履歴に対してgo()した際に呼び出すオブザーバ
	 */
	#goHistoryObserver;

	/**
	 * 履歴操作クラスの初期化
	 * @param { IRouter<T> } router ルータ
	 * @param { IHistoryStorage<T> } strage 履歴を管理するストレージ
	 * @param { PushHistoryObserver<T, R1> } 履歴に対してpush()した際に呼び出すオブザーバ
	 * @param { ReplaceHistoryObserver<T, R2> } 履歴に対してreplace()した際に呼び出すオブザーバ
	 * @param { GoHistoryObserver<T, R2> } 履歴に対してgo()した際に呼び出すオブザーバ
	 */
	constructor(router, strage, pushHistoryObserver, replaceHistoryObserver, goHistoryObserver) {
		this.#router = router;
		this.#strage = strage;
		this.#routeHistoryState = this.#strage.state;
		this.#pushHistoryObserver = pushHistoryObserver;
		this.#replaceHistoryObserver = replaceHistoryObserver;
		this.#goHistoryObserver = goHistoryObserver;
	}

	/**
	 * 履歴にルートを追加する
	 * @param { string | Route<T> } route 履歴に追加するルート情報
	 * @returns { R1 }
	 */
	push(route) {
		const to = this.routing(route);
		const from = this.#currentTraceRoute;
		this.#routeHistoryState = this.#strage.push(route);
		this.#currentTraceRoute = to;
		return this.#pushHistoryObserver(from, to);
	}
	/**
	 * 履歴にルートを置き換える
	 * @param { string | Route<T> } route 履歴に置き換えるルート情報
	 * @returns { R2 }
	 */
	replace(route) {
		const to = this.routing(route);
		const from = this.#currentTraceRoute;
		this.#routeHistoryState = this.#strage.replace(route);
		this.#currentTraceRoute = to;
		return this.#replaceHistoryObserver(from, to);
	}
	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<R3> }
	 */
	go(delta) {
		return this.#strage.go(delta).then(state => {
			const realDelta = state.id - this.#routeHistoryState.id;
			this.#routeHistoryState = state;
			if (state.route !== null) {
				const to = this.routing(state.route);
				const from = this.#currentTraceRoute;
				this.#currentTraceRoute = to;
				return this.#goHistoryObserver(from, to, delta, realDelta);
			}
			else {
				// ルート情報がないときはそのままオブザーバへ渡す
				const from = this.#currentTraceRoute;
				this.#currentTraceRoute = null;
				return this.#goHistoryObserver(from, null, delta, realDelta);
			}
		});
	}
	/**
	 * 現在位置を起点とした直前の履歴へ移動
	 * @returns { Promise<R3> }
	 */
	back() {
		return this.go(-1);
	}
	/**
	 * 現在位置を起点とした直後の履歴へ移動
	 * @returns { Promise<R3> }
	 */
	forward() {
		return this.go(1);
	}

	/**
	 * 外部からのストレージの変更を通知(pushやreplaceの検知は実施しない)
	 * @returns { Promise<R3>? }
	 */
	notify() {
		const delta = this.#strage.state.id - this.#routeHistoryState.id;
		if (delta !== 0) {
			this.#routeHistoryState = this.#strage.state;
			if (this.#strage.state.route !== null) {
				const to = this.#router.routing(this.#strage.state.route);
				const from = this.#currentTraceRoute;
				this.#currentTraceRoute = to;
				return this.#goHistoryObserver(from, to, delta, delta);
			}
			else {
				const from = this.#currentTraceRoute;
				this.#currentTraceRoute = null;
				return this.#goHistoryObserver(from, null, delta, delta);
			}
		}
		return null;
	}

	/**
	 * ルーティングの実施
	 * @param { string | Route<T> } route 遷移先のルート情報
	 * @param {  Readonly<TraceRoute<T>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<T> } ルート解決の経路
	 */
	routing(route, trace = []) {
		return this.#router.routing(route, trace);
	}
}

export { RouteHistory };
