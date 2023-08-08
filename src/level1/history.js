import { IRouter } from "./router.js";
import { TraceRoute } from "./trace-route.js";
import { IHistoryStorage } from "./history-storage.js";

/**
 * @template T
 * @typedef { import("./route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { import("./route-table.js").InputRoute<T> } InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @template T
 * @typedef { import("./history-storage.js").RouteHistoryState<T> } RouteHistoryState 履歴操作のためのルートの状態
 */

/**
 * @template T, RT, TRE, R
 * @typedef { (from: TraceRoute<RT, TRE>?, to: TraceRoute<RT, TRE>) => R } PushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
 */

/**
 * @template T, RT, TRE, R
 * @typedef { (from: TraceRoute<RT, TRE>?, to: TraceRoute<RT, TRE>) => R } ReplaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
 */

/**
 * @template T, RT, TRE, R
 * @typedef { (from: TraceRoute<RT, TRE>?, to: TraceRoute<RT, TRE>?, delta: number, realDelta: number) => R } GoHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
 */

/**
 * @template T, RT, TRE, R
 * @typedef { (from: TraceRoute<RT, TRE>?, to: TraceRoute<RT, TRE>) => R } TransitionHistoryObserver 履歴に対してtransition()した際に呼び出すオブザーバ
 */

/**
 * 履歴操作クラス
 * @template T, RT, TRE, R1, R2, R3, R4
 * @implements { IRouter<T, RT, TRE> }
 */
class RouteHistory {
	/**
	 * @type { IRouter<T, RT, TRE> } ルータ
	 */
	#router;
	/**
	 * @type { IHistoryStorage<T> } 履歴を管理するストレージ
	 */
	#storage;
	/**
	 * @type { TraceRoute<RT, TRE>? } 現在のルート情報についての経路
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
	 * @type { TransitionHistoryObserver<T, R4> } 履歴に対してtransition()した際に呼び出すオブザーバ
	 */
	#transitionHistoryObserver;

	/**
	 * 履歴操作クラスの初期化
	 * @param { IRouter<T, RT, TRE> } router ルータ
	 * @param { IHistoryStorage<T> } storage 履歴を管理するストレージ
	 * @param { PushHistoryObserver<T, RT, TRE, R1> } pushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
	 * @param { ReplaceHistoryObserver<T, RT, TRE, R2> } replaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
	 * @param { GoHistoryObserver<T, RT, TRE, R3> } goHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
	 * @param { TransitionHistoryObserver<T, RT, TRE, R4> } transitionHistoryObserver 履歴に対してtransition()した際に呼び出すオブザーバ
	 */
	constructor(router, storage, pushHistoryObserver = (from, to) => {}, replaceHistoryObserver = (from, to) => {}, goHistoryObserver = (from, to) => {}, transitionHistoryObserver = (from, to) => {}) {
		this.#router = router;
		this.#storage = storage;
		this.#routeHistoryState = this.#storage.state;
		this.#pushHistoryObserver = pushHistoryObserver;
		this.#replaceHistoryObserver = replaceHistoryObserver;
		this.#goHistoryObserver = goHistoryObserver;
		this.#transitionHistoryObserver = transitionHistoryObserver;
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
	/* istanbul ignore next */
	get current() { return this.#currentTraceRoute.clone(); }

	/**
	 * 履歴にルートを追加する
	 * @param { InputRoute<T> | TraceRoute<RT, TRE> } route 履歴に追加するルート情報
	 * @returns { R1 }
	 */
	push(route) {
		/** @type { TraceRoute<RT, TRE> } */
		const to = route instanceof TraceRoute ? route : this.routing(route);
		const from = this.#currentTraceRoute;
		this.#routeHistoryState = this.#storage.push(
			route instanceof TraceRoute ? route?.path ?? route.routes[route.routes.length - 1].route : route
		);
		this.#currentTraceRoute = to;
		return this.#pushHistoryObserver(from, to);
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { InputRoute<T> | TraceRoute<RT, TRE> } route 履歴に置き換えるルート情報
	 * @returns { R2 }
	 */
	replace(route) {
		/** @type { TraceRoute<RT, TRE> } */
		const to = route instanceof TraceRoute ? route : this.routing(route);
		const from = this.#currentTraceRoute;
		this.#routeHistoryState = this.#storage.replace(
			route instanceof TraceRoute ? route?.path ?? route.routes[route.routes.length - 1].route : route
		);
		this.#currentTraceRoute = to;
		return this.#replaceHistoryObserver(from, to);
	}

	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<R3> }
	 */
	go(delta) {
		return this.#storage.go(delta).then(state => {
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
	 * 履歴の操作なしで移動を行う
	 * @param { InputRoute<T> | TraceRoute<RT, TRE> } route 移動先のルート情報
	 * @returns { R4 }
	 */
	transition(route) {
		/** @type { TraceRoute<RT, TRE> } */
		const to = route instanceof TraceRoute ? route : this.routing(route);
		const from = this.#currentTraceRoute;
		this.#currentTraceRoute = to;
		return this.#transitionHistoryObserver(from, to);
	}

	/**
	 * 外部からのストレージの変更を通知(pushやreplaceの検知は実施しない)
	 * @returns { Promise<R3>? }
	 */
	notify() {
		const delta = this.#storage.state.id - this.#routeHistoryState.id;
		if (delta !== 0) {
			this.#routeHistoryState = this.#storage.state;
			if (this.#storage.state.route !== null) {
				const to = this.#router.routing(this.#storage.state.route);
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
	 * @param { InputRoute<T> } route 遷移先のルート情報
	 * @param {  TraceRoute<RT, TRE> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<RT, TRE> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) {
		return this.#router.routing(route, trace);
	}
}

export { RouteHistory };
