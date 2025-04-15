import { mergeParams, createPathArray } from "../level1/route-table.js";
import { IRouter as L1Router } from "../level1/router.js";
import { TraceRoute } from "../level1/trace-route.js";
import { RouteHistory as L1RouteHistory } from "../level1/history.js";
import { IHistoryStorage } from "../level1/history-storage.js";
import { RoutePath } from "./route-path.js";
import { Route, ResolveRoute } from "./route.js";

/**
 * @template T
 * @typedef { import("../level1/route-table.js").Route<T> } L1Route ルート情報
 */

/**
 * @typedef { import("../level1/route-table.js").RouteParams } L1RouteParams ディレクトリパラメータ
 */

/**
 * @template T
 * @typedef { import("../level1/route-table.js").ResolveRoute<T> } L1ResolveRoute IRouteTable.get()などより取得するルート情報
 */

/**
 * @typedef { import("../level1/router.js").InputRoute } L1InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @template RT
 * @typedef { import("../level1/trace-route.js").TraceRouteElement<RT> } TraceRouteElement ルータ型からルート解決の要素の型の取得
 */

/**
 * @typedef { { name: string; } | string } InputRoute ルート解決などの際に引数として入力するルート情報(レベル1とは異なりpathを必須にする)
 */

/**
 * @template T
 * @typedef { import("./route.js").RouteLifecycle<T> } RtRouteLifecycle ルート情報に対するライフサイクルフック
*/

/**
 * @template T
 * @typedef { RtRouteLifecycle<T> & {
 *     beforeEach?: (from: Route<T>?, to: Route<T>?) => undefined | boolean | Promise<undefined | boolean>;
 * }} RouteLifecycle ルータに対するライフサイクルフック
 */

/**
 * @template T
 * @typedef { import("./route.js").L1RouteBody<T> } L1RouteBody ルート情報のボディ
 */

/**
 * TraceRouteのroutesの要素の生成
 * @template T
 * @param { L1Router<L1RouteBody<T>> } router ルーティングを行ったルータ
 * @param { L1ResolveRoute<L1RouteBody<T>> | undefined } route 解決をしたルート情報
 * @returns { ResolveRoute<T> | undefined }
 */
function createTraceRouteElement(router, route) {
	return route ? new ResolveRoute(route) : undefined;
}

/**
 * ルータの抽象クラス
 * @template T
 * @abstract
 */
class ARouter {
	/** @type { ReturnType<typeof createTraceRouteElement<T>> } 生成するルート解決結果を示すルート要素の型(型推論でのみ利用) */
	traceRouteElementType;
	/** @type { Route<T> } ルート情報(型推論でのみ利用) */
	routeType;

	/** @type { RouteLifecycle<T> } ルータが持つライフサイクルフック */
	lifecycle = {};

	/**
	 * ルータの初期化
	 * @param { L1Router<L1RouteBody<T>> } router 内部で用いるレベル1ルータ
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
	 * @returns { ARouter<T> }
	 */
	/* istanbul ignore next */
	get base() { throw new Error('not implemented.'); }

	/**
	 * 内部で保持しているレベル1ルータの取得
	 * @returns { L1Router<L1RouteBody<T>> }
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
	 * 現在のルート解決に用いた経路の取得
	 * @return { TraceRoute<ARouter<T>> } ルート解決の経路
	 */
	/* istanbul ignore next */
	get current() { return this.base.current; }

	/**
	 * ルートを追加する
	 * @param { InputRoute } route 追加するルート
	 * @return { Route<T> } 追加したルート情報
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
	 * @return { Route<T> } 削除したルート情報
	 */
	remove(route) {
		const r = this.l1router.routeTable.remove(route);
		return new Route(r);
	}

	/**
	 * ルートの取得
	 * @param { InputRoute } route 取得対象のルート情報
	 * @return { Route<T> | undefined } 解決したルート情報
	 */
	get(route) {
		const r = this.l1router.routeTable.get(route);
		return r ? new ResolveRoute(r) : undefined;
	}

	/**
	 * 履歴にルートを追加する
	 * @param { string } route 履歴に追加するルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { Promise<boolean> }
	 */
	push(route, params = {}) {
		return this.base.push(this.path.dispatch(params).concat(route).toString());
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { string } route 履歴に置き換えるルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { Promise<boolean> }
	 */
	replace(route, params = {}) {
		return this.base.replace(this.path.dispatch(params).concat(route).toString());
	}

	/**
	 * 履歴の操作なしで移動を行う
	 * @param { string | TraceRoute<ARouter<T>> } route 移動先のルート情報
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { Promise<boolean> }
	 */
	transition(route, params = {}) {
		return this.base.transition(route instanceof TraceRoute ? route : this.path.dispatch(params).concat(route).toString());
	}

	/**
	 * ルーティングの実施
	 * @param { string } route 遷移先のルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @return { TraceRoute<ARouter<T>> } ルート解決の経路
	 */
	routing(route, params = {}) {
		return this.base.routing(this.path.dispatch(params).concat(route).toString());
	}
}

/**
 * ルータクラス
 * @template T
 * @extends { ARouter<T> }
 */
class Router extends ARouter {
	/** @type { L1Router<L1RouteBody<T>> } レベル1のルータ(L1RouterObserverによるルート解決を実施する必要がある) */
	#router;
	/** @type { Route<T> } ルート解決のベースとなるルート */
	#prevRoute;

