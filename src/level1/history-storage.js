/**
 * @template T
 * @typedef { import("./route-table.js").Route<T> } Route ルート情報
 */

/**
 * @typedef { import("./route-table.js").InputRoute } InputRoute ルート解決などの際に引数として入力するルート情報
 */

/**
 * @typedef { { id: number; route: InputRoute? } } RouteHistoryState 履歴操作のためのルートの状態
 */

/**
 * 履歴のストレージのインターフェース
 * @interface
 */
/* istanbul ignore next */
class IHistoryStorage {
	/**
	 * 履歴にルートを追加する
	 * @param { InputRoute } route 履歴に追加するルート情報
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	push(route) { throw new Error('not implemented.'); }
	/**
	 * 履歴にルートを置き換える
	 * @param { InputRoute } route 履歴に置き換えるルート情報
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	replace(route) { throw new Error('not implemented.'); }
	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	go(delta) { throw new Error('not implemented.'); }

	/**
	 * カレントの取得
	 * @returns { RouteHistoryState } カレントのルート
	 */
	get state() { throw new Error('not implemented.'); }
}

/**
 * History APIによる履歴のストレージ
 * @implements { IHistoryStorage }
 */
class BrowserHistoryStorage {
	/**
	 * @type { History } 履歴情報
	 */
	#history;
	/**
	 * @type { (route: InputRoute) => string | URL } ルート情報からHistory APIで利用するURLを生成する関数
	 */
	#makeUrl;
	/**
	 * @type { number } 履歴情報のカレントポジション
	 */
	#currentPos = 0;
	/**
	 * @type { number } 履歴の長さ
	 */
	#length = 0;
	/**
	 * @type { { id: number; resolve: (value: RouteHistoryState) => void }[] } go()の解決を管理するキュー
	 */
	#stateQueue = [];
	/**
	 * @type { number } go()におけるタイムアウトまでのミリ秒
	 */
	timeout;

	/**
	 * History APIによる履歴のストレージの初期化
	 * @param { History } history 履歴情報
	 * @param { (route: InputRoute) => string } makeUrl ルート情報からHistory APIで利用するURLを生成する関数
	 */
	constructor(history, makeUrl = route => `${route.path ?? route.name ?? route}`, timeout = 100) {
		this.#history = history;
		this.#makeUrl = makeUrl;
		// 既に存在する履歴の引継ぎ
		if (Number.isInteger(this.#history.state?.id)) {
			this.#currentPos = this.#history.state.id;
		}
		else {
			this.#history.replaceState({ id: 0, route: null }, '');
		}
		this.#length = this.#currentPos + 1;
		this.timeout = timeout;
		// go()についてのキューの管理
		window.addEventListener('popstate', e => {
			const state = e.state;
			if (state && this.#stateQueue.length > 0 && state?.id === this.#stateQueue[0].id) {
				// キューをポップして解決済みにする
				const { id, resolve } = this.#stateQueue.shift();
				resolve(state);
			}
		});
	}

	/**
	 * 履歴にルートを追加する
	 * @param { InputRoute } route 履歴に追加するルート情報
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	push(route) {
		++this.#currentPos;
		this.#length = this.#currentPos + 1;
		this.#history.pushState({ id: this.#currentPos, route }, '', this.#makeUrl(route));
		return Promise.resolve(this.state);
	}
	/**
	 * 履歴にルートを置き換える
	 * @param { InputRoute } route 履歴に置き換えるルート情報
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	replace(route) {
		this.#history.replaceState({ id: this.#currentPos, route }, '', this.#makeUrl(route));
		return Promise.resolve(this.state);
	}
	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	go(delta) {
		// go()についてのタスクのpushする
		let state = null;
		const stateElement = {
			// clamp
			id: Math.max(0, Math.min(this.#currentPos + delta, this.#length - 1)),
			resolve: /* istanbul ignore next */value => { state = value; }
		};
		const realDelta = stateElement.id - this.#currentPos;
		this.#stateQueue.push(stateElement);

		if (delta === 0 || realDelta !== 0) {
			// clampした範囲で移動をする
			this.#history.go(realDelta);
		}
		else {
			// 移動の必要がない場合はキューを元に戻してから終了させる
			this.#stateQueue.pop();
			return Promise.resolve(this.state);
		}

		let timeoutID = null;
		return new Promise((resolve, reject) => {
			stateElement.resolve = resolve;
			/* istanbul ignore next */
			if (state) {
				// Promiseのresolve設定時点でpopstateで解決していた場合は即解決とする
				resolve(state);
			}
			timeoutID = setTimeout(() => {
				// タイムアウト
				reject(new Error('timeout'));
			}, this.timeout);
		}).then(response => {
			// タイマーを中止する
			/* istanbul ignore next */
			if (timeoutID) {
				clearTimeout(timeoutID);
			}
			this.#currentPos = response.id;
			return response;
		});
	}

	/**
	 * カレントの取得
	 * @returns { RouteHistoryState } カレントのルート
	 */
	get state() {
		return this.#history.state;
	}
}

/**
 * メモリ上で管理する履歴のストレージ
 * @implements { IHistoryStorage }
 */
class MemoryHistoryStorage {
	/**
	 * @type { RouteHistoryState[] } 履歴情報
	 */
	#historyStack = [{ id: 0, route: null }];
	/**
	 * @type { number } 履歴情報のカレントポジション
	 */
	#currentPos = 0;

	/**
	 * 履歴にルートを追加する
	 * @param { InputRoute } route 履歴に追加するルート情報
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	push(route) {
		// this.#currentPos以降の要素を削除して挿入
		++this.#currentPos;
		this.#historyStack.splice(this.#currentPos, this.#historyStack.length, { id: this.#currentPos, route });
		return Promise.resolve(this.state);
	}
	/**
	 * 履歴にルートを置き換える
	 * @param { InputRoute } route 履歴に置き換えるルート情報
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	replace(route) {
		this.#historyStack.splice(this.#currentPos, 1, { id: this.#currentPos, route });
		return Promise.resolve(this.state);
	}
	/**
	 * 現在位置を起点とした履歴の移動
	 * @param { number } delta 移動先の相対位置
	 * @returns { Promise<RouteHistoryState> } 移動先のルート
	 */
	go(delta) {
		// clamp
		this.#currentPos = Math.max(0, Math.min(this.#currentPos + delta, this.#historyStack.length - 1));
		return Promise.resolve(this.state);
	}

	/**
	 * カレントの取得
	 * @returns { RouteHistoryState } カレントのルート
	 */
	get state() {
		return this.#historyStack[this.#currentPos];
	}
}

export { IHistoryStorage, BrowserHistoryStorage, MemoryHistoryStorage };
