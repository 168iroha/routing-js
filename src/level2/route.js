import { TraceRoute } from "../level1/trace-route.js";
import { RoutePath } from "./route-path.js";
import { ARouter } from "./router.js";

/**
 * @template T
 * @typedef { import("../level1/route-table.js").Route<T> } L1Route ルート情報
 */

/**
 * @template T
 * @typedef { import("../level1/route-table.js").ResolveRoute<T> } L1ResolveRoute IRouteTable.get()などより取得するルート情報
 */

/**
 * @typedef { import("../level1/route-table.js").RouteParams } L1RouteParams ディレクトリパラメータ
 */

/**
 * @template T, R1, R2
 * @typedef {{
 *     beforeRouteEnter?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     afterRouteEnter?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     beforeRouteLeave?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     afterRouteLeave?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     beforeRouteUpdate?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     afterRouteUpdate?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     routeEnter?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     routeLeave?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     routeUpdate?: (from: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?, to: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>?) => unknown;
 *     routing?: (trace: TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>>) => TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>> | undefined;
 * }} RouteLifecycle ルート情報に対するライフサイクルフック
 */

/**
 * @template T, R1, R2
 * @typedef {{
 * 		readonly router: ARouter<T, R1, R2>;
 * 		readonly route: Route<T, R1, R2>;
 * 		nexthop?: ARouter<T, R1, R2>;
 *		lifecycle: RouteLifecycle<T, R1, R2>;
 *		navigate?: { type: 'redirect' | 'forward'; route: Route<T, R1, R2>; map: (params: L1RouteParams) => L1RouteParams; };
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
	/* istanbul ignore next */
	get l1route() {
		return this.#route;
	}

	/**
	 * ルート情報のボディの取得
	 */
	/* istanbul ignore next */
	get body() {
		return this.#route.body.body;
	}

	/**
	 * ルート情報のボディの設定
	 */
	/* istanbul ignore next */
	set body(b) {
		this.#route.body.body = b;
	}

	/**
	 * ライフサイクルフックの取得
	 */
	/* istanbul ignore next */
	get lifecycle() {
		return this.#route.body.lifecycle;
	}

	/**
	 * リダイレクト情報の取得
	 */
	/* istanbul ignore next */
	get redirect() {
		return this.#route.body?.navigate?.type === 'redirect' ? this.#route.body.navigate : undefined;
	}

	/**
	 * リダイレクト情報の設定
	 */
	/* istanbul ignore next */
	set redirect(r) {
		this.#route.body.navigate = r;
		this.#route.body.navigate.type = 'redirect';
	}
	
	/**
	 * フォワード情報の取得
	 */
	/* istanbul ignore next */
	get forward() {
		return this.#route.body?.navigate?.type === 'forward' ? this.#route.body.navigate : undefined;
	}

	/**
	 * フォワード情報の設定
	 */
	/* istanbul ignore next */
	set forward(f) {
		this.#route.body.navigate = f;
		this.#route.body.navigate.type = 'forward';
	}

	/**
	 * next hopの取得
	 */
	/* istanbul ignore next */
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
	 * ローカルにおけるルートへのパスを取得
	 * @returns { RoutePath }
	 */
	get relative() {
		return new RoutePath(this.l1route.path);
	}

	/**
	 * ローカルにおけるルートへのパスを設定
	 * @param { RoutePath | string } path ローカルにおけるルートへのパス
	 */
	set relative(path) {
		const p = path instanceof RoutePath ? path.toString() : path;
		this.l1route.body?.router.l1router.routeTable.replace(this.l1route, p);
	}

	/**
	 * ルートへの名称を取得
	 */
	get name() {
		return this.l1route.name;
	}

	/**
	 * ルートへの名称を設定
	 * @param { string | undefined } ルートの名称
	 */
	set name(name) {
		this.l1route.body?.router.l1router.routeTable.replace(this.l1route, { name });
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
	 * 履歴の操作なしで移動を行う
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { R4 }
	 */
	transition(params = {}) {
		return this.#route.body.router.base.transition(this.path.dispatch(params).toString());
	}

	/**
	 * ルーティングの実施
	 * @param { L1RouteParams } params ルートにバインドするパラメータ
	 * @return { TraceRoute<ARouter<T, R1, R2>, ResolveRoute<T, R1, R2>> } ルート解決の経路
	 */
	routing(params = {}) {
		return this.#route.body.router.base.routing(this.path.dispatch(params).toString());
	}
}

/**
 * Router.get()などにより取得するルート情報クラス
 * @template T, R1, R2
 * @extends { Route<T, R1, R2> }
 */
class ResolveRoute extends Route {
	/** @type { L1RouteParams | undefined } ディレクトリパラメータ */
	params;
	/** @type { 'path' | 'name' } 検索方式 */
	search;
	/** @type { string | undefined } 検索時の余り */
	rest;

	/**
	 * ルート情報の初期化
	 * @param { L1ResolveRoute<L1RouteBody<T, R1, R2>> } route レベル1のルート情報
	 */
	constructor(route) {
		super(route.body?.route.l1route);
		this.params = route.params;
		this.search = route.search;
		this.rest = route.rest;
	}
}

export { Route, ResolveRoute };
