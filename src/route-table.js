/**
 * @typedef { Record<string, string | string[]> } RouteParams ディレクトリパラメータ
 */

/**
 * @template T
 * @typedef {{
 *		params?: RouteParams;
 *		search?: string;
 *		body: T;
 *		segment?: boolean;
 *		rest?: string;
 * } & ({
 *		path: string;
 * } | {
 *		name: string;
 * } | {
 *		path: string;
 *		name: string;
 * })} Route ルート情報
 */

/**
 * @template T
 * @typedef {{
 * 		name: string;
 * 		route?: Route<T> & { path: string };
 *		parent?: RouteTree<T>;
 * 		children?: { [K: string]: RouteTree<T> };
 * 		params?: { [K: string]: RouteTree<T> };
 * }} RouteTree ルート解決のためのツリー
 */

/**
 * ルートテーブルのインターフェース
 * @template T
 * @interface
 */
/* istanbul ignore next */
class IRouteTable {
	/**
	 * ルートの取得(ルート解決)
	 * @param { string | Route<T> } route 遷移先のルート情報
	 * @return { Route<T> & { search: string; } | undefined } 解決したルート情報
	 */
	get(route) { throw new Error('not implemented.'); }
}

/**
 * ルートテーブル
 * @template T
 * @implements { IRouteTable<T> }
 */
class RouteTable {
	/**
	 * @type { RouteTree<T> } ルート解決のためのツリー
	 */
	#routeTree = { name: '', parent: null };
	/**
	 * @type { { [K: string ]: Route<T> & { name: string } } } ルートの名称についてのインデックス
	 */
	#routeNameIndex = {};

