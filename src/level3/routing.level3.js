import { RouteTable as L1RouteTable } from "../level1/route-table.js";
import { Router as L1Router } from "../level1/router.js";
import { TraceRoute } from "../level1/trace-route.js";
import { Route as L2Route, ResolveRoute as L2ResolveRoute } from "../level2/route.js";
import { createTraceRouteElement, ARouter as L2ARouter, Router as L2Router, RouteHistory as L2RouteHistory } from "../level2/router.js";

/**
 * @template T
 * @typedef { import("../level1/route-table.js").Route<T> } L1Route ルート情報
 */

/**
 * @template T, R1, R2
 * @typedef { import("../level2/route.js").L1RouteBody<T, R1, R2> } L1RouteBody ルート情報のボディ
 */

/**
 * @template T, R1, R2
 * @typedef { import("../level2/router.js").HistoryStorage<T, R1, R2> } L2HistoryStorage 履歴のストレージ
 */

/**
 * @template R, E
 * @typedef { import("../level1/trace-route.js").TraceRoute<R, E> } TraceRoute ルート解決の経路
 */

/**
 * @typedef { import("../level2/router.js").InputRoute } InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @template T
 * @typedef { L2Route<T, Promise<boolean>, Promise<boolean>> } Route ルート情報クラス
 */

/**
 * @template T
 * @typedef { L2ResolveRoute<T, Promise<boolean>, Promise<boolean>> } ResolveRoute Router.get()などにより取得するルート情報クラス
 */

/**
 * @template T
 * @typedef { L2ARouter<T, Promise<boolean>, Promise<boolean>> } ARouter ルータの抽象クラス
 */

/**
 * @template T
 * @typedef { L2Router<T, Promise<boolean>, Promise<boolean>> } Router ルータクラス
 */

/**
 * @template T
 * @typedef { L2RouteHistory<T, Promise<boolean>, Promise<boolean>, Promise<boolean>, Promise<boolean>> } RouteHistory 履歴操作クラス
 */

/**
 * @template T
 * @typedef { L2HistoryStorage<T, Promise<boolean>, Promise<boolean>> } HistoryStorage 履歴のストレージ
 */

 /**
  * @template T
  * @typedef {{
  *     description?: string;
  *     segment?: boolean;
  *     body?: T;
  *     subroute?: JSONRoute<T>
  * }
  * &
  * ({
  *     redirect?: { route: InputRoute; map?: Record<string, string> };
  *     forward: never;
  * } | {
  *     redirect: never;
  *     forward?: { route: InputRoute; map?: Record<string, string> };
  * })
  * &
  * ({
  *		path: string;
  *		name?: string;
  * } | {
  *		path?: string;
  *		name: string;
  * })} JSONRoute JSON形式のルート情報
  */

const eachCallbackObj = (function () {
    /** @type { ((from: TraceRoute<R, E>?, to: TraceRoute<R, E>?) => unknown)? } */
    let beforeEachCallback = null;
    /** @type { ((from: TraceRoute<R, E>?, to: TraceRoute<R, E>?) => unknown)? } */
    let afterEachCallback = null;

    /**
     * afterEachライフサイクルフックのコールバックを設定
     * @param { ((from: TraceRoute<R, E>?, to: TraceRoute<R, E>?) => unknown)? } callback 
     */
    const beforeEach = (callback) => {
        beforeEachCallback = callback;
    }
    /**
     * afterEachライフサイクルフックのコールバックを設定
     * @param { ((from: TraceRoute<R, E>?, to: TraceRoute<R, E>?) => unknown)? } callback 
     */
    const afterEach = (callback) => {
        afterEachCallback = callback;
    }

    return {
        beforeEach,
        afterEach,
        beforeEachCallback: /** @type { ((from: TraceRoute<R, E>?, to: TraceRoute<R, E>?) => unknown)? } */(beforeEachCallback),
        afterEachCallback: /** @type { ((from: TraceRoute<R, E>?, to: TraceRoute<R, E>?) => unknown)? } */(afterEachCallback)
    };
})();
const { beforeEach, afterEach } = eachCallbackObj;

/**
 * ルータについてオブザーバ
 * @template T, R1, R2
 * @param { L1Route<L1RouteBody<T, R1, R2>> | undefined } route ルート解決したルート情報
 * @param { TraceRoute<L2ARouter<T, R1, R2>, L2ResolveRoute<T, R1, R2>> } trace 現在までの経路
 */
function routerObserver(route, trace) {
    // リダイレクト・フォワードが設定されていれば即時終了
    if (route?.body?.navigate !== undefined) {
        return;
    }

    // 経路情報の変換(動的リダイレクト・フォワード)
    const router = route?.body?.router ?? trace.routes.length > 0 ? trace.routes[trace.routes.length - 1].nexthop : trace.base;
    if (router) {
        const traceRoute = router.lifecycle.routing?.(trace);
        if (traceRoute !== undefined) {
            trace = traceRoute;
        }
    }
    {
        const traceRoute = route?.body?.route?.lifecycle?.routing?.(trace);
        if (traceRoute !== undefined) {
            trace = traceRoute;
        }
    }


    // nexthopが存在すれば後続のルータでルーティング
    return route?.body?.nexthop?.l1router?.routing?.(route, trace) ?? route?.path;
}