	/**
	 * ルータの初期化
	 * @param { L1Router<L1RouteBody<T>> } router 内部で用いるレベル1ルータ
	 * @param { Route<T> } prevRoute ルート解決のベースとなるルート
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
	 * @returns { ARouter<T> }
	 */
	get base() {
		return this.#prevRoute.l1route.body.router;
	}

	/**
	 * 内部で保持しているレベル1ルータの取得
	 * @returns { L1Router<L1RouteBody<T>> }
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
 * 履歴操作クラス
 * @template T
 * @extends { ARouter<T> }
 */
class RouteHistory extends ARouter {
	/** @type { L1RouteHistory<L1RouteBody<T>> } レベル1のルータ(L1RouterObserverによるルート解決を実施する必要がある) */
	#router;
	/** @type { number } リダイレクトの回数の上限 */
	redirectionLimit = 5;

	/**
	 * ルータの初期化
	 * @param { L1Router<L1RouteBody<T>> } router 内部で用いるレベル1ルータ
	 * @param { IHistoryStorage } storage 履歴を管理するストレージ
	 */
	constructor(router, storage) {
		super(router);
		this.#router = new L1RouteHistory(router, storage);
		// level1のライフサイクルからlevel2のライフサイクルを呼び出す
		this.#router.lifecycle.beforeEnter = async (from, to) => {
			const fromRoute = from && from.routes.length !== 0 ? from.routes[from.routes.length - 1] : null;
			// 前提としてtoにはルート解決結果が入っている
			const toRoute = to.routes[to.routes.length - 1];

			if (!fromRoute) {
				// fromが無効の場合はbeforeEachを呼び出す
				// fromが有効の場合はlevel1のbeforeLeaveでbeforeEachを呼び出す
				const ret = this.lifecycle.beforeEach?.(fromRoute, toRoute)
				if ((ret instanceof Promise ? await ret : ret) === false) {
					return false;
				}
			}

			// 同一ルートのときのみupdateを実施する
			if (fromRoute && fromRoute.l1route.body.router === toRoute.l1route.body.router && fromRoute.lifecycle === toRoute.lifecycle) {
				// 任意情報を引き継ぐ
				toRoute.any = fromRoute.any;
				// update
				const ret1 = fromRoute.l1route.body.router.lifecycle.beforeUpdate?.(fromRoute, toRoute);
				if ((ret1 instanceof Promise ? await ret1 : ret1) !== false) {
					const ret2 = fromRoute.lifecycle.beforeUpdate?.(fromRoute, toRoute);
					return (ret2 instanceof Promise ? await ret2 : ret2) !== false;
				}
			}
			else {
				// enter
				const ret1 = toRoute.l1route.body?.router?.lifecycle?.beforeEnter?.(fromRoute, toRoute);
				if ((ret1 instanceof Promise ? await ret1 : ret1) !== false) {
					const ret2 = toRoute.lifecycle.beforeEnter?.(fromRoute, toRoute);
					return (ret2 instanceof Promise ? await ret2 : ret2) !== false;
				}
			}
			return false;
		};
		this.#router.lifecycle.beforeLeave = async (from, to) => {
			// 前提としてfromにはルート解決結果が入っている
			const fromRoute = from.routes[from.routes.length - 1];
			const toRoute = to && to.routes.length !== 0  ? to.routes[to.routes.length - 1] : null;

			// fromが有効の場合はbeforeEachを呼び出す
			// fromが無効の場合はlevel1のbeforeEnterでbeforeEachを呼び出す
			const ret = this.lifecycle.beforeEach?.(fromRoute, toRoute)
			if ((ret instanceof Promise ? await ret : ret) === false) {
				return false;
			}

			if (fromRoute) {
				if (toRoute && fromRoute.l1route.body.router === toRoute.l1route.body.router && fromRoute.lifecycle === toRoute.lifecycle) {
					// updateは実施しない
				}
				else {
					// leave
					fromRoute.l1route.body?.router?.lifecycle?.beforeLeave?.(fromRoute, toRoute);
					fromRoute.lifecycle?.beforeLeave?.(fromRoute, toRoute);
				}
			}
		};
	}

