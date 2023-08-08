
/**
 * ルート解決の経路
 * @template R, E
 */
class TraceRoute {
	/** @type { R | undefined } 経路の基点となるルータ */
	base;
	/** @type { string | undefined } 経路を示すパス */
	path;
	/** @type { E[] } 経路を示す配列 */
	routes;

	/**
	 * コンストラクタ
	 * @param { R | undefined } base 
	 * @param { string | undefined } path 
	 * @param { E[] } routes 
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
