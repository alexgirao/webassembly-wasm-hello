
test("sample test", function () {
    ok(true, "is it true?");
    ok(123, "does it evaluates to true?");
    strictEqual(1, 2 - 1, "strict equal");
    deepEqual([1, 2], [2 - 1, 2], "deep equal");
});

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
    // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
    // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
    while (u8Array[endPtr] && !(endPtr >= endIdx))++endPtr;

    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
    } else {
        var str = '';
        // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
        while (idx < endPtr) {
            // For UTF8 byte structure, see:
            // http://en.wikipedia.org/wiki/UTF-8#Description
            // https://www.ietf.org/rfc/rfc2279.txt
            // https://tools.ietf.org/html/rfc3629
            var u0 = u8Array[idx++];
            if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
            var u1 = u8Array[idx++] & 63;
            if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
            var u2 = u8Array[idx++] & 63;
            if ((u0 & 0xF0) == 0xE0) {
                u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
            } else {
                if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte 0x' + u0.toString(16) + ' encountered when deserializing a UTF-8 string on the asm.js/wasm heap to a JS string!');
                u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
            }

            if (u0 < 0x10000) {
                str += String.fromCharCode(u0);
            } else {
                var ch = u0 - 0x10000;
                str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
            }
        }
    }
    return str;
}