	/**
	 * ルート解決の基点となるルータの取得
	 * @returns { ARouter<T> }
	 */
	get base() {
		return this;
	}

	/**
	 * 内部で保持しているレベル1ルータの取得
	 * @returns { L1Router<L1RouteBody<T>> }
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
	 * 現在のルート解決に用いた経路の取得
	 */
	/* istanbul ignore next */
	get current() { return this.#router.current; }

	/**
	 * 履歴にルートを追加する
	 * @param { string } route 履歴に追加するルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ(空固定)
	 * @returns { Promise<boolean> }
	 */
	/* istanbul ignore next */
	push(route, params = {}) {
		return this.#router.push(Object.keys(params).length == 0 ? route : this.routing(route, params).path);
	}

	/**
	 * 履歴にルートを置き換える
	 * @param { string } route 履歴に置き換えるルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ(空固定)
	 * @returns { Promise<boolean> }
	 */
	/* istanbul ignore next */
	replace(route, params = {}) {
		return this.#router.replace(Object.keys(params).length == 0 ? route : this.routing(route, params).path);
	}

	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<boolean> }
	 */
	/* istanbul ignore next */
	go(delta) {
		return this.#router.go(delta);
	}

	/**
	 * 現在位置を起点とした直前の履歴へ移動
	 * @returns { Promise<boolean> }
	 */
	/* istanbul ignore next */
	back() {
		return this.#router.back();
	}

	/**
	 * 現在位置を起点とした直後の履歴へ移動
	 * @returns { Promise<boolean> }
	 */
	/* istanbul ignore next */
	forward() {
		return this.#router.forward();
	}

	/**
	 * 履歴の操作なしで移動を行う
	 * @param { string | TraceRoute<ARouter<T>> } route 移動先のルート情報
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @returns { Promise<boolean> }
	 */
	/* istanbul ignore next */
	transition(route, params = {}) {
		return this.#router.transition(route instanceof TraceRoute ? route : this.routing(route, params));
	}

	/**
	 * 外部からのストレージの変更を通知(pushやreplaceの検知は実施しない)
	 * @returns { Promise<boolean>? }
	 */
	/* istanbul ignore next */
	notify() {
		return this.#router.notify();
	}

	/**
	 * ルーティングの実施
	 * @param { string } route 遷移先のルート情報(ディレクトリパラメータは含まない)
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @return { TraceRoute<ARouter<T>> } ルート解決の経路
	 */
	routing(route, params = {}) {
		/** @type { L1InputRoute } 次のルート解決に用いるルート情報 */
		let nextRoute = { path: route };
		/** @type { string[] } 最後にフォワードにより与えられたパス */
		const forwardPath = [];

		let cnt = 0;
		while (cnt++ < this.redirectionLimit) {
			// ルート解決の実施
			const traceRoute = this.#router.routing(nextRoute, new TraceRoute(this));
			/* istanbul ignore next */
			if (traceRoute.routes.length === 0) {
				// ルート情報自体が存在しなければリダイレクトやフォワードもないため終了
				return traceRoute;
			}
			const lastRoute = traceRoute.routes[traceRoute.routes.length - 1];

			const to = lastRoute.l1route.body.navigate;
			if (to === undefined) {
				// リダイレクトやフォワードがなければルート解決完了
				return traceRoute;
			}

			// ルート解決の再実施のためのルート情報の構築
			nextRoute = {};
			const params = (() => {
				/** @type { L1RouteParams } */
				const temp = {};
				mergeParams(temp, ...(traceRoute.routes.map(val => val.params ?? {})));
				return to?.map !== undefined ? to.map(temp) : temp;
			})();
			const rest = lastRoute.rest ?? '';
			const lastRoutePath = createPathArray(rest.length === 0 ? traceRoute.path : traceRoute.path.slice(0, -rest.length));
			// フォワードにより形成されたpath内でのリダイレクトは代わりにフォワードを実施
			if (to.type === 'redirect' && forwardPath.length <= lastRoutePath.length) {
				// リダイレクト用のルート情報の構築
				nextRoute.path = to.route.path.dispatch(params).concat(rest).toString();
				forwardPath.splice(0);
			}
			else {
				// フォワードのルート情報の構築
				const temp = to.route.path.dispatch(params);
				nextRoute.rest = temp.concat(rest).toString();
				nextRoute.path = traceRoute.path;
				// フォワードするパスの記憶
				const nextForwardPath = createPathArray(temp.toString());
				forwardPath.splice(0, lastRoutePath.length, ...nextForwardPath);
			}
		}

		throw new Error('There are too many redirects and forwards.');
	}
}

export { createTraceRouteElement, ARouter, Router, RouteHistory };
