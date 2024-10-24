import { IHistoryStorage } from "../level1/history-storage.js";
import { RouteTable as L1RouteTable } from "../level1/route-table.js";
import { Router as L1Router } from "../level1/router.js";
import { TraceRoute } from "../level1/trace-route.js";
import { Route as L2Route, ResolveRoute as L2ResolveRoute } from "../level2/route.js";
import { createTraceRouteElement, ARouter, Router, RouteHistory } from "../level2/router.js";

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
  * @typedef {{
  *     description?: string;
  *     segment?: boolean;
  *     body?: T;
  * }
  * &
  * ({
  *     redirect?: InputRoute;
  *     forward: never;
  * } | {
  *     redirect: never;
  *     forward?: InputRoute;
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
 * @param { TraceRoute<ARouter<T, R1, R2>, L2ResolveRoute<T, R1, R2>> } trace 現在までの経路
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
        const traceRoute = route.body?.route?.lifecycle?.routing?.(trace);
        if (traceRoute !== undefined) {
            trace = traceRoute;
        }
    }


    // nexthopが存在すれば後続のルータでルーティング
    return route?.body?.nexthop?.l1router?.routing?.(route, trace) ?? route?.path;
}

/**
 * 履歴についてオブザーバ
 * @template T, R1, R2
 * @param { TraceRoute<ARouter<T, R1, R2>, L2ResolveRoute<T, R1, R2>>? } from 遷移元のルート解決の経路
 * @param { TraceRoute<ARouter<T, R1, R2>, L2ResolveRoute<T, R1, R2>>? } to 遷移先のルート解決の経路
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
 * @template T, R1, R2
 * @param { L2Route<T, R1, R2> | L2HistoryStorage<T, R1, R2> } obj ルート解決のベースとなるルート | 履歴を管理するストレージ
 * @returns { ARouter<T, R1, R2> }
 */
function createRouter(obj) {
    /** @type { L1Router<L1RouteBody<T, R1, R2>, ARouter<T, R1, R2>, L2ResolveRoute<T, R1, R2>> } */
    const l1Router = new L1Router(new L1RouteTable(), createTraceRouteElement, routerObserver);

    // 引数のパターンに応じたルータを返す
    if (obj instanceof L2Route) {
        return new Router(l1Router, obj);
    }
    else {
        return new RouteHistory(l1Router, obj, historyObserver, historyObserver, historyObserver);
    }
}

/**
 * JSON形式のルート情報をルータに登録する
 * @param { ARouter<T, R1, R2> } router ルート情報を登録するルータ
 * @param { JSONRoute<T>[] } jsonRouteList JSON形式のルート情報のリスト(トポロジカルソートされる)
 * @returns { number } リダイレクト・フォワード先が存在しなくて登録されなかったルート情報の数
 */
function loadJSONRouteList(router, jsonRouteList) {
    // 登録済みのルート情報の数
    let regstered = 0;

    while (jsonRouteList.length !== regstered) {
        // 現在の登録状況の退避
        const temp = regstered;
        
        for (let i = 0; i < jsonRouteList.length - regstered;) {
            const jsonRoute = jsonRouteList[i];
            // リダイレクト・フォワードの解決先が存在しないときはスキップする
            if (jsonRoute.redirect !== undefined && router.get(jsonRoute.redirect) === undefined || jsonRoute.forward !== undefined && router.get(jsonRoute.forward) === undefined) {
                ++i;
                continue;
            }

            // ルート情報を登録する
            const route = jsonRoute.name === undefined ? router.add(jsonRoute.path) : router.add({ name: jsonRoute.name });
            if (jsonRoute.name !== undefined) {
                route.path = jsonRoute.path;
            }
            if (jsonRoute.forward !== undefined) {
                route.forward = { route: router.get(jsonRoute.forward) };
            }
            if (jsonRoute.redirect !== undefined) {
                route.redirect = { route: router.get(jsonRoute.redirect) };
            }
            route.l1route.segment = jsonRoute.segment;
            route.body = jsonRoute.body;

            // 登録済みのルート情報は後方の未登録のルート情報と入れ替える
            jsonRouteList[i] = jsonRouteList[jsonRouteList.length - regstered - 1];
            jsonRouteList[jsonRouteList.length - regstered - 1] = jsonRoute;
            ++regstered;
        }

        // 登録されなくなったら終了
        if (regstered === temp) {
            break;
        }
    }

    return jsonRouteList.length - regstered;
}

export { createRouter, beforeEach, afterEach, loadJSONRouteList };
