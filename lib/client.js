window.__ModuleLoader__.load({
	id: "dsh-role-config",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../deepseek-harness/vendor/cosmokit/src/misc.ts
		/** Return true when a value is `null` or `undefined`. */
		function isNullable(value) {
			return value === null || value === void 0;
		}
		/** Return true for non-array object values. */
		function isPlainObject(data) {
			return data && typeof data === "object" && !Array.isArray(data);
		}
		/** Filter object entries and return a new object. */
		function filterKeys(object, filter) {
			return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
		}
		/** Map object values while preserving the original key set. */
		function mapValues(object, transform) {
			return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
		}
		/** Pick selected keys from an object, optionally including `undefined` values. */
		function pick(source, keys, forced) {
			if (!keys) return { ...source };
			const result = {};
			for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
			return result;
		}
		//#endregion
		//#region ../deepseek-harness/vendor/cosmokit/src/volatile.ts
		/** Shared config references used by schema validators and plugin runtimes. */
		const write = Symbol.for("cosmokit.volatile.write");
		function snapshot(value, ancestors = /* @__PURE__ */ new Set()) {
			if (typeof value === "function") throw new TypeError("volatile config cannot contain functions");
			if (value === null || typeof value !== "object") return value;
			if (ancestors.has(value)) throw new TypeError("volatile config cannot contain cycles");
			ancestors.add(value);
			try {
				if (Array.isArray(value)) return Object.freeze(value.map((item) => snapshot(item, ancestors)));
				if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new TypeError("volatile config objects must be plain objects or arrays");
				return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item, ancestors)])));
			} finally {
				ancestors.delete(value);
			}
		}
		/**
		* Create a detached reference containing an immutable copy of the supplied data.
		* @param value - validated config data; class instances and functions are unsupported.
		* @returns a reference whose value is updated only by its owning runtime.
		*/
		function createVolatile(value) {
			let current = snapshot(value);
			return Object.freeze({
				get: () => current,
				[write]: (value) => {
					current = value;
				}
			});
		}
		/**
		* Identify references across ESM/CJS copies of the shared library.
		* @param value - a parsed config value.
		* @returns whether the value implements the shared reference protocol.
		*/
		function isVolatile(value) {
			return typeof value === "object" && value !== null && write in value;
		}
		//#endregion
		//#region ../deepseek-harness/vendor/cosmokit/src/types.ts
		/** Test values using `instanceof` with a `toStringTag` fallback. */
		function is(type, value) {
			if (arguments.length === 1) return (value) => is(type, value);
			return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
		}
		function isArrayBufferLike(value) {
			return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
		}
		function isArrayBufferSource(value) {
			return isArrayBufferLike(value) || ArrayBuffer.isView(value);
		}
		let Binary;
		(function(_Binary) {
			_Binary.is = isArrayBufferLike;
			_Binary.isSource = isArrayBufferSource;
			function fromSource(source) {
				if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
				else return source;
			}
			_Binary.fromSource = fromSource;
			function toBase64(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
				let binary = "";
				const bytes = new Uint8Array(source);
				for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
				return btoa(binary);
			}
			_Binary.toBase64 = toBase64;
			function fromBase64(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
				return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
			}
			_Binary.fromBase64 = fromBase64;
			function toHex(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
				return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
			}
			_Binary.toHex = toHex;
			function fromHex(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
				const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
				const buffer = [];
				for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
				return Uint8Array.from(buffer).buffer;
			}
			_Binary.fromHex = fromHex;
		})(Binary || (Binary = {}));
		Binary.fromBase64;
		Binary.toBase64;
		Binary.fromHex;
		Binary.toHex;
		/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
		function clone(source, refs = /* @__PURE__ */ new Map()) {
			if (!source || typeof source !== "object") return source;
			if (is("Date", source)) return new Date(source.valueOf());
			if (is("RegExp", source)) return new RegExp(source.source, source.flags);
			if (isArrayBufferLike(source)) return source.slice(0);
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			const cached = refs.get(source);
			if (cached) return cached;
			if (Array.isArray(source)) {
				const result = [];
				refs.set(source, result);
				source.forEach((value, index) => {
					result[index] = Reflect.apply(clone, null, [value, refs]);
				});
				return result;
			}
			const result = Object.create(Object.getPrototypeOf(source));
			refs.set(source, result);
			for (const key of Reflect.ownKeys(source)) {
				const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
				if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
				Reflect.defineProperty(result, key, descriptor);
			}
			return result;
		}
		/**
		* Compare values recursively, treating two volatile references as equal regardless of value.
		* Strict comparison distinguishes null/undefined, treats opaque objects by identity,
		* compares URLs by normalized href, treats array holes as undefined, and considers distinct cyclic structures unequal.
		* @param a - first value.
		* @param b - second value.
		* @param strict - whether to require strict data equality outside volatile references.
		* @returns whether the values compare equal.
		*/
		function deepEqual(a, b, strict) {
			const ancestors = /* @__PURE__ */ new Set();
			function compare(a, b) {
				if (a === b) return true;
				if (isVolatile(a) || isVolatile(b)) return isVolatile(a) && isVolatile(b);
				if (!strict && isNullable(a) && isNullable(b)) return true;
				if (typeof a !== typeof b || typeof a !== "object" || !a || !b) return false;
				if (ancestors.has(a)) return false;
				function check(test, then) {
					return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
				}
				ancestors.add(a);
				try {
					return check(Array.isArray, (a, b) => {
						if (a.length !== b.length) return false;
						for (let index = 0; index < a.length; index++) if (!compare(a[index], b[index])) return false;
						return true;
					}) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("URL"), (a, b) => a.href === b.href) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
						if (a.byteLength !== b.byteLength) return false;
						const viewA = new Uint8Array(a);
						const viewB = new Uint8Array(b);
						for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
						return true;
					}) ?? ((!strict || [a, b].every((value) => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) && Object.keys({
						...a,
						...b
					}).every((key) => compare(a[key], b[key])));
				} finally {
					ancestors.delete(a);
				}
			}
			return compare(a, b);
		}
		//#endregion
		//#region ../deepseek-harness/vendor/cosmokit/src/time.ts
		let Time;
		(function(_Time) {
			_Time.millisecond = 1;
			const second = _Time.second = 1e3;
			const minute = _Time.minute = second * 60;
			const hour = _Time.hour = minute * 60;
			const day = _Time.day = hour * 24;
			const week = _Time.week = day * 7;
			let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
			function setTimezoneOffset(offset) {
				timezoneOffset = offset;
			}
			_Time.setTimezoneOffset = setTimezoneOffset;
			function getTimezoneOffset() {
				return timezoneOffset;
			}
			_Time.getTimezoneOffset = getTimezoneOffset;
			function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
				if (typeof date === "number") date = new Date(date);
				if (offset === void 0) offset = timezoneOffset;
				return Math.floor((date.valueOf() / minute - offset) / 1440);
			}
			_Time.getDateNumber = getDateNumber;
			function fromDateNumber(value, offset) {
				const date = new Date(value * day);
				if (offset === void 0) offset = timezoneOffset;
				return new Date(+date + offset * minute);
			}
			_Time.fromDateNumber = fromDateNumber;
			const numeric = /\d+(?:\.\d+)?/.source;
			const timeRegExp = new RegExp(`^${[
				"w(?:eek(?:s)?)?",
				"d(?:ay(?:s)?)?",
				"h(?:our(?:s)?)?",
				"m(?:in(?:ute)?(?:s)?)?",
				"s(?:ec(?:ond)?(?:s)?)?"
			].map((unit) => `(${numeric}${unit})?`).join("")}$`);
			function parseTime(source) {
				const capture = timeRegExp.exec(source);
				if (!capture) return 0;
				return (parseFloat(capture[1]) * week || 0) + (parseFloat(capture[2]) * day || 0) + (parseFloat(capture[3]) * hour || 0) + (parseFloat(capture[4]) * minute || 0) + (parseFloat(capture[5]) * second || 0);
			}
			_Time.parseTime = parseTime;
			function parseDate(date) {
				const parsed = parseTime(date);
				if (parsed) date = Date.now() + parsed;
				else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
				else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
				return date ? new Date(date) : /* @__PURE__ */ new Date();
			}
			_Time.parseDate = parseDate;
			function format(ms) {
				const abs = Math.abs(ms);
				if (abs >= day - hour / 2) return Math.round(ms / day) + "d";
				else if (abs >= hour - minute / 2) return Math.round(ms / hour) + "h";
				else if (abs >= minute - second / 2) return Math.round(ms / minute) + "m";
				else if (abs >= second) return Math.round(ms / second) + "s";
				return ms + "ms";
			}
			_Time.format = format;
			function toDigits(source, length = 2) {
				return source.toString().padStart(length, "0");
			}
			_Time.toDigits = toDigits;
			function template(template, time = /* @__PURE__ */ new Date()) {
				return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
			}
			_Time.template = template;
		})(Time || (Time = {}));
		//#endregion
		//#region ../deepseek-harness/vendor/schemastery/lib/index.mjs
		const kSchema = Symbol.for("schemastery");
		const kValidationError = Symbol.for("ValidationError");
		globalThis.__schemastery_index__ ??= 0;
		globalThis.__schemastery_refs__ = void 0;
		var ValidationError = class extends TypeError {
			options;
			name = "ValidationError";
			constructor(message, options) {
				let prefix = "$";
				for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
				else if (typeof segment === "number") prefix += "[" + segment + "]";
				else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
				if (prefix.startsWith(".")) prefix = prefix.slice(1);
				super((prefix === "$" ? "" : `${prefix} `) + message);
				this.options = options;
			}
			static is(error) {
				return !!error?.[kValidationError];
			}
		};
		Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
		const Schema = function(options) {
			const schema = function(data, options = {}) {
				return Schema.resolve(data, schema, options)[0];
			};
			if (options.refs) {
				const refs = mapValues(options.refs, (options) => new Schema(options));
				const getRef = (uid) => refs[uid];
				for (const key in refs) {
					const options = refs[key];
					options.sKey = getRef(options.sKey);
					options.inner = getRef(options.inner);
					options.list = options.list && options.list.map(getRef);
					options.dict = options.dict && mapValues(options.dict, getRef);
				}
				return refs[options.uid];
			}
			Object.assign(schema, options);
			if (typeof schema.callback === "string") try {
				schema.callback = new Function("return " + schema.callback)();
			} catch {}
			Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
			Object.setPrototypeOf(schema, Schema.prototype);
			schema.meta ||= {};
			schema.toString = schema.toString.bind(schema);
			return schema;
		};
		Schema.prototype = Object.create(Function.prototype);
		Schema.prototype[kSchema] = true;
		Object.defineProperty(Schema.prototype, "~standard", { get() {
			return {
				version: 1,
				vendor: "schemastery",
				validate: (value) => {
					try {
						return { value: Schema.resolve(value, this, {})[0] };
					} catch (error) {
						if (ValidationError.is(error)) return { issues: [{
							message: error.message,
							path: error.options.path
						}] };
						throw error;
					}
				}
			};
		} });
		Schema.ValidationError = ValidationError;
		Schema.prototype.toJSON = function toJSON() {
			if (globalThis.__schemastery_refs__) {
				globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
				return this.uid;
			}
			globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
			globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
			const result = {
				uid: this.uid,
				refs: globalThis.__schemastery_refs__
			};
			globalThis.__schemastery_refs__ = void 0;
			return result;
		};
		Schema.prototype.set = function set(key, value) {
			this.dict[key] = value;
			return this;
		};
		Schema.prototype.push = function push(value) {
			this.list.push(value);
			return this;
		};
		function mergeDesc(original, messages) {
			const result = typeof original === "string" ? { "": original } : { ...original };
			for (const locale in messages) {
				const value = messages[locale];
				if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
				else if (typeof value === "string") result[locale] = value;
			}
			return result;
		}
		function getInner(value) {
			return value?.$value ?? value?.$inner;
		}
		function extractKeys(data) {
			return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
		}
		Schema.prototype.i18n = function i18n(messages) {
			const schema = Schema(this);
			const desc = mergeDesc(schema.meta.description, messages);
			if (Object.keys(desc).length) schema.meta.description = desc;
			if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
				return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
			});
			if (schema.list) schema.list = schema.list.map((inner, index) => {
				return inner.i18n(mapValues(messages, (data = {}) => {
					if (Array.isArray(getInner(data))) return getInner(data)[index];
					if (Array.isArray(data)) return data[index];
					return extractKeys(data);
				}));
			});
			if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
				if (getInner(data)) return getInner(data);
				return extractKeys(data);
			}));
			if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
			return schema;
		};
		Schema.prototype.extra = function extra(key, value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		};
		for (const key of [
			"required",
			"disabled",
			"collapse",
			"hidden",
			"loose"
		]) Object.assign(Schema.prototype, { [key](value = true) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		Schema.prototype.deprecated = function deprecated() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "deprecated",
				type: "danger"
			});
			return schema;
		};
		Schema.prototype.experimental = function experimental() {
			const schema = Schema(this);
			schema.meta.badges ||= [];
			schema.meta.badges.push({
				text: "experimental",
				type: "warning"
			});
			return schema;
		};
		Schema.prototype.pattern = function pattern(regexp) {
			const schema = Schema(this);
			const pattern = pick(regexp, ["source", "flags"]);
			schema.meta = {
				...schema.meta,
				pattern
			};
			return schema;
		};
		Schema.prototype.simplify = function simplify(value) {
			if (isVolatile(value)) value = value.get();
			if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
			if (isNullable(value)) return value;
			if (this.type === "object" || this.type === "dict") {
				const result = {};
				for (const key in value) {
					const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
					if (this.type === "dict" || !isNullable(item)) result[key] = item;
				}
				if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
				return result;
			} else if (this.type === "array" || this.type === "tuple") {
				const result = [];
				value.forEach((value, index) => {
					const schema = this.type === "array" ? this.inner : this.list[index];
					const item = schema ? schema.simplify(value) : value;
					result.push(item);
				});
				return result;
			} else if (this.type === "intersect") {
				const result = {};
				for (const item of this.list) Object.assign(result, item.simplify(value));
				return result;
			} else if (this.type === "union") for (const schema of this.list) try {
				Schema.resolve(value, schema, {});
				return schema.simplify(value);
			} catch {}
			return value;
		};
		Schema.prototype.toString = function toString(inline) {
			return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
		};
		Schema.prototype.role = function role(role, extra) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				role,
				extra
			};
			return schema;
		};
		for (const key of [
			"default",
			"link",
			"comment",
			"description",
			"max",
			"min",
			"step"
		]) Object.assign(Schema.prototype, { [key](value) {
			const schema = Schema(this);
			schema.meta = {
				...schema.meta,
				[key]: value
			};
			return schema;
		} });
		Schema.prototype.volatile = function volatile() {
			if (this.meta.volatile) throw new TypeError("volatile schema is already wrapped");
			return this.extra("volatile", true);
		};
		const resolvers = {};
		const checkedVolatile = Symbol("checked-volatile-schema");
		function validateVolatileSchema(schema, path = [], blocked = false, seen = /* @__PURE__ */ new Map()) {
			const states = seen.get(schema) ?? /* @__PURE__ */ new Set();
			if (states.has(blocked)) return;
			states.add(blocked);
			seen.set(schema, states);
			if (schema.meta?.volatile && blocked) throw new ValidationError("volatile fields require a fixed object path without an enclosing volatile field", { path });
			const nested = blocked || !!schema.meta?.volatile;
			if (schema.dict) for (const [key, child] of Object.entries(schema.dict)) validateVolatileSchema(child, [...path, key], nested, seen);
			if (schema.sKey) validateVolatileSchema(schema.sKey, [...path, "<key>"], true, seen);
			if (schema.inner && (schema.type !== "lazy" || schema.inner[kSchema])) validateVolatileSchema(schema.inner, [...path, "*"], true, seen);
			if (schema.list) for (let index = 0; index < schema.list.length; index++) validateVolatileSchema(schema.list[index], [...path, String(index)], true, seen);
		}
		Schema.extend = function extend(type, resolve) {
			resolvers[type] = resolve;
		};
		Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
			if (!schema) return [data];
			if (!options[checkedVolatile]) {
				validateVolatileSchema(schema, options.path);
				options = {
					...options,
					[checkedVolatile]: true
				};
			}
			if (schema.meta?.volatile) {
				const inner = Schema(schema);
				inner.meta = {
					...schema.meta,
					volatile: false
				};
				const [value, adapted] = Schema.resolve(data, inner, options, strict);
				try {
					return [createVolatile(value), adapted];
				} catch (error) {
					throw new ValidationError(error instanceof Error ? error.message : String(error), options);
				}
			}
			if (options.ignore?.(data, schema)) return [data];
			if (isNullable(data) && schema.type !== "lazy") {
				if (schema.meta.required) throw new ValidationError(`missing required value`, options);
				let current = schema;
				let fallback = schema.meta.default;
				while (current?.type === "intersect" && isNullable(fallback)) {
					current = current.list[0];
					fallback = current?.meta.default;
				}
				if (isNullable(fallback)) return [data];
				data = clone(fallback);
			}
			const callback = resolvers[schema.type];
			if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
			try {
				return callback(data, schema, options, strict);
			} catch (error) {
				if (!schema.meta.loose) throw error;
				return [schema.meta.default];
			}
		};
		Schema.from = function from(source) {
			if (isNullable(source)) return Schema.any();
			else if ([
				"string",
				"number",
				"boolean"
			].includes(typeof source)) return Schema.const(source).required();
			else if (source[kSchema]) return source;
			else if (typeof source === "function") switch (source) {
				case String: return Schema.string().required();
				case Number: return Schema.number().required();
				case Boolean: return Schema.boolean().required();
				case Function: return Schema.function().required();
				default: return Schema.is(source).required();
			}
			else throw new TypeError(`cannot infer schema from ${source}`);
		};
		Schema.lazy = function lazy(builder) {
			const toJSON = () => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			};
			const schema = new Schema({
				type: "lazy",
				builder,
				inner: { toJSON }
			});
			return schema;
		};
		Schema.natural = function natural() {
			return Schema.number().step(1).min(0);
		};
		Schema.percent = function percent() {
			return Schema.number().step(.01).min(0).max(1).role("slider");
		};
		Schema.date = function date() {
			return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
				const date = new Date(value);
				if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
				return date;
			}, true)]);
		};
		Schema.regExp = function regExp(flag = "") {
			return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
				try {
					return new RegExp(value, flag);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)]);
		};
		Schema.arrayBuffer = function arrayBuffer(encoding) {
			return Schema.union([
				Schema.is(ArrayBuffer),
				Schema.is(SharedArrayBuffer),
				Schema.transform(Schema.any(), (value, options) => {
					if (Binary.isSource(value)) return Binary.fromSource(value);
					throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
				}, true),
				...encoding ? [Schema.transform(Schema.string(), (value, options) => {
					try {
						return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
					} catch (e) {
						throw new ValidationError(e.message, options);
					}
				}, true)] : []
			]);
		};
		Schema.extend("lazy", (data, schema, options, strict) => {
			if (!schema.inner[kSchema]) {
				schema.inner = schema.builder();
				schema.inner.meta = {
					...schema.meta,
					...schema.inner.meta
				};
				validateVolatileSchema(schema.inner, options.path, true);
			}
			return Schema.resolve(data, schema.inner, options, strict);
		});
		Schema.extend("any", (data) => {
			return [data];
		});
		Schema.extend("never", (data, _, options) => {
			throw new ValidationError(`expected nullable but got ${data}`, options);
		});
		Schema.extend("const", (data, { value }, options) => {
			if (deepEqual(data, value)) return [value];
			throw new ValidationError(`expected ${value} but got ${data}`, options);
		});
		function checkWithinRange(data, meta, description, options, skipMin = false) {
			const { max = Infinity, min = -Infinity } = meta;
			if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
			if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
		}
		Schema.extend("string", (data, { meta }, options) => {
			if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
			if (meta.pattern) {
				const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
				if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
			}
			checkWithinRange(data.length, meta, "string length", options);
			return [data];
		});
		function decimalShift(data, digits) {
			const str = data.toString();
			if (str.includes("e")) return data * Math.pow(10, digits);
			const index = str.indexOf(".");
			if (index === -1) return data * Math.pow(10, digits);
			const frac = str.slice(index + 1);
			const integer = str.slice(0, index);
			if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
			return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
		}
		function isMultipleOf(data, min, step) {
			step = Math.abs(step);
			if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
			const index = step.toString().indexOf(".");
			const digits = step.toString().slice(index + 1).length;
			return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
		}
		Schema.extend("number", (data, { meta }, options) => {
			if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
			checkWithinRange(data, meta, "number", options);
			const { step } = meta;
			if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
			return [data];
		});
		Schema.extend("boolean", (data, _, options) => {
			if (typeof data === "boolean") return [data];
			throw new ValidationError(`expected boolean but got ${data}`, options);
		});
		Schema.extend("bitset", (data, { bits, meta }, options) => {
			let value = 0, keys = [];
			if (typeof data === "number") {
				value = data;
				for (const key in bits) if (data & bits[key]) keys.push(key);
			} else if (Array.isArray(data)) {
				keys = data;
				for (const key of keys) {
					if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
					if (key in bits) value |= bits[key];
				}
			} else throw new ValidationError(`expected number or array but got ${data}`, options);
			if (value === meta.default) return [value];
			return [value, keys];
		});
		Schema.extend("function", (data, _, options) => {
			if (typeof data === "function") return [data];
			throw new ValidationError(`expected function but got ${data}`, options);
		});
		Schema.extend("is", (data, { constructor }, options) => {
			if (typeof constructor === "function") {
				if (data instanceof constructor) return [data];
				throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
			} else {
				if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
				let prototype = Object.getPrototypeOf(data);
				while (prototype) {
					if (prototype.constructor?.name === constructor) return [data];
					prototype = Object.getPrototypeOf(prototype);
				}
				throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			}
		});
		function property(data, key, schema, options) {
			try {
				const [value, adapted] = Schema.resolve(data[key], schema, {
					...options,
					path: [...options.path || [], key]
				});
				if (adapted !== void 0) data[key] = adapted;
				return value;
			} catch (e) {
				if (!options?.autofix) throw e;
				delete data[key];
				return schema.meta.volatile ? createVolatile(schema.meta.default) : schema.meta.default;
			}
		}
		Schema.extend("array", (data, { inner, meta }, options) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
			return [data.map((_, index) => property(data, index, inner, options))];
		});
		Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in data) {
				let rKey;
				try {
					rKey = Schema.resolve(key, sKey, options)[0];
				} catch (error) {
					if (strict) continue;
					throw error;
				}
				result[rKey] = property(data, key, inner, options);
				data[rKey] = data[key];
				if (key !== rKey) delete data[key];
			}
			return [result];
		});
		Schema.extend("tuple", (data, { list }, options, strict) => {
			if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
			const result = list.map((inner, index) => property(data, index, inner, options));
			if (strict) return [result];
			result.push(...data.slice(list.length));
			return [result];
		});
		function merge(result, data) {
			for (const key in data) {
				if (key in result) continue;
				result[key] = data[key];
			}
		}
		Schema.extend("object", (data, { dict }, options, strict) => {
			if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
			const result = {};
			for (const key in dict) {
				const value = property(data, key, dict[key], options);
				if (!isNullable(value) || key in data) result[key] = value;
			}
			if (!strict) merge(result, data);
			return [result];
		});
		Schema.extend("union", (data, { list, toString }, options, strict) => {
			const messages = [];
			for (const inner of list) try {
				return Schema.resolve(data, inner, options, strict);
			} catch (error) {
				messages.push(error);
			}
			throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		});
		Schema.extend("intersect", (data, { list, toString }, options, strict) => {
			if (!list.length) return [data];
			let result;
			for (const inner of list) {
				const value = Schema.resolve(data, inner, options, true)[0];
				if (isNullable(value)) continue;
				if (isNullable(result)) result = value;
				else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
				else if (typeof value === "object") merge(result ??= {}, value);
				else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
			}
			if (!strict && isPlainObject(data)) merge(result, data);
			return [result];
		});
		Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
			const [result, adapted = data] = Schema.resolve(data, inner, options, true);
			if (preserve) return [callback(result)];
			else return [callback(result), callback(adapted)];
		});
		const formatters = {};
		function defineMethod(name, keys, format) {
			formatters[name] = format;
			Object.assign(Schema, { [name](...args) {
				const schema = new Schema({ type: name });
				keys.forEach((key, index) => {
					switch (key) {
						case "sKey":
							schema.sKey = args[index] ?? Schema.string();
							break;
						case "inner":
							schema.inner = Schema.from(args[index]);
							break;
						case "list":
							schema.list = args[index].map(Schema.from);
							break;
						case "dict":
							schema.dict = mapValues(args[index], Schema.from);
							break;
						case "bits":
							schema.bits = {};
							for (const key in args[index]) {
								if (typeof args[index][key] !== "number") continue;
								schema.bits[key] = args[index][key];
							}
							break;
						case "callback": {
							const callback = schema.callback = args[index];
							callback["toJSON"] ||= () => callback.toString();
							break;
						}
						case "constructor": {
							const constructor = schema.constructor = args[index];
							if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
							break;
						}
						default: schema[key] = args[index];
					}
				});
				if (name === "object" || name === "dict") schema.meta.default = {};
				else if (name === "array" || name === "tuple") schema.meta.default = [];
				else if (name === "bitset") schema.meta.default = 0;
				return schema;
			} });
		}
		defineMethod("is", ["constructor"], ({ constructor }) => {
			if (typeof constructor === "function") return constructor.name;
			else return constructor;
		});
		defineMethod("any", [], () => "any");
		defineMethod("never", [], () => "never");
		defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
		defineMethod("string", [], () => "string");
		defineMethod("number", [], () => "number");
		defineMethod("boolean", [], () => "boolean");
		defineMethod("bitset", ["bits"], () => "bitset");
		defineMethod("function", [], () => "function");
		defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
		defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
		defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
		defineMethod("object", ["dict"], ({ dict }) => {
			if (Object.keys(dict).length === 0) return "{}";
			return `{ ${Object.entries(dict).map(([key, inner]) => {
				return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
			}).join(", ")} }`;
		});
		defineMethod("union", ["list"], ({ list }, inline) => {
			const result = list.map(({ toString: format }) => format()).join(" | ");
			return inline ? `(${result})` : result;
		});
		defineMethod("intersect", ["list"], ({ list }) => {
			return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
		});
		defineMethod("transform", [
			"inner",
			"callback",
			"preserve"
		], ({ inner }, isInner) => inner.toString(isInner));
		//#endregion
		//#region lib/settings.js
		/**
		* Role presets and the model pool: the settings vocabulary, the plugin's
		* Config schema, and cross-field validation.
		*
		* Two user-authored parts live here. The **model pool** lists models the main
		* agent may name directly, each with the description the user wrote for it.
		* The **role presets** name roles (tiers the user extends freely) and decide,
		* per role, which model serves a request: user-written conditions first, then
		* the role's priority chain.
		*
		* A role never exposes its members to the model. Only the role's name and
		* description reach the model; the chain and its rules stay Host-side.
		*
		* @module dsh-role-config/settings
		*/
		const routeMember = Schema.object({
			provider: Schema.string().required(),
			model: Schema.string().required()
		});
		const bindingTarget = Schema.object({
			kind: Schema.union(["off", "role"]).default("off"),
			role: Schema.string()
		});
		Schema.object({
			pool: Schema.array(Schema.object({
				provider: Schema.string().required(),
				model: Schema.string().required(),
				label: Schema.string(),
				description: Schema.string().default(""),
				capabilities: Schema.array(Schema.string()).default([])
			})).default([]).volatile(),
			groups: Schema.array(Schema.object({
				id: Schema.string().required(),
				label: Schema.string().required(),
				roles: Schema.array(Schema.object({
					id: Schema.string().required(),
					label: Schema.string().required(),
					description: Schema.string(),
					chain: Schema.array(routeMember).default([]),
					rules: Schema.array(Schema.object({
						label: Schema.string(),
						when: Schema.object({
							promptAny: Schema.array(Schema.string()).default([]),
							promptRegex: Schema.string(),
							modalities: Schema.array(Schema.string()).default([]),
							minContextWindow: Schema.number().default(0),
							capabilities: Schema.array(Schema.string()).default([])
						}).default({}),
						use: routeMember.default({
							provider: "",
							model: ""
						})
					})).default([])
				})).default([])
			})).default([]).volatile(),
			bindings: Schema.object({
				compact: bindingTarget.default({ kind: "off" }),
				sessionTitle: bindingTarget.default({ kind: "off" }),
				delegateDefault: bindingTarget.default({ kind: "off" })
			}).default({}).volatile(),
			exposure: Schema.object({
				listTool: Schema.boolean().default(true),
				sessionStart: Schema.boolean().default(false),
				delegateTool: Schema.boolean().default(true)
			}).default({}).volatile(),
			routing: Schema.object({
				fallback: Schema.boolean().default(true),
				aiEnabled: Schema.boolean().default(false),
				aiProvider: Schema.string(),
				aiModel: Schema.string(),
				aiTimeoutMs: Schema.number().default(8e3)
			}).default({}).volatile(),
			delegate: Schema.object({
				provider: Schema.string().default("spawn"),
				toolName: Schema.string().default("subagent"),
				enableRunInBackground: Schema.boolean().default(true)
			}).default({}).volatile()
		});
		/** Stable identity for one exact route. */
		function routeKey(route) {
			return `${route.provider}\u0000${route.model}`;
		}
		/** Human-readable `provider/model` for diagnostics and descriptions. */
		function routeLabel(route) {
			return `${route.provider}/${route.model}`;
		}
		/** Whether a condition lists nothing at all. */
		function conditionIsEmpty(condition) {
			return (condition.promptAny ?? []).length === 0 && (condition.promptRegex ?? "").length === 0 && (condition.modalities ?? []).length === 0 && (condition.minContextWindow ?? 0) <= 0 && (condition.capabilities ?? []).length === 0;
		}
		/**
		* Check the cross-field rules the Config schema cannot express.
		*
		* Findings are returned rather than thrown so the Host can serve a partially
		* configured section (the routing then reports what is wrong) while the
		* editor blocks a save that would introduce them.
		*
		* @param settings - the settings snapshot to inspect.
		* @returns every problem found, in document order.
		*/
		function inspectRoleConfig(settings) {
			const problems = [];
			const poolKeys = /* @__PURE__ */ new Map();
			settings.pool.forEach((entry, index) => {
				const path = `pool.${index}`;
				if (entry.provider.trim().length === 0 || entry.model.trim().length === 0) {
					problems.push({
						path,
						message: "a pool entry needs both a provider and a model"
					});
					return;
				}
				const key = routeKey(entry);
				const previous = poolKeys.get(key);
				if (previous !== void 0) {
					problems.push({
						path,
						message: `duplicate pool entry for ${routeLabel(entry)} (also at ${previous})`
					});
					return;
				}
				poolKeys.set(key, path);
			});
			const roleIds = /* @__PURE__ */ new Map();
			settings.groups.forEach((group, groupIndex) => {
				const groupPath = `groups.${groupIndex}`;
				if (group.id.trim().length === 0) problems.push({
					path: `${groupPath}.id`,
					message: "a tag group needs an id"
				});
				group.roles.forEach((role, roleIndex) => {
					const rolePath = `${groupPath}.roles.${roleIndex}`;
					if (role.id.trim().length === 0) problems.push({
						path: `${rolePath}.id`,
						message: "a role needs an id"
					});
					else {
						const previous = roleIds.get(role.id);
						if (previous !== void 0) problems.push({
							path: `${rolePath}.id`,
							message: `duplicate role id "${role.id}" (also at ${previous})`
						});
						else roleIds.set(role.id, `${rolePath}.id`);
					}
					const inChain = /* @__PURE__ */ new Set();
					role.chain.forEach((member, memberIndex) => {
						const key = routeKey(member);
						if (!poolKeys.has(key)) problems.push({
							path: `${rolePath}.chain.${memberIndex}`,
							message: `${routeLabel(member)} is not in the model pool`
						});
						if (inChain.has(key)) problems.push({
							path: `${rolePath}.chain.${memberIndex}`,
							message: `${routeLabel(member)} appears twice in this role`
						});
						inChain.add(key);
					});
					for (const [ruleIndex, rule] of (role.rules ?? []).entries()) {
						const rulePath = `${rolePath}.rules.${ruleIndex}`;
						if (!inChain.has(routeKey(rule.use))) problems.push({
							path: `${rulePath}.use`,
							message: `${routeLabel(rule.use)} is not a member of role "${role.id}"`
						});
						const regex = rule.when.promptRegex;
						if (regex !== void 0 && regex.length > 0) try {
							new RegExp(regex);
						} catch (error) {
							problems.push({
								path: `${rulePath}.when.promptRegex`,
								message: `invalid regular expression: ${error instanceof Error ? error.message : String(error)}`
							});
						}
						if (conditionIsEmpty(rule.when)) problems.push({
							path: `${rulePath}.when`,
							message: "a rule needs at least one condition"
						});
					}
				});
			});
			const configuredBindings = settings.bindings ?? {};
			const bindings = [
				[configuredBindings.compact, "bindings.compact"],
				[configuredBindings.sessionTitle, "bindings.sessionTitle"],
				[configuredBindings.delegateDefault, "bindings.delegateDefault"]
			];
			for (const [binding, path] of bindings) {
				if (binding?.kind !== "role") continue;
				const role = binding.role ?? "";
				if (role.length === 0) problems.push({
					path: `${path}.role`,
					message: "choose a role or turn this binding off"
				});
				else if (!roleIds.has(role)) problems.push({
					path: `${path}.role`,
					message: `role "${role}" does not exist`
				});
			}
			if ((settings.routing ?? {}).aiEnabled === true) {
				const provider = settings.routing?.aiProvider ?? "";
				const model = settings.routing?.aiModel ?? "";
				if (provider.length === 0 || model.length === 0) problems.push({
					path: "routing.aiProvider",
					message: "AI routing needs a router model (provider and model together)"
				});
				const timeout = settings.routing?.aiTimeoutMs ?? 0;
				if (!Number.isFinite(timeout) || timeout <= 0) problems.push({
					path: "routing.aiTimeoutMs",
					message: "the router deadline must be a positive number"
				});
			}
			if ((settings.delegate?.provider ?? "").trim().length === 0) problems.push({
				path: "delegate.provider",
				message: "the delegation tool needs a subagent provider name"
			});
			if ((settings.delegate?.toolName ?? "").trim().length === 0) problems.push({
				path: "delegate.toolName",
				message: "the delegation tool needs a tool name"
			});
			return problems;
		}
		//#endregion
		//#region lib/client/controller.js
		/**
		* The Role Config page's controller: one staged draft over the live settings
		* namespace, the adapter catalog joined with the pool, and the actions the
		* page renders.
		*
		* The page never writes on every keystroke. Edits land in a detached draft,
		* and `save()` sends the six top-level fields as one revision-fenced
		* mutation, so a document changed elsewhere is never silently overwritten.
		*
		* @module dsh-role-config/client/controller
		*/
		/** Settings namespace this page edits (the Loader row id). */
		const ROLE_CONFIG_NS = "role-config";
		/** The page's empty settings value, used before the first read lands. */
		const EMPTY = {
			pool: [],
			groups: [],
			bindings: {
				compact: { kind: "off" },
				sessionTitle: { kind: "off" },
				delegateDefault: { kind: "off" }
			},
			exposure: {
				listTool: true,
				sessionStart: false,
				delegateTool: true
			},
			routing: {
				fallback: true,
				aiEnabled: false,
				aiTimeoutMs: 8e3
			},
			delegate: {
				provider: "spawn",
				toolName: "subagent",
				enableRunInBackground: true
			}
		};
		/** Structural equality good enough for a settings document (plain JSON). */
		function sameValue(left, right) {
			return JSON.stringify(left) === JSON.stringify(right);
		}
		/** Clone one settings document. */
		function cloneSettings(settings) {
			return structuredClone(settings);
		}
		/** Whether one route still has an entry in the pool. */
		function poolHas(settings, route) {
			return settings.pool.some((entry) => entry.provider === route.provider && entry.model === route.model);
		}
		/** Bridges the settings namespace, the adapter directory, and one staged draft. */
		var RoleConfigPageController = class {
			scope;
			ctx;
			draft;
			draftRevision;
			catalogGroups = [];
			catalogStatus = "idle";
			catalogPartial = false;
			saving = false;
			conflicted = false;
			disposed = false;
			saveGeneration = 0;
			catalogGeneration = 0;
			store;
			unsubscribe;
			/**
			* @param scope - the bound `role-config` settings form.
			* @param ctx - the page plugin's context, whose `remote.session` namespace
			* answers the Host model catalog.
			*/
			constructor(scope, ctx) {
				this.scope = scope;
				this.ctx = ctx;
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = scope.subscribe(() => {
					const snapshot = this.scope.getSnapshot();
					if (!this.saving && this.draft !== void 0 && snapshot.revision !== this.draftRevision) if (snapshot.value !== void 0 && sameValue(snapshot.value, this.draft)) {
						this.draft = void 0;
						this.draftRevision = void 0;
						this.conflicted = false;
					} else this.conflicted = true;
					this.publish();
				});
				this.loadCatalog();
			}
			/** Stop observing settings and suppress late settlements. */
			dispose() {
				this.disposed = true;
				this.saveGeneration += 1;
				this.catalogGeneration += 1;
				this.unsubscribe();
			}
			/** The renderer face for this page. */
			inject() {
				return {
					hooks: { roleConfigPage: this.store },
					retryCatalog: () => {
						this.loadCatalog();
					},
					edit: (update) => {
						this.edit(update);
					},
					save: () => {
						this.save();
					},
					discard: () => {
						this.discard();
					}
				};
			}
			/** Load the adapter catalog once per request, keeping the last good one. */
			async loadCatalog() {
				if (this.disposed) return;
				const generation = ++this.catalogGeneration;
				this.catalogStatus = "loading";
				this.publish();
				try {
					const response = await this.ctx.remote.session.modelCatalog();
					if (this.disposed || generation !== this.catalogGeneration) return;
					if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
					this.catalogGroups = response.value.groups;
					this.catalogPartial = response.value.groups.some((group) => group.error !== void 0);
					this.catalogStatus = "ready";
				} catch {
					if (this.disposed || generation !== this.catalogGeneration) return;
					this.catalogStatus = "error";
				}
				this.publish();
			}
			current() {
				return this.scope.getSnapshot().value ?? EMPTY;
			}
			staged() {
				this.draft ??= cloneSettings(this.current());
				this.draftRevision ??= this.scope.getSnapshot().revision;
				return this.draft;
			}
			edit(update) {
				const snapshot = this.scope.getSnapshot();
				if (this.disposed || !snapshot.writable || this.saving) return;
				if (snapshot.value === void 0) return;
				this.draft = update(cloneSettings(this.staged()));
				this.publish();
			}
			discard() {
				if (this.saving) return;
				this.draft = void 0;
				this.draftRevision = void 0;
				this.conflicted = false;
				this.publish();
			}
			async save() {
				const snapshot = this.scope.getSnapshot();
				if (this.disposed || this.draft === void 0 || !snapshot.writable || this.saving) return;
				if (this.conflicted) return;
				const desired = this.draft;
				if (snapshot.revision !== this.draftRevision) {
					this.conflicted = true;
					this.publish();
					return;
				}
				const generation = ++this.saveGeneration;
				this.saving = true;
				this.publish();
				const ops = [
					"pool",
					"groups",
					"bindings",
					"exposure",
					"routing",
					"delegate"
				].map((field) => ({
					op: "set",
					path: [field],
					value: desired[field]
				}));
				try {
					const ok = await this.scope.mutate(ops, this.draftRevision);
					if (this.disposed || generation !== this.saveGeneration) return;
					if (ok) {
						this.draft = void 0;
						this.draftRevision = void 0;
					}
				} finally {
					if (!this.disposed && generation === this.saveGeneration) {
						this.saving = false;
						this.publish();
					}
				}
			}
			/** Build the picker: catalog rows plus pool routes the adapter dropped. */
			catalog() {
				const settings = this.draft ?? this.current();
				const selected = new Set(settings.pool.map((entry) => `${entry.provider}\u0000${entry.model}`));
				const groups = this.catalogGroups.map((group) => ({
					provider: group.id,
					providerName: group.name,
					rows: group.models.map((model) => ({
						provider: group.id,
						providerName: group.name,
						model: model.id,
						modelName: model.name,
						available: true,
						selected: selected.has(`${group.id}\u0000${model.id}`)
					}))
				}));
				const known = new Set(groups.flatMap((group) => group.rows.map((row) => `${row.provider}\u0000${row.model}`)));
				const kept = settings.pool.filter((entry) => !known.has(`${entry.provider}\u0000${entry.model}`)).map((entry) => ({
					provider: entry.provider,
					providerName: entry.provider,
					model: entry.model,
					modelName: entry.model,
					available: false,
					selected: true
				}));
				if (kept.length > 0) groups.push({
					provider: "(unavailable)",
					providerName: "unavailable",
					rows: kept
				});
				return groups;
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				const draft = this.draft ?? snapshot.value ?? EMPTY;
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					saving: this.saving,
					failed: false,
					dirty: this.draft !== void 0 && !sameValue(this.draft, snapshot.value),
					invalid: inspectRoleConfig(draft).length > 0,
					draft,
					problems: inspectRoleConfig(draft),
					catalogStatus: this.catalogStatus,
					catalogPartial: this.catalogPartial,
					catalog: this.catalog(),
					conflicted: this.conflicted
				};
			}
			publish() {
				if (this.disposed) return;
				this.store.update((state) => {
					Object.assign(state, this.projection());
				});
			}
		};
		//#endregion
		//#region lib/client/RoleConfigPage.js
		/**
		* The Role Config page: the model pool, the role presets with their chains and
		* routing rules, and the switches that decide what the model may see.
		*
		* Controls are native elements with inline styles on purpose: this page ships
		* inside a fresh plugin bundle, and every extra shared dependency is a module
		* request the module table has to answer.
		*
		* @module dsh-role-config/client/RoleConfigPage
		*/
		const label = {
			display: "block",
			fontSize: 12,
			opacity: .7,
			marginBottom: 2
		};
		const field = {
			width: "100%",
			boxSizing: "border-box"
		};
		const section = {
			display: "grid",
			gap: 10,
			marginBottom: 22
		};
		const row = {
			display: "grid",
			gap: 8,
			padding: "8px 0",
			borderTop: "1px solid rgba(127,127,127,0.2)"
		};
		const inline = {
			display: "flex",
			gap: 6,
			alignItems: "center",
			flexWrap: "wrap"
		};
		const muted = {
			fontSize: 12,
			opacity: .7
		};
		const mono = {
			fontFamily: "ui-monospace, monospace",
			fontSize: 12
		};
		/**
		* Render the Role Config settings form.
		* @param props - locale copy, the page snapshot, and its actions.
		* @returns the summary line or the editable form.
		*/
		function RoleConfigPage(props) {
			const { t } = props;
			const state = props.useRoleConfigPage((snapshot) => snapshot);
			const headingId = (0, react.useId)();
			if (props.view === "summary") return t("description");
			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: {
					unavailable: t("unavailable"),
					readOnly: t("notWritable"),
					saveFailed: t("conflict"),
					save: t("save"),
					saving: t("saving")
				},
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						style: muted,
						children: t("description")
					}),
					(0, react_jsx_runtime.jsx)(PoolSection, {
						t,
						state,
						edit: props.edit,
						retryCatalog: props.retryCatalog,
						headingId
					}),
					(0, react_jsx_runtime.jsx)(RolesSection, {
						t,
						state,
						edit: props.edit,
						headingId
					}),
					(0, react_jsx_runtime.jsx)(SwitchSection, {
						t,
						state,
						edit: props.edit,
						headingId
					}),
					state.problems.length > 0 ? (0, react_jsx_runtime.jsxs)("section", {
						"aria-labelledby": `${headingId}-problems`,
						children: [(0, react_jsx_runtime.jsx)("h3", {
							id: `${headingId}-problems`,
							children: t("problemTitle")
						}), (0, react_jsx_runtime.jsx)("ul", { children: state.problems.map((problem) => (0, react_jsx_runtime.jsxs)("li", {
							style: muted,
							children: [
								problem.path,
								": ",
								problem.message
							]
						}, `${problem.path}:${problem.message}`)) })]
					}) : null
				]
			});
		}
		/** The pool picker, the pool rows, and the descriptions the model reads. */
		function PoolSection(props) {
			const { t, state } = props;
			const settings = state.draft;
			const toggle = (row) => {
				props.edit((draft) => {
					const exists = draft.pool.some((entry) => entry.provider === row.provider && entry.model === row.model);
					return {
						...draft,
						pool: exists ? draft.pool.filter((entry) => !(entry.provider === row.provider && entry.model === row.model)) : [...draft.pool, {
							provider: row.provider,
							model: row.model,
							description: ""
						}]
					};
				});
			};
			const update = (index, patch) => {
				props.edit((draft) => ({
					...draft,
					pool: draft.pool.map((entry, position) => position === index ? {
						...entry,
						...patch
					} : entry)
				}));
			};
			return (0, react_jsx_runtime.jsxs)("section", {
				style: section,
				"aria-labelledby": props.headingId + "-pool",
				children: [
					(0, react_jsx_runtime.jsx)("h3", {
						id: props.headingId + "-pool",
						children: t("poolTitle")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						style: muted,
						children: t("poolHint")
					}),
					settings.pool.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						style: muted,
						children: t("poolEmpty")
					}) : null,
					settings.pool.map((entry, index) => (0, react_jsx_runtime.jsxs)("div", {
						style: row,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								style: inline,
								children: [
									(0, react_jsx_runtime.jsxs)("span", {
										style: mono,
										children: [
											entry.provider,
											"/",
											entry.model
										]
									}),
									!poolHas(settings, entry) || state.catalog.some((group) => group.rows.some((r) => r.provider === entry.provider && r.model === entry.model && !r.available)) ? (0, react_jsx_runtime.jsx)("span", {
										style: muted,
										children: t("poolUnavailable")
									}) : null,
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											toggle({
												provider: entry.provider,
												model: entry.model,
												selected: true,
												available: true,
												providerName: entry.provider,
												modelName: entry.model
											});
										},
										children: t("poolRemove")
									})
								]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								style: label,
								children: [t("poolLabel"), (0, react_jsx_runtime.jsx)("input", {
									style: field,
									value: entry.label ?? "",
									onChange: (event) => {
										update(index, { label: event.target.value });
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								style: label,
								children: [t("poolDescription"), (0, react_jsx_runtime.jsx)("textarea", {
									style: field,
									rows: 2,
									value: entry.description,
									onChange: (event) => {
										update(index, { description: event.target.value });
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								style: label,
								children: [t("poolCapabilities"), (0, react_jsx_runtime.jsx)("input", {
									style: field,
									placeholder: t("poolCapabilitiesHint"),
									value: (entry.capabilities ?? []).join(", "),
									onChange: (event) => {
										update(index, { capabilities: splitList(event.target.value) });
									}
								})]
							})
						]
					}, `${entry.provider}/${entry.model}`)),
					(0, react_jsx_runtime.jsxs)("div", {
						style: inline,
						children: [
							(0, react_jsx_runtime.jsx)("strong", {
								style: muted,
								children: t("poolAdd")
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: props.retryCatalog,
								children: t("poolRetry")
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: muted,
								children: state.catalogStatus
							})
						]
					}),
					state.catalog.map((group) => (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("div", {
						style: muted,
						children: group.providerName
					}), group.rows.map((row) => (0, react_jsx_runtime.jsxs)("label", {
						style: inline,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: row.selected,
								onChange: () => {
									toggle(row);
								}
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: mono,
								children: row.model
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: muted,
								children: row.available ? row.modelName : t("poolUnavailable")
							})
						]
					}, `${row.provider}/${row.model}`))] }, group.provider))
				]
			});
		}
		/** Role presets: groups, roles, priority chains, and routing rules. */
		function RolesSection(props) {
			const { t, state } = props;
			const settings = state.draft;
			const mutateGroups = (change) => {
				props.edit((draft) => ({
					...draft,
					groups: change(structuredClone(draft.groups))
				}));
			};
			const mutateRole = (groupIndex, roleIndex, change) => {
				mutateGroups((groups) => {
					const group = groups[groupIndex];
					const role = group?.roles[roleIndex];
					if (group === void 0 || role === void 0) return groups;
					group.roles[roleIndex] = change(structuredClone(role));
					return groups;
				});
			};
			return (0, react_jsx_runtime.jsxs)("section", {
				style: section,
				"aria-labelledby": props.headingId + "-roles",
				children: [
					(0, react_jsx_runtime.jsx)("h3", {
						id: props.headingId + "-roles",
						children: t("rolesTitle")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						style: muted,
						children: t("rolesHint")
					}),
					settings.groups.map((group, groupIndex) => (0, react_jsx_runtime.jsxs)("div", {
						style: row,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								style: inline,
								children: [(0, react_jsx_runtime.jsxs)("label", {
									style: label,
									children: [t("groupLabel"), (0, react_jsx_runtime.jsx)("input", {
										style: field,
										value: group.label,
										onChange: (event) => {
											mutateGroups((groups) => {
												const target = groups[groupIndex];
												if (target !== void 0) target.label = event.target.value;
												return groups;
											});
										}
									})]
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										mutateGroups((groups) => groups.filter((_, index) => index !== groupIndex));
									},
									children: t("groupRemove")
								})]
							}),
							group.roles.map((role, roleIndex) => (0, react_jsx_runtime.jsxs)("div", {
								style: row,
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										style: inline,
										children: [
											(0, react_jsx_runtime.jsxs)("label", {
												style: label,
												children: [t("roleId"), (0, react_jsx_runtime.jsx)("input", {
													style: field,
													value: role.id,
													onChange: (event) => {
														mutateRole(groupIndex, roleIndex, (current) => ({
															...current,
															id: event.target.value
														}));
													}
												})]
											}),
											(0, react_jsx_runtime.jsxs)("label", {
												style: label,
												children: [t("roleLabel"), (0, react_jsx_runtime.jsx)("input", {
													style: field,
													value: role.label,
													onChange: (event) => {
														mutateRole(groupIndex, roleIndex, (current) => ({
															...current,
															label: event.target.value
														}));
													}
												})]
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => {
													mutateGroups((groups) => {
														const target = groups[groupIndex];
														if (target !== void 0) target.roles = target.roles.filter((_, index) => index !== roleIndex);
														return groups;
													});
												},
												children: t("roleRemove")
											})
										]
									}),
									(0, react_jsx_runtime.jsxs)("label", {
										style: label,
										children: [t("roleDescription"), (0, react_jsx_runtime.jsx)("input", {
											style: field,
											value: role.description ?? "",
											onChange: (event) => {
												mutateRole(groupIndex, roleIndex, (current) => ({
													...current,
													description: event.target.value
												}));
											}
										})]
									}),
									(0, react_jsx_runtime.jsxs)("div", { children: [
										(0, react_jsx_runtime.jsx)("div", {
											style: muted,
											children: t("chainTitle")
										}),
										role.chain.length === 0 ? (0, react_jsx_runtime.jsx)("div", {
											style: muted,
											children: t("chainEmpty")
										}) : null,
										role.chain.map((member, memberIndex) => (0, react_jsx_runtime.jsxs)("div", {
											style: inline,
											children: [
												(0, react_jsx_runtime.jsxs)("span", {
													style: mono,
													children: [
														memberIndex + 1,
														". ",
														member.provider,
														"/",
														member.model
													]
												}),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: memberIndex === 0,
													onClick: () => {
														moveMember(props, groupIndex, roleIndex, memberIndex, -1);
													},
													children: t("memberUp")
												}),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: memberIndex === role.chain.length - 1,
													onClick: () => {
														moveMember(props, groupIndex, roleIndex, memberIndex, 1);
													},
													children: t("memberDown")
												}),
												(0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => {
														mutateRole(groupIndex, roleIndex, (current) => ({
															...current,
															chain: current.chain.filter((_, index) => index !== memberIndex)
														}));
													},
													children: t("memberRemove")
												})
											]
										}, `${member.provider}/${member.model}`)),
										(0, react_jsx_runtime.jsxs)("select", {
											value: "",
											onChange: (event) => {
												const member = memberFromKey(settings, event.target.value);
												if (member === void 0) return;
												mutateRole(groupIndex, roleIndex, (current) => ({
													...current,
													chain: [...current.chain, member]
												}));
											},
											children: [(0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: t("chainAdd")
											}), settings.pool.filter((entry) => !role.chain.some((member) => member.provider === entry.provider && member.model === entry.model)).map((entry) => (0, react_jsx_runtime.jsxs)("option", {
												value: `${entry.provider}\u0000${entry.model}`,
												children: [
													entry.provider,
													"/",
													entry.model
												]
											}, `${entry.provider}/${entry.model}`))]
										})
									] }),
									(0, react_jsx_runtime.jsxs)("div", { children: [
										(0, react_jsx_runtime.jsxs)("div", {
											style: muted,
											children: [
												t("rulesTitle"),
												" — ",
												t("rulesHint")
											]
										}),
										(role.rules ?? []).map((rule, ruleIndex) => (0, react_jsx_runtime.jsxs)("div", {
											style: row,
											children: [
												(0, react_jsx_runtime.jsxs)("div", {
													style: inline,
													children: [(0, react_jsx_runtime.jsxs)("label", {
														style: label,
														children: [t("ruleKeywords"), (0, react_jsx_runtime.jsx)("input", {
															style: field,
															value: (rule.when.promptAny ?? []).join(", "),
															onChange: (event) => {
																mutateRule(props, groupIndex, roleIndex, ruleIndex, (current) => ({
																	...current,
																	when: {
																		...current.when,
																		promptAny: splitList(event.target.value)
																	}
																}));
															}
														})]
													}), (0, react_jsx_runtime.jsxs)("label", {
														style: label,
														children: [t("ruleRegex"), (0, react_jsx_runtime.jsx)("input", {
															style: field,
															value: rule.when.promptRegex ?? "",
															onChange: (event) => {
																mutateRule(props, groupIndex, roleIndex, ruleIndex, (current) => ({
																	...current,
																	when: {
																		...current.when,
																		promptRegex: event.target.value
																	}
																}));
															}
														})]
													})]
												}),
												(0, react_jsx_runtime.jsxs)("div", {
													style: inline,
													children: [
														(0, react_jsx_runtime.jsxs)("label", {
															style: label,
															children: [t("ruleModalities"), (0, react_jsx_runtime.jsx)("input", {
																style: field,
																value: (rule.when.modalities ?? []).join(", "),
																onChange: (event) => {
																	mutateRule(props, groupIndex, roleIndex, ruleIndex, (current) => ({
																		...current,
																		when: {
																			...current.when,
																			modalities: splitList(event.target.value)
																		}
																	}));
																}
															})]
														}),
														(0, react_jsx_runtime.jsxs)("label", {
															style: label,
															children: [t("ruleContext"), (0, react_jsx_runtime.jsx)("input", {
																style: field,
																type: "number",
																value: rule.when.minContextWindow ?? 0,
																onChange: (event) => {
																	mutateRule(props, groupIndex, roleIndex, ruleIndex, (current) => ({
																		...current,
																		when: {
																			...current.when,
																			minContextWindow: Number(event.target.value)
																		}
																	}));
																}
															})]
														}),
														(0, react_jsx_runtime.jsxs)("label", {
															style: label,
															children: [t("ruleTags"), (0, react_jsx_runtime.jsx)("input", {
																style: field,
																value: (rule.when.capabilities ?? []).join(", "),
																onChange: (event) => {
																	mutateRule(props, groupIndex, roleIndex, ruleIndex, (current) => ({
																		...current,
																		when: {
																			...current.when,
																			capabilities: splitList(event.target.value)
																		}
																	}));
																}
															})]
														})
													]
												}),
												(0, react_jsx_runtime.jsxs)("div", {
													style: inline,
													children: [(0, react_jsx_runtime.jsxs)("label", {
														style: label,
														children: [t("ruleUse"), (0, react_jsx_runtime.jsx)("select", {
															value: `${rule.use.provider}\u0000${rule.use.model}`,
															onChange: (event) => {
																const member = memberFromKey(settings, event.target.value);
																if (member === void 0) return;
																mutateRule(props, groupIndex, roleIndex, ruleIndex, (current) => ({
																	...current,
																	use: member
																}));
															},
															children: role.chain.map((member) => (0, react_jsx_runtime.jsxs)("option", {
																value: `${member.provider}\u0000${member.model}`,
																children: [
																	member.provider,
																	"/",
																	member.model
																]
															}, `${member.provider}/${member.model}`))
														})]
													}), (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => {
															mutateRole(groupIndex, roleIndex, (current) => ({
																...current,
																rules: (current.rules ?? []).filter((_, index) => index !== ruleIndex)
															}));
														},
														children: t("ruleRemove")
													})]
												})
											]
										}, `rule-${ruleIndex}`)),
										(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											disabled: role.chain.length === 0,
											onClick: () => {
												mutateRole(groupIndex, roleIndex, (current) => ({
													...current,
													rules: [...current.rules ?? [], {
														when: { promptAny: [] },
														use: current.chain[0]
													}]
												}));
											},
											children: t("ruleAdd")
										})
									] })
								]
							}, role.id)),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									mutateGroups((groups) => {
										const target = groups[groupIndex];
										if (target !== void 0) {
											const id = nextId(target.roles.map((role) => role.id), "role");
											target.roles = [...target.roles, {
												id,
												label: id,
												chain: []
											}];
										}
										return groups;
									});
								},
								children: t("roleAdd")
							})
						]
					}, group.id)),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							mutateGroups((groups) => {
								const id = nextId(groups.map((group) => group.id), "group");
								return [...groups, {
									id,
									label: id,
									roles: []
								}];
							});
						},
						children: t("groupAdd")
					})
				]
			});
		}
		/** The switches, the delegation wiring, and the AI routing stage. */
		function SwitchSection(props) {
			const { t, state } = props;
			const settings = state.draft;
			const set = (change) => {
				props.edit(change);
			};
			const checkbox = (key, checked, onChange) => (0, react_jsx_runtime.jsxs)("label", {
				style: inline,
				children: [(0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked,
					onChange: (event) => {
						onChange(event.target.checked);
					}
				}), (0, react_jsx_runtime.jsx)("span", { children: t(key) })]
			}, key);
			return (0, react_jsx_runtime.jsxs)("section", {
				style: section,
				"aria-labelledby": props.headingId + "-switches",
				children: [
					(0, react_jsx_runtime.jsx)("h3", {
						id: props.headingId + "-switches",
						children: t("switchesTitle")
					}),
					checkbox("switchesList", settings.exposure.listTool, (next) => {
						set((draft) => ({
							...draft,
							exposure: {
								...draft.exposure,
								listTool: next
							}
						}));
					}),
					checkbox("switchesSessionStart", settings.exposure.sessionStart, (next) => {
						set((draft) => ({
							...draft,
							exposure: {
								...draft.exposure,
								sessionStart: next
							}
						}));
					}),
					checkbox("switchesDelegate", settings.exposure.delegateTool, (next) => {
						set((draft) => ({
							...draft,
							exposure: {
								...draft.exposure,
								delegateTool: next
							}
						}));
					}),
					checkbox("switchesFallback", settings.routing.fallback, (next) => {
						set((draft) => ({
							...draft,
							routing: {
								...draft.routing,
								fallback: next
							}
						}));
					}),
					checkbox("switchesAi", settings.routing.aiEnabled, (next) => {
						set((draft) => ({
							...draft,
							routing: {
								...draft.routing,
								aiEnabled: next
							}
						}));
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: inline,
						children: [
							(0, react_jsx_runtime.jsxs)("label", {
								style: label,
								children: [t("switchesAiProvider"), (0, react_jsx_runtime.jsx)("input", {
									style: field,
									value: settings.routing.aiProvider ?? "",
									onChange: (event) => {
										set((draft) => ({
											...draft,
											routing: {
												...draft.routing,
												aiProvider: event.target.value
											}
										}));
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								style: label,
								children: [t("switchesAiModel"), (0, react_jsx_runtime.jsx)("input", {
									style: field,
									value: settings.routing.aiModel ?? "",
									onChange: (event) => {
										set((draft) => ({
											...draft,
											routing: {
												...draft.routing,
												aiModel: event.target.value
											}
										}));
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								style: label,
								children: [t("switchesAiTimeout"), (0, react_jsx_runtime.jsx)("input", {
									style: field,
									type: "number",
									value: settings.routing.aiTimeoutMs,
									onChange: (event) => {
										set((draft) => ({
											...draft,
											routing: {
												...draft.routing,
												aiTimeoutMs: Number(event.target.value)
											}
										}));
									}
								})]
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: inline,
						children: BINDINGS.map(({ key, labelKey }) => (0, react_jsx_runtime.jsxs)("label", {
							style: label,
							children: [t(labelKey), (0, react_jsx_runtime.jsxs)("select", {
								style: field,
								value: settings.bindings[key].kind === "role" ? settings.bindings[key].role ?? "" : "",
								onChange: (event) => {
									set((draft) => ({
										...draft,
										bindings: {
											...draft.bindings,
											[key]: event.target.value.length === 0 ? { kind: "off" } : {
												kind: "role",
												role: event.target.value
											}
										}
									}));
								},
								children: [(0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("bindingOff")
								}), settings.groups.flatMap((group) => group.roles).map((role) => (0, react_jsx_runtime.jsx)("option", {
									value: role.id,
									children: role.label || role.id
								}, role.id))]
							})]
						}, key))
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: inline,
						children: [(0, react_jsx_runtime.jsxs)("label", {
							style: label,
							children: [t("delegateProvider"), (0, react_jsx_runtime.jsx)("input", {
								style: field,
								value: settings.delegate.provider,
								onChange: (event) => {
									set((draft) => ({
										...draft,
										delegate: {
											...draft.delegate,
											provider: event.target.value
										}
									}));
								}
							})]
						}), (0, react_jsx_runtime.jsxs)("label", {
							style: label,
							children: [t("delegateToolName"), (0, react_jsx_runtime.jsx)("input", {
								style: field,
								value: settings.delegate.toolName,
								onChange: (event) => {
									set((draft) => ({
										...draft,
										delegate: {
											...draft.delegate,
											toolName: event.target.value
										}
									}));
								}
							})]
						})]
					})
				]
			});
		}
		/** The bindable features, in the order the page lists them. */
		const BINDINGS = [
			{
				key: "compact",
				labelKey: "bindingCompact"
			},
			{
				key: "sessionTitle",
				labelKey: "bindingSessionTitle"
			},
			{
				key: "delegateDefault",
				labelKey: "bindingDelegateDefault"
			}
		];
		/** Split one comma-separated control into trimmed, non-empty entries. */
		function splitList(value) {
			return value.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
		}
		/** Resolve a `provider\0model` option value against the live pool. */
		function memberFromKey(settings, key) {
			const [provider, model] = key.split("\0");
			if (provider === void 0 || model === void 0 || provider.length === 0 || model.length === 0) return void 0;
			if (!settings.pool.some((entry) => entry.provider === provider && entry.model === model)) return void 0;
			return {
				provider,
				model
			};
		}
		/** The first free id with the requested stem. */
		function nextId(existing, stem) {
			for (let index = 1;; index += 1) {
				const candidate = `${stem}-${index}`;
				if (!existing.includes(candidate)) return candidate;
			}
		}
		/** Reorder one chain member. */
		function moveMember(props, groupIndex, roleIndex, memberIndex, delta) {
			props.edit((draft) => {
				const groups = structuredClone(draft.groups);
				const role = groups[groupIndex]?.roles[roleIndex];
				if (role === void 0) return draft;
				const chain = [...role.chain];
				const target = memberIndex + delta;
				const member = chain[memberIndex];
				const other = chain[target];
				if (member === void 0 || other === void 0) return draft;
				chain[memberIndex] = other;
				chain[target] = member;
				role.chain = chain;
				return {
					...draft,
					groups
				};
			});
		}
		/** Stage one rule edit. */
		function mutateRule(props, groupIndex, roleIndex, ruleIndex, change) {
			props.edit((draft) => {
				const groups = structuredClone(draft.groups);
				const role = groups[groupIndex]?.roles[roleIndex];
				const rule = role?.rules?.[ruleIndex];
				if (role === void 0 || rule === void 0) return draft;
				const rules = [...role.rules ?? []];
				rules[ruleIndex] = change(rule);
				role.rules = rules;
				return {
					...draft,
					groups
				};
			});
		}
		//#endregion
		//#region lib/client/locales.js
		/** Copy for the Role Config settings page. */
		/** English copy. */
		const en = {
			title: "Role Config",
			description: "Role presets the model can delegate to, and the pool of models it may name directly.",
			poolTitle: "Model pool",
			poolHint: "Models the main agent may name directly. Each one needs the description you consider important.",
			poolEmpty: "No models in the pool yet. Add them from the list below.",
			poolAdd: "Add these models",
			poolRemove: "Remove",
			poolUnavailable: "not advertised by any adapter right now",
			poolRetry: "Reload the model list",
			poolDescription: "Description (what it is good at)",
			poolLabel: "Display name (optional)",
			poolCapabilities: "Capability tags (optional)",
			poolCapabilitiesHint: "Comma-separated, used by rules only where an adapter discloses nothing.",
			rolesTitle: "Role presets",
			rolesHint: "A role shows the model its name and description only; which member serves stays with your rules.",
			groupLabel: "Group",
			groupAdd: "Add group",
			groupRemove: "Remove group",
			roleId: "Role id",
			roleLabel: "Name",
			roleDescription: "Description",
			roleAdd: "Add role",
			roleRemove: "Remove role",
			chainTitle: "Priority chain (first serves, failure walks down)",
			chainAdd: "Add member",
			chainEmpty: "No members yet. Add one from the pool.",
			memberUp: "Move up",
			memberDown: "Move down",
			memberRemove: "Remove member",
			rulesTitle: "Routing rules",
			rulesHint: "Evaluated in order before the chain. Every stated condition must hold.",
			ruleAdd: "Add rule",
			ruleRemove: "Remove rule",
			ruleKeywords: "Prompt contains (comma-separated)",
			ruleRegex: "Prompt matches (regular expression)",
			ruleModalities: "Requires modalities (image, ...)",
			ruleContext: "Minimum context window",
			ruleTags: "Requires tags",
			ruleUse: "Use member",
			switchesTitle: "Surfaces and routing",
			switchesList: "List roles and models on request (list_model_roles)",
			switchesSessionStart: "Insert the descriptions at the start of every session",
			switchesDelegate: "Register the role-routing delegation tool",
			switchesFallback: "Walk the role chain after a terminal failure",
			switchesAi: "Ask a router model when no rule matched",
			switchesAiProvider: "Router provider",
			switchesAiModel: "Router model",
			switchesAiTimeout: "Router deadline (ms)",
			bindingCompact: "Context compaction",
			bindingSessionTitle: "Session titles",
			bindingDelegateDefault: "Default role for a delegation with no role",
			bindingOff: "Harness default",
			delegateProvider: "Subagent provider",
			delegateToolName: "Delegation tool name",
			save: "Save",
			discard: "Discard",
			saving: "Saving...",
			unavailable: "This Host does not serve the role-config settings namespace.",
			notWritable: "This deployment stores settings in memory only; changes last for this process.",
			conflict: "The settings changed elsewhere. Discard your draft and edit again.",
			problemTitle: "Problems to fix before saving"
		};
		/** Chinese copy. */
		const zh = {
			title: "模型角色配置",
			description: "可供模型按角色委派的预设，以及它可以直接指定的模型池。",
			poolTitle: "模型池",
			poolHint: "主 agent 可以直接指定的模型；每个都要写你觉得重要的描述。",
			poolEmpty: "池中还没有模型，从下面的列表添加。",
			poolAdd: "添加所选模型",
			poolRemove: "移除",
			poolUnavailable: "当前没有任何适配器提供该路由",
			poolRetry: "重新加载模型列表",
			poolDescription: "描述（擅长什么）",
			poolLabel: "显示名（可选）",
			poolCapabilities: "能力标签（可选）",
			poolCapabilitiesHint: "逗号分隔；只在适配器没有声明时供规则使用。",
			rolesTitle: "角色预设",
			rolesHint: "角色只把名称与描述给模型；由哪个成员服务由你的规则决定。",
			groupLabel: "标签组",
			groupAdd: "添加标签组",
			groupRemove: "删除标签组",
			roleId: "角色 id",
			roleLabel: "名称",
			roleDescription: "描述",
			roleAdd: "添加角色",
			roleRemove: "删除角色",
			chainTitle: "优先级链（首个服务，失败逐级向下）",
			chainAdd: "添加成员",
			chainEmpty: "还没有成员，从池中添加。",
			memberUp: "上移",
			memberDown: "下移",
			memberRemove: "移除成员",
			rulesTitle: "路由规则",
			rulesHint: "按顺序在链首之前求值；写出的每个条件都必须满足。",
			ruleAdd: "添加规则",
			ruleRemove: "删除规则",
			ruleKeywords: "提示词包含（逗号分隔）",
			ruleRegex: "提示词匹配（正则）",
			ruleModalities: "需要模态（image 等）",
			ruleContext: "最小上下文窗口",
			ruleTags: "需要标签",
			ruleUse: "使用成员",
			switchesTitle: "暴露面与路由",
			switchesList: "按需列出角色与模型（list_model_roles）",
			switchesSessionStart: "在每个会话开头插入描述",
			switchesDelegate: "注册按角色路由的委派工具",
			switchesFallback: "终局失败后沿角色链回退",
			switchesAi: "没有规则命中时询问路由模型",
			switchesAiProvider: "路由 provider",
			switchesAiModel: "路由模型",
			switchesAiTimeout: "路由超时（毫秒）",
			bindingCompact: "上下文压缩",
			bindingSessionTitle: "会话标题",
			bindingDelegateDefault: "未指定角色时的默认角色",
			bindingOff: "按 dsh 默认",
			delegateProvider: "子代理 provider",
			delegateToolName: "委派工具名",
			save: "保存",
			discard: "放弃修改",
			saving: "保存中…",
			unavailable: "当前 Host 没有提供 role-config 设置命名空间。",
			notWritable: "当前部署只把设置存在内存里，改动只对本次进程有效。",
			conflict: "设置已在别处被修改，请放弃草稿后重新编辑。",
			problemTitle: "保存前需要修复的问题"
		};
		//#endregion
		//#region lib/client/index.js
		/**
		* The Role Config page, browser half: the pool, the role presets with their
		* chains and routing rules, and the switches, over one settings namespace on
		* the Plugins page.
		*
		* The page registers while the Host serves `role-config`, and the Host side
		* registers that namespace itself, so the page exists exactly when its
		* settings do.
		*
		* @module dsh-role-config/client
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.role-config";
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.session",
			"configForms"
		];
		/**
		* Mount the Role Config page while the Host serves its namespace.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "role-config: dictionaries");
			const controller = new RoleConfigPageController(ctx.configForms.get(ROLE_CONFIG_NS), ctx);
			ctx.effect(() => () => {
				controller.dispose();
			}, "role-config: settings subscription");
			const face = controller.inject();
			ctx.effect(() => ctx.remote.$on("settings/document-updated", () => {
				controller.loadCatalog();
			}), "role-config: settings invalidations");
			ctx.effect(() => ctx.configForms.whileServed([ROLE_CONFIG_NS], () => ctx.slots.inject("plugins.item", () => ctx.slots.register({
				name: "plugins.item",
				id: "role-config",
				order: 40,
				label: () => t("title"),
				locale: NS,
				inject: () => face
			}, RoleConfigPage))), "role-config: page");
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map