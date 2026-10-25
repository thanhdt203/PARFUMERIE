import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import ChiTietDonHang from "../src/models/ChiTietDonHang.js";
import DonHang from "../src/models/DonHang.js";
import LuotXemSanPham from "../src/models/LuotXemSanPham.js";
import YeuThich from "../src/models/YeuThich.js";
import productRoute from "../src/routers/productRoute.js";
import HoiThoaiAI from "../src/models/HoiThoaiAI.js";
import aiHistoryRoute from "../src/ai/aiHistoryRoute.js";
import KhachHang from "../src/models/KhachHang.js";
import NhanVien from "../src/models/NhanVien.js";
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

const profileOriginal = { dh: DonHang.find, ct: ChiTietDonHang.find, yt: YeuThich.find, lx: LuotXemSanPham.find };
const stubEmptyProfile = () => {
    DonHang.find = () => query([]);
    ChiTietDonHang.find = () => query([]);
    YeuThich.find = () => query([]);
    LuotXemSanPham.find = () => query([]);
};
const restoreProfile = () => {
    DonHang.find = profileOriginal.dh;
    ChiTietDonHang.find = profileOriginal.ct;
    YeuThich.find = profileOriginal.yt;
    LuotXemSanPham.find = profileOriginal.lx;
};

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

