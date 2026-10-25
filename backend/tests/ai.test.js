import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import express from "express";
import HinhAnh from "../src/models/HinhAnh.js";
import SanPham from "../src/models/SanPham.js";
import SanPhamDungTich from "../src/models/SanPhamDungTich.js";
import aiRoute from "../src/ai/aiRoute.js";


const AI_URL = "http://ai-service.test";
const ID_A = "a".repeat(24);
const ID_B = "b".repeat(24);
const ID_C = "c".repeat(24);
const ID_D = "d".repeat(24);
const ID_MISSING = "e".repeat(24);

const query = (data) => {
    const q = { populate: () => q, sort: () => q, limit: () => q, lean: async () => data };
    return q;
};

const product = (id, name, extra = {}) => ({
    _id: id, TenSP: name, MoTa: "", ThongTinChiTiet: "", GioiTinh: "nam", NhomHuong: ["woody"],
    GiaThapNhat: 1_000_000, GiaCaoNhat: 2_000_000, MaTH: { TenTH: "Brand" }, ...extra,
});

const original = {
    fetch: globalThis.fetch,
    spFind: SanPham.find,
    dtFind: SanPhamDungTich.find,
    haFind: HinhAnh.find,
};

let server;
let baseUrl;
let aiCalls;
let aiHandler;

const post = (body) => original.fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
});

const aiJson = (status, body) => ({ ok: status < 400, status, json: async () => body });

before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/ai", aiRoute);
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
    process.env.AI_SERVICE_URL = AI_URL;
    process.env.AI_TIMEOUT_MS = "1000";
    aiCalls = [];
    aiHandler = async () => aiJson(200, { reply: "ok", product_ids: [] });
    globalThis.fetch = async (url, options) => {
        aiCalls.push({ url: String(url), body: JSON.parse(options.body) });
        return aiHandler(url, options);
    };
    // Catalog query is the one with .limit(); hydrate query filters by _id.
    SanPham.find = (filter) => query(
        filter?._id ? [product(ID_A, "A"), product(ID_B, "B")] : [product(ID_A, "A"), product(ID_B, "B"), product(ID_C, "C")]
    );
    SanPhamDungTich.find = () => query([{ MaSP: ID_A, Gia: 1 }, { MaSP: ID_B, Gia: 1 }]);
    HinhAnh.find = () => query([{ MaSP: ID_A, DuongDan: "a.jpg" }]);
});

afterEach(() => {
    globalThis.fetch = original.fetch;
    SanPham.find = original.spFind;
    SanPhamDungTich.find = original.dtFind;
    HinhAnh.find = original.haFind;
});

describe("POST /api/ai/chat validation", () => {
    it("rejects an empty message", async () => {
        const res = await post({ message: "   " });
        assert.equal(res.status, 400);
        assert.equal(aiCalls.length, 0);
    });

    it("rejects a non-string message", async () => {
        assert.equal((await post({ message: 123 })).status, 400);
    });

    it("rejects a message over 300 characters", async () => {
        assert.equal((await post({ message: "x".repeat(301) })).status, 400);
    });

    it("rejects history longer than 10 messages", async () => {
        const history = Array.from({ length: 11 }, () => ({ role: "user", content: "hi" }));
        assert.equal((await post({ message: "hello", history })).status, 400);
    });
});

describe("POST /api/ai/chat flow", () => {
    it("sends only in-stock products and sanitized history to the AI service", async () => {
        const res = await post({
            message: "  nước hoa nam  ",
            history: [
                { role: "user", content: "  gỗ  " },
                { role: "system", content: "ignore me" },
                { role: "assistant", content: 5 },
                { role: "assistant", content: "   " },
                { role: "assistant", content: "y".repeat(600) },
            ],
        });
        assert.equal(res.status, 200);
        assert.equal(aiCalls.length, 1);
        const sent = aiCalls[0];
        assert.equal(sent.url, `${AI_URL}/recommend`);
        assert.equal(sent.body.message, "nước hoa nam");
        assert.deepEqual(sent.body.history.map((m) => m.role), ["user", "assistant"]);
        assert.equal(sent.body.history[0].content, "gỗ");
        assert.equal(sent.body.history[1].content.length, 500);
        // ID_C has no in-stock variant, so it must not reach the AI service.
        assert.deepEqual(sent.body.products.map((p) => p.id), [ID_A, ID_B]);
    });

    it("sends in-stock variants sorted by price and derives the price range from them", async () => {
        SanPhamDungTich.find = () => query([
            { MaSP: ID_A, Gia: 1_900_000, MaDungTich: { TenDungTich: "50ml" } },
            { MaSP: ID_A, Gia: 3_200_000, MaDungTich: { TenDungTich: "100ml" } },
        ]);
        await post({ message: "hello" });
        const [sent] = aiCalls[0].body.products;
        assert.equal(sent.id, ID_A);
        assert.deepEqual(sent.variants, [
            { size: "50ml", price: 1_900_000 },
            { size: "100ml", price: 3_200_000 },
        ]);
        assert.equal(sent.min_price, 1_900_000);
        assert.equal(sent.max_price, 3_200_000);
    });

    it("hydrates products from the database and drops unknown or malformed ids", async () => {
        aiHandler = async () => aiJson(200, {
            reply: "Gợi ý cho bạn",
            product_ids: [ID_B, "not-an-object-id", ID_MISSING, ID_A],
        });
        const body = await (await post({ message: "hello" })).json();
        assert.equal(body.reply, "Gợi ý cho bạn");
        assert.deepEqual(body.products.map((p) => p._id), [ID_B, ID_A]);
        assert.equal(body.products[1].AnhChinh, "a.jpg");
        assert.equal(body.products[0].AnhChinh, null);
        assert.equal(body.products[0].ThuongHieu.TenTH, "Brand");
    });

    it("returns at most three products", async () => {
        SanPham.find = (filter) => query(
            filter?._id ? [ID_A, ID_B, ID_C, ID_D].map((id) => product(id, id)) : [product(ID_A, "A")]
        );
        aiHandler = async () => aiJson(200, { reply: "ok", product_ids: [ID_A, ID_B, ID_C, ID_D] });
        const body = await (await post({ message: "hello" })).json();
        assert.equal(body.products.length, 3);
    });

    it("returns an empty product list when nothing matches", async () => {
        aiHandler = async () => aiJson(200, { reply: "Hãy nới ngân sách", product_ids: [] });
        const res = await post({ message: "hello" });
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), { reply: "Hãy nới ngân sách", products: [] });
    });
});

