/**
 * @typedef { import("../level1/route-table.js").RouteParams } L1RouteParams ディレクトリパラメータ
 */

/**
 * ルート情報におけるパスの操作
 */
class RoutePath {
	/** @type { string } パスを示す文字列 */
	#path;

	/**
	 * パスの初期化
	 * @param { string } path パスを示す文字列
	 */
	constructor(path) {
		this.#path = path;
	}

	/**
	 * パスの右からの結合
	 * @param { string | RoutePath } path パスの結合
	 */
	concat(path) {
		const relative = path instanceof RoutePath ? path.#path : path;
		const base = this.#path;

		if (relative.length > 0 && base.length > 0) {
			const f1 = relative.startsWith('/');
			const f2 = base.endsWith('/');
			if (f1 && f2) {
				// 単純文字列結合時に連続した'/'が生じる場合は除去
				return new RoutePath(base + relative.slice(1));
			}
			if (!f1 && !f2) {
				// 単純文字列結合時に'/'による区切りがない場合は追加
				return new RoutePath(base + '/' + relative);
			}
		}
		return new RoutePath(base + relative);
	}

	/**
	 * ディレクトリパラメータのディスパッチ
	 * @param { L1RouteParams } params ルートにディスパッチするパラメータ
	 * @return { RoutePath } ディスパッチ結果
	 */
	dispatch(params) {
		// ディレクトリパラメータが存在しない場合は即時終了
		if (Object.keys(params).length === 0) {
			return new RoutePath(this.#path);
		}

		/** @type { Record<string, number> } */
		const cntMap = {};
		return new RoutePath(this.#path.split('/').map(token => {
			if (token.startsWith(':')) {
				const param = token.slice(1).trim();
				if (param in params) {
					const paramVal = params[param];
					// パラメータの数のカウント
					if (param in cntMap) {
						++cntMap[param];
					}
					else {
						cntMap[param] = 0;
					}
					if (cntMap[param] > 0 && (!Array.isArray(paramVal) || !(cntMap[param] < paramVal.length))) {
						// パラメータの数が不足
						throw new Error('Missing directory parameter.');
					}
					return Array.isArray(paramVal) ? paramVal[cntMap[param]] : paramVal;
				}
				else {
					// ディレクトリパラメータが与えられていない
					throw new Error('Missing directory parameter.');
				}
			}
			return token;
		}).join('/'));
	}

	toString() {
		return this.#path;
	}
}

export { RoutePath };