/**
 * 履歴についてオブザーバ
 * @template T
 * @param { TraceRoute<ARouter<T>, ResolveRoute<T>>? } from 遷移元のルート解決の経路
 * @param { TraceRoute<ARouter<T>, ResolveRoute<T>>? } to 遷移先のルート解決の経路
 */
async function historyObserver(from, to) {
    if (await eachCallbackObj.beforeEachCallback?.(from, to) === false) {
        return false;
    }

    if (from && to) {
        const fromRoute = from.routes[from.routes.length - 1];
        const toRoute = to.routes[to.routes.length - 1];
        // 同一ルートのときのみupdateを実施する
        if (fromRoute.l1route.body.router === toRoute.l1route.body.router && fromRoute.lifecycle === toRoute.lifecycle) {
            // 任意情報を引き継ぐ
            toRoute.any = fromRoute.any;
            // update
            await fromRoute.l1route.body.router.lifecycle.beforeRouteUpdate?.(fromRoute, toRoute);
            await fromRoute.lifecycle.beforeRouteUpdate?.(fromRoute, toRoute);
            await fromRoute.l1route.body.router.lifecycle.routeUpdate?.(fromRoute, toRoute);
            await fromRoute.lifecycle.routeUpdate?.(fromRoute, toRoute);
            await fromRoute.l1route.body.router.lifecycle.afterRouteUpdate?.(fromRoute, toRoute);
            await fromRoute.lifecycle.afterRouteUpdate?.(fromRoute, toRoute);
        }
        else {
            // leave
            await fromRoute.l1route.body.router.lifecycle.beforeRouteLeave?.(fromRoute, toRoute);
            await fromRoute.lifecycle?.beforeRouteLeave?.(fromRoute, toRoute);
            await fromRoute.l1route.body.router.lifecycle.routeLeave?.(fromRoute, toRoute);
            await fromRoute.lifecycle?.routeLeave?.(fromRoute, toRoute);
            await fromRoute.l1route.body.router.lifecycle.afterRouteLeave?.(fromRoute, toRoute);
            await fromRoute.lifecycle?.afterRouteLeave?.(fromRoute, toRoute);
            // enter
            await toRoute.l1route.body.router.lifecycle.beforeRouteEnter?.(fromRoute, toRoute);
            await toRoute.lifecycle?.beforeRouteEnter?.(fromRoute, toRoute);
            await toRoute.l1route.body.router.lifecycle.routeEnter?.(fromRoute, toRoute);
            await toRoute.lifecycle?.routeEnter?.(fromRoute, toRoute);
            await toRoute.l1route.body.router.lifecycle.afterRouteEnter?.(fromRoute, toRoute);
            await toRoute.lifecycle?.afterRouteEnter?.(fromRoute, toRoute);
        }
    }
    else if (from) {
        const fromRoute = from.routes[from.routes.length - 1];
        // leave
        await fromRoute.l1route.body.router.lifecycle.beforeRouteLeave?.(fromRoute, null);
        await fromRoute.lifecycle?.beforeRouteLeave?.(fromRoute, null);
        await fromRoute.l1route.body.router.lifecycle.routeLeave?.(fromRoute, null);
        await fromRoute.lifecycle?.routeLeave?.(fromRoute, null);
        await fromRoute.l1route.body.router.lifecycle.afterRouteLeave?.(fromRoute, null);
        await fromRoute.lifecycle?.afterRouteLeave?.(fromRoute, null);
    }
    else if (to) {
        const toRoute = to.routes[to.routes.length - 1];
        // enter
        await toRoute.l1route.body.router.lifecycle.beforeRouteEnter?.(null, toRoute);
        await toRoute.lifecycle?.beforeRouteEnter?.(null, toRoute);
        await toRoute.l1route.body.router.lifecycle.routeEnter?.(null, toRoute);
        await toRoute.lifecycle?.routeEnter?.(null, toRoute);
        await toRoute.l1route.body.router.lifecycle.afterRouteEnter?.(null, toRoute);
        await toRoute.lifecycle?.afterRouteEnter?.(null, toRoute);
    }

    if (await eachCallbackObj?.afterEachCallback?.(from, to) === false) {
        return false;
    }
    return true;
}

/**
 * ルータを作成する
 * @template T
 * @param { Route<T> | HistoryStorage<T> } obj ルート解決のベースとなるルート | 履歴を管理するストレージ
 * @returns { ARouter<T> }
 */
function createRouter(obj) {
    /** @type { L1Router<L1RouteBody<T, Promise<boolean>, Promise<boolean>>, ARouter<T>, ResolveRoute<T>> } */
    const l1Router = new L1Router(new L1RouteTable(), createTraceRouteElement, routerObserver);

    // 引数のパターンに応じたルータを返す
    if (obj instanceof L2Route) {
        return new L2Router(l1Router, obj);
    }
    else {
        return new L2RouteHistory(l1Router, obj, historyObserver, historyObserver, historyObserver, historyObserver);
    }
}