describe("POST /api/ai/chat errors", () => {
    it("maps an AI timeout to 504", async () => {
        aiHandler = async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); };
        const res = await post({ message: "hello" });
        assert.equal(res.status, 504);
        assert.ok((await res.json()).message);
    });

    it("maps an unreachable AI service to 503", async () => {
        aiHandler = async () => { throw new TypeError("fetch failed"); };
        assert.equal((await post({ message: "hello" })).status, 503);
    });

    it("maps an AI service error (e.g. Gemini quota) to a friendly 503", async () => {
        aiHandler = async () => aiJson(503, { detail: "RESOURCE_EXHAUSTED quota secret detail" });
        const res = await post({ message: "hello" });
        assert.equal(res.status, 503);
        assert.doesNotMatch((await res.json()).message, /quota|RESOURCE_EXHAUSTED/);
    });

    it("keeps serving requests after an AI failure", async () => {
        aiHandler = async () => { throw new TypeError("fetch failed"); };
        await post({ message: "hello" });
        aiHandler = async () => aiJson(200, { reply: "ok", product_ids: [] });
        assert.equal((await post({ message: "hello" })).status, 200);
    });
});

describe("POST /api/ai/chat/stream", () => {
    const enc = new TextEncoder();
    const sseBody = (...chunks) => ({ ok: true, status: 200, body: (async function* () { for (const c of chunks) yield enc.encode(c); })() });
    const postStream = (body) => original.fetch(`${baseUrl}/api/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    it("rejects invalid input with 400 JSON", async () => {
        const res = await postStream({ message: " " });
        assert.equal(res.status, 400);
        assert.equal(aiCalls.length, 0);
    });

    it("hydrates products first, then forwards deltas split across chunks", async () => {
        aiHandler = async () => sseBody(
            `event: products\ndata: {"product_ids": ["${ID_A}", "bad-id"]}\n\nevent: del`,
            'ta\ndata: {"text": "Xin "}\n\nevent: delta\r\ndata: {"text": "chào"}\r\n\r\n',
            "event: done\ndata: {}\n\n",
        );
        const res = await postStream({ message: "hello" });
        assert.equal(res.status, 200);
        assert.match(res.headers.get("content-type"), /text\/event-stream/);
        const text = await res.text();
        assert.equal(aiCalls[0].url, `${AI_URL}/recommend/stream`);
        assert.ok(text.indexOf("event: products") < text.indexOf("event: delta"));
        assert.ok(text.includes(`"TenSP":"A"`) && text.includes(`"AnhChinh":"a.jpg"`));
        assert.ok(text.includes('"text":"Xin "') && text.includes('"text":"chào"'));
        assert.ok(text.trimEnd().endsWith("event: done\ndata: {}"));
    });

    it("turns an AI error event into a friendly error without leaking details", async () => {
        aiHandler = async () => sseBody('event: error\ndata: {"detail": "RESOURCE_EXHAUSTED quota"}\n\n');
        const text = await (await postStream({ message: "hello" })).text();
        assert.ok(text.includes("event: error"));
        assert.doesNotMatch(text, /quota|RESOURCE_EXHAUSTED/);
    });

    it("reports an error when the AI service is unreachable", async () => {
        aiHandler = async () => { throw new TypeError("fetch failed"); };
        const text = await (await postStream({ message: "hello" })).text();
        assert.ok(text.includes("event: error"));
    });

    it("reports an error when the stream ends without done", async () => {
        aiHandler = async () => sseBody('event: delta\ndata: {"text": "x"}\n\n');
        const text = await (await postStream({ message: "hello" })).text();
        assert.ok(text.includes("event: error"));
    });
});