test("load hello.wasm", function () {

    let WASM_PAGE_SIZE = 65536;
    let INITIAL_TOTAL_MEMORY = 16777216;

    let __memory_base = 1024;
    let __table_base = 0;

    let tempDoublePtr = 4816;
    let DYNAMICTOP_PTR = 4800;

    function abort(what) {
        console.error(what);
    }

    function abortStackOverflow(allocSize) {
        abort('Stack overflow, attempted to allocate ' + allocSize + ' bytes on the stack.');
    }

    function abortOnCannotGrowMemory() {
        abort('abortOnCannotGrowMemory: ' + Array.prototype.slice.call(arguments));
    }

    var tempRet0 = 0;

    var setTempRet0 = function (value) {
        tempRet0 = value;
    }

    var getTempRet0 = function () {
        return tempRet0;
    }

    let wasmMemory = new WebAssembly.Memory({
        'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE,
        'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
    });

    let wasmTable = new WebAssembly.Table({
        'initial': 30,
        'maximum': 30,
        'element': 'anyfunc'
    });

    let HEAP8 = new Int8Array(wasmMemory.buffer);
    let HEAP16 = new Int16Array(wasmMemory.buffer);
    let HEAP32 = new Int32Array(wasmMemory.buffer);
    let HEAPU8 = new Uint8Array(wasmMemory.buffer);
    let HEAPU16 = new Uint16Array(wasmMemory.buffer);
    let HEAPU32 = new Uint32Array(wasmMemory.buffer);
    let HEAPF32 = new Float32Array(wasmMemory.buffer);
    let HEAPF64 = new Float64Array(wasmMemory.buffer);

    function _emscripten_get_heap_size() {
        console.log("_emscripten_get_heap_size: " + Array.prototype.slice.call(arguments));
        return HEAP8.length;
    }

    function _emscripten_memcpy_big(dest, src, num) {
        HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    }

    function _emscripten_resize_heap(requestedSize) {
        console.log("_emscripten_resize_heap: " + Array.prototype.slice.call(arguments));
        abort("not implemented");
    }

    function nullFunc_ii() {
        abort("nullFunc_ii: " + Array.prototype.slice.call(arguments));
    }

    function nullFunc_iidiiii() {
        abort("nullFunc_iidiiii: " + Array.prototype.slice.call(arguments));
    }

    function nullFunc_iiii() {
        abort("nullFunc_iiii: " + Array.prototype.slice.call(arguments));
    }

    function nullFunc_jiji() {
        abort("nullFunc_jiji: " + Array.prototype.slice.call(arguments));
    }

    function nullFunc_vii() {
        abort("nullFunc_vii: " + Array.prototype.slice.call(arguments));
    }

    function ___lock() { }
    function ___unlock() { }

    function ___setErrNo(value) {
        console.log("___setErrNo: " + Array.prototype.slice.call(arguments));
        return value;
    }

    function ___syscall140(which, varargs) {
        console.log("___syscall140: " + Array.prototype.slice.call(arguments));
    }

    function ___syscall146() {
        console.log("___syscall146: " + Array.prototype.slice.call(arguments));
    }

    // 54 = ioctl
    function ___syscall54() {
        console.log("___syscall54: " + Array.prototype.slice.call(arguments));
    }

    // 6 = close
    function ___syscall6() {
        console.log("___syscall6: " + Array.prototype.slice.call(arguments));
    }

    let buffers = [null, [], []]; // stdin,stdout,stderr

    let out = console.log.bind(console);
    var err = console.warn.bind(console);

    // stream: file descriptor, curr: current char
    function printChar(stream, curr) {
        var buffer = buffers[stream];
        // if (curr === 0 || curr === 10) {
        //     // write to stdout/stderr on null byte or new line
        //     (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
        //     buffer.length = 0;
        // } else {
        //     buffer.push(curr);
        // }
        buffer.push(curr);
    }

    // 146 = writev
    function ___syscall146(which, varargs) {
        console.log("___syscall146: " + Array.prototype.slice.call(arguments));
        let stream = HEAP32[varargs >> 2];
        let iov = HEAP32[(varargs + 4) >> 2];
        let iovcnt = HEAP32[(varargs + 8) >> 2];
        // console.log("stream: [" + stream + "], iov: [" + iov + "], iovcnt: [" + iovcnt + "]");
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[(((iov) + (i * 8)) >> 2)];        // void *iov_base
            var len = HEAP32[(((iov) + (i * 8 + 4)) >> 2)];    // size_t iov_len
            for (var j = 0; j < len; j++) {
                printChar(stream, HEAPU8[ptr + j]);
            }
            ret += len;
        }
        return ret;
    }

    var importObject = {
        env: {
            DYNAMICTOP_PTR: DYNAMICTOP_PTR,
            memory: wasmMemory,
            table: wasmTable,
            setTempRet0: setTempRet0,
            getTempRet0: getTempRet0,
            abortStackOverflow: abortStackOverflow,
            abortOnCannotGrowMemory: abortOnCannotGrowMemory,
            nullFunc_ii: nullFunc_ii,
            nullFunc_iidiiii: nullFunc_iidiiii,
            nullFunc_iiii: nullFunc_iiii,
            nullFunc_jiji: nullFunc_jiji,
            nullFunc_vii: nullFunc_vii,
            tempDoublePtr: tempDoublePtr,
            _emscripten_get_heap_size: _emscripten_get_heap_size,
            _emscripten_resize_heap: _emscripten_resize_heap,
            _emscripten_memcpy_big: _emscripten_memcpy_big,
            __memory_base: __memory_base,
            __table_base: __table_base,
            ___lock: ___lock,
            ___unlock: ___unlock,
            ___setErrNo: ___setErrNo,
            ___syscall140: ___syscall140,
            ___syscall146: ___syscall146,
            ___syscall54: ___syscall54,
            ___syscall6: ___syscall6,
        }
    };

    fetch("hello.wasm").then(response =>
        response.arrayBuffer()
    ).then(bytes =>
        WebAssembly.instantiate(bytes, importObject)
    ).then(wasmInstance => {
        console.log(wasmInstance);
        return wasmInstance;
    }).then(wasmInstance => {
        wasmInstance.instance.exports._main();
        out('stdout: "' + UTF8ArrayToString(buffers[1], 0) + '"');
        buffers[1].length = 0;
    }).catch(function (err) {
        console.log("error");
        console.log(err);
    });
});
