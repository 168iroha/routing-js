import { IRouteTable } from "./route-table";

/**
 * @template T
 * @typedef { import("./route-table").Route<T> } Route ルート情報
 */

/**
 * @template T
 * @typedef { (route: Route<T>) => boolean | Route<T> } RouterObserver ルート遷移に関するオブザーバ
 */

/**
 * ルータクラス
 * @template T
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
	 * @param { (string | Route<T>)? } defaultRoute 初期状態のルート
	 */
	constructor(routeTable, observer, defaultRoute = '/') {
		this.#routeTable = routeTable;
		this.#observer = observer;
		if (defaultRoute !== null) {
			this.routing(defaultRoute);
		}
	}

	/**
	 * ルーティングの実施
	 * @param { string | Route<T> } route 遷移先のルート情報
	 * @return { boolean } trueならルーティング成功、falseならルーティング失敗
	 */
	routing(route) {
		// restが存在する場合はrestをpathとして取得
		const r = this.#routeTable.get(route?.segment === true && 'rest' in route ? { path: route.rest } : route);
		const path = typeof route === 'string' ? route : route.path;
		const name = typeof route === 'string' ? undefined : route.name;
		if (r === undefined) {
			throw new Error(`The requested Route-Path '${path}' or Route-Name '${name}' was not found`);
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
		}));
		return (ret === true || ret === false) ? ret :
				(ret === undefined || ret === null) ? true : this.routing(ret);
	}
}

export { Router };