	/** @enum { string } トークンの種類 */
	static #TOKEN_TYPE = {
		none: '',
		children: 'children',
		params: 'params'
	}

	/**
	 * ルートテーブルの初期化
	 * @param { Route<T>[] } routes 初期状態のルート情報
	 */
	constructor(routes) {
		Object.freeze(this.#routeTree.name);
		Object.freeze(this.#routeTree.parent);

		for (const route of routes) {
			this.add(route);
		}
	}

	/**
	 * トークンの種類の取得
	 * @param { string } token 種類の取得対象のトークン
	 * @return { [string, string] } トークンのタイプと整形済みトークンのペア
	 */
	static #tokenType(token) {
		if (token.startsWith(':')) {
			return [ RouteTable.#TOKEN_TYPE.params, token.slice(1).trim() ];
		}
		return [ RouteTable.#TOKEN_TYPE.children, token ];
	}

	// /**
	//  * ルートツリーの取得
	//  */
	// get routeTree() {
	// 	return this.#routeTree;
	// }

	// /**
	//  * ルートのインデックスの取得
	//  */
	// get routeNameIndex() {
	// 	return this.#routeNameIndex;
	// }

	/**
	 * @typedef {{
	 *		subtree: RouteTree<T>;
	 * 		param: string;
	 * 		depth: number;
	 * }} StackElement 探索で用いるスタックの要素
	 * @typedef {{
	 *		tree: RouteTree<T>;
	 * 		params?: RouteParams;
	 * 		rest: string[];
	 * }} FindResult ルートの探索結果
	 */

	/** @type { (stack: StackElement) => RouteParams } ディレクトリパラメータのスタックから連想配列へ変換 */
	#toParams(stack) {
		/** @type { RouteParams } */
		const result = [];
		for (const { subtree, param, depth } of stack) {
			const preformattedToken = RouteTable.#tokenType(subtree.name)[1];
			// ディレクトリパラメータを配列で格納する
			if (preformattedToken in result) {
				if (Array.isArray(result[preformattedToken])) {
					result[preformattedToken] = [...result[preformattedToken], param];
				}
				else {
					result[preformattedToken] = [result[preformattedToken], param];
				}
			}
			// ディレクトリパラメータを文字列で格納する
			else {
				result[preformattedToken] = param;
			}
		}
		return result;
	};

	/**
	 * pathによるルートの探索(ルート解決)
	 * @param { string | Route<T> & { path: string } } route 探索対象のルート情報
	 * @param { boolean } matching ディレクトリパラメータのマッチングを行うかの指定
	 * @return { FindResult } 探索結果のルート情報
	 */
	#findByPath(route, matching) {
		/** @type { string } ルートへのパス */
		const path = typeof route === 'string' ? route : route.path;
		let tree = this.#routeTree;
		const list = path.split('/');
		/** @type { StackElement[] } ディレクトリパラメータのためのスタック */
		const paramsStack = [];
		/** @type { StackElement[] } 深さ優先探索のためのスタック */
		const depthStack = [];

		// RootからRouteを探索
		for (let i = 0; i < list.length; ++i) {
			const token = list[i].trim();
			// '/path/'と'/path'のようなパスなどを区別しない
			if (token.length === 0) {
				continue;
			}
			const type = RouteTable.#tokenType(token)[0];
			if (matching) {
				// ルートのセグメントがtrueのときはこの時点のルートをルート解決候補としてスタックに積む
				if (tree?.route?.segment === true) {
					depthStack.push({ subtree: tree, param: '', depth: i });
				}
				// ディレクトリパラメータによるルート解決候補をスタックに積む
				if ('params' in tree && Object.keys(tree.params).length !== 0) {
					for (const treeKey in tree.params) {
						depthStack.push({ subtree: tree.params[treeKey], param: token, depth: i });
					}
				}

				if (!('children' in tree) || !(token in tree.children)) {
					// ルートが見つからないかつバックトラッキング不可の場合は終了
					if (depthStack.length === 0) {
						return { tree, rest: list.slice(i)
							, ...(paramsStack.length === 0 ? {} : { params: this.#toParams(paramsStack) }) };
					}
					// バックトラッキングの実施
					const { subtree, param, depth } = depthStack.pop();
					while (paramsStack.length !== 0 && paramsStack[paramsStack.length - 1].depth >= depth) {
						paramsStack.pop();
					}
					// ディレクトリパラメータではない場合(tree.route.segment === trueも満たす)
					if (param.length === 0/* && tree?.route?.segment === true*/) {
						return { tree: subtree, rest: list.slice(depth)
							, ...(paramsStack.length === 0 ? {} : { params: this.#toParams(paramsStack) }) };
					}
					// ディレクトリパラメータの場合
					paramsStack.push({ subtree, param, depth });
					tree = subtree;
					i = depth;
				}
				else {
					tree = tree.children[token];
					// ルートが見つかった場合はそのまま終了
					if (i + 1 === list.length && 'route' in tree && tree.route !== undefined) {
						break;
					}
				}
			}
			else {
				if (!(type in tree) || !(token in tree[type])) {
					// バックトラッキングは行わずそのまま終了
					return { tree, rest: list.slice(i) };
				}
				else {
					tree = tree[type][token];
				}
			}
		}

		return { tree, rest: []
			, ...(paramsStack.length === 0 ? {} : { params: this.#toParams(paramsStack) }) };
	}

	/**
	 * nameによるルートの探索(ルート解決)
	 * @param { Route<T> & { name: string } } route 探索対象のルート情報
	 * @return { Route<T> | undefined } 探索結果のルート情報
	 */
	#findByName(route) {
		if (route.name in this.#routeNameIndex) {
			return this.#routeNameIndex[route.name];
		}
		return undefined;
	}

	/**
	 * Proxyでラップしたルートを得る
	 * @param { Route<T> } route 
	 * @param { Partial<Route<T>> } getoption 
	 */
	#wrapWithProxy(route, getoption = {}) {
		const routeTable = this;
		return new Proxy(route, {
			get(target, prop, receiver) {
				if ((prop in getoption) && (getoption[prop] !== undefined)) { return getoption[prop]; }
				return Reflect.get(...arguments);
			},
			set(obj, prop, value) {
				if (prop === 'path' || prop === 'name') {
					if (typeof value === 'string') {
						// ルートテーブルを修正する
						routeTable.replace(obj, { [prop]: value });
						return true;
					}
					throw new Error(`'${value}' was not 'String' type.`);
				}
				return Reflect.set(...arguments);
			},
			has(target, key) {
				if ((key in getoption) && (getoption[key] !== undefined)) { return true; }
				return key in target;
			}
		});
	}

	/**
	 * ルートの置換を行う
	 * @param { Route<T> | string | undefined } dest 置換先のルート。undefinedの場合は新規作成する
	 * @param { Route<T> | string | undefined } src 置換元のルート。stringの場合はpathのみの置換、undefinedの場合はdestの削除のみ行う
	 * @return { Route<T> | undefined } srcがundefinedであるときは置換元のルート、そうでない場合は置換結果のルート
	 */
	replace(dest, src) {
		let result = undefined;

		// 不正な引数型の組み合わせの検査
		if (dest === undefined && typeof src === 'string') {
			throw new Error(`The combination of 'dest' type 'undefined' and 'src' type 'String' is invalid.`);
		}

		// 置換元の削除の実施
		if (dest !== undefined) {
			// 削除対象の存在チェック
			let tree = undefined, rest = undefined, routeByName = undefined;
			let removePath = undefined;
			if (typeof dest === 'string' || 'path' in dest) {
				({ tree, rest } = this.#findByPath(dest, false));
				if (rest.length !== 0) {
					throw new Error(`The Route '${dest.path ?? dest}' was not exists`);
				}
				removePath = tree.route.path;
			}
			if (typeof dest !== 'string' && 'name' in dest) {
				routeByName = this.#findByName(dest);
				if (routeByName === undefined) {
					throw new Error(`The Route name '${dest.name}' was not exists`);
				}
			}

			// pathによる削除の実施
			if (typeof dest === 'string' || 'path' in dest) {
				result = tree.route;
				delete tree.route;
				let p = tree;
				// 葉から順にルート情報を削除する
				while (p.parent !== null && p.name.length !== 0) {
					const type = RouteTable.#tokenType(p.name)[0];
					// 子情報が存在しなければ親から自ノードを削除
					if ((!('children' in p) || Object.keys(p.children).length === 0) &&
						(!('params' in p) || Object.keys(p.params).length === 0)) {
						delete p.parent[type][p.name];
						p = p.parent;
					}
					else {
						break;
					}
				}
				// ルートのインデックスからも削除(destで指定されている場合は実施しない)
				if ('name' in result && result.name !== dest?.name) {
					this.#removeOnlyName(result);
				}
			}
			// nameによる削除の実施
			if (typeof dest !== 'string' && 'name' in dest) {
				result = routeByName;
				delete this.#routeNameIndex[dest.name];
				// ルートツリーからも削除(destで指定されている場合は実施しない)
				if ('path' in result && removePath !== result.path) {
					this.#removeOnlyPath(result);
				}
			}
		}

		// 置換元のルートの追加
		if (src !== undefined) {
			// 挿入対象のルートの構築
			if (result === undefined) {
				// 外部からpathやnameの変更を禁止するためにシャローコピー
				result = { ...src };
			}
			else {
				// 単純にルート情報を各項目で置き換える
				if (typeof src === 'string') {
					result.path = src;
				}
				else {
					for (const key in src) {
						result[key] = src[key];
					}
				}				
			}

			// pathによる追加の実施
			if (typeof src === 'string' || 'path' in src) {
				const { tree, rest } = this.#findByPath(src, false);
				let p = tree;
				// ルートの挿入位置までツリーを構築
				for (const token of rest.map(x => x.trim())) {
					if (token.length === 0) {
						continue;
					}
					const type = RouteTable.#tokenType(token)[0];
					p[type] = p[type] || {};
					p[type][token] = { name: token, parent: p };
					p = p[type][token];
				}
				// 不整合なnameに対応するルートを削除
				if (p.route !== undefined && 'name' in p.route) {
					const name = p.route.name;
					if (name !== src?.name) {
						this.#removeOnlyName(p.route);
					}
				}
				p.route = result;
			}
			// nameによる追加の実施
			if (typeof src !== 'string' && 'name' in src) {
				// 不整合なpathに対応するルートを削除
				if (this.#findByName(src) !== undefined && 'path' in this.#routeNameIndex[src.name]) {
					const path = this.#routeNameIndex[src.name].path;
					if (path !== src?.path) {
						this.#removeOnlyPath(this.#routeNameIndex[src.name]);
					}
				}
				this.#routeNameIndex[src.name] = result;
			}
		}
		if (result !== undefined) {
			if (src !== undefined) {
				// ルートテーブルに存在するルートを返す場合はProxyでラップしてpathの変更を検知できるようにする
				return this.#wrapWithProxy(result);
			}
			return result;
		}
		return undefined;
	}

	/**
	 * ルートを追加する
	 * 既に存在する場合は上書きする
	 * @param { Route<T> } route 追加するルート
	 * @return { Route<T> } 追加したルート情報
	 */
	add(route) {
		return this.replace(undefined, route);
	}

	/**
	 * ルートの削除
	 * @param { string | Route<T> } route 削除対象のルート情報
	 * @return { Route<T> } 削除したルート情報
	 */
	remove(route) {
		return this.replace(route, undefined);
	}

	/**
	 * ルートツリーのみでのルート情報の削除
	 * @param { Route<T> & { path: string; name: string; } } route 削除対象のルート情報
	 */
	#removeOnlyPath(route) {
		const name = route.name;
		delete route.name;
		this.remove({ path: route.path });
		route.name = name;
	}

	/**
	 * ルートのインデックスのみでのルート情報の削除
	 * @param { Route<T> & { path: string; name: string; } } route 削除対象のルート情報
	 */
	#removeOnlyName(route) {
		const path = route.path;
		delete route.path;
		this.remove({ name: route.name });
		route.path = path;
	}

	/**
	 * ルートの取得
	 * @param { string | Route<T> } route 取得対象のルート情報
	 * @return { Route<T> & { search: string; } | undefined }取得したルート情報
	 */
	get(route) {
		// pathによる取得
		if (typeof route === 'string' || 'path' in route) {
			const { tree, rest, params } = this.#findByPath(route, true);

			if ('route' in tree && tree.route !== undefined) {
				if (tree.route?.segment === true) {
					// restを許容する
					return this.#wrapWithProxy(tree.route, { params, search: 'path', rest: rest.join('/') });
				}
				else if (rest.length === 0) {
					return this.#wrapWithProxy(tree.route, { params, search: 'path' });
				}
			}
			return undefined;
		}
		// nameによる取得
		else {
			const r = this.#findByName(route);
			if (r !== undefined) {
				return this.#wrapWithProxy(r, { search: 'name' });
			}
			return undefined;
		}
	}
}

export { IRouteTable, RouteTable };
