import { IRouter as L1Router } from "../level1/router.js";
import { RouteHistory as L1RouteHistory } from "../level1/history.js";
import { IHistoryStorage as L1HistoryStorage } from "../level1/history-storage.js";
import { RoutePath } from "./route-path.js";
import { Route } from "./route.js";

/**
 * @template T
 * @typedef { import("../level1/router.js").TraceRoute<T> } L1TraceRoute レベル1のルート解決の経路
 */

/**
 * @template T, R1, R2
 * @typedef { { base: ARouter<T, R1, R2>; route: Route<T, R1, R2>[]; } } TraceRoute ルート解決の経路
 */

/**
 * @template T
 * @typedef { import("../level1/route-table.js").Route<T> } L1Route ルート情報
 */

/**
 * @typedef { import("../level1/route-table.js").RouteParams } L1RouteParams ディレクトリパラメータ
 */

/**
 * @template T
 * @typedef { import("../level1/router.js").InputRoute<T> } L1InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @typedef { { path: string; name?: string; } | string } InputRoute ルート解決などの際に引数として入力するルート情報(レベル1とは異なりpathを必須にする)
 */

/**
 * @template T, R1, R2
 * @typedef { import("./route.js").RouteLifecycle<T, R1, R2> } RouteLifecycle ルート情報に対するライフサイクルフック
*/

/**
 * @template T, R1, R2
 * @typedef { import("./route.js").L1RouteBody<T, R1, R2> } L1RouteBody ルート情報のボディ
 */

/**
 * レベル1のルート解決の経路からレベル2のルート解決の経路へ変換
 * @template T, R1, R2
 * @param { ARouter<T, R1, R2> } base ルート解決の基点となるルータ
 * @param { Readonly<L1TraceRoute<L1RouteBody<T, R1, R2>>> } trace レベル1の経路
 * @returns { TraceRoute<T, R1, R2> }
 */
function l1TraceRouteToL2TraceRoute(base, trace) {
	const result = { base, route: [] };

	// 本来はルータのインスタンスのチェック等も厳密に実施すべきだが実施しない
	for (const r of trace) {
		if (r?.route !== undefined) {
			result.route.push(r.route.body.route);
		}
		else {
			break;
		}
	}

	return result;
}

/**
 * ルータの抽象クラス
 * @template T, R1, R2
 * @abstract
 */
class ARouter {
	/** @type { RouteLifecycle<T, R1, R2> } ルータが持つライフサイクルフック */
	lifecycle = {};

	/**
	 * ルータの初期化
	 * @param { L1Router<L1RouteBody<T, R1, R2>> } router 内部で用いるレベル1ルータ
	 */
	constructor(router) {
		// レベル2のルート情報を登録
		router.routeTable.forEach(r => {
			r.body = {
				router: this,
				route: new Route(r),
				lifecycle: {}
			};
		});
	}

	/**
	 * ルート解決の基点となるルータの取得
	 * @returns { ARouter<T, R1, R2> }
	 */
	/* istanbul ignore next */
	get base() { throw new Error('not implemented.'); }

	/**
	 * 内部で保持しているレベル1ルータの取得
	 * @returns { L1Router<L1RouteBody<T, R1, R2>> }
	 */
	/* istanbul ignore next */
	get l1router() { throw new Error('not implemented.'); }

	/**
	 * このルータへのパスの取得
	 * @returns { RoutePath }
	 */
	/* istanbul ignore next */
	get path() { throw new Error('not implemented.'); }

	/**
	 * ルートを追加する
	 * @param { InputRoute } route 追加するルート
	 * @return { Route<T, R1, R2> } 追加したルート情報
	 */
	add(route) {
		const r = this.l1router.routeTable.add(route);
		// デフォルトのルーティングの設定
		r.body = {
			router: this,
			route: new Route(r),
			lifecycle: {}
		};
		return r.body.route;
	}

