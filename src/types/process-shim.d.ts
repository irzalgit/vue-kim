// Deklarasi ambient minimal untuk `process`, supaya file yang dipakai
// bersama oleh browser (tsconfig.app.json) dan Node/MCP (tsconfig.node.json)
// — seperti src/agent/envUtil.ts — tidak error TS2591 di sisi browser.
//
// Di runtime browser, `process` memang undefined (envUtil.ts sudah cek
// `typeof process !== 'undefined'` sebelum memakainya), jadi deklarasi ini
// hanya untuk memuaskan type-checker, bukan mengubah perilaku runtime.
//
// Di runtime Node (via tsconfig.node.json, yang punya "types": ["node"]),
// tipe asli dari paket @types/node yang berlaku — deklarasi di file ini
// tidak dipakai di sana karena tsconfig.node.json tidak meng-include
// folder src/types.
declare const process: { env: Record<string, string | undefined> } | undefined;
