import { parseUsageCsv, aggregateRows } from "./csv";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.log(`FAIL ${name}\n  got  ${g}\n  want ${w}`); fails++; }
  else console.log(`ok   ${name}`);
};

// 1. Standart ISO + virgül
let r = parseUsageCsv(`email,date,model,input tokens,output tokens,cost
a@x.com,2026-01-05,claude-opus-5,1000,200,"$1.50"
b@x.com,2026-01-05,claude-opus-5,5,6,0.01`);
eq("iso ok", r.ok, true);
if (r.ok) { eq("iso rows", r.rows.length, 2); eq("iso cost", r.rows[0].costUsd, 1.5); }

// 2. TR: noktalı virgül, GG.AA.YYYY, virgüllü ondalık, BOM, CRLF
r = parseUsageCsv("﻿E-Posta;Tarih;Model;Girdi Token;Çıktı Token;Maliyet\r\nc@x.com;05.01.2026;opus;1.234;56;\"1,50\"\r\n");
eq("tr ok", r.ok, true);
if (r.ok) { eq("tr date", r.rows[0].usageDate, "2026-01-05"); eq("tr input", r.rows[0].inputTokens, 1234); eq("tr cost", r.rows[0].costUsd, 1.5); }

// 3. Tırnak içinde satır sonu ve ikilenmiş tırnak
r = parseUsageCsv(`email,date,cost\n"a@x.com",2026-02-01,"2.00"\n"b@x.com",2026-02-01,"3.00"`);
eq("quoted ok", r.ok, true);
if (r.ok) eq("quoted rows", r.rows.length, 2);

// 4. Zorunlu sütun eksik
r = parseUsageCsv(`model,cost\nopus,1`);
eq("missing cols", r.ok, false);
if (!r.ok) eq("missing msg", r.reason.includes("e-posta"), true);

// 5. Metrik sütunu hiç yok
r = parseUsageCsv(`email,date\na@x.com,2026-01-01`);
eq("no metrics", r.ok, false);

// 6. Bozuk satırlar atlanır, iyi satır kalır
r = parseUsageCsv(`email,date,cost\nbozuk,2026-01-01,1\na@x.com,31.02.2026,1\na@x.com,2026-01-01,-5\na@x.com,2026-01-01,7`);
eq("partial ok", r.ok, true);
if (r.ok) { eq("partial rows", r.rows.length, 1); eq("partial skipped", r.skipped, 3);
  eq("issue reasons", r.issues.map(i => i.line), [2,3,4]); }

// 7. Hiç geçerli satır yok
r = parseUsageCsv(`email,date,cost\nbozuk,yok,1`);
eq("all bad", r.ok, false);

// 8. Toplama
const agg = aggregateRows([
  { userEmail:"a@x.com", model:"o", inputTokens:1, outputTokens:2, costUsd:0.5, usageDate:"2026-01-01" },
  { userEmail:"a@x.com", model:"o", inputTokens:3, outputTokens:4, costUsd:0.25, usageDate:"2026-01-01" },
  { userEmail:"a@x.com", model:"p", inputTokens:1, outputTokens:1, costUsd:1, usageDate:"2026-01-01" },
]);
eq("agg len", agg.length, 2);
eq("agg sum", [agg[0].inputTokens, agg[0].outputTokens, agg[0].costUsd], [4,6,0.75]);

// 9. Sekmeyle ayrılmış
r = parseUsageCsv("email\tdate\tcost\na@x.com\t2026-01-01\t5");
eq("tab ok", r.ok, true);

// 10. Boş dosya
eq("empty", parseUsageCsv("   ").ok, false);


// 11. Sayı biçimleri
const num = (csv: string) => { const x = parseUsageCsv(csv); return x.ok ? x.rows[0] : null; };
const h = "email,date,input tokens,cost\n";
eq("bin nokta", num(h + 'a@x.com,2026-01-01,1.234,1')?.inputTokens, 1234);
eq("bin virgul", num(h + 'a@x.com,2026-01-01,"1,234",1')?.inputTokens, 1234);
eq("ondalik token", num(h + 'a@x.com,2026-01-01,1234.0,1')?.inputTokens, 1234);
eq("karisik token", num(h + 'a@x.com,2026-01-01,"1,234.56",1')?.inputTokens, 1235);
eq("cok grup", num(h + 'a@x.com,2026-01-01,1.234.567,1')?.inputTokens, 1234567);
eq("kucuk maliyet", num(h + 'a@x.com,2026-01-01,1,0.001234')?.costUsd, 0.001234);
eq("tr maliyet", num(h + 'a@x.com,2026-01-01,1,"1.234,56"')?.costUsd, 1234.56);
eq("dolar imi", num(h + 'a@x.com,2026-01-01,1,"$12.50"')?.costUsd, 12.5);

console.log(fails === 0 ? "\nTÜM TESTLER GEÇTİ" : `\n${fails} TEST BAŞARISIZ`);
process.exit(fails === 0 ? 0 : 1);
