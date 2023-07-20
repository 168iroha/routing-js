
import { RoutePath } from '../../../src/level2/route-path.js';

describe('RoutePath', () => {

	describe('constructor', () => {
		it('初期状態のパス', () => {
			const path = new RoutePath('/path');
			expect(path.toString()).toBe('/path');
		});
	});

	describe('concat', () => {
		it('パスのパスの結合', () => {
			const path1 = new RoutePath('/path1');
			const path2 = new RoutePath('/path2');
			const path3 = path1.concat(path2);
			expect(path3 !== path1).toBe(true);
			expect(path3 !== path2).toBe(true);
			expect(path3.toString()).toBe('/path1/path2');
		});

		it('パスと文字列の結合', () => {
			const path1 = new RoutePath('/path1');
			const path2 = path1.concat('/path2');
			expect(path2 !== path1).toBe(true);
			expect(path2.toString()).toBe('/path1/path2');
		});

		it('空のパスとの結合', () => {
			const path1 = new RoutePath('');
			const path2 = path1.concat('/path2');
			expect(path2 !== path1).toBe(true);
			expect(path2.toString()).toBe('/path2');
		});

		it('空のパスとの結合', () => {
			const path1 = new RoutePath('/path1');
			const path2 = path1.concat('');
			expect(path2 !== path1).toBe(true);
			expect(path2.toString()).toBe('/path1');
		});

		it('デリミタの補完の確認1', () => {
			const path1 = new RoutePath('/path1/');
			const path2 = path1.concat('/path2');
			expect(path2.toString()).toBe('/path1/path2');
		});

		it('デリミタの補完の確認2', () => {
			const path1 = new RoutePath('/path1');
			const path2 = path1.concat('path2');
			expect(path2.toString()).toBe('/path1/path2');
		});

		it('デリミタの補完の確認3', () => {
			const path1 = new RoutePath('/path1/');
			const path2 = path1.concat('path2');
			expect(path2.toString()).toBe('/path1/path2');
		});
	});

	describe('dispatch', () => {
		it('ディレクトリパラメータを与えない場合', () => {
			const path1 = new RoutePath('/path1/:path2');
			const path2 = path1.dispatch({});
			expect(path2 !== path1).toBe(true);
			expect(path2.toString()).toBe(path1.toString());
		});

		it('ディレクトリパラメータが存在しない場合', () => {
			const path1 = new RoutePath('/path1/path2');
			const path2 = path1.dispatch({ path2: 'param1' });
			expect(path2 !== path1).toBe(true);
			expect(path2.toString()).toBe(path1.toString());
		});

		it('ディレクトリパラメータが正常にディスパッチできる場合', () => {
			const path1 = new RoutePath('/path1/:path2/:path3/:path3/:path4');
			const path2 = path1.dispatch({ path2: 'param1', path3: ['param2', 'param3'], path4: 'param4' });
			expect(path2 !== path1).toBe(true);
			expect(path2.toString()).toBe('/path1/param1/param2/param3/param4');
		});

		it('ディレクトリパラメータが存在しないことにより失敗する場合', () => {
			const path1 = new RoutePath('/path1/:path2/:path3/:path3/:path4');
			expect(() => path1.dispatch({ path3: ['param2', 'param3'], path4: 'param4' })).toThrow();
		});

		it('ディレクトリパラメータが不足していることにより失敗する場合1', () => {
			const path1 = new RoutePath('/path1/:path2/:path3/:path3/:path4');
			expect(() => path1.dispatch({ path2: 'param1', path3: 'param2', path4: 'param4' })).toThrow();
		});

		it('ディレクトリパラメータが不足していることにより失敗する場合2', () => {
			const path1 = new RoutePath('/path1/:path2/:path3/:path3/:path4');
			expect(() => path1.dispatch({ path2: 'param1', path3: ['param2'], path4: 'param4' })).toThrow();
		});
	});

});