	/**
	 * ルートの削除
	 * @param { InputRoute } route 削除対象のルート情報
	 * @return { Route<T, R1, R2> } 削除したルート情報
	 */
	remove(route) {
		const r = this.l1router.routeTable.remove(route);
		return new Route(r);
	}

	/**
	 * ルートの取得
	 * @param { InputRoute } route 取得対象のルート情報
	 * @return { Route<T, R1, R2> | undefined } 解決したルート情報
	 */
	get(route) {
		const r = this.l1router.routeTable.get(route);
		return r ? r.body.route : undefined;
	}

	/**
	 * 履歴にルートを追加する
	 * @param { string } route 履歴に追加するルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { R1 }
	 */
	push(route, params = {}) {
		return this.base.push(this.path.dispatch(params).concat(route).toString());
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { string } route 履歴に置き換えるルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { R2 }
	 */
	replace(route, params = {}) {
		return this.base.replace(this.path.dispatch(params).concat(route).toString());
	}

	/**
	 * ルーティングの実施
	 * @param { string } route 遷移先のルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @return { TraceRoute<T, R1, R2> } ルート解決の経路
	 */
	routing(route, params = {}) {
		return l1TraceRouteToL2TraceRoute(this.base, this.base.l1router.routing(this.path.dispatch(params).concat(route).toString()));
	}
}

/**
 * ルータクラス
 * @template T, R1, R2
 * @extends { ARouter<T, R1, R2> }
 */
class Router extends ARouter {
	/** @type { L1Router<L1RouteBody<T, R1, R2>> } レベル1のルータ(L1RouterObserverによるルート解決を実施する必要がある) */
	#router;
	/** @type { Route<T, R1, R2> } ルート解決のベースとなるルート */
	#prevRoute;

	/**
	 * ルータの初期化
	 * @param { L1Router<L1RouteBody<T, R1, R2>> } router 内部で用いるレベル1ルータ
	 * @param { Route<T, R1, R2> } prevRoute ルート解決のベースとなるルート
	 */
	constructor(router, prevRoute) {
		super(router);
		this.#router = router;
		if (prevRoute.nexthop !== undefined) {
			// next hopの上書きは禁止
			throw new Error('Overriding the nexthop is prohibited.');
		}
		// prevRouteからthisへのルートを構築する
		prevRoute.l1route.body.nexthop = this;
		prevRoute.l1route.segment = true;
		this.#prevRoute = prevRoute;
	}

	/**
	 * ルート解決の基点となるルータの取得
	 * @returns { ARouter<T, R1, R2> }
	 */
	get base() {
		return this.#prevRoute.l1route.body.router;
	}

	/**
	 * 内部で保持しているレベル1ルータの取得
	 * @returns { L1Router<L1RouteBody<T, R1, R2>> }
	 */
	get l1router() {
		return this.#router;
	}

	/**
	 * このルータへのパスの取得
	 * @returns { RoutePath }
	 */
	get path() {
		return this.#prevRoute.path;
	}
}

/**
 * @template T, R1, R2
 * @typedef { L1HistoryStorage<L1RouteBody<T, R1, R2>> } HistoryStorage 履歴のストレージ
 */


/**
 * @template T, R
 * @typedef { import("../level1/history.js").PushHistoryObserver<T, R> } L1PushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
 */

/**
 * @template T, R
 * @typedef { import("../level1/history.js").ReplaceHistoryObserver<T, R> } L1ReplaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
 */

/**
 * @template T, R
 * @typedef { import("../level1/history.js").GoHistoryObserver<T, R> } L1GoHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
 */
/**
 * @template T, R1, R2
 * @typedef { (from: Readonly<TraceRoute<T, R1, R2>>?, to: Readonly<TraceRoute<T, R1, R2>>) => R1 } PushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
 */

/**
 * @template T, R1, R2
 * @typedef { (from: Readonly<TraceRoute<T, R1, R2>>?, to: Readonly<TraceRoute<T, R1, R2>>) => R2 } ReplaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
 */

/**
 * @template T, R1, R2, R3
 * @typedef { (from: Readonly<TraceRoute<T, R1, R2>>?, to: Readonly<TraceRoute<T, R1, R2>>?, delta: number, realDelta: number) => R3 } GoHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
 */

/**
 * 履歴操作クラス
 * @template T, R1, R2, R3
 * @extends { ARouter<T, R1, R2> }
 */
class RouteHistory extends ARouter {
	/** @type { L1RouteHistory<L1RouteBody<T, R1, R2>, R1, R2, R3> } レベル1のルータ(L1RouterObserverによるルート解決を実施する必要がある) */
	#router;

