import { IRouteTable } from "./route-table.js";
import { TraceRoute } from "./trace-route.js";

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
 * @typedef { import("./route-table.js").ResolveRoute<T> } ResolveRoute IRouteTable.get()などより取得するルート情報
 */

/**
 * @template T
 * @typedef { (route: Route<T> | undefined, trace: TraceRoute<T>) => TraceRoute<T> | string | undefined | null } RouterObserver ルート解決に関するオブザーバ
 */

/**
 * @template T, RT, TRE
 * @typedef { (router: IRouter<T, RT, TRE>, route: ResolveRoute<T> | undefined) => TRE | undefined } CreateTraceRouteElement TraceRouteのroutesの要素の生成する関数型
 */

/**
 * TraceRouteのroutesの要素の生成
 * @template T, RT, TRE
 * @param { IRouter<T, RT, TRE> } router ルーティングを行ったルータ
 * @param { ResolveRoute<T> | undefined } route 解決をしたルート情報
 * @returns { TRE | undefined }
 */
function createTraceRouteElement(router, route) {
	return { router, route };
}

/**
 * ルータのインターフェース
 * @template T, RT, TRE
 * @interface
 */
/* istanbul ignore next */
class IRouter {
	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	get routeTable() { throw new Error('not implemented.'); }

	/**
	 * ルーティングの実施
	 * @param { InputRoute<T> } route 遷移先のルート情報
	 * @param { TraceRoute<RT, TRE> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<RT, TRE> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) { throw new Error('not implemented.'); }
}

/**
 * ルータクラス
 * @template T, RT, TRE
 * @implements { IRouter<T, RT, TRE> }
 */
class Router {
	/**
	 * @type { IRouteTable<T> } ルート情報全体
	 */
	#routeTable;
	/**
	 * @type { RouterObserver<T> } ルーティングの通知を受け取るオブザーバ
	 */
	#observer;
	/**
	 * @type { CreateTraceRouteElement<T, RT, TRE> } TraceRouteのroutesの要素の生成する関数型
	 */
	#createTRE;

	/**
	 * ルータの初期化
	 * @param { IRouteTable<T> } routeTable 初期状態のルート情報
	 * @param { CreateTraceRouteElement<T, RT, TRE> } createTRE TraceRouteのroutesの要素の生成する関数型
	 * @param { RouterObserver<T> } observer ルーティングの通知を受け取るオブザーバ
	 */
	constructor(routeTable, createTRE, observer = router => {}) {
		this.#routeTable = routeTable;
		this.#createTRE = createTRE;
		this.#observer = observer;
	}

	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	/* istanbul ignore next */
	get routeTable() { return this.#routeTable; }

	/**
	 * ルーティングの実施
	 * @param { InputRoute<T> } route 遷移先のルート情報
	 * @param {  TraceRoute<RT, TRE> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<RT, TRE> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) {
		// restが存在する場合はrestをpathとして取得
		const r = this.#routeTable.get(
			typeof route !== 'string'&& route.rest !== undefined
			? { path: route.rest } : route);
		const path = typeof route === 'string' ? route : route?.path;
		const name = typeof route === 'string' ? undefined : route?.name;
		const resolvePath = path ?? trace?.path ?? r?.path;

		// 経路の要素を生成して生成に成功すれば経路に追加する
		const traceRouteElement = this.#createTRE(this, r);
		const traceRoute = new TraceRoute(
			trace.base,
			resolvePath,
			traceRouteElement ? [ ...trace.routes, traceRouteElement ] : [ ...trace.routes ]
		);

		const r2 = r === undefined ? undefined : { ...r };
		if (r?.search === 'path') {
			r2.path = path;
		}
		const ret = this.#observer(r2, traceRoute);
		
		// デフォルトの動作
		if (ret === undefined || ret === null) {
			return traceRoute;
		}
		// ルーティングの結果のパスの明示的指定
		if (typeof ret === 'string') {
			traceRoute.path = ret;
			return traceRoute;
		}
		// 経路が直接与えられた場合はそれを返す
		return ret;
	}
}

export { createTraceRouteElement, Router, IRouter };
