import { RoutePath } from "./route-path.js";
import { ARouter } from "./router.js";

/**
 * @template T
 * @typedef { import("../level1/route-table.js").Route<T> } L1Route ルート情報
 */

/**
 * @typedef { import("../level1/route-table.js").RouteParams } L1RouteParams ディレクトリパラメータ
 */

/**
 * @template T
 * @typedef { import("../level1/router.js").TraceRoute<T> } L1TraceRoute ルート解決の経路
 */

/**
 * @template T, R1, R2
 * @typedef { import("./router.js").TraceRoute<T, R1, R2> } TraceRoute ルート解決の経路
 */

/**
 * @template T, R1, R2
 * @typedef {{
 *     beforeRouteEnter?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     afterRouteEnter?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     beforeRouteLeave?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     afterRouteLeave?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     beforeRouteUpdate?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     afterRouteUpdate?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     routeEnter?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     routeLeave?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 *     routeUpdate?: (from: TraceRoute<T, R1, R2>?, to: TraceRoute<T, R1, R2>?) => unknown;
 * }} RouteLifecycle ルート情報に対するライフサイクルフック
 */

/**
 * @template T, R1, R2
 * @typedef {{
 * 		router: ARouter<T, R1, R2>;
 * 		route: Route<T, R1, R2>;
 * 		nexthop?: ARouter<T, R1, R2>;
 *		lifecycle: RouteLifecycle<T, R1, R2>;
 * 		body?: T;
 * }} L1RouteBody レベル1におけるルート情報のボディ
 */

/**
 * ルート情報クラス
 * @template T, R1, R2
 */
class Route {
	/** @type { L1Route<L1RouteBody<T, R1, R2>> } レベル1のルート情報 */
	#route;

	/**
	 * ルート情報の初期化
	 * @param { L1Route<L1RouteBody<T, R1, R2>> } route レベル1のルート情報
	 */
	constructor(route) {
		this.#route = route;
	}

	/**
	 * レベル1のルート情報の取得
	 */
	get l1route() {
		return this.#route;
	}

	/**
	 * ルート情報のボディの取得
	 */
	get body() {
		return this.#route.body.body;
	}

	/**
	 * ルート情報のボディの設定
	 */
	set body(b) {
		this.#route.body.body = b;
	}

	/**
	 * ライフサイクルフックの取得
	 */
	get lifecycle() {
		return this.#route.body.lifecycle;
	}

	/**
	 * next hopの取得
	 */
	get nexthop() {
		return this.#route.body.nexthop;
	}

	/**
	 * ルートへのパスを取得
	 * @returns { RoutePath }
	 */
	get path() {
		return this.#route.body.router.path.concat(this.l1route.path);
	}

	/**
	 * 履歴にルートを追加する
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { R1 }
	 */
	push(params = {}) {
		return this.#route.body.router.base.push(this.path.dispatch(params).toString());
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { R2 }
	 */
	replace(params = {}) {
		return this.#route.body.router.base.replace(this.path.dispatch(params).toString());
	}

	/**
	 * ルーティングの実施
	 * @param { L1RouteParams } params ルートにバインドするパラメータ
	 * @return { TraceRoute<T, R1, R2> } ルート解決の経路
	 */
	routing(params = {}) {
		return this.#route.body.router.base.routing(this.path.dispatch(params).toString());
	}
}

export { Route };