	/**
	 * ルータの初期化
	 * @param { L1Router<L1RouteBody<T, R1, R2>> } router 内部で用いるレベル1ルータ
	 * @param { HistoryStorage<T, R1, R2> } storage 履歴を管理するストレージ
	 * @param { PushHistoryObserver<T, R1, R2> } pushHistoryObserver 履歴に対してpush()した際に呼び出すオブザーバ
	 * @param { ReplaceHistoryObserver<T, R1, R2> } replaceHistoryObserver 履歴に対してreplace()した際に呼び出すオブザーバ
	 * @param { GoHistoryObserver<T, R1, R2, R3> } goHistoryObserver 履歴に対してgo()した際に呼び出すオブザーバ
	 */
	constructor(router, storage, pushHistoryObserver = (from, to) => {}, replaceHistoryObserver = (from, to) => {}, goHistoryObserver = (from, to) => {}) {
		super(router);
		this.#router = new L1RouteHistory(
			router,
			storage,
			/* istanbul ignore next */
			(from, to) => pushHistoryObserver(from ? l1TraceRouteToL2TraceRoute(this, from) : null, l1TraceRouteToL2TraceRoute(this, to)),
			/* istanbul ignore next */
			(from, to) => replaceHistoryObserver(from ? l1TraceRouteToL2TraceRoute(this, from) : null, l1TraceRouteToL2TraceRoute(this, to)),
			/* istanbul ignore next */
			(from, to, delta, realDelta) => goHistoryObserver(from ? l1TraceRouteToL2TraceRoute(this, from) : null, to ? l1TraceRouteToL2TraceRoute(this, to) : null, delta, realDelta)
		);
	}

	/**
	 * ルート解決の基点となるルータの取得
	 * @returns { ARouter<T, R1, R2> }
	 */
	get base() {
		return this;
	}

	/**
	 * 内部で保持しているレベル1ルータの取得
	 * @returns { L1Router<L1RouteBody<T, R1, R2>> }
	 */
	get l1router() {
		return this.#router;
	}

	/**
	 * このルータへのパスの取得
	 * @returns { RoutePath }
	 */
	get path() {
		return new RoutePath('');
	}

	/**
	 * 履歴にルートを追加する
	 * @param { string } route 履歴に追加するルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ(空固定)
	 * @returns { R1 }
	 */
	/* istanbul ignore next */
	push(route, params = {}) {
		return this.#router.push(route);
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { string } route 履歴に置き換えるルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ(空固定)
	 * @returns { R2 }
	 */
	/* istanbul ignore next */
	replace(route, params = {}) {
		return this.#router.replace(route);
	}

	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<R3> }
	 */
	/* istanbul ignore next */
	go(delta) {
		return this.#router.go(delta);
	}

	/**
	 * 現在位置を起点とした直前の履歴へ移動
	 * @returns { Promise<R3> }
	 */
	/* istanbul ignore next */
	back() {
		return this.#router.back();
	}

	/**
	 * 現在位置を起点とした直後の履歴へ移動
	 * @returns { Promise<R3> }
	 */
	/* istanbul ignore next */
	forward() {
		return this.#router.forward();
	}

	/**
	 * 外部からのストレージの変更を通知(pushやreplaceの検知は実施しない)
	 * @returns { Promise<R3>? }
	 */
	/* istanbul ignore next */
	notify() {
		return this.#router.notify();
	}
}

export { ARouter, Router, RouteHistory };