describe("POST /api/ai/chat/stream modes", () => {
    const enc = new TextEncoder();
    const sseBody = (...chunks) => ({ ok: true, status: 200, body: (async function* () { for (const c of chunks) yield enc.encode(c); })() });
    const productsThenDone = () => sseBody(`event: products\ndata: {"product_ids": ["${ID_A}"]}\n\n`, "event: done\ndata: {}\n\n");
    const original2 = { kh: KhachHang.findById, nv: NhanVien.findById, secret: process.env.ACCESS_TOKEN_SECRET };
    const token = (role) => jwt.sign({ userId: "u1", role }, "test-secret");
    const postAs = (auth) => original.fetch(`${baseUrl}/api/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: JSON.stringify({ message: "hello" }),
    });

    beforeEach(() => {
        process.env.ACCESS_TOKEN_SECRET = "test-secret";
        KhachHang.findById = () => ({ select: async () => ({ _id: "u1" }) });
        NhanVien.findById = () => ({ select: async () => ({ _id: "u1", VaiTro: "staff" }) });
        stubEmptyProfile();
        aiHandler = async () => productsThenDone();
        SanPham.find = (filter) => query(
            filter?._id
                ? [product(ID_A, "A", { NotHuong: { Dau: ["cam"], Giua: [], Cuoi: ["gỗ"] } })]
                : [product(ID_A, "A")]
        );
        SanPhamDungTich.find = () => query([
            { _id: "v1", MaSP: ID_A, Gia: 900_000, SoLuongCo: 3, MaDungTich: { TenDungTich: "50ml" } },
        ]);
    });

    afterEach(() => {
        KhachHang.findById = original2.kh;
        NhanVien.findById = original2.nv;
        process.env.ACCESS_TOKEN_SECRET = original2.secret;
        restoreProfile();
    });

    it("guest gets basic mode and plain product cards", async () => {
        const text = await (await postAs(null)).text();
        assert.ok(text.startsWith('event: mode\ndata: {"mode":"basic"}'));
        assert.equal(aiCalls[0].body.mode, "basic");
        assert.ok(!text.includes("BienThe") && !text.includes("NotHuong"));
    });

    it("logged-in customer gets deep mode with note tiers and cart-ready variants", async () => {
        const text = await (await postAs(token("customer"))).text();
        assert.ok(text.startsWith('event: mode\ndata: {"mode":"deep"}'));
        assert.equal(aiCalls[0].body.mode, "deep");
        assert.ok(text.includes('"NotHuong":{"Dau":["cam"],"Giua":[],"Cuoi":["gỗ"]}'));
        assert.ok(text.includes('"BienThe":[{"_id":"v1","TenDungTich":"50ml","Gia":900000,"SoLuongCo":3,"ConHang":true}]'));
    });

    it("invalid token or staff account falls back to basic mode instead of failing", async () => {
        for (const auth of ["not-a-jwt", token("staff")]) {
            aiCalls.length = 0;
            const res = await postAs(auth);
            assert.equal(res.status, 200);
            assert.equal(aiCalls[0].body.mode, "basic");
            await res.text();
        }
    });
});

describe("AI conversation history", () => {
    const enc = new TextEncoder();
    const sseBody = (...chunks) => ({ ok: true, status: 200, body: (async function* () { for (const c of chunks) yield enc.encode(c); })() });
    const saved = { kh: KhachHang.findById, secret: process.env.ACCESS_TOKEN_SECRET, create: HoiThoaiAI.create, upd: HoiThoaiAI.findOneAndUpdate };
    const OID = "f".repeat(24);
    let creates;
    let updates;
    const customerToken = () => jwt.sign({ userId: "u1", role: "customer" }, "test-secret");
    const stream = (body, auth = customerToken()) => original.fetch(`${baseUrl}/api/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: JSON.stringify({ message: "hello", ...body }),
    });

    beforeEach(() => {
        process.env.ACCESS_TOKEN_SECRET = "test-secret";
        KhachHang.findById = () => ({ select: async () => ({ _id: "u1" }) });
        creates = [];
        updates = [];
        HoiThoaiAI.create = async (doc) => { creates.push(doc); return { _id: OID }; };
        HoiThoaiAI.findOneAndUpdate = async (filter, update) => { updates.push({ filter, update }); return null; };
        stubEmptyProfile();
        aiHandler = async () => sseBody(
            `event: products\ndata: {"product_ids": ["${ID_A}"]}\n\n`,
            'event: delta\ndata: {"text": "Xin "}\n\nevent: delta\ndata: {"text": "chào"}\n\n',
            "event: done\ndata: {}\n\n",
        );
        SanPhamDungTich.find = () => query([{ _id: "v1", MaSP: ID_A, Gia: 1, SoLuongCo: 1, MaDungTich: { TenDungTich: "50ml" } }]);
    });

    afterEach(() => {
        KhachHang.findById = saved.kh;
        process.env.ACCESS_TOKEN_SECRET = saved.secret;
        HoiThoaiAI.create = saved.create;
        HoiThoaiAI.findOneAndUpdate = saved.upd;
        restoreProfile();
    });

    it("saves a finished exchange of a logged-in customer into a new conversation", async () => {
        const text = await (await stream({})).text();
        assert.equal(creates.length, 1);
        assert.equal(creates[0].MaKH, "u1");
        assert.equal(creates[0].TieuDe, "hello");
        assert.deepEqual(creates[0].TinNhan.map((m) => [m.VaiTro, m.NoiDung]), [["user", "hello"], ["assistant", "Xin chào"]]);
        assert.deepEqual(creates[0].TinNhan[1].MaSanPham, [ID_A]);
        assert.ok(text.indexOf("event: conversation") < text.indexOf("event: done"));
        assert.ok(text.includes(`"id":"${OID}"`));
    });

    it("appends to an owned conversation and only creates a new one when it is not found", async () => {
        HoiThoaiAI.findOneAndUpdate = async (filter, update) => { updates.push({ filter, update }); return { _id: OID }; };
        const text = await (await stream({ conversationId: OID })).text();
        assert.equal(creates.length, 0);
        assert.equal(updates[0].filter.MaKH, "u1");
        assert.equal(updates[0].update.$push.TinNhan.$each.length, 2);
        assert.ok(text.includes(`"id":"${OID}"`));
    });

    it("ignores a malformed conversation id and does not save for guests or failed streams", async () => {
        await (await stream({ conversationId: "not-an-id" })).text();
        assert.equal(updates.length, 0);
        assert.equal(creates.length, 1);

        creates.length = 0;
        await (await stream({}, null)).text();
        assert.equal(creates.length, 0);

        aiHandler = async () => sseBody('event: delta\ndata: {"text": "x"}\n\nevent: error\ndata: {"detail": "boom"}\n\n');
        await (await stream({})).text();
        assert.equal(creates.length, 0);
    });

    describe("history endpoints", () => {
        let historyServer;
        let historyUrl;
        const found = { _id: OID, TieuDe: "t", TinNhan: [
            { VaiTro: "user", NoiDung: "q" },
            { VaiTro: "assistant", NoiDung: "a", MaSanPham: [ID_A, ID_MISSING] },
        ] };
        const origFind = { find: HoiThoaiAI.find, one: HoiThoaiAI.findOne, del: HoiThoaiAI.findOneAndDelete };
        let lastFilter;

        before(async () => {
            const app = express();
            app.use((req, res, next) => { req.user = { _id: "u1" }; next(); });
            app.use("/api/me/ai", aiHistoryRoute);
            await new Promise((resolve) => { historyServer = app.listen(0, "127.0.0.1", resolve); });
            historyUrl = `http://127.0.0.1:${historyServer.address().port}/api/me/ai`;
        });
        after(() => new Promise((resolve) => historyServer.close(resolve)));
        afterEach(() => {
            HoiThoaiAI.find = origFind.find;
            HoiThoaiAI.findOne = origFind.one;
            HoiThoaiAI.findOneAndDelete = origFind.del;
        });

        it("lists only the caller's conversations", async () => {
            HoiThoaiAI.find = (filter) => { lastFilter = filter; return query([{ _id: OID, TieuDe: "t" }]); };
            const res = await original.fetch(`${historyUrl}/conversations`);
            assert.equal(res.status, 200);
            assert.deepEqual(lastFilter, { MaKH: "u1" });
            assert.equal((await res.json()).data.length, 1);
        });

        it("returns messages with products rehydrated and drops products that no longer exist", async () => {
            HoiThoaiAI.findOne = (filter) => { lastFilter = filter; return { lean: async () => found }; };
            SanPham.find = () => query([product(ID_A, "A")]);
            const body = await (await original.fetch(`${historyUrl}/conversations/${OID}`)).json();
            assert.deepEqual(lastFilter, { _id: OID, MaKH: "u1" });
            assert.deepEqual(body.messages.map((m) => m.role), ["user", "assistant"]);
            assert.deepEqual(body.messages[1].products.map((p) => p.TenSP), ["A"]);
            assert.ok(body.messages[1].products[0].BienThe.length === 1);
        });

        it("returns 404 for someone else's conversation, 400 for a bad id", async () => {
            HoiThoaiAI.findOne = () => ({ lean: async () => null });
            assert.equal((await original.fetch(`${historyUrl}/conversations/${OID}`)).status, 404);
            assert.equal((await original.fetch(`${historyUrl}/conversations/abc`)).status, 400);
        });

        it("deletes only the caller's conversation", async () => {
            HoiThoaiAI.findOneAndDelete = async (filter) => { lastFilter = filter; return found; };
            const res = await original.fetch(`${historyUrl}/conversations/${OID}`, { method: "DELETE" });
            assert.equal(res.status, 200);
            assert.deepEqual(lastFilter, { _id: OID, MaKH: "u1" });
            HoiThoaiAI.findOneAndDelete = async () => null;
            assert.equal((await original.fetch(`${historyUrl}/conversations/${OID}`, { method: "DELETE" })).status, 404);
        });
    });
});

