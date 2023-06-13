
import { RouteTable } from '../../src/route-table.js';

describe('RouteTable', () => {
	/** 共通して用いるルート(ディレクトリパラメータなし) */
	const routesWithoutParams = [
		{ path: '/', body: '/' },
		{ path: '/page1', body: '/page1' },
		{ path: '/page1/page1-1', body: '/page1/page1-1' },
		{ path: '/page1/page1-2', body: '/page1/page1-2' },
		{ path: '/page2/page2-1', body: '/page2/page2-1' }
	];
	/** 共通して用いるルート(ディレクトリパラメータあり) */
	const routesWithParams = [
		{ path: '/', body: '/' },
		{ path: '/page1', body: '/page1' },
		{ path: '/page1/page1-1', body: '/page1/page1-1' },
		{ path: '/page2/:pages2-1', body: '/page2/:pages2-1' },
		{ path: '/:pages1/page1-1', body: '/:pages1/page1-1' },
		{ path: '/:pages1/page1-2', body: '/:pages1/page1-2' },
		{ path: '/:pages2/page2-1', body: '/:pages2/page2-1' }
	];
	/** 共通して用いるルート(名前付きルートあり) */
	const namedRoutes = [
		{ path: '/', body: '/' },
		{ path: '/page1', body: '/page1' },
		{ path: '/page2', name: 'page2', body: '/page2' },
		{ path: '/page3', name: 'page3', body: '/page3' },
		{ name: 'page4', body: 'page4' },
		{ name: 'page5', body: 'page5' }
	];
	/** 共通して用いるルート(segment指定されたルートあり) */
	const routesWithSegment = [
		{ path: '/', body: '/' },
		{ path: '/page1', body: '/page1/**', segment: true },
		{ path: '/page1/page1-1', body: '/page1/page1-1' },
		{ path: '/:pages', body: '/:pages/**', segment: true },
		{ path: '/:pages/pages-1', body: '/:pages/pages-1' }
	];

	// /**
	//  * ルートツリーから親情報を再帰的に削除
	//  * @template T
	//  * @param { RouteTree<T> } routeTree 
	//  */
	// const deleteParentInfo = routeTree => {
	// 	/** @type { RouteTree<T>[] } */
	// 	const stack = [routeTree];
	// 	// routeTreeからparent属性を排除する
	// 	while (stack.length !== 0) {
	// 		/** @type { RouteTree<T> } */
	// 		const tree = stack.pop();
	// 		delete tree.parent;
	// 		if ('children' in tree) {
	// 			for (const key in tree.children) {
	// 				stack.push(tree.children[key]);
	// 			}
	// 		}
	// 		if ('params' in tree) {
	// 			for (const key in tree.params) {
	// 				stack.push(tree.params[key]);
	// 			}
	// 		}
	// 	}
	// 	return routeTree;
	// };

	// describe('RouteTable.constructor()', () => {
	// 	it('ディレクトリパラメータなしのルートツリーの構築', () => {
	// 		const routeTable = new RouteTable(routesWithoutParams);
	// 		const routeTree = deleteParentInfo(structuredClone(routeTable.routeTree));

	// 		expect(routeTree).toEqual({
	// 			name: '',
	// 			route: routesWithoutParams[0],
	// 			children: {
	// 				'page1': {
	// 					name: 'page1',
	// 					route: routesWithoutParams[1],
	// 					children: {
	// 						'page1-1': {
	// 							name: 'page1-1',
	// 							route: routesWithoutParams[2],
	// 						},
	// 						'page1-2': {
	// 							name: 'page1-2',
	// 							route: routesWithoutParams[3],
	// 						}
	// 					}
	// 				},
	// 				'page2': {
	// 					name: 'page2',
	// 					children: {
	// 						'page2-1': {
	// 							name: 'page2-1',
	// 							route: routesWithoutParams[4],
	// 						}
	// 					}
	// 				}
	// 			}
	// 		});
	// 	});

	// 	it('ディレクトリパラメータありのルートツリーの構築', () => {
	// 		const routeTable = new RouteTable(routesWithParams);
	// 		const routeTree = deleteParentInfo(structuredClone(routeTable.routeTree));

	// 		expect(routeTree).toEqual({
	// 			name: '',
	// 			route: routesWithParams[0],
	// 			children: {
	// 				'page1': {
	// 					name: 'page1',
	// 					route: routesWithParams[1],
	// 					children: {
	// 						'page1-1': {
	// 							name: 'page1-1',
	// 							route: routesWithParams[2],
	// 						}
	// 					}
	// 				},
	// 				'page2': {
	// 					name: 'page2',
	// 					params: {
	// 						':pages2-1': {
	// 							name: ':pages2-1',
	// 							route: routesWithParams[3],
	// 						}
	// 					}
	// 				}
	// 			},
	// 			params: {
	// 				':pages1': {
	// 					name: ':pages1',
	// 					children: {
	// 						'page1-1': {
	// 							name: 'page1-1',
	// 							route: routesWithParams[4],
	// 						},
	// 						'page1-2': {
	// 							name: 'page1-2',
	// 							route: routesWithParams[5],
	// 						}
	// 					}
	// 				},
	// 				':pages2': {
	// 					name: ':pages2',
	// 					children: {
	// 						'page2-1': {
	// 							name: 'page2-1',
	// 							route: routesWithParams[6],
	// 						}
	// 					}
	// 				},
	// 			}
	// 		});
	// 	});
	// });

	describe('RouteTable.get()', () => {
		it('Pathを指定した定義したルートの取得', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			for (const path of routesWithoutParams.map(x => x.path)) {
				expect(routeTable.get(path).path).toBe(path);
			}
		});

		it('Routeを指定した定義したルートの取得', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			for (const route of routesWithoutParams) {
				expect(routeTable.get(route).path).toBe(route.path);
			}
		});

		it('Nameを指定した定義したルートの取得', () => {
			const routeTable = new RouteTable(namedRoutes);
			for (const route of namedRoutes.filter(x => 'name' in x)) {
				expect(routeTable.get({ name: route.name }).body).toBe(route.body);
			}
		});

		it('存在しないルートの取得', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get('/page2')).toBe(undefined);
		});

		it('ディレクトリパラメータを含むマッチング', () => {
			const routeTable = new RouteTable(routesWithParams);
			expect(routeTable.get('/page1/page1-1').body).toBe('/page1/page1-1');
			expect(routeTable.get('/page1/page1-2').body).toBe('/:pages1/page1-2');
			expect(routeTable.get('/page1/page1-2').params['pages1']).toBe('page1');
			expect(routeTable.get('/page2/page2-1').body).toBe('/page2/:pages2-1');
			expect(routeTable.get('/page2/page2-1').params['pages2-1']).toBe('page2-1');
			expect(routeTable.get('/page3/page2-1').body).toBe('/:pages2/page2-1');
			expect(routeTable.get('/page3/page2-1').params['pages2']).toBe('page3');
			expect(routeTable.get('/page3/page2-2')).toBe(undefined);
		});

		it('配列形式のディレクトリパラメータの取得', () => {
			const routeTable = new RouteTable([{ path: '/:pages/:pages/:pages' }]);
			expect(routeTable.get('/page1/page1-1/page1-1-1').params['pages']).toEqual(
				['page1', 'page1-1', 'page1-1-1']
			);
		});

		it('取得したルート情報の取得と変更', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get('/page2')).toBe(undefined);
			const route = routeTable.get('/page1/page1-1');
			expect(route.path).toBe('/page1/page1-1');
			// ルート情報の書き換え
			expect(() => route.path = 123).toThrow();
			expect(routeTable.get('/page2')).toBe(undefined);
			expect(() => route.path = '/page2').not.toThrow();
			expect(routeTable.get('/page2').body).toBe('/page1/page1-1');
			expect(() => routeTable.get('/page2').body = '/page2').not.toThrow();
			expect(routeTable.get('/page2').body).toBe('/page2');
			expect('body' in routeTable.get('/page2')).toBe(true);
			expect('test' in routeTable.get('/page2')).toBe(false);
		});

		it('取得したルート情報の取得と変更(nameの変更)', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: 'page6' })).toBe(undefined);
			const route = routeTable.get({ name: 'page4' });
			expect(route.body).toBe('page4');
			// ルート情報の書き換え
			expect(() => route.name = 123).toThrow();
			expect(routeTable.get({ name: 'page6' })).toBe(undefined);
			expect(() => route.name = 'page6').not.toThrow();
			expect(routeTable.get({ name: 'page6' }).body).toBe('page4');
		});

		it('segmentを含むマッチング', () => {
			const routeTable = new RouteTable(routesWithSegment);
			expect(routeTable.get('/page1/page1-1').body).toBe('/page1/page1-1');
			expect(routeTable.get('/page1/page1-1').rest).toBe(undefined);
			expect(routeTable.get('/page1/page1-2').body).toBe('/page1/**');
			expect(routeTable.get('/page1/page1-2').rest).toBe('page1-2');
			expect(routeTable.get('/page1').body).toBe('/page1/**');
			expect(routeTable.get('/page1').rest).toBe('');
			expect(routeTable.get('/page1/').body).toBe('/page1/**');
			expect(routeTable.get('/page1/').rest).toBe('');
			expect(routeTable.get('/page2/pages-1').body).toBe('/:pages/pages-1');
			expect(routeTable.get('/page2/pages-1').params['pages']).toBe('page2');
			expect(routeTable.get('/page2/pages-2').body).toBe('/:pages/**');
			expect(routeTable.get('/page2/pages-2').params['pages']).toBe('page2');
			expect(routeTable.get('/page2/pages-2').rest).toBe('pages-2');
			expect(routeTable.get('/page2').body).toBe('/:pages/**');
			expect(routeTable.get('/page2').params['pages']).toBe('page2');
			expect(routeTable.get('/page2').rest).toBe('');
			expect(routeTable.get('/page2/').body).toBe('/:pages/**');
			expect(routeTable.get('/page2/').params['pages']).toBe('page2');
			expect(routeTable.get('/page2/').rest).toBe('');
		});
	});

	describe('RouteTable.replace()', () => {
		it('pathのみの置換', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get('/path3')).toBe(undefined);
			expect(routeTable.get(routesWithoutParams[2].path).body).toBe(routesWithoutParams[2].body);
			expect(routeTable.replace(routesWithoutParams[2].path, '/path3').body).toBe(routesWithoutParams[2].body);
			expect(routeTable.get('/path3').body).toBe(routesWithoutParams[2].body);
		});

		it('何もしない', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.replace(undefined, undefined)).toBe(undefined);
		});

		it('不正な引数の組み合わせ', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(() => routeTable.replace(undefined, '123456')).toThrow();
		});
	});

	describe('RouteTable.add()', () => {
		it('ディレクトリパラメータをもたないルートの上書き', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get(routesWithoutParams[2].path).body).toBe(routesWithoutParams[2].body);
			expect(routeTable.add({ path: routesWithoutParams[2].path, body: routesWithoutParams[2].body + routesWithoutParams[2].body }).body).toBe(routesWithoutParams[2].body + routesWithoutParams[2].body);
			expect(routeTable.get(routesWithoutParams[2].path).body).toBe(routesWithoutParams[2].body + routesWithoutParams[2].body);
		});

		it('ディレクトリパラメータをもつルートの上書き', () => {
			const routeTable = new RouteTable(routesWithParams);
			expect(routeTable.get('/page1/page1-2').body).toBe(routesWithParams[5].body);
			expect(routeTable.add({ path: routesWithParams[5].path, body: routesWithParams[5].body + routesWithParams[5].body }).body).toBe(routesWithParams[5].body + routesWithParams[5].body);
			expect(routeTable.get('/page1/page1-2').body).toBe(routesWithParams[5].body + routesWithParams[5].body);
		});

		it('空パラメータを含むルートの追加', () => {
			const routeTable = new RouteTable(routesWithParams);
			expect(routeTable.get('/page3///page3-1')).toBe(undefined);
			expect(routeTable.add({ path: '/page3///page3-1', body: '/page3///page3-1' }).path).toBe('/page3///page3-1');
			expect(routeTable.get('/page3///page3-1').path).toBe('/page3///page3-1');
			expect(routeTable.get('/page3/page3-1').path).toBe('/page3///page3-1');
		});

		it('pathを指定したnameを持つルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[2].path).path).toBe(namedRoutes[2].path);
			expect(routeTable.add({ path: namedRoutes[2].path, body: namedRoutes[2].body + namedRoutes[2].body }).path).toBe(namedRoutes[2].path);
			expect(routeTable.get({ name: namedRoutes[2].name })).toBe(undefined);
		});

		it('nameを指定したpathを持たないルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: namedRoutes[4].name }).name).toBe(namedRoutes[4].name);
			expect(routeTable.add({ name: namedRoutes[4].name, body: namedRoutes[4].body + namedRoutes[4].body }).name).toBe(namedRoutes[4].name);
			expect(routeTable.get({ name: namedRoutes[4].name }).body).toBe(namedRoutes[4].body + namedRoutes[4].body);
		});

		it('nameを指定したpathを持つルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: namedRoutes[2].name }).name).toBe(namedRoutes[2].name);
			expect(routeTable.add({ name: namedRoutes[2].name, body: namedRoutes[2].body + namedRoutes[2].body }).name).toBe(namedRoutes[2].name);
			expect(routeTable.get(namedRoutes[2].path)).toBe(undefined);
		});

		it('pathとnameを指定したpathを持たないルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: namedRoutes[4].name }).body).toBe(namedRoutes[4].body);
			expect(routeTable.add({ name: namedRoutes[4].name, path: `/${namedRoutes[4].name}`, body: namedRoutes[4].body + namedRoutes[4].body }).body).toBe(namedRoutes[4].body + namedRoutes[4].body);
			expect(routeTable.get({ name: namedRoutes[4].name }).body).toBe(namedRoutes[4].body + namedRoutes[4].body);
			expect(routeTable.get(`/${namedRoutes[4].name}`).body).toBe(namedRoutes[4].body + namedRoutes[4].body);
		});

		it('pathとnameを指定したnameを持たないルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[1].path).body).toBe(namedRoutes[1].body);
			expect(routeTable.add({ path: namedRoutes[1].path, name: namedRoutes[1].path.substring(1), body: namedRoutes[1].body + namedRoutes[1].body }).body).toBe(namedRoutes[1].body + namedRoutes[1].body);
			expect(routeTable.get({ name: namedRoutes[1].path.substring(1) }).body).toBe(namedRoutes[1].body + namedRoutes[1].body);
			expect(routeTable.get(namedRoutes[1].path).body).toBe(namedRoutes[1].body + namedRoutes[1].body);
		});

		it('pathとnameを指定したpathとnameを持つルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[2].path).body).toBe(namedRoutes[2].body);
			expect(routeTable.get({ name: namedRoutes[2].name }).body).toBe(namedRoutes[2].body);
			expect(routeTable.add({ path: namedRoutes[2].path, name: namedRoutes[2].name, body: namedRoutes[2].body + namedRoutes[2].body }).body).toBe(namedRoutes[2].body + namedRoutes[2].body);
			expect(routeTable.get({ name: namedRoutes[2].name }).body).toBe(namedRoutes[2].body + namedRoutes[2].body);
			expect(routeTable.get(namedRoutes[2].path).body).toBe(namedRoutes[2].body + namedRoutes[2].body);
		});

		it('pathとnameを指定した不整合なルートの上書き', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[2].path).body).toBe(namedRoutes[2].body);
			expect(routeTable.get({ name: namedRoutes[3].name }).body).toBe(namedRoutes[3].body);
			expect(routeTable.add({ path: namedRoutes[2].path, name: namedRoutes[3].name, body: namedRoutes[2].body + namedRoutes[3].body }).body).toBe(namedRoutes[2].body + namedRoutes[3].body);
			expect(routeTable.get(namedRoutes[2].path).body).toBe(namedRoutes[2].body + namedRoutes[3].body);
			expect(routeTable.get({ name: namedRoutes[3].name }).body).toBe(namedRoutes[2].body + namedRoutes[3].body);
			expect(routeTable.get(namedRoutes[3].path)).toBe(undefined);
			expect(routeTable.get({ name: namedRoutes[2].name })).toBe(undefined);
		});
	});

	describe('RouteTable.remove()', () => {
		it('Pathを指定した存在するルートの削除', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get(routesWithoutParams[2].path).path).toBe(routesWithoutParams[2].path);
			expect(routeTable.remove(routesWithoutParams[2].path).path).toBe(routesWithoutParams[2].path);
			expect(routeTable.get(routesWithoutParams[2].path)).toBe(undefined);
		});

		it('Routeを指定した存在するルートの削除', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get(routesWithoutParams[2].path).path).toBe(routesWithoutParams[2].path);
			expect(routeTable.remove(routesWithoutParams[2]).path).toBe(routesWithoutParams[2].path);
			expect(routeTable.get(routesWithoutParams[2].path)).toBe(undefined);
		});

		it('ディレクトリパラメータを指定した存在するルートの削除', () => {
			const routeTable = new RouteTable(routesWithParams);
			expect(routeTable.get('/page2/page2-1').body).toBe('/page2/:pages2-1');
			expect(routeTable.remove('/page2/:pages2-1').body).toBe('/page2/:pages2-1');
			expect(routeTable.get('/page2/page2-1').body).toBe('/:pages2/page2-1');
		});

		it('存在しないルートの削除', () => {
			const routeTable = new RouteTable(routesWithoutParams);
			expect(routeTable.get(routesWithoutParams[2].path).path).toBe(routesWithoutParams[2].path);
			expect(routeTable.remove(routesWithoutParams[2].path).path).toBe(routesWithoutParams[2].path);
			expect(() => routeTable.remove(routesWithoutParams[2].path)).toThrow();
		});

		it('pathを指定したnameを持つルートの削除', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[2].path).path).toBe(namedRoutes[2].path);
			expect(routeTable.remove({ path: namedRoutes[2].path }).path).toBe(namedRoutes[2].path);
			expect(routeTable.get(namedRoutes[2].path)).toBe(undefined);
			expect(routeTable.get({ name: namedRoutes[2].name })).toBe(undefined);
		});

		it('nameを指定したpathを持たないルートの削除', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: namedRoutes[4].name }).name).toBe(namedRoutes[4].name);
			expect(routeTable.remove({ name: namedRoutes[4].name }).name).toBe(namedRoutes[4].name);
			expect(routeTable.get({ name: namedRoutes[4].name })).toBe(undefined);
		});

		it('nameを指定したpathを持つルートの削除', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: namedRoutes[2].name }).name).toBe(namedRoutes[2].name);
			expect(routeTable.remove({ name: namedRoutes[2].name }).name).toBe(namedRoutes[2].name);
			expect(routeTable.get(namedRoutes[2].path)).toBe(undefined);
			expect(routeTable.get({ name: namedRoutes[2].name })).toBe(undefined);
		});

		it('pathとnameを指定したルートの削除', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[2].path).body).toBe(namedRoutes[2].body);
			expect(routeTable.get({ name: namedRoutes[2].name }).body).toBe(namedRoutes[2].body);
			expect(routeTable.remove({ path: namedRoutes[2].path, name: namedRoutes[2].name }).body).toBe(namedRoutes[2].body);
			expect(routeTable.get({ name: namedRoutes[2].name })).toBe(undefined);
			expect(routeTable.get(namedRoutes[2].path)).toBe(undefined);
		});

		it('pathとnameを指定した不整合なルートの削除', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get(namedRoutes[2].path).body).toBe(namedRoutes[2].body);
			expect(routeTable.get({ name: namedRoutes[3].name }).body).toBe(namedRoutes[3].body);
			expect(() => routeTable.remove({ path: namedRoutes[2].path, name: namedRoutes[3].name }).body).not.toThrow();
			expect(routeTable.get(namedRoutes[2].path)).toBe(undefined);
			expect(routeTable.get({ name: namedRoutes[3].name })).toBe(undefined);
			expect(routeTable.get(namedRoutes[3].path)).toBe(undefined);
			expect(routeTable.get({ name: namedRoutes[2].name })).toBe(undefined);
		});

		it('Nameによる存在しないルートの削除', () => {
			const routeTable = new RouteTable(namedRoutes);
			expect(routeTable.get({ name: namedRoutes[4].name }).name).toBe(namedRoutes[4].name);
			expect(routeTable.remove({ name: namedRoutes[4].name }).name).toBe(namedRoutes[4].name);
			expect(() => routeTable.remove({ name: namedRoutes[4].name })).toThrow();
		});
	});
});