/**
 * JSON形式のルート情報をルータに登録する
 * @template T
 * @param { ARouter<T> } router ルート情報を登録するルータ
 * @param { JSONRoute<T>[] } jsonRouteList JSON形式のルート情報のリスト(トポロジカルソートされる)
 * @param { number } size jsonRouteListに対して登録する数
 * @returns { [{ jsonRouteList: JSONRoute<T>[]; router: ARouter<T>; size: number }] } リダイレクト・フォワード先が存在しなくて登録されなかったルート情報の数に関する情報
 */
function loadJSONRouteList(router, jsonRouteList, size = jsonRouteList.length) {
    // 登録済みのルート情報の数
    let regstered = 0;

    /** @type { [{ jsonRouteList: JSONRoute<T>[]; router: ARouter<T>; size: number }] } ルート解決結果 */
    const ret = [];

    while (size !== regstered) {
        // 現在の登録状況の退避
        const temp = regstered;
        
        for (let i = 0; i < size - regstered;) {
            const jsonRoute = jsonRouteList[i];
            // リダイレクト・フォワードの解決先が存在しないときはスキップする
            const navigateRoute = (() => {
                try {
                    return jsonRoute.redirect !== undefined && router.routing(jsonRoute.redirect.route) || jsonRoute.forward !== undefined && router.routing(jsonRoute.forward.route);
                }
                catch {
                    // ディレクトリパラメータの変換により
                    // ディレクトリパラメータのミスマッチが生じて例外が発生する可能性があるため
                    // リダイレクト・フォワードの解決先が存在しない扱いにする
                    return undefined;
                }
            })();
            if (navigateRoute !== false && (navigateRoute === undefined || navigateRoute.routes.length === 0 || navigateRoute.routes[navigateRoute.routes.length - 1].rest !== undefined)) {
                ++i;
                continue;
            }

            // ルート情報を登録する
            const route = jsonRoute.name === undefined ? router.add(jsonRoute.path) : router.add({ name: jsonRoute.name });
            if (jsonRoute.name !== undefined) {
                route.path = jsonRoute.path;
            }
            if (navigateRoute !== false) {
                // ↑は型推論のためのガード条件を記述
                if (jsonRoute.forward !== undefined) {
                    const navigate = { route: navigateRoute.routes[navigateRoute.routes.length - 1].l1route.body.route };
                    if (jsonRoute.forward.map !== undefined) {
                        // ディレクトリパラメータ名の対応関係からディレクトリパラメータの変換を構築する
                        const map = jsonRoute.forward.map;
                        navigate.map = params => Object.fromEntries(Object.entries(map).map(([to, from]) => [to, params[from]]));
                    }
                    route.forward = navigate;
                }
                if (jsonRoute.redirect !== undefined) {
                    const navigate = { route: navigateRoute.routes[navigateRoute.routes.length - 1].l1route.body.route };
                    if (jsonRoute.redirect.map !== undefined) {
                        // ディレクトリパラメータ名の対応関係からディレクトリパラメータの変換を構築する
                        const map = jsonRoute.redirect.map;
                        navigate.map = params => Object.fromEntries(Object.entries(map).map(([to, from]) => [to, params[from]]));
                    }
                    route.redirect = navigate;
                }
            }
            route.l1route.segment = jsonRoute.segment;
            route.body = jsonRoute.body;

            // 別のルータを用いてルート解決する場合
            if (jsonRoute.subroute !== undefined) {
                const subrouter = createRouter(route);
                ret.push(...loadJSONRouteList(subrouter, jsonRoute.subroute));
            }

            // 登録済みのルート情報は後方の未登録のルート情報と入れ替える
            jsonRouteList[i] = jsonRouteList[size - regstered - 1];
            jsonRouteList[size - regstered - 1] = jsonRoute;
            ++regstered;
        }

        // 別のルータで未解決なルートを解決する
        let subregstered = 0;
        for (let i = 0; i < ret.length; ++i) {
            const subret = ret[i];
            if (subret.size !== 0) {
                const newSubret = loadJSONRouteList(subret.router, subret.jsonRouteList, subret.size);
                if (subret.size !== newSubret[newSubret.length - 1].size) {
                    // 解決により減少した未解決のルートの数を記憶
                    subregstered += subret.size - newSubret[newSubret.length - 1].size;
                    // 最後の要素はsubretを更新したものに相当するため置き換える
                    ret[i] = newSubret[newSubret.length - 1];
                    if (newSubret.length > 1) {
                        // 1番目～最後の要素-1の要素はsubret.routerのルート情報に接続されたルータに関するもの(新規生成されたルータ)のため
                        // 単純に新規要素として追加する
                        ret.push(...newSubret.slice(0, -1));
                    }
                }
            }
        }

        // 登録されなくなったら終了
        if (regstered === temp && subregstered === 0) {
            break;
        }
    }

    ret.push({ jsonRouteList, router, size: size - regstered });
    return ret;
}

export { createRouter, beforeEach, afterEach, loadJSONRouteList };