describe("Personalized profile for deep mode", () => {
    const enc = new TextEncoder();
    const done = () => ({ ok: true, status: 200, body: (async function* () { yield enc.encode("event: done\ndata: {}\n\n"); })() });
    const saved = { kh: KhachHang.findById, secret: process.env.ACCESS_TOKEN_SECRET, sp: SanPham.find };
    const ORDER_NEW = "1".repeat(24);
    const ORDER_OLD = "2".repeat(24);
    const post = (auth) => original.fetch(`${baseUrl}/api/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: JSON.stringify({ message: "hello" }),
    });
    const customer = () => jwt.sign({ userId: "u1", role: "customer" }, "test-secret");
    let filters;

    beforeEach(() => {
        process.env.ACCESS_TOKEN_SECRET = "test-secret";
        KhachHang.findById = () => ({ select: async () => ({ _id: "u1" }) });
        aiHandler = async () => done();
        filters = {};
        DonHang.find = (filter) => { filters.order = filter; return query([{ _id: ORDER_NEW }, { _id: ORDER_OLD }]); };
        ChiTietDonHang.find = () => query([
            { MaDH: ORDER_OLD, MaSPDungTich: { MaSP: ID_B } },
            { MaDH: ORDER_NEW, MaSPDungTich: { MaSP: ID_A } },
            { MaDH: ORDER_NEW, MaSPDungTich: { MaSP: ID_A } },
        ]);
        YeuThich.find = () => query([{ MaSP: ID_C }]);
        LuotXemSanPham.find = () => query([{ MaSP: ID_D }, { MaSP: ID_A }]);
        SanPham.find = (filter) => query(filter?._id?.$in
            ? [ID_A, ID_B, ID_C, ID_D].map((id) => product(id, `P-${id[0]}`, { NhomHuong: ["woody"], NotHuong: { Dau: ["cam"] } }))
            : [product(ID_A, "A")]);
    });

    afterEach(() => {
        KhachHang.findById = saved.kh;
        process.env.ACCESS_TOKEN_SECRET = saved.secret;
        SanPham.find = saved.sp;
        restoreProfile();
    });

    it("sends purchased (newest order first, deduped), liked and viewed products to the AI service", async () => {
        await (await post(customer())).text();
        const profile = aiCalls[0].body.profile;
        assert.deepEqual(profile.purchased.map((p) => p.id), [ID_A, ID_B]);
        assert.deepEqual(profile.liked.map((p) => p.id), [ID_C]);
        assert.deepEqual(profile.viewed.map((p) => p.id), [ID_D, ID_A]);
        assert.deepEqual(profile.purchased[0], {
            id: ID_A, name: "P-a", brand: "Brand", gender: "nam", scent_groups: ["woody"], notes: ["cam"],
        });
    });

    it("ignores cancelled orders and never builds a profile for guests", async () => {
        await (await post(customer())).text();
        assert.deepEqual(filters.order, { MaKH: "u1", TrangThai: { $ne: "Đã hủy" } });
        aiCalls.length = 0;
        await (await post(null)).text();
        assert.equal("profile" in aiCalls[0].body, false);
    });

    it("omits the profile when the customer has no history", async () => {
        stubEmptyProfile();
        await (await post(customer())).text();
        assert.equal("profile" in aiCalls[0].body, false);
    });

    it("still answers when building the profile fails", async () => {
        DonHang.find = () => { throw new Error("db down"); };
        const res = await post(customer());
        assert.equal(res.status, 200);
        assert.ok((await res.text()).includes("event: done"));
        assert.equal("profile" in aiCalls[0].body, false);
    });
});

describe("Product view tracking", () => {
    const saved = { kh: KhachHang.findById, secret: process.env.ACCESS_TOKEN_SECRET, one: SanPham.findOne, upd: SanPham.updateOne, dt: SanPhamDungTich.find, ha: HinhAnh.find, lx: LuotXemSanPham.updateOne };
    let viewServer;
    let viewUrl;
    let views;

    before(async () => {
        const app = express();
        app.use("/api/products", productRoute);
        await new Promise((resolve) => { viewServer = app.listen(0, "127.0.0.1", resolve); });
        viewUrl = `http://127.0.0.1:${viewServer.address().port}/api/products/${ID_A}`;
    });
    after(() => new Promise((resolve) => viewServer.close(resolve)));

    beforeEach(() => {
        process.env.ACCESS_TOKEN_SECRET = "test-secret";
        KhachHang.findById = () => ({ select: async () => ({ _id: "u1" }) });
        views = [];
        SanPham.findOne = () => query(product(ID_A, "A"));
        SanPham.updateOne = async () => ({});
        SanPhamDungTich.find = () => query([]);
        HinhAnh.find = () => query([]);
        LuotXemSanPham.updateOne = async (filter, update, options) => { views.push({ filter, update, options }); };
    });

    afterEach(() => {
        KhachHang.findById = saved.kh;
        process.env.ACCESS_TOKEN_SECRET = saved.secret;
        SanPham.findOne = saved.one;
        SanPham.updateOne = saved.upd;
        SanPhamDungTich.find = saved.dt;
        HinhAnh.find = saved.ha;
        LuotXemSanPham.updateOne = saved.lx;
    });

    it("records a view for a logged-in customer only", async () => {
        const token = jwt.sign({ userId: "u1", role: "customer" }, "test-secret");
        assert.equal((await original.fetch(viewUrl, { headers: { Authorization: `Bearer ${token}` } })).status, 200);
        assert.equal(views.length, 1);
        assert.deepEqual(views[0].filter, { MaKH: "u1", MaSP: ID_A });
        assert.equal(views[0].update.$inc.SoLan, 1);
        assert.equal(views[0].options.upsert, true);

        views.length = 0;
        assert.equal((await original.fetch(viewUrl)).status, 200);
        assert.equal(views.length, 0);
    });
});
