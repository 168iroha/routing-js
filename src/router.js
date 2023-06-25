import { IRouteTable } from "./route-table.js";

/**
 * @template T
 * @typedef { import("./route-table.js").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { (route: Route<T>, trace: Readonly<TraceRoute<T>>) => TraceRoute<T> | Route<T> | undefined | null } RouterObserver ルート解決に関するオブザーバ
 */

/**
 * @template T
 * @typedef { { router: IRouter<T>; route?: string | Route<T>; }[] } TraceRoute ルート解決の経路
 */

/**
 * ルータのインターフェース
 * @template T
 * @interface
 */
/* istanbul ignore next */
class IRouter {
	/**
	 * ルーティングの実施
	 * @param { string | Route<T> } route 遷移先のルート情報
	 * @param { Readonly<TraceRoute<T>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<T> } ルート解決の経路
	 */
	routing(route, trace = []) { throw new Error('not implemented.'); }
}

/**
 * ルータクラス
 * @template T
 * @implements { IRouter<T> }
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
	 * ルータの初期化
	 * @param { IRouteTable<T> } routeTable 初期状態のルート情報
	 * @param { RouterObserver<T> } observer ルーティングの通知を受け取るオブザーバ
	 */
	constructor(routeTable, observer) {
		this.#routeTable = routeTable;
		this.#observer = observer;
	}

	/**
	 * ルーティングの実施
	 * @param { string | Route<T> } route 遷移先のルート情報
	 * @param {  Readonly<TraceRoute<T>> } trace 現時点でのルート解決の経路
	 * @return { TraceRoute<T> } ルート解決の経路
	 */
	routing(route, trace = []) {
		// restが存在する場合はrestをpathとして取得
		const r = this.#routeTable.get(route?.segment === true && 'rest' in route ? { path: route.rest } : route);
		const path = typeof route === 'string' ? route : route.path;
		const name = typeof route === 'string' ? undefined : route.name;
		if (r === undefined) {
			return [ ...trace, { router: this } ];
		}
		const ret = this.#observer(new Proxy(r, {
			// 解決済みのpathを返すようにするかつ変更不可にする
			get(target, prop, receiver) {
				if (prop === 'path' && r.search == 'path') { return path; }
				return Reflect.get(...arguments);
			},
			set(obj, prop, value) {
				if (prop === r.search) {
					throw new Error(`'${prop}' changes are prohibited in resolved routes.`);
				}
				return Reflect.set(...arguments);
			}
		}), []);
		if (Array.isArray(ret)) {
			return [ ...trace, { router: this, route: r }, ...ret ];
		}
		if (ret === undefined || ret === null) {
			return [ ...trace, { router: this, route: r } ];
		}
		return this.routing(ret, trace);
	}
}

export { Router, IRouter };
