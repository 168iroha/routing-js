/**
 * @template RT
 * @typedef { RT extends { traceRouteElementType: infer U } ? U : never } TraceRouteElement ルータ型からルート解決の要素の型の取得
 */

/**
 * ルート解決の経路
 * @template RT
 */
class TraceRoute {
	/** @type { RT | undefined } 経路の基点となるルータ */
	base;
	/** @type { string | undefined } 経路を示すパス(nameで解決された場合はundefinedとなる) */
	path;
	/** @type { TraceRouteElement<RT>[] } 経路を示す配列 */
	routes;

	/**
	 * コンストラクタ
	 * @param { RT | undefined } base 経路の基点となるルータ
	 * @param { string | undefined } path 経路を示すパス
	 * @param { TraceRouteElement<RT>[] } routes 経路を示す配列
	 */
	constructor(base = undefined, path = undefined, routes = []) {
		this.base = base;
		this.path = path;
		this.routes = routes;
	}

	/**
	 * 経路の複製
	 */
	/* istanbul ignore next */
	clone() {
		return new TraceRoute(this.base, this.path, [...this.routes]);
	}
}

export { TraceRoute };
