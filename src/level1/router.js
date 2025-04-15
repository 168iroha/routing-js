import { IRouteTable } from "./route-table.js";
import { TraceRoute } from "./trace-route.js";

/**
 * @template T
 * @typedef { import("./route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template RT
 * @typedef { import("./trace-route.js").TraceRouteElement<RT> } TraceRouteElement ルータ型からルート解決の要素の型の取得
 */

/**
 * @typedef { import("./route-table.js").InputRoute } InputRoute ルート解決などの際に引数として入力するルート情報
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
 * @template T
 * @typedef { (router: IRouter<T>, route: ResolveRoute<T> | undefined) => TraceRouteElement<DefaultRouter<IRouter<T>>> | undefined } CreateTraceRouteElement TraceRouteのroutesの要素の生成する関数型
 */

/**
 * @template RT
 * @typedef { RT extends { routeType: infer R } ? (Exclude<R['body'], undefined> extends { router: infer U } ? DefaultRouter<U> : RT) : never } DefaultRouter ルータが実際にルーティングをする際に利用するデフォルトのルータ
 */

/**
 * TraceRouteのroutesの要素の生成
 * @template T
 * @param { IRouter<T> } router ルーティングを行ったルータ
 * @param { ResolveRoute<T> | undefined } route 解決をしたルート情報
 * @returns { { router: IRouter<T>; route: ResolveRoute<T> | undefined } | undefined }
 */
function createTraceRouteElement(router, route) {
	return { router, route };
}

/**
 * ルータのインターフェース
 * @template T
 * @interface
 */
/* istanbul ignore next */
class IRouter {
	/** @type { Route<T> } ルート情報(型推論でのみ利用) */
	routeType;
	/** @type { ReturnType<typeof createTraceRouteElement<T>> } 生成するルート解決結果を示すルート要素の型(型推論でのみ利用) */
	traceRouteElementType;

	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	get routeTable() { throw new Error('not implemented.'); }

	/**
	 * ルーティングの実施
	 * @param { InputRoute } route 遷移先のルート情報
	 * @param { TraceRoute<DefaultRouter<IRouter<T>>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<DefaultRouter<IRouter<T>>> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) { throw new Error('not implemented.'); }
}

/**
 * ルータクラス
 * @template T
 * @implements { IRouter<T> }
 */
class Router extends IRouter {
	/**
	 * @type { IRouteTable<T> } ルート情報全体
	 */
	#routeTable;
	/**
	 * @type { RouterObserver<T> } ルーティングの通知を受け取るオブザーバ
	 */
	observer;
	/**
	 * @type { CreateTraceRouteElement<T> } TraceRouteのroutesの要素の生成する関数型
	 */
	createTRE;

	/**
	 * ルータの初期化
	 * @param { IRouteTable<T> } routeTable 初期状態のルート情報
	 * @param { CreateTraceRouteElement<T> } createTRE TraceRouteのroutesの要素の生成する関数型
	 * @param { RouterObserver<T> } observer ルーティングの通知を受け取るオブザーバ
	 */
	constructor(routeTable, createTRE, observer = router => {}) {
		super();
		this.#routeTable = routeTable;
		this.createTRE = createTRE;
		this.observer = observer;
	}

	/**
	 * 内部でルートテーブルをもつ場合にルートテーブルの取得
	 * @return { IRouteTable<T> } ルートテーブル
	 */
	/* istanbul ignore next */
	get routeTable() { return this.#routeTable; }

	/**
	 * ルーティングの実施
	 * @param { InputRoute } route 遷移先のルート情報
	 * @param { TraceRoute<DefaultRouter<IRouter<T>>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<DefaultRouter<IRouter<T>>> } ルート解決の経路
	 */
	routing(route, trace = new TraceRoute()) {
		// restが存在する場合はrestをpathとして取得
		const r = this.#routeTable.get(
			typeof route !== 'string'&& route.rest !== undefined
			? { path: route.rest } : route);
		const path = typeof route === 'string' ? route : route.path;
		const name = typeof route === 'string' ? undefined : route.name;
		const resolvePath = path ?? trace.path ?? r?.path;

		// 経路の要素を生成して生成に成功すれば経路に追加する
		const traceRouteElement = this.createTRE(this, r);
		const traceRoute = new TraceRoute(
			trace.base,
			resolvePath,
			traceRouteElement ? [ ...trace.routes, traceRouteElement ] : [ ...trace.routes ]
		);

		const r2 = r === undefined ? undefined : { ...r };
		if (r?.search === 'path') {
			r2.path = path;
		}
		const ret = this.observer(r2, traceRoute);
		
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
